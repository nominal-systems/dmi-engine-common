import { Result } from './provider-service'

export interface BatchResultsResponse {
  batchId: string
  results: Result[]
}
