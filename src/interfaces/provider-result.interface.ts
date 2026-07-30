import { Attachment, Order, ReferenceRange } from './provider-service'
import { TestResultItemInterpretationCode, TestResultItemStatus } from './results.interface'

export interface ProviderResult {
  id: string
  orderId: string
  order?: Order
  status: string
  testResults: ProviderTestResult[]
  pdfReport?: Attachment[]
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
  /**
   * Unit of the result value, at the observation level. Populated whenever the
   * provider reports a unit, regardless of whether the value is numeric
   * (`valueQuantity`) or textual (`valueString`). For numeric results this
   * duplicates `valueQuantity.units`; consumers should read `units` here.
   */
  units?: string
  interpretation?: {
    code: TestResultItemInterpretationCode
    text: string
  }
  referenceRange?: ReferenceRange[]
  notes?: string
}
