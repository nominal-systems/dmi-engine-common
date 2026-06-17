export interface ProviderRawData {
  provider: string
  accessionIds?: string[]
  integrationId?: string
  status: number
  method: string
  url: string
  headers: any
  body: any
  payload?: any
}
