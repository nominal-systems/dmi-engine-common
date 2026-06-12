import { AxiosInterceptor } from './axios.interceptor'
import { runWithRequestContext } from '../context'

describe('AxiosInterceptor', () => {
  let interceptor: AxiosInterceptor
  let httpServiceMock: any
  let clientMock: any

  // Hold the registered interceptor callbacks from axios
  let successHandler: ((response: any) => any) | undefined
  let errorHandler: ((error: any) => Promise<any>) | undefined

  beforeEach(() => {
    successHandler = undefined
    errorHandler = undefined

    httpServiceMock = {
      axiosRef: {
        interceptors: {
          response: {
            use: jest.fn((
              success: any,
              error: any
            ) => {
              successHandler = success
              errorHandler = error
            })
          }
        }
      }
    }

    clientMock = {
      emit: jest.fn()
    }

    interceptor = new AxiosInterceptor(httpServiceMock, clientMock)
    // Assign a provider to verify propagation in emitted payloads
    ;(interceptor as any).provider = 'test-provider'
  })

  it('registers axios response interceptors on module init', () => {
    interceptor.onModuleInit()

    expect(httpServiceMock.axiosRef.interceptors.response.use).toHaveBeenCalledTimes(1)
    expect(typeof successHandler).toBe('function')
    expect(typeof errorHandler).toBe('function')
  })

  it('emits raw_data on successful responses and returns the response', () => {
    interceptor.onModuleInit()
    expect(successHandler).toBeDefined()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        params: {},
        data: { sent: 123 }
      },
      data: {
        ok: true,
        value: 42
      },
      status: 200,
      request: {
        method: 'GET',
        headers: { 'x-req': '123' }
      }
    }

    const returned = (successHandler as any)(response)

    // Returns the same response
    expect(returned).toBe(response)

    // Emits expected event with extracted payload
    expect(clientMock.emit).toHaveBeenCalledTimes(1)
    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
      provider: 'test-provider',
      accessionIds: [],
      status: 200,
      method: 'GET',
      url: 'https://api.example.com/resource',
      body: {
        ok: true,
        value: 42
      },
      headers: { 'x-req': '123' },
      payload: { sent: 123 }
    })
  })

  it('emits raw_data with URL including query params', () => {
    interceptor.onModuleInit()
    expect(successHandler).toBeDefined()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        params: {
          q: 'abc',
          page: 2
        },
        data: { sent: 'ok' }
      },
      data: { ok: true },
      status: 200,
      request: {
        method: 'GET',
        headers: {}
      }
    }

    ;(successHandler as any)(response)

    expect(clientMock.emit).toHaveBeenCalledTimes(1)
    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
      url: 'https://api.example.com/resource?q=abc&page=2'
    }))
  })

  it('does not append ? when params object is empty', () => {
    interceptor.onModuleInit()
    expect(successHandler).toBeDefined()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        params: {},
        data: null
      },
      data: { ok: true },
      status: 200,
      request: {
        method: 'GET',
        headers: {}
      }
    };

    (successHandler as any)(response)

    expect(clientMock.emit).toHaveBeenCalledTimes(1)
    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
      url: 'https://api.example.com/resource'
    }))
  })

  it('does not emit when filter returns false', () => {
    interceptor.onModuleInit()
    expect(successHandler).toBeDefined()

    // Force filter to return false to bypass handleResponse
    jest.spyOn(interceptor, 'filter').mockReturnValue(false)

    const response = {
      config: {
        url: 'https://api.example.com/skip',
        data: { sent: 'nope' }
      },
      data: { ok: true },
      status: 204,
      request: {
        method: 'GET',
        headers: {}
      }
    }

    const returned = (successHandler as any)(response)
    expect(returned).toBe(response)
    expect(clientMock.emit).not.toHaveBeenCalled()
  })

  it('emits raw_data with the integrationId from the request context', () => {
    interceptor.onModuleInit()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        data: null
      },
      data: { ok: true },
      status: 200,
      request: {
        method: 'GET',
        headers: {}
      }
    }

    runWithRequestContext({ integrationId: 'integration-1' }, () => {
      (successHandler as any)(response)
    })

    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
      integrationId: 'integration-1'
    }))
  })

  it('prefers the explicit per-request integrationId over the request context', () => {
    interceptor.onModuleInit()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        data: null,
        metadata: { integrationId: 'explicit-integration' }
      },
      data: { ok: true },
      status: 200,
      request: {
        method: 'GET',
        headers: {}
      }
    }

    runWithRequestContext({ integrationId: 'context-integration' }, () => {
      (successHandler as any)(response)
    })

    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
      integrationId: 'explicit-integration'
    }))
  })

  it('emits raw_data without integrationId when no context is available', () => {
    interceptor.onModuleInit()

    const response = {
      config: {
        url: 'https://api.example.com/resource',
        data: null
      },
      data: { ok: true },
      status: 200,
      request: {
        method: 'GET',
        headers: {}
      }
    };

    (successHandler as any)(response)

    const emitted = clientMock.emit.mock.calls[0][1]
    expect(emitted.integrationId).toBeUndefined()
  })

  it('emits raw_data on error responses and rethrows the error', async () => {
    interceptor.onModuleInit()
    expect(errorHandler).toBeDefined()

    const error = {
      config: {
        url: 'https://api.example.com/fail',
        data: { attempt: 1 }
      },
      response: {
        data: { message: 'Boom' },
        status: 500,
        // Axios response objects also carry config; interceptor's extract reads response.config.data
        config: { data: { attempt: 1 } },
        request: {
          method: 'POST',
          headers: { 'content-type': 'application/json' }
        }
      }
    }

    await expect((errorHandler as any)(error)).rejects.toBe(error)

    expect(clientMock.emit).toHaveBeenCalledTimes(1)
    expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
      provider: 'test-provider',
      accessionIds: [],
      status: 500,
      method: 'POST',
      url: 'https://api.example.com/fail',
      body: { message: 'Boom' },
      headers: { 'content-type': 'application/json' },
      payload: { attempt: 1 }
    })
  })
})
