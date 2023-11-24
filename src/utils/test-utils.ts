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

  static async mockHttpErrorResponse (
    status: number,
    statusText: string,
    errors: any
  ): Promise<AxiosResponse<any>> {
    const errorResponse = {
      status: status,
      statusText: statusText,
      headers: {},
      config: {
        url: 'http://url.com',
        data: ''
      },
      response: errors
    }

    const error = errorResponse
    throw await Promise.reject(error)
  }
}
