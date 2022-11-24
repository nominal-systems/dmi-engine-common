export interface CreateOrderPayload {
  id: string
  requisitionId: string
  patient: OrderPatient
  client: ClientPayload
  veterinarian: VeterinarianPayload
  tests: Test[]
  devices?: string[]
  editable?: boolean
  technician: string
  notes: string
}

export interface ClientPayload {
  id: string
  lastName: string
  firstName?: string
}

export interface VeterinarianPayload {
  id: string
  lastName: string
  firstName?: string
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
}

export interface Test {
  code: string
}

export interface IdPayload {
  id: string
}

export interface OrderTestPayload {
  id: string
  tests: Test[]
}

export type NullPayloadPayload = null

export interface NewIntegrationPayload {
  integrationId: string
}
