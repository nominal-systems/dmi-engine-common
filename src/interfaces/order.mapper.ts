import { ClientPayload, CreateOrderPayload, OrderPatient, Test, VeterinarianPayload } from './payloads.interface'
import { Client, Identifier, Order, Patient, Veterinarian } from './provider-service'
import { OrderStatus } from '../constants'

export interface OrderMapper {
  mapCreateOrderPayload: (payload: CreateOrderPayload) => unknown
  mapVeterinarianPayload: (payload: VeterinarianPayload) => unknown
  mapPatientPayload: (payload: OrderPatient) => unknown
  mapClientPayload: (payload: ClientPayload) => unknown
  mapTestPayload: (payload: Test[]) => unknown
  mapOrder: (order: unknown, metadata?: any) => Order
  mapOrderStatus: (status: string) => OrderStatus
  mapOrderPatient: (patient: unknown) => Patient
  mapOrderClient: (client: unknown) => Client
  mapOrderTest: (test: unknown) => Test
  mapOrderVeterinarian: (veterinarian: unknown) => Veterinarian
  getIdFromIdentifier: (system: string, identifier?: Identifier[]) => string | undefined
}
