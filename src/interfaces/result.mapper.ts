import { Result, TestResult, TestResultItem } from './provider-service'
import { TestResultItemStatus } from './results.interface'

export interface ResultMapper {
  mapResult: (value: any) => Result
  mapResults: (array: any[]) => Result[]
  mapTestResult: (value: unknown) => TestResult
  mapTestResults: (array: any[]) => TestResult[]
  mapTestResultItemStatus: (status: string) => TestResultItemStatus
  mapTestResultItem: (value: unknown) => TestResultItem
  mapTestResultItems: (array: unknown[]) => TestResultItem[]
}
