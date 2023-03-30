import { Order, Result } from './provider-service'
import { OrderStatus } from '../constants'

export interface OrderCreatedResponse {
  externalId: string
  status: OrderStatus
  manifestUri?: string | null
  submissionUri?: string | null
}

export interface BatchResultsResponse {
  batchId?: string
  hasMoreResults?: boolean
  results: Result[]
  orders?: Array<Partial<Order>>
}
