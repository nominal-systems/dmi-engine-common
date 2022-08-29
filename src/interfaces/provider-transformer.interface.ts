import { ProviderResult, ProviderTestResult, ProviderTestResultItem } from './provider-result.interface'
import { TestResultStatus } from './results.interface'

export interface ProviderTransformer {
  getTestResultStatus: () => TestResultStatus
  getResultId: () => string
  getOrderId: () => string
  getTestResults: () => any[]
  transformTestResultItem: (item: any) => ProviderTestResultItem
  transformTestResult: (testResult: any) => ProviderTestResult
  transformResult: (result: any) => ProviderResult
}
