// src/common/axios.interceptor.ts

import { Injectable, OnModuleInit, Logger, HttpService, Module, HttpModule } from '@nestjs/common'
import { ProviderRawData } from './../interfaces/provider-raw-data.interface'

@Module({ imports: [HttpModule] })

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  constructor (
    private readonly httpService: HttpService
  ) { }

  public onModuleInit (): any {
    const logger = new Logger('Axios')

    const axios = this.httpService.axiosRef
    axios.interceptors.request.use((request) => {
      if (this.filterRequest(request)) {
        this.extractRequest(request)
      }

      return request
    })
    axios.interceptors.response.use(
      (response) => {
        if (this.filterResponse(response)) {
          this.extractResponse(response)
        }

        return response
      },
      async (err) => {
        logger.error(err)
        return await Promise.reject(err)
      })
  }

  protected filterRequest (request): boolean {
    return true
  }

  protected filterResponse (response): boolean {
    return true
  }

  protected extractRequest (request): ProviderRawData {
    // Implement your request extraction logic here
    return { provider: '', data: undefined }
  }

  protected extractResponse (response): ProviderRawData {
    return { provider: '', data: undefined }
  }
}
