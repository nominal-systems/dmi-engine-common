import { MqttContext } from '@nestjs/microservices'
import { ApiEvent } from '../events/api-event'
import { NewIntegrationPayload } from './payloads'
import {
  Breed,
  Gender,
  IMetadata,
  IPayload,
  Order,
  Result,
  Service,
  Species
} from './provider-service'
import { ReferenceDataResponse } from './reference-data-response'

export enum Provider {
  Demo = 'demo',
  Zoetis = 'zoetis-v1',
  Idexx = 'idexx',
  Antech = 'antech'
}

export enum Resource {
  Orders = 'orders',
  Breeds = 'breeds',
  Genders = 'genders',
  Services = 'services',
  Species = 'species',
  Integration = 'integration'
}

export enum Operation {
  Get = 'get',
  Create = 'create',
  Cancel = 'cancel',
  TestsCancel = 'tests.cancel',
  Results = 'results',
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
  getServices: (msg: ApiEvent, context?: MqttContext) => Promise<ReferenceDataResponse<Service> | Service[]>
  getGenders: (msg: ApiEvent, context?: MqttContext) => Promise<ReferenceDataResponse<Gender> | Gender[]>
  getSpecies: (msg: ApiEvent, context?: MqttContext) => Promise<ReferenceDataResponse<Species> | Species[]>
  getBreeds: (msg: ApiEvent, context?: MqttContext) => Promise<ReferenceDataResponse<Breed> | Breed[]>
  fetchResults?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  fetchOrders?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  handleNewIntegration: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
}
