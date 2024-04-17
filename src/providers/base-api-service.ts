import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { firstValueFrom, Observable } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { HttpException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import * as process from 'node:process'

export class BaseApiService {
  constructor (private readonly http: HttpService) {
  }

  async get<T> (
    url: string,
    config: AxiosRequestConfig = {
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
      map((response: AxiosResponse) => {
        return response.data
      }),
      catchError((error) => {
        const status = error.response?.status ?? 500
        throw new HttpException(`Failed to GET ${url}`, status)
      })
    )

    return await firstValueFrom(observable)
  }

  async post<T> (
    url: string,
    data: any,
    config: AxiosRequestConfig = {
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
      map((response: AxiosResponse) => {
        return response.data
      }),
      catchError((error) => {
        const status = error.response?.status ?? 500
        throw new HttpException(`Failed to POST ${url}`, status)
      })
    )

    return await firstValueFrom(observable)
  }
}
