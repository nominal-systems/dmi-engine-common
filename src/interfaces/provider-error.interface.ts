export interface ProviderErrorInterface {
  provider: string
  message: string
  code: number
  error: any
}

export class ProviderError extends Error {
  response: ProviderErrorInterface
  constructor (response) {
    super(response.message)
    this.name = 'ProviderError'
    this.response = response
  }
}
