import { lastValueFrom, of } from 'rxjs'
import { IntegrationContextInterceptor } from './integration-context.interceptor'
import { getRequestContext } from './request-context'

describe('IntegrationContextInterceptor', () => {
  let interceptor: IntegrationContextInterceptor

  const executionContext = (type: string, data: any): any => ({
    getType: () => type,
    switchToRpc: () => ({ getData: () => data })
  })

  // CallHandler that captures the request context visible to the handler
  const callHandler = (capture: { integrationId?: string }): any => ({
    handle: () => {
      capture.integrationId = getRequestContext()?.integrationId
      return of('handled')
    }
  })

  beforeEach(() => {
    interceptor = new IntegrationContextInterceptor()
  })

  it('runs the handler within a context holding data.integrationId', async () => {
    const capture: { integrationId?: string } = {}
    const message = { id: '1', type: 'idexx/orders/create', data: { integrationId: 'integration-1', payload: {} } }

    const result = await lastValueFrom(
      interceptor.intercept(executionContext('rpc', message), callHandler(capture))
    )

    expect(result).toBe('handled')
    expect(capture.integrationId).toBe('integration-1')
  })

  it('falls back to data.payload.integrationId (integration lifecycle messages)', async () => {
    const capture: { integrationId?: string } = {}
    const message = { id: '1', type: 'idexx/integration/create', data: { payload: { integrationId: 'integration-2' } } }

    await lastValueFrom(
      interceptor.intercept(executionContext('rpc', message), callHandler(capture))
    )

    expect(capture.integrationId).toBe('integration-2')
  })

  it('supports bare data objects without the message envelope', async () => {
    const capture: { integrationId?: string } = {}

    await lastValueFrom(
      interceptor.intercept(executionContext('rpc', { integrationId: 'integration-3' }), callHandler(capture))
    )

    expect(capture.integrationId).toBe('integration-3')
  })

  it('runs the handler without a context when the message has no integrationId', async () => {
    const capture: { integrationId?: string } = { integrationId: 'sentinel' }
    const message = { id: '1', type: 'idexx/integration/test', data: { payload: null } }

    await lastValueFrom(
      interceptor.intercept(executionContext('rpc', message), callHandler(capture))
    )

    expect(capture.integrationId).toBeUndefined()
  })

  it('ignores non-rpc execution contexts', async () => {
    const capture: { integrationId?: string } = { integrationId: 'sentinel' }

    const result = await lastValueFrom(
      interceptor.intercept(executionContext('http', {}), callHandler(capture))
    )

    expect(result).toBe('handled')
    expect(capture.integrationId).toBeUndefined()
  })

  it('keeps the context alive for async work started by the handler', async () => {
    const message = { data: { integrationId: 'integration-4' } }
    let asyncContext: string | undefined
    let pending: Promise<void> = Promise.resolve()

    await lastValueFrom(interceptor.intercept(executionContext('rpc', message), {
      handle: () => {
        // Simulates an axios call resolving after the handler returns
        pending = new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
          asyncContext = getRequestContext()?.integrationId
        })
        return of('handled')
      }
    } as any))

    await pending
    expect(asyncContext).toBe('integration-4')
  })
})
