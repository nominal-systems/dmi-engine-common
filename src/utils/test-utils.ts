import { AxiosResponse } from 'axios'

export class TestUtils {
  static mockHttpResponse (
    status: number,
    statusText: string,
    data: any
  ): AxiosResponse {
    return {
      status: status,
      statusText: statusText,
      headers: {},
      config: {},
      data: data
    }
  }

  static mockHttpOkResponse (data: any): AxiosResponse {
    return this.mockHttpResponse(200, 'OK', data)
  }
}
