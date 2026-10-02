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

  describe('credential redaction', () => {
    const TOKEN = 'dummy-token-123'

    function successResponse (config: any, headers: any = {}): any {
      return {
        config: { data: null, ...config },
        data: { ok: true },
        status: 200,
        request: { method: 'GET', headers }
      }
    }

    function spyOnLogger (): jest.SpyInstance {
      return jest.spyOn((interceptor as any).logger, 'debug').mockImplementation(() => undefined)
    }

    it('masks a credential query parameter in the debug lines and the emitted url', () => {
      interceptor.onModuleInit()
      jest.spyOn(interceptor, 'debug').mockReturnValue(true)
      const debugLog = spyOnLogger()

      ;(successHandler as any)(successResponse({
        url: 'https://api.example.com/Tests/v6',
        params: { accesstoken: TOKEN, userId: '7' }
      }))

      expect(debugLog.mock.calls).toEqual([
        ['GET https://api.example.com/Tests/v6?accesstoken=***&userId=7 -> 200'],
        ['GET https://api.example.com/Tests/v6?accesstoken=***&userId=7']
      ])
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: 'https://api.example.com/Tests/v6?accesstoken=***&userId=7'
      }))
      expect(JSON.stringify(clientMock.emit.mock.calls)).not.toContain(TOKEN)
    })

    it('masks a credential that is already in the request url', () => {
      interceptor.onModuleInit()

      ;(successHandler as any)(successResponse({
        url: `https://api.example.com/LabOrders?AccessToken=${TOKEN}&ClinicAccessionID=A1`
      }))

      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: 'https://api.example.com/LabOrders?AccessToken=***&ClinicAccessionID=A1'
      }))
    })

    it('masks the whole credential even when its decoded value contains & or #', () => {
      interceptor.onModuleInit()

      ;(successHandler as any)(successResponse({
        url: 'https://api.example.com/Tests/v6',
        params: { accesstoken: 'dummy&tail=leaked#rest', x: '1' }
      }))

      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: 'https://api.example.com/Tests/v6?accesstoken=***&x=1'
      }))
    })

    it('hands filter and debug the redacted url', () => {
      interceptor.onModuleInit()
      const filter = jest.spyOn(interceptor, 'filter')
      const debug = jest.spyOn(interceptor, 'debug')
      const response = successResponse({ url: 'https://api.example.com/x', params: { token: TOKEN } })

      ;(successHandler as any)(response)

      expect(filter).toHaveBeenCalledWith('https://api.example.com/x?token=***', response.data, response)
      expect(debug).toHaveBeenCalledWith('https://api.example.com/x?token=***', response.data, response)
    })

    it('masks credential headers in the emitted event', () => {
      interceptor.onModuleInit()

      ;(successHandler as any)(successResponse({ url: 'https://api.example.com/x' }, {
        accessToken: TOKEN,
        Authorization: `Bearer ${TOKEN}`,
        'content-type': 'application/json'
      }))

      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        headers: {
          accessToken: '***',
          Authorization: '***',
          'content-type': 'application/json'
        }
      }))
    })

    it('emits a request without credentials exactly as before', () => {
      interceptor.onModuleInit()

      ;(successHandler as any)(successResponse({
        url: 'https://api.example.com/LabResults/v6/GetStatus?serviceType=labResult',
        params: { ClinicID: 'C 1', overrideAck: true },
        data: { sent: 1 }
      }, { 'content-type': 'application/json', 'x-request-id': 'r-1' }))

      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', {
        provider: 'test-provider',
        accessionIds: [],
        status: 200,
        method: 'GET',
        url: 'https://api.example.com/LabResults/v6/GetStatus?serviceType=labResult&ClinicID=C 1&overrideAck=true',
        body: { ok: true },
        headers: { 'content-type': 'application/json', 'x-request-id': 'r-1' },
        payload: { sent: 1 }
      })
    })

    it('masks credentials on the error path before handleResponse sees them', async () => {
      interceptor.onModuleInit()
      const handleResponse = jest.spyOn(interceptor as any, 'handleResponse')
      const error = {
        config: { url: 'https://api.example.com/Tests/v6', params: { accesstoken: TOKEN } },
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
          config: { data: undefined },
          request: { method: 'GET', headers: { accessToken: TOKEN } }
        }
      }

      await expect((errorHandler as any)(error)).rejects.toBe(error)

      expect(handleResponse).toHaveBeenCalledWith(
        'https://api.example.com/Tests/v6?accesstoken=***', error.response.data, error.response
      )
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: 'https://api.example.com/Tests/v6?accesstoken=***',
        headers: { accessToken: '***' }
      }))
    })

    it('masks credentials when a subclass calls handleResponse with an unredacted url', () => {
      const debugLog = spyOnLogger()

      ;(interceptor as any).handleResponse(
        `https://api.example.com/report.pdf?access_token=${TOKEN}`,
        { ok: true },
        successResponse({ url: 'https://api.example.com/report.pdf' })
      )

      expect(debugLog).toHaveBeenCalledWith('GET https://api.example.com/report.pdf?access_token=***')
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: 'https://api.example.com/report.pdf?access_token=***'
      }))
    })

    it('masks the names a subclass adds through extraSensitiveNames, in any case or encoding', () => {
      class ClinicInterceptor extends AxiosInterceptor {
        protected extraSensitiveNames (): readonly string[] {
          return ['sessionId', 'X-Clinic-Key']
        }
      }
      interceptor = new ClinicInterceptor(httpServiceMock, clientMock)
      interceptor.onModuleInit()
      const filter = jest.spyOn(interceptor, 'filter')
      const response = successResponse({
        url: 'https://api.example.com/x?session%49d=s-2',
        params: { SessionId: 'S3', page: 2 }
      }, { 'x-clinic-key': 'k-1', accept: 'application/json' })

      ;(successHandler as any)(response)

      const expectedUrl = 'https://api.example.com/x?sessionId=***&SessionId=***&page=2'
      expect(filter).toHaveBeenCalledWith(expectedUrl, response.data, response)
      expect(clientMock.emit).toHaveBeenCalledWith('raw_data', expect.objectContaining({
        url: expectedUrl,
        headers: { 'x-clinic-key': '***', accept: 'application/json' }
      }))
      const emitted = JSON.stringify(clientMock.emit.mock.calls)
      expect(emitted).not.toContain('S3')
      expect(emitted).not.toContain('s-2')
      expect(emitted).not.toContain('k-1')
    })

    it('masks the url for a subclass that registers its own interceptors and decodes withParams()', async () => {
      const LEAKY_TOKEN = 'dummy&tail=leaked#rest'
      // The shape of an integration that replaces onModuleInit(): it logs and
      // emits decodeURIComponent(this.withParams(...)) itself.
      class OwnHandlersInterceptor extends AxiosInterceptor {
        readonly lines: string[] = []

        constructor (private readonly http: any, client: any) {
          super(http, client)
        }

        public onModuleInit (): void {
          this.http.axiosRef.interceptors.response.use(
            (res: any) => {
              const url = decodeURIComponent(this.withParams(res.config))
              this.lines.push(`${String(res.request.method)} ${url} -> ${String(res.status)}`)
              this.handleResponse(url, res.data, res)
              return res
            },
            async (error: any) => {
              const url = this.withParams(error.config ?? error.response.config)
              this.lines.push(`failed ${url}`)
              this.handleResponse(url, error.response.data, error.response)
              return await Promise.reject(error)
            }
          )
        }
      }
      const own = new OwnHandlersInterceptor(httpServiceMock, clientMock)
      own.onModuleInit()
      spyOnLogger()

      ;(successHandler as any)(successResponse({
        url: 'https://api.example.com/Tests/v6',
        params: { accesstoken: LEAKY_TOKEN, x: '1' }
      }))
      const error = {
        config: { url: 'https://api.example.com/Tests/v6', params: { accesstoken: LEAKY_TOKEN } },
        response: { data: {}, status: 401, config: {}, request: { method: 'GET' } }
      }
      await expect((errorHandler as any)(error)).rejects.toBe(error)

      expect(own.lines).toEqual([
        'GET https://api.example.com/Tests/v6?accesstoken=***&x=1 -> 200',
        'failed https://api.example.com/Tests/v6?accesstoken=***'
      ])
      expect(clientMock.emit.mock.calls.map((call: any[]) => call[1].url)).toEqual([
        'https://api.example.com/Tests/v6?accesstoken=***&x=1',
        'https://api.example.com/Tests/v6?accesstoken=***'
      ])
      expect(JSON.stringify(clientMock.emit.mock.calls)).not.toContain('leaked')
    })

    it('emits headers as undefined when the request carries none, as Node requests do', () => {
      interceptor.onModuleInit()
      const response = successResponse({ url: 'https://api.example.com/x', params: { token: TOKEN } })
      delete response.request.headers

      ;(successHandler as any)(response)

      const emitted = clientMock.emit.mock.calls[0][1]
      expect(emitted.url).toBe('https://api.example.com/x?token=***')
      expect(emitted).toHaveProperty('headers', undefined)
    })
  })
})
