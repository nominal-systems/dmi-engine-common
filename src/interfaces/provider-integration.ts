import { MqttContext } from '@nestjs/microservices'
import { ApiEvent } from '../events/api-event'
import { NewIntegrationPayload } from './payloads'
import {
  Breed,
  Sex,
  IMetadata,
  IPayload,
  Order,
  Result,
  Service,
  Species,
  Device
} from './provider-service'
import { ReferenceDataResponse } from './reference-data-response'

export enum ProviderId {
  Demo = 'demo',
  Idexx = 'idexx',
  ZoetisV1 = 'zoetis-v1',
  AntechV3 = 'antech-v3'
}

/**
 * @deprecated since version 0.2.0. Please use ProviderId enum instead. Will be removed on 0.3.0.
 */
export enum Provider {
  Demo = 'demo',
  Zoetis = 'zoetis-v1',
  Idexx = 'idexx',
  Antech = 'antech'
}

export enum Resource {
  Orders = 'orders',
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
  Batch = 'batch'
}

export interface INewIntegrationJobMetadata<T extends IMetadata> {
  id: string
  type: string
  version: string
  data: IPayload<NewIntegrationPayload> & T
}

export interface ProviderIntegration {
  createOrder: (msg: ApiEvent, context?: MqttContext) => Promise<Order>
  getBatchOrders?: (msg: ApiEvent, context?: MqttContext) => Promise<Order[]>
  getBatchResults: (msg: ApiEvent, context?: MqttContext) => Promise<Result[]>
  getOrder: (msg: ApiEvent, context?: MqttContext) => Promise<Order>
  getOrderResult: (msg: ApiEvent, context?: MqttContext) => Promise<Result>
  cancelOrder: (msg: ApiEvent, context?: MqttContext) => Promise<void>
  cancelOrderTest: (msg: ApiEvent, context?: MqttContext) => Promise<void>
  getDevices: (msg: ApiEvent, context?: MqttContext) => Promise<Device[]>
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
}
