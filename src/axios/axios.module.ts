import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { AxiosInterceptor } from './axios.interceptor'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [
    HttpModule,
    ClientsModule.registerAsync([
      {
        name: 'API_SERVICE',
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            ...configService.get('mqtt')
          }
        })
      }
    ])],
  providers: [AxiosInterceptor],
  exports: [AxiosInterceptor]
})
export class AxiosModule {
}
