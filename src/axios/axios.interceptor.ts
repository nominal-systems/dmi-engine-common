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

  }

  public onModuleInit (): any {
    const axios = this.httpService.axiosRef
    axios.interceptors.response.use(
      (response) => {
        const url: string = response.config.url as string
        const body = response.data
        if (this.debug(url, body, response)) {
          const method: string = response.request.method
          this.logger.debug(`Provider: ${this.provider} Status: ${response.status} Method: ${method} URL: ${url} 
          BODY:${JSON.stringify(body)}`)
        } else {
          if (this.filter(url, body, response)) {
            this.handleResponse(url, body, response)
          }
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

  protected filter (url: string, body: any, response: AxiosResponse): boolean {
    return true
  }

  protected extract (url: string, body: any, response: AxiosResponse): ProviderRawData {
    return {
      provider: this.provider,
      status: response.status,
      method: response.request.method,
      url,
      body
    }
  }

  protected debug (url: string, body: any, response: AxiosResponse): boolean {
    return false
  }

  protected handleResponse (url: string, body: any, response: AxiosResponse): any {
    const { provider, status } = this.extract(url, body, response)
    const method: string = response.request.method
    this.logger.debug(`${method} ${url}`)

    this.client.emit('raw_data', {
      provider,
      status,
      method,
      url,
      body
    })
  }
}
