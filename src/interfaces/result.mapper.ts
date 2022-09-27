import { TestResult, TestResultItem } from './provider-service'
import { TestResultItemStatus } from './results.interface'

export interface ResultMapper {
  // mapTestResult: (value: unknown) => TestResult
  // mapTestResults: (array: any[], fn: (value: any) => TestResult) => TestResult[]
  mapTestResultItemStatus: (status: string) => TestResultItemStatus
  mapTestResultItem: (value: unknown) => TestResultItem
  mapTestResultItems: (array: unknown[], fn: (value: unknown) => TestResultItem) => TestResultItem[]
}
