import { AxiosRequestConfig, AxiosResponse, isCancel } from 'axios'
import { firstValueFrom, MonoTypeOperatorFunction, Observable, retry, timer, identity } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { HttpException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import * as process from 'node:process'

function isRetryableError (error: any): boolean {
  return !isCancel(error) && (
    error.response === undefined ||
      error.response === null ||
      error.response.status === 429 ||
      (error.response.status >= 500 && error.response.status <= 599)
  )
}

// Upper bound on a Retry-After-derived delay, so a huge or malicious value
// from an upstream we don't control can't stall a request indefinitely.
const MAX_RETRY_AFTER_DELAY_MS = 60_000

function getRetryAfterDelayMs (error: any): number | undefined {
  const retryAfter = error.response?.headers?.['retry-after']
  if (typeof retryAfter !== 'string' || retryAfter.trim() === '') {
    return undefined
  }

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(0, seconds * 1000), MAX_RETRY_AFTER_DELAY_MS)
  }

  const dateMs = Date.parse(retryAfter)
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(0, dateMs - Date.now()), MAX_RETRY_AFTER_DELAY_MS)
  }

  return undefined
}

function retryRequest<T> (config?: RetryConfig): MonoTypeOperatorFunction<T> {
  const { count = 1, delay = 100 } = config ?? {}
  return retry({
    count,
    delay: (error) => {
      if (!isRetryableError(error)) {
        throw error
      }

      return timer(getRetryAfterDelayMs(error) ?? delay)
    }
  })
}

export interface RetryConfig {
  count?: number
  delay?: number
}

export type RequestConfig = AxiosRequestConfig & {
  retry?: boolean | RetryConfig
}

export class BaseApiService {
  constructor (private readonly http: HttpService) {
  }

  /**
   * Retries by default (1 retry, 100ms delay) on 5xx, 429, and network errors,
   * honoring a `Retry-After` response header over the configured delay when
   * present. Pass `retry: false` to disable, or `retry: { count, delay }` to
   * override the defaults.
   */
  async get<T> (
    url: string,
    config: RequestConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ): Promise<T> {
    if (process.env.HTTP_DEBUG === 'true') {
      console.log('=================================================================================================')
      console.log(`GET ${url}`)
      console.log('-------------------------------------------------------------------------------------------------')
      console.log(`headers= ${JSON.stringify(config.headers, null, 2)}`)
      console.log('=================================================================================================\n')
    }
    const observable: Observable<T> = this.http.get<T>(url, config).pipe(
      config.retry === false ? identity : retryRequest(typeof config.retry === 'object' ? config.retry : undefined),
      map((response: AxiosResponse) => {
        return response.data
      }),
      catchError((error) => {
        const status = error.response?.status ?? 500
        throw new HttpException(`Failed to GET ${url}`, status, error.response?.data)
      })
    )

    return await firstValueFrom(observable)
  }

  /**
   * Does not retry by default, since POST bodies are not generally safe to
   * resend automatically. Pass `retry: true` (or `retry: { count, delay }`)
   * to opt in — retries then behave the same as `get`: 5xx, 429, and network
   * errors are retried, honoring a `Retry-After` response header when present.
   */
  async post<T> (
    url: string,
    data: any,
    config: RequestConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ): Promise<T> {
    if (process.env.HTTP_DEBUG === 'true') {
      console.log('=================================================================================================')
      console.log(`POST ${url}`)
      console.log('-------------------------------------------------------------------------------------------------')
      console.log(`body= ${JSON.stringify(data, null, 2)}`)
      console.log(`headers= ${JSON.stringify(config.headers, null, 2)}`)
      console.log('=================================================================================================\n')
    }
    const observable: Observable<T> = this.http.post<T>(url, data, config).pipe(
      config.retry === false || config.retry === undefined
        ? identity
        : retryRequest(typeof config.retry === 'object' ? config.retry : undefined),
      map((response: AxiosResponse) => {
        return response.data
      }),
      catchError((error) => {
        const status = error.response?.status ?? 500
        throw new HttpException(`Failed to POST ${url}`, status, error.response?.data)
      })
    )

    return await firstValueFrom(observable)
  }
}
