import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { runWithRequestContext } from './request-context'

@Injectable()
export class IntegrationContextInterceptor implements NestInterceptor {
  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'rpc') {
      return next.handle()
    }

    const integrationId = this.extractIntegrationId(context.switchToRpc().getData())
    if (integrationId === undefined) {
      return next.handle()
    }

    // Both the handler invocation and the subscription must happen inside the
    // AsyncLocalStorage scope so the context propagates to the axios calls
    // made by the handler.
    return new Observable((subscriber) => {
      runWithRequestContext({ integrationId }, () => {
        next.handle().subscribe(subscriber)
      })
    })
  }

  // Messages arrive as the full envelope ({ id, version, type, data }) on
  // MQTT handlers, but Bull-driven flows may pass the bare data object.
  private extractIntegrationId (message: any): string | undefined {
    return message?.data?.integrationId ??
      message?.data?.payload?.integrationId ??
      message?.integrationId ??
      message?.payload?.integrationId
  }
}
