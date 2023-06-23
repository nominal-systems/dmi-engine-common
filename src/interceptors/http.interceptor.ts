import { HttpModule, HttpService, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common'
import { AxiosResponse } from 'axios'
import { ProviderRawData } from '../interfaces'

@Module({ imports: [HttpModule] })

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  protected provider: string

  constructor (
    private readonly httpService: HttpService
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

  private handleResponse (url: string, body: any, response: AxiosResponse): any {
    const { provider } = this.extract(url, body, response)

    console.log('Provider:', provider, 'Url:', url, 'Body:', body)
  }
}
