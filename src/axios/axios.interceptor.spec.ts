import axios, { AxiosError, AxiosResponse, CanceledError, InternalAxiosRequestConfig } from 'axios'
import { Logger } from '@nestjs/common'
import { AxiosInterceptor } from './axios.interceptor'
import { runWithRequestContext } from '../context'

describe('AxiosInterceptor', () => {
  let interceptor: AxiosInterceptor
  let httpServiceMock: any
  let clientMock: any

  // Hold the registered interceptor callbacks from axios
  let requestHandler: ((config: any) => any) | undefined
  let successHandler: ((response: any) => any) | undefined
  let errorHandler: ((error: any) => Promise<any>) | undefined

  beforeEach(() => {
    requestHandler = undefined
    successHandler = undefined
    errorHandler = undefined

    httpServiceMock = {
      axiosRef: {
        interceptors: {
          request: {
            use: jest.fn((onFulfilled: any) => {
              requestHandler = onFulfilled
            })
          },
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

  it('registers a request interceptor on module init', () => {
    interceptor.onModuleInit()

    expect(httpServiceMock.axiosRef.interceptors.request.use).toHaveBeenCalledTimes(1)
    expect(typeof requestHandler).toBe('function')
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

  describe('a failed call', () => {
    type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>

    // A real axios instance whose transport is the given adapter, with the interceptor attached as
    // in production: what the caller receives is what axios hands on after the interceptor ran.
    const attach = (adapter: Adapter, Interceptor: typeof AxiosInterceptor = AxiosInterceptor) => {
      const instance = axios.create({ adapter })
      const attached = new Interceptor({ axiosRef: instance } as any, clientMock)
      ;(attached as any).provider = 'test-provider'
      attached.onModuleInit()
      return instance
    }

    const responseTo = (config: InternalAxiosRequestConfig, status: number, data: any): AxiosResponse => ({
      data,
      status,
      statusText: '',
      headers: { 'content-type': 'application/json' },
      config,
      request: { method: String(config.method).toUpperCase(), headers: { 'x-req': '1' } }
    })

    // What a status-poll extractor written for the success shape does with any other body.
    class SuccessShapeInterceptor extends AxiosInterceptor {
      public extractAccessionIds (url: string, body: any, response: AxiosResponse): string[] {
        return body.LabOrders.map((order: any) => order.ClinicAccessionID)
      }
    }

    let errorLog: jest.SpyInstance
    let warnLog: jest.SpyInstance

    beforeEach(() => {
      errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
      warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    describe('with no response (timeout, reset, DNS)', () => {
      it.each(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'])('passes the original %s error to the caller unchanged', async (code) => {
        let original: AxiosError | undefined
        const instance = attach(async (config) => {
          original = new AxiosError(`${code} from the transport`, code, config)
          throw original
        })

        const rejection = await instance.get('https://api.example.com/slow').catch((error) => error)

        expect(rejection).toBe(original)
        expect(rejection.code).toBe(code)
        expect(rejection).not.toBeInstanceOf(TypeError)
      })

      it('emits a record that names the url, the method and the error code, with status 0', async () => {
        const instance = attach(async (config) => {
          throw new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)
        })

        await expect(instance.get('https://api.example.com/slow', { params: { id: 7 } })).rejects.toThrow('timeout of 60000ms exceeded')

        expect(clientMock.emit).toHaveBeenCalledTimes(1)
        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
          provider: 'test-provider',
          accessionIds: [],
          status: 0,
          method: 'GET',
          url: 'https://api.example.com/slow?id=7',
          code: 'ECONNABORTED',
          duration: expect.any(Number)
        })
      })

      it('logs the failure at error level with the url and the error code', async () => {
        const instance = attach(async (config) => {
          throw new AxiosError('socket hang up', 'ECONNRESET', config)
        })

        await expect(instance.post('https://api.example.com/orders', { a: 1 })).rejects.toThrow('socket hang up')

        expect(errorLog).toHaveBeenCalledTimes(1)
        expect(errorLog.mock.calls[0][0]).toMatch(/^POST https:\/\/api\.example\.com\/orders -> ECONNRESET \(\d+ms\): socket hang up$/)
      })

      it('carries no request headers and no request body in the record', async () => {
        const instance = attach(async (config) => {
          throw new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)
        })

        await expect(instance.post(
          'https://api.example.com/login',
          { UserName: 'clinic-user', Password: 'not-for-the-audit-trail' },
          { headers: { accessToken: 'not-for-the-audit-trail-either' } }
        )).rejects.toThrow()

        const record = clientMock.emit.mock.calls[0][1]
        expect(record).not.toHaveProperty('headers')
        expect(record).not.toHaveProperty('payload')
        expect(record).not.toHaveProperty('body')
        expect(JSON.stringify(record)).not.toContain('not-for-the-audit-trail')
      })

      it('keeps the integrationId the caller set on the request config', async () => {
        const instance = attach(async (config) => {
          throw new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)
        })

        await expect(instance.get('https://api.example.com/slow', { metadata: { integrationId: 'integration-7' } } as any)).rejects.toThrow()

        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ integrationId: 'integration-7', status: 0 }))
      })

      it('takes the integrationId from the request context when the config has none', async () => {
        const instance = attach(async (config) => {
          throw new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)
        })

        await runWithRequestContext({ integrationId: 'integration-ctx' }, async () => {
          await expect(instance.get('https://api.example.com/slow')).rejects.toThrow()
        })

        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ integrationId: 'integration-ctx', status: 0 }))
      })

      it('never hands an undefined response to the response hooks', async () => {
        const hooks = { filter: 0, debug: 0, extractAccessionIds: 0, handleResponse: 0 }
        class CountingInterceptor extends AxiosInterceptor {
          public filter (url: string, body: any, response: AxiosResponse): boolean { hooks.filter++; return true }
          public debug (url: string, body: any, response: AxiosResponse): boolean { hooks.debug++; return true }
          public extractAccessionIds (url: string, body: any, response: AxiosResponse): string[] { hooks.extractAccessionIds++; return [] }
          protected handleResponse (url: string, body: any, response: AxiosResponse): any { hooks.handleResponse++; return super.handleResponse(url, body, response) }
        }
        const instance = attach(async (config) => {
          throw new AxiosError('getaddrinfo ENOTFOUND api.example.com', 'ENOTFOUND', config)
        }, CountingInterceptor)

        await expect(instance.get('https://api.example.com/x')).rejects.toThrow('ENOTFOUND')

        expect(hooks).toEqual({ filter: 0, debug: 0, extractAccessionIds: 0, handleResponse: 0 })
      })

      it('passes a cancellation through without an error log or a record', async () => {
        // In flight, as axios's own http adapter rejects on abort: `new CanceledError(null, config, req)`.
        let original: CanceledError<unknown> | undefined
        const instance = attach(async (config) => await new Promise((resolve, reject) => {
          (config.signal as AbortSignal).addEventListener('abort', () => {
            original = new (CanceledError as any)(null, config)
            reject(original)
          })
        }))
        const controller = new AbortController()

        const pending = instance.get('https://api.example.com/abandoned', { signal: controller.signal }).catch((error) => error)
        controller.abort()
        const rejection = await pending

        expect(rejection).toBe(original)
        expect(rejection).toBeInstanceOf(CanceledError)
        expect(errorLog).not.toHaveBeenCalled()
        expect(clientMock.emit).not.toHaveBeenCalled()
      })

      it('passes the original error on even when a withParams() override throws, and logs the bare url', async () => {
        class ThrowingUrlInterceptor extends AxiosInterceptor {
          protected withParams (): string { throw new Error('masking bug') }
        }
        let original: AxiosError | undefined
        const instance = attach(async (config) => {
          original = new AxiosError('socket hang up', 'ECONNRESET', config)
          throw original
        }, ThrowingUrlInterceptor)

        const rejection = await instance.get('https://api.example.com/slow', { params: { id: 7 } }).catch((error) => error)

        expect(rejection).toBe(original)
        expect(warnLog).toHaveBeenCalledTimes(1)
        expect(warnLog.mock.calls[0][0]).toBe('Could not record GET https://api.example.com/slow as raw_data: Error: masking bug')
      })

      it('passes an error that is not from a request through without a record', async () => {
        interceptor.onModuleInit()
        const original = new Error('thrown before any request was made')

        await expect((errorHandler as any)(original)).rejects.toBe(original)
        expect(clientMock.emit).not.toHaveBeenCalled()
      })
    })

    describe('with a response whose body never arrived', () => {
      // Headers, then the connection stalls until the timeout or drops: axios can attach the
      // response it had started, with no data.
      const stalled = (config: InternalAxiosRequestConfig): AxiosError =>
        new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config, {}, responseTo(config, 200, undefined))

      it('passes the original error to the caller unchanged, even past a success-shape extractor', async () => {
        let original: AxiosError | undefined
        const instance = attach(async (config) => {
          original = stalled(config)
          throw original
        }, SuccessShapeInterceptor)

        const rejection = await instance.get('https://api.example.com/LabResults/v6/GetStatus').catch((error) => error)

        expect(rejection).toBe(original)
        expect(rejection.code).toBe('ECONNABORTED')
      })

      it('records it as a call that got no response: status 0 and the error code, through no response hook', async () => {
        // Older axios versions reject this same failure with no response at all; the record must not
        // depend on which one an engine runs, nor read as a call that answered 200.
        const hooks = { debug: 0, extractAccessionIds: 0, handleResponse: 0 }
        class CountingInterceptor extends AxiosInterceptor {
          public debug (url: string, body: any, response: AxiosResponse): boolean { hooks.debug++; return true }
          public extractAccessionIds (url: string, body: any, response: AxiosResponse): string[] { hooks.extractAccessionIds++; return [] }
          protected handleResponse (url: string, body: any, response: AxiosResponse): any { hooks.handleResponse++; return super.handleResponse(url, body, response) }
        }
        const instance = attach(async (config) => { throw stalled(config) }, CountingInterceptor)

        await expect(instance.get('https://api.example.com/LabResults/v6/GetStatus')).rejects.toThrow()

        expect(clientMock.emit).toHaveBeenCalledTimes(1)
        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
          provider: 'test-provider',
          accessionIds: [],
          status: 0,
          method: 'GET',
          url: 'https://api.example.com/LabResults/v6/GetStatus',
          code: 'ECONNABORTED',
          duration: expect.any(Number)
        })
        expect(hooks).toEqual({ debug: 0, extractAccessionIds: 0, handleResponse: 0 })
      })

      it('logs it at error level with the status and the error code', async () => {
        const instance = attach(async (config) => { throw stalled(config) })

        await expect(instance.get('https://api.example.com/slow-body')).rejects.toThrow()

        expect(errorLog).toHaveBeenCalledTimes(1)
        expect(errorLog.mock.calls[0][0]).toMatch(/^GET https:\/\/api\.example\.com\/slow-body -> 200 ECONNABORTED \(\d+ms\): timeout of 60000ms exceeded$/)
      })
    })

    describe('with an error response', () => {
      const providerError = { type: 'about:blank', title: 'One or more validation errors occurred.', status: 400 }
      const rejectWith = (status: number, data: any): Adapter => async (config) => {
        throw new AxiosError(`Request failed with status code ${status}`, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, responseTo(config, status, data))
      }

      it('passes the provider error to the caller unchanged when the extractor cannot read its body', async () => {
        const instance = attach(rejectWith(400, providerError), SuccessShapeInterceptor)

        const rejection = await instance.get('https://api.example.com/LabResults/v6/GetStatus').catch((error) => error)

        expect(rejection).toBeInstanceOf(AxiosError)
        expect(rejection.response.status).toBe(400)
        expect(rejection.response.data).toEqual(providerError)
      })

      it('still records the provider error when the extractor cannot read its body', async () => {
        const instance = attach(rejectWith(400, providerError), SuccessShapeInterceptor)

        await expect(instance.get('https://api.example.com/LabResults/v6/GetStatus')).rejects.toThrow()

        expect(clientMock.emit).toHaveBeenCalledTimes(1)
        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
          status: 400,
          url: 'https://api.example.com/LabResults/v6/GetStatus',
          body: providerError,
          accessionIds: []
        }))
        expect(warnLog).toHaveBeenCalledTimes(1)
        expect(warnLog.mock.calls[0][0]).toMatch(/^Could not extract accession ids from GET https:\/\/api\.example\.com\/LabResults\/v6\/GetStatus -> 400: TypeError/)
      })

      it('passes the provider error to the caller unchanged when a handleResponse override throws, and logs that', async () => {
        class StubbingInterceptor extends AxiosInterceptor {
          protected handleResponse (url: string, body: any, response: AxiosResponse): any {
            return super.handleResponse(url, body.Attachment.length > 0 ? { bodyOmitted: true } : body, response)
          }
        }
        const instance = attach(rejectWith(502, '<html>Bad Gateway</html>'), StubbingInterceptor)

        const rejection = await instance.get('https://api.example.com/orders').catch((error) => error)

        expect(rejection).toBeInstanceOf(AxiosError)
        expect(rejection.response.status).toBe(502)
        expect(clientMock.emit).not.toHaveBeenCalled()
        expect(warnLog).toHaveBeenCalledTimes(1)
        expect(warnLog.mock.calls[0][0]).toMatch(/^Could not record GET https:\/\/api\.example\.com\/orders as raw_data: TypeError/)
      })

      it('passes the provider error to the caller unchanged even when a withParams() override throws', async () => {
        class ThrowingUrlInterceptor extends AxiosInterceptor {
          protected withParams (): string { throw new Error('masking bug') }
        }
        const instance = attach(rejectWith(400, providerError), ThrowingUrlInterceptor)

        const rejection = await instance.get('https://api.example.com/orders').catch((error) => error)

        expect(rejection).toBeInstanceOf(AxiosError)
        expect(rejection.response.status).toBe(400)
        expect(warnLog.mock.calls[0][0]).toBe('Could not record GET https://api.example.com/orders as raw_data: Error: masking bug')
      })

      it('does not consult filter(), so an error body a success filter would drop is still recorded', async () => {
        class JsonOnlyInterceptor extends AxiosInterceptor {
          public filter (url: string, body: any, response: AxiosResponse): boolean {
            return String(response.headers['content-type']).includes('application/json') && body.LabOrders.length > 0
          }
        }
        const instance = attach(rejectWith(502, '<html>Bad Gateway</html>'), JsonOnlyInterceptor)

        await expect(instance.get('https://api.example.com/orders')).rejects.toThrow()

        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 502, body: '<html>Bad Gateway</html>' }))
      })
    })
  })

  describe('a successful call whose hooks throw', () => {
    let warnLog: jest.SpyInstance

    beforeEach(() => {
      warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    const okResponse = () => ({
      config: { url: 'https://api.example.com/LabResults/v6/GetStatus', data: null },
      data: { unexpected: true },
      status: 200,
      request: { method: 'GET', headers: {} }
    })

    it('returns the response and still records it when the extractor throws', () => {
      jest.spyOn(interceptor, 'extractAccessionIds').mockImplementation(() => { throw new TypeError('cannot map') })
      interceptor.onModuleInit()
      const response = okResponse()

      expect((successHandler as any)(response)).toBe(response)
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 200, accessionIds: [] }))
      expect(warnLog).toHaveBeenCalledTimes(1)
    })

    it('returns the response when filter() throws, and logs that', () => {
      jest.spyOn(interceptor, 'filter').mockImplementation(() => { throw new TypeError('cannot filter') })
      interceptor.onModuleInit()
      const response = okResponse()

      expect((successHandler as any)(response)).toBe(response)
      expect(clientMock.emit).not.toHaveBeenCalled()
      expect(warnLog.mock.calls[0][0]).toBe('Could not record GET https://api.example.com/LabResults/v6/GetStatus as raw_data: TypeError: cannot filter')
    })

    it('returns the response when a withParams() override throws, and logs the bare url', () => {
      jest.spyOn(interceptor as any, 'withParams').mockImplementation(() => { throw new Error('masking bug') })
      interceptor.onModuleInit()
      const response = okResponse()

      expect((successHandler as any)(response)).toBe(response)
      expect(clientMock.emit).not.toHaveBeenCalled()
      expect(warnLog.mock.calls[0][0]).toBe('Could not record GET https://api.example.com/LabResults/v6/GetStatus as raw_data: Error: masking bug')
    })

    it('returns the response when a hook throws a value that cannot be printed', () => {
      jest.spyOn(interceptor, 'filter').mockImplementation(() => { throw Object.create(null) })
      interceptor.onModuleInit()
      const response = okResponse()

      expect((successHandler as any)(response)).toBe(response)
      expect(warnLog.mock.calls[0][0]).toBe('Could not record GET https://api.example.com/LabResults/v6/GetStatus as raw_data: [object Object]')
    })

    it('returns the response when even the warn line cannot be written', () => {
      jest.spyOn(interceptor, 'filter').mockImplementation(() => { throw new TypeError('cannot filter') })
      warnLog.mockImplementation(() => { throw new Error('log sink down') })
      interceptor.onModuleInit()
      const response = okResponse()

      expect((successHandler as any)(response)).toBe(response)
    })
  })

  describe('request duration', () => {
    type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>

    const START = 1_700_000_000_000

    const attach = (adapter: Adapter, Interceptor: typeof AxiosInterceptor = AxiosInterceptor) => {
      const instance = axios.create({ adapter })
      const attached = new Interceptor({ axiosRef: instance } as any, clientMock)
      ;(attached as any).provider = 'test-provider'
      attached.onModuleInit()
      return instance
    }

    const responseTo = (config: InternalAxiosRequestConfig, status: number, data: any): AxiosResponse => ({
      data,
      status,
      statusText: '',
      headers: {},
      config,
      request: { method: String(config.method).toUpperCase(), headers: {} }
    })

    // The provider takes `ms` to answer (the clock is faked).
    const after = (ms: number, outcome: (config: InternalAxiosRequestConfig) => AxiosResponse | Error): Adapter =>
      async (config) => {
        jest.setSystemTime(Date.now() + ms)
        const result = outcome(config)
        if (result instanceof Error) throw result
        return result
      }

    class LoggingInterceptor extends AxiosInterceptor {
      public debug (url: string, body: any, response: AxiosResponse): boolean {
        return true
      }
    }

    let debugLog: jest.SpyInstance
    let errorLog: jest.SpyInstance

    beforeEach(() => {
      jest.useFakeTimers({ now: START })
      debugLog = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined)
      errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.restoreAllMocks()
    })

    it('stamps metadata.startTime when the request is sent and keeps it through to the response', async () => {
      let sentStartTime: number | undefined
      const instance = attach(async (config) => {
        sentStartTime = (config as any).metadata?.startTime
        return responseTo(config, 200, { ok: true })
      })

      const response = await instance.get('https://api.example.com/x')

      expect(sentStartTime).toBe(START)
      expect((response.config as any).metadata.startTime).toBe(START)
    })

    it('keeps the caller\'s metadata.integrationId', async () => {
      let sentMetadata: any
      const instance = attach(async (config) => {
        sentMetadata = (config as any).metadata
        return responseTo(config, 200, { ok: true })
      })

      await instance.get('https://api.example.com/x', { metadata: { integrationId: 'integration-1' } } as any)

      expect(sentMetadata).toMatchObject({ integrationId: 'integration-1', startTime: START })
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ integrationId: 'integration-1' }))
    })

    it('still sends the request in the same tick', async () => {
      const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => responseTo(config, 200, {}))
      const instance = attach(adapter)

      const pending = instance.get('https://api.example.com/x')

      expect(adapter).toHaveBeenCalledTimes(1)
      await pending
    })

    it('appends the duration to the debug line and puts it in the record on success', async () => {
      const instance = attach(after(1423, (config) => responseTo(config, 200, { ok: true })), LoggingInterceptor)

      await instance.get('https://api.example.com/x', { params: { page: 2 } })

      expect(debugLog).toHaveBeenCalledWith('GET https://api.example.com/x?page=2 -> 200 (1423ms)')
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 200, duration: 1423 }))
    })

    it('appends the duration to the debug line and puts it in the record for an error response', async () => {
      const instance = attach(after(87, (config) =>
        new AxiosError('Request failed with status code 503', 'ERR_BAD_RESPONSE', config, {}, responseTo(config, 503, { message: 'unavailable' }))
      ), LoggingInterceptor)

      await expect(instance.post('https://api.example.com/orders', {})).rejects.toThrow('503')

      expect(debugLog).toHaveBeenCalledWith('POST https://api.example.com/orders -> 503 (87ms)')
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 503, duration: 87 }))
    })

    it('puts the duration in the error line and the record when there is no response', async () => {
      const instance = attach(after(60_000, (config) => new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)))

      await expect(instance.get('https://api.example.com/slow')).rejects.toThrow('timeout')

      expect(errorLog).toHaveBeenCalledWith('GET https://api.example.com/slow -> ECONNABORTED (60000ms): timeout of 60000ms exceeded')
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 0, code: 'ECONNABORTED', duration: 60_000 }))
    })

    it('puts the duration in the error line and the record when the body never arrived', async () => {
      const instance = attach(after(60_000, (config) =>
        new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config, {}, responseTo(config, 200, undefined))
      ))

      await expect(instance.get('https://api.example.com/slow-body')).rejects.toThrow('timeout')

      expect(errorLog).toHaveBeenCalledWith('GET https://api.example.com/slow-body -> 200 ECONNABORTED (60000ms): timeout of 60000ms exceeded')
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({ status: 0, code: 'ECONNABORTED', duration: 60_000 }))
    })

    it('times a request afresh when it is re-sent with an earlier request\'s config', async () => {
      let elapsed = 10
      const instance = attach(async (config) => {
        jest.setSystemTime(Date.now() + elapsed)
        return responseTo(config, 200, {})
      })

      const first = await instance.get('https://api.example.com/x')
      elapsed = 30
      await instance.request(first.config)

      expect(clientMock.emit.mock.calls.map(([, record]: any[]) => record.duration)).toEqual([10, 30])
    })

    it('times each request on its own', async () => {
      const instance = attach(after(10, (config) => responseTo(config, 200, {})))

      await instance.get('https://api.example.com/first')
      jest.setSystemTime(Date.now() + 5_000)
      await instance.get('https://api.example.com/second')

      expect(clientMock.emit.mock.calls.map(([, record]: any[]) => record.duration)).toEqual([10, 10])
    })

    // An engine may register its own axios interceptors in place of onModuleInit's (and so no
    // request interceptor) while still recording through handleResponse.
    describe('in a subclass that overrides onModuleInit', () => {
      class OwnHandlersInterceptor extends AxiosInterceptor {
        public onModuleInit (): void {
          const axiosRef = (this as any).httpService.axiosRef
          axiosRef.interceptors.response.use(
            (response: AxiosResponse) => {
              this.handleResponse(this.withParams(response.config), response.data, response)
              return response
            },
            async (error: any) => {
              if (error?.response != null) {
                this.handleResponse(this.withParams(error.config), error.response.data, error.response)
              }
              return await Promise.reject(error)
            })
        }
      }

      it('records a response with no duration, and nothing else changes', async () => {
        const instance = attach(after(250, (config) => responseTo(config, 200, { ok: true })), OwnHandlersInterceptor)

        const response = await instance.get('https://api.example.com/x')

        expect(response.status).toBe(200)
        expect((response.config as any).metadata).toBeUndefined()
        expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
          provider: 'test-provider',
          accessionIds: [],
          status: 200,
          method: 'GET',
          url: 'https://api.example.com/x',
          body: { ok: true },
          headers: {},
          payload: undefined
        })
        expect(clientMock.emit.mock.calls[0][1].duration).toBeUndefined()
      })

      it('records an error response with no duration', async () => {
        const instance = attach(after(250, (config) =>
          new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', config, {}, responseTo(config, 500, { message: 'Boom' }))
        ), OwnHandlersInterceptor)

        await expect(instance.get('https://api.example.com/x', { metadata: { integrationId: 'integration-2' } } as any)).rejects.toThrow('500')

        const record = clientMock.emit.mock.calls[0][1]
        expect(record).toMatchObject({ status: 500, integrationId: 'integration-2' })
        expect(record.duration).toBeUndefined()
      })
    })
  })
})
