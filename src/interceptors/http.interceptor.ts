// src/common/axios.interceptor.ts

import { Injectable, OnModuleInit, Logger, HttpService, Module, HttpModule } from '@nestjs/common';

@Module({ imports: [HttpModule] })

@Injectable()
export class AxiosInterceptor implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
  ) { }

  public onModuleInit(): any {
    const logger = new Logger('Axios');

    const axios = this.httpService.axiosRef;
    axios.interceptors.request.use((request) => {
      //Request data can be handled here
      return request;
    });
    axios.interceptors.response.use(
      (response) => {
        if (this.filter(response)) {
          this.extractor(response);
        }

        return response;
      },
      (err) => {
        logger.error(err);
        return Promise.reject(err);
      });
  }


  protected filter(response): any {
    return true;
  }

  protected extractor(response): any {

    return;
  }
}
