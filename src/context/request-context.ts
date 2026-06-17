import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  integrationId?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T> (context: RequestContext, fn: () => T): T {
  return storage.run(context, fn)
}

export function getRequestContext (): RequestContext | undefined {
  return storage.getStore()
}
