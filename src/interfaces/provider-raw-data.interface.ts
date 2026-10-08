export interface ProviderRawData {
  provider: string
  accessionIds?: string[]
  integrationId?: string
  // The HTTP status, or 0 when the request got no response (see `code`)
  status: number
  method: string
  url: string
  // Absent when the request got no response
  headers?: any
  // Absent when the request got no response
  body?: any
  payload?: any
  // The error code (`ECONNABORTED`, `ECONNRESET`, ...) when the request got no response
  code?: string
  // Milliseconds from the request being sent to its response or failure
  duration?: number
}
