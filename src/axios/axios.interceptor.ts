import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AxiosResponse, isCancel } from 'axios'
import { ProviderRawData } from '../interfaces'
import { ClientProxy } from '@nestjs/microservices'
import { HttpService } from '@nestjs/axios'
import { getRequestContext } from '../context'

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  protected provider: string
  private readonly logger = new Logger(AxiosInterceptor.name)
  // Each request's duration, keyed by its axios config (one per request), once it has been read.
  private readonly durations = new WeakMap<Record<string, unknown>, number>()

  constructor (
    private readonly httpService: HttpService,
    @Inject('API_SERVICE') readonly client: ClientProxy
  ) {
    this.logger = new Logger(this.constructor.name)
  }

  public onModuleInit (): any {
    const axios = this.httpService.axiosRef
    // Synchronous, so that a request is still dispatched in the same tick as it was without one.
    axios.interceptors.request.use((config) => this.stampStartTime(config), undefined, { synchronous: true })
    axios.interceptors.response.use(
      (response) => this.onResponseFulfilled(response),
      async (err) => await this.onResponseRejected(err))
  }

  public filter (
    url: string,
    body: any,
    response: AxiosResponse
  ): boolean {
    return true
  }

  public extract (
    url: string,
    body: any,
    response: AxiosResponse
  ): ProviderRawData {
    return {
      provider: this.provider,
      status: response.status,
      method: response.request.method,
      accessionIds: this.accessionIdsOf(url, body, response),
      integrationId: this.integrationIdOf(response.config),
      url,
      body,
      headers: response.request.headers,
      payload: response.config.data,
      duration: this.durationOf(response.config)
    }
  }

  public extractAccessionIds (
    url: string,
    body: any,
    response: AxiosResponse
  ): string[] {
    return []
  }

  public debug (
    url: string,
    body: any,
    response: AxiosResponse
  ): boolean {
    return false
  }

  protected handleResponse (
    url: string,
    body: any,
    response: AxiosResponse
  ): any {
    const {
      provider,
      accessionIds,
      integrationId,
      status,
      payload,
      headers,
      duration
    } = this.extract(url, body, response)
    const method: string = response.request.method
    this.logger.debug(`${method} ${url}`)

    this.client.emit('raw_data', {
      provider,
      accessionIds,
      integrationId,
      status,
      method,
      url,
      body,
      headers,
      payload,
      duration
    })
  }

  // The raw_data record for a call that got no HTTP response at all: a timeout, a reset or refused
  // connection, a DNS failure. `status` is 0 and `code` is the error's (`ECONNABORTED`,
  // `ECONNRESET`, ...). The hooks above all take a response, so none of them is called. The record
  // deliberately carries no request headers and no request body: the headers left on the request
  // config can hold a provider's access token, and the body of a login is its password.
  protected handleNoResponse (
    url: string,
    error: any
  ): void {
    const config = error?.config
    const record: ProviderRawData = {
      provider: this.provider,
      accessionIds: [],
      integrationId: this.integrationIdOf(config),
      status: 0,
      method: methodOf(config),
      url,
      code: error?.code,
      duration: this.durationOf(config)
    }
    this.client.emit('raw_data', record)
  }

  // Build a URL that includes serialized query params from axios config
  protected withParams (config?: { url?: string, params?: any } | null): string {
    const baseUrl = (config?.url ?? '')
    const params = config?.params
    if (params == null) return baseUrl

    // URLSearchParams handling
    if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
      const qs = params.toString()
      if (qs.length === 0) return baseUrl
      const joiner = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${joiner}${qs}`
    }

    if (typeof params !== 'object') return baseUrl

    const keys = Object.keys(params)
    if (keys.length === 0) return baseUrl

    const search = keys
      .map((key) => {
        const value = params[key]
        if (value === undefined || value === null) return null
        if (Array.isArray(value)) {
          const parts = value
            .filter(v => v !== undefined && v !== null)
            .map(v => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
            .join('&')
          return parts.length > 0 ? parts : null
        }
        // Skip empty-string values to avoid meaningless query pairs
        if (value === '') return null
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      })
      .filter(Boolean)
      .join('&')

    if (search.length === 0) return baseUrl

    const joiner = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${joiner}${search}`
  }

  // Logging and recording a call must never change its outcome: whatever the hooks throw is logged
  // here and the response is handed on untouched.
  private onResponseFulfilled (response: AxiosResponse): AxiosResponse {
    try {
      const url: string = decodeURIComponent(this.withParams(response.config))
      const body = response.data
      if (this.debug(url, body, response)) {
        const method: string = response.request.method
        this.logger.debug(`${method} ${url} -> ${response.status}${this.took(response.config)}`)
      }
      if (this.filter(url, body, response)) {
        this.handleResponse(url, body, response)
      }
    } catch (error) {
      this.warnNotRecorded(response?.config, error, response)
    }
    return response
  }

  // Likewise for a failed call: the caller always receives the original error.
  private async onResponseRejected (err: any): Promise<never> {
    try {
      this.recordFailure(err)
    } catch (error) {
      this.warnNotRecorded(err?.config ?? err?.response?.config, error, err?.response)
    }
    return await Promise.reject(err)
  }

  private recordFailure (err: any): void {
    const config = err?.config ?? err?.response?.config
    const url: string = this.withParams(config)
    const response: AxiosResponse | undefined = err?.response ?? undefined
    const method = methodOf(config, response)
    const code: string | undefined = err?.code

    if (isCancel(err)) {
      // The caller abandoned the call; that is not a provider failure, and there is nothing to record.
      this.logger.debug(`${method} ${url} -> ${code ?? 'canceled'}${this.took(config)}`)
      return
    }

    if (response == null) {
      this.logger.error(`${method} ${url} -> ${code ?? 'no response'}${this.took(config)}: ${String(err?.message)}`)
      if (config != null) {
        this.handleNoResponse(url, err)
      }
      return
    }

    const body = response.data
    if (body === undefined) {
      // The headers arrived and the body never did: the connection stalled or dropped mid-response.
      // Depending on its version, axios rejects that with no response at all (1.6, 1.13) or with the
      // response it had started and no data (1.17). It is the same failure either way, so it is
      // recorded the same way: status 0 and the error code, not as a call that answered.
      this.logger.error(`${method} ${url} -> ${response.status} ${code ?? 'no body'}${this.took(config)}: ${String(err?.message)}`)
      if (config != null) {
        this.handleNoResponse(url, err)
      }
      return
    }
    if (this.debug(url, body, response)) {
      this.logger.debug(`${method} ${url} -> ${response.status}${this.took(config)}`)
    }
    // `filter()` is not consulted for a failed call: engines' filters are written for success
    // bodies and content types, and a failure is what the audit trail exists to keep.
    this.handleResponse(url, body, response)
  }

  // Accession ids index the record; an extractor written for the success shape must not cost the
  // record when it meets an error body (or a missing one).
  private accessionIdsOf (url: string, body: any, response: AxiosResponse): string[] {
    try {
      return this.extractAccessionIds(url, body, response)
    } catch (error) {
      this.logger.warn(`Could not extract accession ids from ${methodOf(response.config, response)} ${url} -> ${response.status}: ${describe(error)}`)
      return []
    }
  }

  // Stamps when the request left on a copy of the caller's metadata, keeping its integrationId.
  private stampStartTime (config: any): any {
    config.metadata = { ...config.metadata, startTime: Date.now() }
    return config
  }

  // The call's duration in milliseconds, fixed the first time it is read once the call is over, so
  // the log line and the record agree. Undefined when the request was never stamped: an engine that
  // registers its own axios interceptors in place of onModuleInit's gets no duration, and nothing else
  // changes for it.
  private durationOf (config: any): number | undefined {
    const startTime = config?.metadata?.startTime
    if (typeof startTime !== 'number') return undefined
    let duration = this.durations.get(config)
    if (duration === undefined) {
      duration = Date.now() - startTime
      this.durations.set(config, duration)
    }
    return duration
  }

  private took (config: any): string {
    const duration = this.durationOf(config)
    return duration === undefined ? '' : ` (${duration}ms)`
  }

  private integrationIdOf (config: any): string | undefined {
    return config?.metadata?.integrationId ?? getRequestContext()?.integrationId
  }

  // Runs where recording has already failed, so nothing in it may throw: an overridden withParams()
  // that throws gets the bare config url instead, and an error that cannot be printed a fixed text.
  private warnNotRecorded (config: any, error: unknown, response?: AxiosResponse): void {
    try {
      let url: string
      try {
        url = this.withParams(config)
      } catch {
        url = String(config?.url ?? '')
      }
      this.logger.warn(`Could not record ${methodOf(config, response)} ${url} as raw_data: ${describe(error)}`)
    } catch {
      // Nothing is left to report with; the call's outcome must not depend on it.
    }
  }
}

// An error as text, for a log line that must not throw: `String()` throws on a value with no
// usable toString (an object made with `Object.create(null)`, say).
function describe (error: unknown): string {
  try {
    return String(error)
  } catch {
    return Object.prototype.toString.call(error)
  }
}

// The HTTP method as the success path logs it: the sent request's, else the config's, upper-cased.
function methodOf (config: any, response?: AxiosResponse): string {
  return String(response?.request?.method ?? config?.method ?? '').toUpperCase()
}
