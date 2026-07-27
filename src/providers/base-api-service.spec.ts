import axios, { AxiosAdapter, AxiosError, AxiosResponse } from 'axios'
import { HttpService } from '@nestjs/axios'
import { HttpException } from '@nestjs/common'
import { BaseApiService } from './base-api-service'

function createResponse (status: number, data?: any, headers: Record<string, string> = {}): AxiosResponse {
  return {
    status,
    statusText: '',
    data,
    headers,
    config: {} as any
  }
}

function createResponseError (status: number, headers?: Record<string, string>): AxiosError {
  return new AxiosError(
    'HTTP test error',
    String(status),
    undefined,
    {},
    createResponse(status, undefined, headers))
}

function setup (): { service: BaseApiService, adapter: jest.Mock } {
  const adapter = jest.fn()
  const instance = axios.create({ adapter: adapter })
  return { service: new BaseApiService(new HttpService(instance)), adapter }
}

describe('BaseApiService', () => {
  describe('defaults', () => {
    it('retries a GET by default (1 initial attempt + retries)', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.get('', { retry: { delay: 0 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(2)
    })

    it('does not retry a POST by default', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      // No `retry` key at all — any object value opts the POST in.
      await expect(service.post('', {}, {})).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(1)
    })

    it('does not retry a successful request', async () => {
      const { service, adapter } = setup()
      adapter.mockResolvedValue(createResponse(200, { test: 'data' }))

      await expect(service.get('')).resolves.toEqual({ test: 'data' })
      expect(adapter).toHaveBeenCalledTimes(1)
    })
  })

  describe('error classification', () => {
    it.each([500, 502, 503, 504, 429])('retries on %i', async (status) => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(status))

      await expect(service.get('', { retry: { delay: 0 } })).rejects.toThrow()
      expect(adapter).toHaveBeenCalledTimes(2)
    })

    it.each([400, 401, 403, 404, 422])('does not retry on %i', async (status) => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(status))

      await expect(service.get('', { retry: { delay: 0 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(1)
    })

    it('retries transport errors that carry no response', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(new Error('Network error'))

      await expect(service.get('', { retry: { delay: 0 } })).rejects.toThrow()
      expect(adapter).toHaveBeenCalledTimes(2)
    })
  })

  describe('recovery', () => {
    it('returns the response body once a retried attempt succeeds', async () => {
      const { service, adapter } = setup()
      adapter
        .mockRejectedValueOnce(createResponseError(503))
        .mockResolvedValueOnce(createResponse(200, { test: 'data' }))

      await expect(service.get('', { retry: { delay: 0, count: 2 } })).resolves.toEqual({ test: 'data' })
      expect(adapter).toHaveBeenCalledTimes(2)
    })

    it('stops retrying as soon as a non-retryable status is returned', async () => {
      const { service, adapter } = setup()
      adapter
        .mockRejectedValueOnce(createResponseError(503))
        .mockRejectedValueOnce(createResponseError(400))

      await expect(service.get('', { retry: { delay: 0, count: 2 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry configuration', () => {
    it('disables retries on a GET when retry is false', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.get('', { retry: false })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(1)
    })

    it('enables retries on a POST when retry is true', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.post('', {}, { retry: true })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(2)
    })

    it('honors a custom retry count', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.get('', { retry: { count: 4, delay: 0 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(5)
    })

    it('makes a single attempt when the count is zero', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.get('', { retry: { count: 0, delay: 0 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(1)
    })

    it('falls back to the defaults for an empty retry object', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(500))

      await expect(service.get('', { retry: {} })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(2)
    })
  })

  describe('surfaced errors', () => {
    it('preserves the upstream status on a non-retryable failure', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(404))

      await expect(service.get('/test', { retry: { delay: 0 } })).rejects.toMatchObject({
        status: 404,
        message: 'Failed to GET /test'
      })
    })

    it('preserves the upstream status once retries are exhausted', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(503))

      await expect(service.get('/test', { retry: { delay: 0 } })).rejects.toMatchObject({
        status: 503,
        message: 'Failed to GET /test'
      })
    })

    it('reports a transport error as a 500 HttpException', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(new Error('Network error'))

      await expect(service.get('/test', { retry: { delay: 0 } })).rejects.toMatchObject({
        status: 500,
        message: 'Failed to GET /test'
      })
    })
  })

  describe('Retry-After header', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('uses the Retry-After delay (seconds form) when it is present', async () => {
      const { service, adapter } = setup()
      adapter
        .mockRejectedValueOnce(createResponseError(429, { 'retry-after': '2' })) // 2000ms
        .mockResolvedValueOnce(createResponse(200, { test: 'data' }))

      // Configured delay (60s) is far longer than the header (2s). Advancing by
      // only the header's delay should already be enough to resolve — proving
      // the header won, not the configured delay.
      const promise = service.get('', { retry: { delay: 60000, count: 1 } })

      await jest.advanceTimersByTimeAsync(2000)
      await expect(promise).resolves.toEqual({ test: 'data' })
    })

    it('uses the Retry-After delay (HTTP-date form) when it is present', async () => {
      const { service, adapter } = setup()
      const retryAt = new Date(Date.now() + 2000)
      adapter
        .mockRejectedValueOnce(createResponseError(429, { 'retry-after': retryAt.toUTCString() }))
        .mockResolvedValueOnce(createResponse(200, { test: 'data' }))

      const promise = service.get('', { retry: { delay: 60000, count: 1 } })

      await jest.advanceTimersByTimeAsync(2000)
      await expect(promise).resolves.toEqual({ test: 'data' })
    })

    it('does not retry a Retry-After delay on a non-retryable status', async () => {
      const { service, adapter } = setup()
      adapter.mockRejectedValue(createResponseError(404, { 'retry-after': '2' }))

      await expect(service.get('', { retry: { delay: 60000, count: 1 } })).rejects.toThrow(HttpException)
      expect(adapter).toHaveBeenCalledTimes(1)
    })
  })
})
