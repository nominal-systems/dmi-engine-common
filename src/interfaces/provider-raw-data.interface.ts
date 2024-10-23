export interface ProviderRawData {
  provider: string
  accessionIds?: string[]
  status: number
  method: string
  url: string
  headers: any
  body: any
  payload?: any
}
