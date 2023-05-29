import { Order, ReferenceRange } from './provider-service'
import { TestResultItemInterpretationCode, TestResultItemStatus } from './results.interface'

export interface ProviderResult {
  id: string
  orderId: string
  order?: Order
  status: string
  testResults: ProviderTestResult[]
}

export interface ProviderTestResult {
  seq?: number
  code: string
  name: string
  deviceId?: string
  notes?: string
  items: ProviderTestResultItem[]
}

export interface ProviderTestResultItem {
  seq?: number
  code: string
  name: string
  status: TestResultItemStatus
  valueString?: string
  valueQuantity?: {
    value: number
    units: string
  }
  interpretation?: {
    code: TestResultItemInterpretationCode
    text: string
  }
  referenceRange?: ReferenceRange[]
  notes?: string
}
