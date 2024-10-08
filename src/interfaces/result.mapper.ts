import { Result, TestResult, TestResultItem } from './provider-service'
import { TestResultItemStatus } from './results.interface'
import { ResultStatus } from '../constants'

export interface ResultMapper {
  mapResult: (value: any) => Result
  mapResultStatus: (value: string) => ResultStatus
  mapResults: (array: any[]) => Result[]
  mapTestResult: (value: unknown, index?: number) => TestResult
  mapTestResults: (array: any[]) => TestResult[]
  mapTestResultItemStatus: (status: string) => TestResultItemStatus
  mapTestResultItem: (value: unknown, index?: number) => TestResultItem
  mapTestResultItems: (array: unknown[]) => TestResultItem[]
}
