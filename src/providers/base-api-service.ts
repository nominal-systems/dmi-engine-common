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

function retryRequest<T> (config?: RetryConfig): MonoTypeOperatorFunction<T> {
  const { count = 1, delay = 100 } = config ?? {}
  return retry({
    count,
    delay: (error) => {
      if (!isRetryableError(error)) {
        throw error
      }

      return timer(delay)
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
