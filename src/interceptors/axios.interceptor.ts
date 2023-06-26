import { HttpService, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AxiosResponse } from 'axios'
import { ProviderRawData } from '../interfaces'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  protected provider: string

  constructor (
    private readonly httpService: HttpService,
    @Inject('API_SERVICE') readonly client: ClientProxy
  ) {

  }

  public onModuleInit (): any {
    const logger = new Logger('Axios')

    const axios = this.httpService.axiosRef
    axios.interceptors.response.use(
      (response) => {
        const url: string = response.config.url as string
        const body = response.data

        if (this.filter(url, body, response)) {
          this.handleResponse(url, body, response)
        }

        return response
      },
      async (err) => {
        logger.error(err)
        return await Promise.reject(err)
      })
  }

  protected filter (url: string, body: any, response: AxiosResponse): boolean {
    return true
  }

  protected extract (url: string, body: any, response: AxiosResponse): ProviderRawData {
    return {
      provider: this.provider,
      url,
      body
    }
  }

  protected handleResponse (url: string, body: any, response: AxiosResponse): any {
    const { provider } = this.extract(url, body, response)
    const method: string = response.request.method
    const logger = new Logger(`${provider} Service`)

    logger.debug(`${method} ${url}`)

    this.client.emit('raw_data', {
      provider,
      body,
      url
    })

    // TODO: save response to database
    // Send this to the API to be saved
  }
}
