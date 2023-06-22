// src/common/axios.interceptor.ts

import { Injectable, OnModuleInit, Logger, HttpService, Module, HttpModule, Inject } from '@nestjs/common'
import { ProviderRawData } from './../interfaces/provider-raw-data.interface'
export type provider = string
@Module({ imports: [HttpModule], providers: [{ provide: 'Provider', useValue: '' }], exports: [{ provide: 'Provider', useValue: '' }] })

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  constructor (
    private readonly httpService: HttpService,
    @Inject('Provider') private readonly provider: provider
  ) {

  }

  public onModuleInit (): any {
    const logger = new Logger('Axios')

    const axios = this.httpService.axiosRef
    axios.interceptors.response.use(
      (response) => {
        const url = response.config.url
        const body = response.data
        if (this.filter(url, body, response)) {
          this.handleResponse(response)
        }

        return response
      },
      async (err) => {
        logger.error(err)
        return await Promise.reject(err)
      })
  }

  protected filter (url, body, response): boolean {
    return true
  }

  protected extractor (response): ProviderRawData {
    const url = response.config.url
    const body = response.data
    return { provider: this.provider, url, body }
  }

  // CAMBIAR ANY ANTES DE COMMITEAR
  private handleResponse (response): any {
    const { provider, url, body } = this.extractor(response)

    console.log('Provider', provider, 'Url', url, 'Body', body)
  }
}
