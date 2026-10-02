import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AxiosResponse } from 'axios'
import { ProviderRawData } from '../interfaces'
import { ClientProxy } from '@nestjs/microservices'
import { HttpService } from '@nestjs/axios'
import { getRequestContext } from '../context'
import { redactHeaders, redactUrl } from '../utils'

/**
 * Records each provider HTTP response as a `raw_data` event and, when `debug()`
 * allows it, a debug log line.
 * Credential query parameters and headers are masked as `***` before either
 * (as are headers and body keys in `BaseApiService`'s `HTTP_DEBUG` dump), by
 * the name lists in `src/utils/redact.ts` plus any `extraSensitiveNames()`.
 */
@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  protected provider: string
  private readonly logger = new Logger(AxiosInterceptor.name)

  constructor (
    private readonly httpService: HttpService,
    @Inject('API_SERVICE') readonly client: ClientProxy
  ) {
    this.logger = new Logger(this.constructor.name)
  }

  public onModuleInit (): any {
    const axios = this.httpService.axiosRef
    axios.interceptors.response.use(
      (response) => {
        const url: string = decodeURIComponent(this.withParams(response.config))
        const body = response.data
        if (this.debug(url, body, response)) {
          const method: string = response.request.method
          this.logger.debug(`${method} ${url} -> ${response.status}`)
        }
        if (this.filter(url, body, response)) {
          this.handleResponse(url, body, response)
        }
        return response
      },
      async (err) => {
        const url: string = this.withParams(err?.config ?? err?.response?.config)
        const body = err.response.data

        this.handleResponse(url, body, err.response)
        return await Promise.reject(err)
      })
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
      accessionIds: this.extractAccessionIds(url, body, response),
      integrationId: (response.config as any)?.metadata?.integrationId ?? getRequestContext()?.integrationId,
      url,
      body,
      headers: response.request.headers,
      payload: response.config.data
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

  // Redacts the URL again (idempotent): a subclass that registers its own axios
  // interceptors and builds the URL without withParams() may pass one that has
  // not been redacted yet.
  protected handleResponse (
    rawUrl: string,
    body: any,
    response: AxiosResponse
  ): any {
    const url = this.redactUrl(rawUrl)
    const {
      provider,
      accessionIds,
      integrationId,
      status,
      payload,
      headers
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
      headers: redactHeaders(headers, this.extraSensitiveNames()),
      payload
    })
  }

  // Masks credential query parameters (SENSITIVE_PARAM_NAMES and
  // extraSensitiveNames()) before a URL is logged, emitted or handed to
  // filter/debug/extract.
  protected redactUrl (url: string): string {
    return redactUrl(url, this.extraSensitiveNames())
  }

  // Provider-specific parameter, header and body key names to mask on top of
  // the defaults in src/utils/redact.ts; each matches exactly, ignoring case.
  protected extraSensitiveNames (): readonly string[] {
    return []
  }

  // The URL of a request, with its serialized query params, as logged and
  // emitted: credential parameters are already masked, before any decoding,
  // so a decoded '&' or '#' cannot cut a secret value short. Nothing sends a
  // request from this string (axios uses its own config), so masking it here
  // changes no traffic.
  protected withParams (config?: { url?: string, params?: any } | null): string {
    return this.redactUrl(serializeUrl(config))
  }
}

// Build a URL that includes serialized query params from axios config
function serializeUrl (config?: { url?: string, params?: any } | null): string {
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
