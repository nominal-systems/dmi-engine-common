import { MqttContext } from '@nestjs/microservices'
import { ApiEvent } from '../events/api-event'
import { ExistingIntegrationPayload, NewIntegrationPayload } from './payloads.interface'
import { Breed, Device, IMetadata, IPayload, Order, Result, Service, Sex, Species } from './provider-service'
import { ReferenceDataResponse } from './reference-data-response'
import { OrderCreatedResponse } from './responses.interface'

export enum ProviderId {
  Demo = 'demo',
  Idexx = 'idexx',
  ZoetisV1 = 'zoetis-v1',
  AntechV3 = 'antech-v3',
  Heska = 'heska'
}

/**
 * @deprecated since version 0.2.0. Please use ProviderId enum instead. Will be removed on 0.3.0.
 */
export enum Provider {
  Demo = 'demo',
  Zoetis = 'zoetis',
  Idexx = 'idexx',
  Antech = 'antech',
  Heska = 'heska'
}

export enum Resource {
  Orders = 'orders',
  Results = 'results',
  Breeds = 'breeds',
  Sexes = 'sexes',
  Devices = 'devices',
  Services = 'services',
  Species = 'species',
  Integration = 'integration'
}

export enum Operation {
  Get = 'get',
  Create = 'create',
  Remove = 'remove',
  Cancel = 'cancel',
  TestsCancel = 'tests.cancel',
  Results = 'results',
  ResultsPDF = 'results.pdf',
  ResultsBatch = 'results.batch',
  List = 'list',
  Batch = 'batch',
  Pause = 'pause',
  Submit = 'submit'
}

export interface INewIntegrationJobMetadata<T extends IMetadata> {
  id: string
  type: string
  version: string
  data: IPayload<NewIntegrationPayload> & T
}

export interface IExistingIntegrationJobMetadata<T extends IMetadata> {
  id: string
  type: string
  version: string
  data: IPayload<ExistingIntegrationPayload> & T
}

export interface ProviderIntegration {
  createOrder: (msg: ApiEvent, context?: MqttContext) => Promise<OrderCreatedResponse>
  getBatchOrders?: (msg: ApiEvent, context?: MqttContext) => Promise<Order[]>
  getBatchResults: (msg: ApiEvent, context?: MqttContext) => Promise<Result[]>
  getOrder: (msg: ApiEvent, context?: MqttContext) => Promise<Order>
  getOrderResult: (msg: ApiEvent, context?: MqttContext) => Promise<Result>
  cancelOrder: (msg: ApiEvent, context?: MqttContext) => Promise<void>
  cancelOrderTest: (msg: ApiEvent, context?: MqttContext) => Promise<void>
  getDevices: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Device> | Device[]>
  getServices: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Service> | Service[]>
  getSexes: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Sex> | Sex[]>
  getSpecies: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Species> | Species[]>
  getBreeds: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Breed> | Breed[]>
  fetchResults?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  fetchOrders?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  handleNewIntegration: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  handleIntegrationDelete: (jobData: IExistingIntegrationJobMetadata<IMetadata>) => any
}
