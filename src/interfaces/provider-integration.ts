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
  Update = 'update',
  Remove = 'remove',
  Cancel = 'cancel',
  TestsCancel = 'tests.cancel',
  Results = 'results',
  ResultsPDF = 'results.pdf',
  ResultsBatch = 'results.batch',
  List = 'list',
  Batch = 'batch',
  Pause = 'pause',
  Submit = 'submit',
  Manifest = 'manifest'
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
  getBatchOrders?: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<Order[]>
  getBatchResults: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<Result[]>
  getOrder: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<Order>
  getOrderResult: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<Result>
  fetchResults?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  fetchOrders?: (jobData: INewIntegrationJobMetadata<IMetadata>) => any
  getManifest?: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<any>
}

export interface ProviderServices {
  getDevices: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Device> | Device[]>
  getServices: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<ReferenceDataResponse<Service> | Service[]>
}

export interface ProviderReferenceData {
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
}

export interface ProviderOrderCreation {
  createOrder: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<OrderCreatedResponse>
}

export interface ProviderOrderUpdate {
  cancelOrder: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<void>
  cancelOrderTest: (
    msg: ApiEvent,
    context?: MqttContext
  ) => Promise<void>
}

export interface ProviderIntegrationAdmin {
  handleNewIntegration: (
    jobData: INewIntegrationJobMetadata<IMetadata>,
    context: MqttContext
  ) => any

  handleIntegrationDelete: (
    jobData: IExistingIntegrationJobMetadata<IMetadata>,
    context: MqttContext
  ) => any

  handleIntegrationUpdate: (
    jobData: IExistingIntegrationJobMetadata<IMetadata>,
    context: MqttContext
  ) => any
}
