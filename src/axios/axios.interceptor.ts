import { HttpService, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AxiosResponse } from 'axios'
import { ProviderRawData } from '../interfaces'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  protected provider: string
  private readonly logger = new Logger(AxiosInterceptor.name)

  constructor (
    private readonly httpService: HttpService,
    @Inject('API_SERVICE') readonly client: ClientProxy
  ) {
    this.logger.setContext(this.constructor.name)
  }

  public onModuleInit (): any {
    const axios = this.httpService.axiosRef
    axios.interceptors.response.use(
      (response) => {
        const url: string = response.config.url as string
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
        this.logger.error(err)
        const url: string = err.config.url as string
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

  protected handleResponse (
    url: string,
    body: any,
    response: AxiosResponse
  ): any {
    const {
      provider,
      accessionIds,
      status,
      payload,
      headers
    } = this.extract(url, body, response)
    const method: string = response.request.method
    this.logger.debug(`${method} ${url}`)

    this.client.emit('raw_data', {
      provider,
      accessionIds,
      status,
      method,
      url,
      body,
      headers,
      payload
    })
  }
}
