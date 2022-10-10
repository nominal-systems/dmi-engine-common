import { AxiosResponse } from 'axios'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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
