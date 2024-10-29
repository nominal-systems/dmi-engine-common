import {
  BatchResultsResponse,
  Breed,
  CreateOrderPayload,
  Device,
  IdPayload,
  IdsPayload,
  IMetadata,
  IntegrationTestResponse,
  NullPayloadPayload,
  Order,
  OrderCreatedResponse,
  OrderTestPayload,
  ProviderService,
  ReferenceDataResponse,
  Result,
  Service,
  ServiceCodePayload,
  Sex,
  Species
} from '../interfaces'

export abstract class BaseProviderService<T extends IMetadata> implements ProviderService<T> {
  abstract testAuth (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<IntegrationTestResponse>

  abstract acknowledgeOrder (
    payload: IdPayload,
    metadata: any
  ): Promise<void>

  abstract acknowledgeResult (
    payload: IdPayload,
    metadata: T
  ): Promise<void>

  abstract cancelOrder (
    payload: IdPayload,
    metadata: any
  ): Promise<void>

  abstract cancelOrderTest (
    payload: OrderTestPayload,
    metadata: any
  ): Promise<void>

  abstract createOrder (
    payload: CreateOrderPayload,
    metadata: any
  ): Promise<OrderCreatedResponse>

  abstract createRequisitionId (
    payload: NullPayloadPayload,
    metadata: any
  ): string

  abstract getBatchOrders (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<Order[]>

  abstract getBatchResults (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<BatchResultsResponse>

  abstract getBreeds (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<ReferenceDataResponse<Breed>>

  abstract getDevices (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<Device[]>

  abstract getOrder (
    payload: IdPayload,
    metadata: any
  ): Promise<Order>

  abstract getOrderResult (
    payload: IdPayload,
    metadata: any
  ): Promise<Result>

  abstract getServiceByCode (
    payload: ServiceCodePayload,
    metadata: any
  ): Promise<Service>

  abstract getServices (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<Service[]>

  abstract getSexes (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<ReferenceDataResponse<Sex>>

  abstract getSpecies (
    payload: NullPayloadPayload,
    metadata: any
  ): Promise<ReferenceDataResponse<Species>>

  async acknowledgeOrders (
    payload: IdsPayload,
    metadata: any
  ): Promise<void> {
    for (const id of payload.ids) {
      await this.acknowledgeOrder({ id }, metadata)
    }
  }

  async acknowledgeResults (
    payload: IdsPayload,
    metadata: T
  ): Promise<void> {
    for (const id of payload.ids) {
      await this.acknowledgeResult({ id }, metadata)
    }
  }
}
