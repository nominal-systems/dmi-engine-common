import { IsNotEmpty } from 'class-validator'

export class ApiEvent<EventData = ApiEventData> {
  @IsNotEmpty()
  id: string

  @IsNotEmpty()
  version: string

  @IsNotEmpty()
  type: string

  @IsNotEmpty()
  data: EventData
}

export interface ApiEventData {
  providerConfiguration?: any
  integrationOptions?: any
  payload?: any
}
