import { ReferenceRange } from './provider-service'
import { TestResultItemStatus } from './results.interface'

export interface ProviderResult {
  id: string
  orderId: string
  status: string
  testResults: ProviderTestResult[]
}

export interface ProviderTestResult {
  code: string
  name: string
  deviceId?: string
  notes?: string
  items: ProviderTestResultItem[]
}

export interface ProviderTestResultItem {
  code: string
  name: string
  status: TestResultItemStatus
  valueString?: string
  valueQuantity?: {
    value: number
    units: string
  }
  interpretation?: string
  referenceRange?: ReferenceRange[]
  notes?: string
}
