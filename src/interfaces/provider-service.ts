import {
  CreateOrderPayload,
  IdPayload,
  NewIntegrationPayload,
  NullPayloadPayload,
  OrderTestPayload,
  Test
} from './payloads.interface'
import { OrderStatus, ResultStatus } from '../constants'
import { BatchResultsResponse, OrderCreatedResponse } from './responses.interface'
import { ReferenceDataResponse } from './reference-data-response'
import { TestResultItemInterpretationCode } from './results.interface'

export enum ResultModality {
  InHouse = 'in-house',
  LabReference = 'lab-reference'
}

export interface Order {
  externalId: string
  status: OrderStatus
  patient: Patient
  client: Client
  tests: Test[]
  veterinarian: Veterinarian
  technician?: string
  devices?: string[]
  manifestUri?: string
  submissionUri?: string
  notes?: string
  editable?: boolean
}

export interface Identifier {
  system: string
  value: string
}

export interface Patient {
  identifier?: Identifier[]
  name: string
  sex: string
  species: string
  breed?: string
  birthdate?: string
  weight?: {
    measurement: number
    units: string
  }
}

export interface Client {
  // TODO(gb): provider client Id?
  firstName: string
  lastName: string
  // TODO(gb): add contact
  // TODO(gb): add address
  isDoctor?: boolean
  isStaff?: boolean
}

export interface Veterinarian {
  firstName?: string
  lastName?: string
  // TODO(gb): add contact
}

export enum ServiceType {
  IN_HOUSE = 'IN_HOUSE',
  PAID = 'PAID'
}

export interface Service {
  code: string
  name: string
  description?: string
  category?: string
  type?: ServiceType
  price?: number
  currency?: string
}

export interface Species {
  code: string
  name: string
}

export interface Sex {
  code: string
  name: string
}

export interface Breed {
  code: string
  name: string
  species: string
}

export interface Result {
  id: string
  orderId: string
  order?: Order
  accession?: string
  status: ResultStatus
  testResults: TestResult[]
}

export interface TestResult {
  seq?: number
  code: string
  name: string
  deviceId?: string
  notes?: string
  items: TestResultItem[]
}

export interface ResultItem {
  code: string
  name: string
  notes: string
  runDate: string
  sampleType: string
  items: AnalyteResult[]
}

export interface TestResultItem {
  seq?: number
  code: string
  name: string
  status: string
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

export interface ReferenceRange {
  type: string
  text?: string
  low?: number
  high?: number
}

export interface Device {
  name?: string
  status: DeviceStatus
  serialNumber: string
  tests?: Test[]
}

export enum DeviceStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export interface AnalyteResult {
  code: string
  analyte: string
  name: string
  status: string
  indicator: string
  result: {
    type: string
    valueText: string
    valueNumber: string
  }
  low: number
  high: number
  criticalLow: number
  criticalHigh: number
  units: string
  notes: string
}

export interface ProviderConfiguration {
  [key: string]: any
}

export interface IntegrationOptions {
  [key: string]: any
}

export type Payload =
  | CreateOrderPayload
  | NewIntegrationPayload
  | IdPayload
  | OrderTestPayload
  | NullPayloadPayload

export interface IMetadata {
  providerConfiguration: ProviderConfiguration
  integrationOptions: IntegrationOptions
}

export interface IPayload<T extends Payload> {
  payload: T
}

export interface ProviderService<T extends IMetadata> {
  createOrder: (payload: CreateOrderPayload, metadata: T) => Promise<OrderCreatedResponse>
  getBatchOrders: (payload: NullPayloadPayload, metadata: T) => Promise<Order[]>
  getBatchResults: (payload: NullPayloadPayload, metadata: T) => Promise<BatchResultsResponse>
  getOrder: (payload: IdPayload, metadata: T) => Promise<Order>
  getOrderResult: (payload: IdPayload, metadata: T) => Promise<Result>
  cancelOrder: (payload: IdPayload, metadata: T) => Promise<void>
  cancelOrderTest: (payload: OrderTestPayload, metadata: T) => Promise<void>
  getServices: (payload: NullPayloadPayload, metadata: T) => Promise<Service[]>
  getDevices: (payload: NullPayloadPayload, metadata: T) => Promise<Device[]>
  getSexes: (payload: NullPayloadPayload, metadata: T) => Promise<ReferenceDataResponse<Sex>>
  getSpecies: (payload: NullPayloadPayload, metadata: T) => Promise<ReferenceDataResponse<Species>>
  getBreeds: (payload: NullPayloadPayload, metadata: T) => Promise<ReferenceDataResponse<Breed>>
}

export interface PdfResults<T extends IMetadata> {
  getOrderResultPdf: (payload: IdPayload, metadata: T) => Promise<Result>
}

export interface OrderEdits<T extends IMetadata> {
  editOrder: (payload: IdPayload, metadata: T) => Promise<Result>
}

export interface Manifest<T extends IMetadata> {
  getOrderManifest: (payload: IdPayload, metadata: T) => Promise<Result>
}

export interface SubmissionUrl<T extends IMetadata> {
  getOrderSubmissionUrl: (payload: IdPayload, metadata: T) => Promise<Result>
}

export interface NewTests<T extends IMetadata> {
  addOrderTest: (payload: OrderTestPayload, metadata: T) => Promise<void>
}
