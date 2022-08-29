import {
  ProviderResult,
  ProviderTestResult,
  ProviderTestResultItem,
  ProviderTransformer,
  TestResultStatus
} from '../interfaces'

export abstract class BaseProviderTransformer implements ProviderTransformer {
  transformResult (): ProviderResult {
    return {
      id: this.getResultId(),
      orderId: this.getOrderId(),
      status: this.getTestResultStatus(),
      testResults: this.getTestResults().map(this.transformTestResult, this)
    }
  }

  abstract getResultId (): string

  abstract getOrderId (): string

  abstract getTestResults (): any[]

  abstract getTestResultStatus (): TestResultStatus

  abstract transformTestResult (testResult: any): ProviderTestResult

  abstract transformTestResultItem (item: any): ProviderTestResultItem
}
