import { Attachment, Order, Result } from './provider-service'
import { OrderStatus } from '../constants'

export interface OrderCreatedResponse {
  externalId: string
  status: OrderStatus
  manifest?: Attachment | null
  submissionUri?: string | null
  requisitionId?: string | null
}

export interface BatchResultsResponse {
  batchId?: string
  hasMoreResults?: boolean
  results: Result[]
  orders?: Array<Partial<Order>>
}

export interface IntegrationTestResponse {
  success: boolean
  message: string
}
