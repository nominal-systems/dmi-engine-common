import { ClientProxy } from '@nestjs/microservices'
import { lastValueFrom, timeout, TimeoutError } from 'rxjs'

export const DEFAULT_EMIT_TIMEOUT_MS = 10_000

export interface EmitAndWaitOptions {
  timeoutMs?: number
}

export class EmitFailedError extends Error {
  readonly timedOut: boolean

  constructor (readonly pattern: string, readonly reason: unknown, timeoutMs: number) {
    const timedOut = reason instanceof TimeoutError
    const detail = timedOut ? `not published within ${timeoutMs} ms` : (reason as Error)?.message ?? String(reason)
    super(`emit '${pattern}' failed: ${detail}`)
    this.name = 'EmitFailedError'
    this.timedOut = timedOut
  }
}

/**
 * Emits an event and resolves once the transport has published it, so a caller
 * can acknowledge the data at the provider only after it left this process.
 * Throws EmitFailedError if the publish fails or doesn't finish within timeoutMs.
 * Over MQTT with QoS 0 "published" means written to the socket; only QoS 1
 * (MqttRecordBuilder.setQoS(1)) waits for the broker's PUBACK.
 * A message that timed out may still go out later (mqtt.js queues it while
 * disconnected), so a timeout can cause a duplicate on the next poll, not a loss.
 */
export async function emitAndWait<T = any> (
  client: ClientProxy,
  pattern: string,
  data: T,
  options: EmitAndWaitOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_EMIT_TIMEOUT_MS
  try {
    // an emit that completes without a value (e.g. a test double's EMPTY) would otherwise reject with EmptyError
    await lastValueFrom(client.emit(pattern, data).pipe(timeout(timeoutMs)), { defaultValue: undefined })
  } catch (error) {
    throw new EmitFailedError(pattern, error, timeoutMs)
  }
}
