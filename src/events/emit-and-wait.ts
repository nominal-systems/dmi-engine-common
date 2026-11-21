import { ClientProxy } from '@nestjs/microservices'
import { lastValueFrom, timeout, TimeoutError } from 'rxjs'

export const DEFAULT_EMIT_TIMEOUT_MS = 10_000

// setTimeout's limit: longer delays (and Infinity) fire after 1 ms
const MAX_EMIT_TIMEOUT_MS = 2 ** 31 - 1

export interface EmitAndWaitOptions {
  timeoutMs?: number
}

export class EmitFailedError extends Error {
  readonly timedOut: boolean
  cause: unknown

  constructor (readonly pattern: string, readonly reason: unknown, timeoutMs: number) {
    const timedOut = reason instanceof TimeoutError
    super(`emit '${pattern}' failed: ${timedOut ? `not published within ${timeoutMs} ms` : describeReason(reason)}`)
    this.name = 'EmitFailedError'
    this.timedOut = timedOut
    this.cause = reason
  }
}

/**
 * Emits an event and resolves once the transport has published it, so a caller
 * can acknowledge the data at the provider only after it left this process.
 * Throws EmitFailedError if the publish fails or doesn't finish within timeoutMs.
 *
 * Over MQTT with QoS 0 "published" means written to the socket, so this only
 * catches a connection mqtt.js knows is gone (closed, reset, refused). A link that
 * stops passing bytes without a FIN or RST, or a reset in the same tick as the
 * emit, still resolves and the message is lost. QoS 1 (MqttRecordBuilder.setQoS(1))
 * waits for the broker's PUBACK and covers those too.
 *
 * Each emit that times out stays in mqtt.js's offline queue and goes out after the
 * reconnect, so every timed-out attempt is one duplicate on the subscriber's side.
 * The client option `queueQoSZero: false` makes them fail at once instead.
 *
 * Nest's ClientMqtt caches a failed first connect: if the broker is unreachable on
 * the first emit, every later emit fails with that error until client.close().
 */
export async function emitAndWait<T = any> (
  client: ClientProxy,
  pattern: string,
  data: T,
  options: EmitAndWaitOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_EMIT_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_EMIT_TIMEOUT_MS) {
    throw new RangeError(`timeoutMs must be an integer from 1 to ${MAX_EMIT_TIMEOUT_MS}, got ${timeoutMs}`)
  }
  try {
    // an emit that completes without a value (a test double returning EMPTY) would otherwise reject with EmptyError
    await lastValueFrom(client.emit(pattern, data).pipe(timeout(timeoutMs)), { defaultValue: undefined })
  } catch (error) {
    throw new EmitFailedError(pattern, error, timeoutMs)
  }
}

function describeReason (reason: any): string {
  // ClientMqtt rejects with no reason when the connection closes before CONNACK
  if (reason === undefined || reason === null) return 'no reason given by the transport'
  if (typeof reason.message === 'string' && reason.message !== '') return reason.message
  // A host with several addresses that all refuse (localhost: ::1 and 127.0.0.1) gives an AggregateError with an
  // empty message; the reasons are in its errors.
  const inner: string[] = (Array.isArray(reason.errors) ? reason.errors : [])
    .map((e: any) => e?.message)
    .filter((m: unknown): m is string => typeof m === 'string' && m !== '')
  if (inner.length > 0) return inner.join('; ')
  return String(reason.code ?? reason.name ?? reason)
}
