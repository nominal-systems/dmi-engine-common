import { Identifier } from './provider-service'

export interface CreateOrderPayload {
  requisitionId: string
  patient: OrderPatient
  client: ClientPayload
  veterinarian: VeterinarianPayload
  tests: Test[]
  devices?: string[]
  editable?: boolean
  technician: string
  notes: string
  labRequisitionInfo?: any
}

export interface ClientPayload {
  id: string
  lastName: string
  firstName?: string
  identifier?: Identifier[]
}

export interface VeterinarianPayload {
  id: string
  lastName: string
  firstName?: string
  identifier?: Identifier[]
}

export interface OrderPatient {
  id: string
  name: string
  sex: string
  species: string
  breed?: string
  birthdate?: string
  weightMeasurement?: number
  weightUnits?: string
  identifier?: Identifier[]
}

export interface Test {
  code: string
}

export interface IdPayload {
  id: string
}

export interface IdsPayload {
  ids: string[]
}

export interface OrderTestPayload {
  id: string
  tests: Test[]
}

export type NullPayloadPayload = null

export interface NewIntegrationPayload {
  integrationId: string
}

export interface ExistingIntegrationPayload {
  integrationId: string
}

export interface ServiceCodePayload {
  code: string
  labRequisitionParameters?: any
}
