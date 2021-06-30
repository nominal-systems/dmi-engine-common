import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { RpcException } from '@nestjs/microservices'

@Catch(RpcException)
export class CustomRpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch (exception: RpcException, host: ArgumentsHost): Observable<any> {
    const obj = exception.getError()

    if (typeof obj === 'object' && obj != null) {
      return throwError({ type: RpcException.name, ...obj })
    }

    return throwError({ type: RpcException.name, message: obj })
  }
}
