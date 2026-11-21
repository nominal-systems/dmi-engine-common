import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices'
import { EMPTY, noop } from 'rxjs'
import * as common from '../index'
import { DEFAULT_EMIT_TIMEOUT_MS, EmitFailedError, emitAndWait } from './emit-and-wait'

// Uses the real ClientProxy.emit(); only the transport underneath is faked
class FakeClient extends ClientProxy {
  dispatched: ReadPacket[] = []
  dispatch: (packet: ReadPacket) => Promise<any> = async () => undefined
  connectError?: Error
  private connection?: Promise<void>

  // Like ClientMqtt: the first connect attempt is cached, a rejected one included
  async connect () {
    this.connection ??= this.connectError != null ? Promise.reject(this.connectError) : Promise.resolve()
    return await this.connection
  }

  close = noop

  protected publish (_packet: ReadPacket, _callback: (packet: WritePacket) => void) {
    return noop
  }

  protected async dispatchEvent<T = any> (packet: ReadPacket): Promise<T> {
    this.dispatched.push(packet)
    return await this.dispatch(packet)
  }
}

describe('emitAndWait', () => {
  let client: FakeClient

  beforeEach(() => {
    client = new FakeClient()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is exported from the package root', () => {
    expect(common.emitAndWait).toBe(emitAndWait)
    expect(common.EmitFailedError).toBe(EmitFailedError)
    expect(common.DEFAULT_EMIT_TIMEOUT_MS).toBe(DEFAULT_EMIT_TIMEOUT_MS)
  })

  it('defaults to a 10 s timeout', () => {
    expect(DEFAULT_EMIT_TIMEOUT_MS).toBe(10_000)
  })

  it('resolves only once the publish has gone through', async () => {
    jest.useFakeTimers()
    let settle: () => void = noop
    client.dispatch = async () => await new Promise<void>((resolve) => { settle = resolve })

    let done = false
    const waiting = emitAndWait(client, 'external_results', { integrationId: 'i-1' }).then(() => { done = true })
    await jest.advanceTimersByTimeAsync(DEFAULT_EMIT_TIMEOUT_MS - 1)
    expect(done).toBe(false)

    settle()
    await waiting
    expect(done).toBe(true)
    expect(client.dispatched).toEqual([{ pattern: 'external_results', data: { integrationId: 'i-1' } }])
  })

  it('resolves for an emit that completes without a value (a test double returning EMPTY)', async () => {
    const double = { emit: () => EMPTY } as unknown as ClientProxy
    await expect(emitAndWait(double, 'external_results', {})).resolves.toBeUndefined()
  })

  it('throws an EmitFailedError naming the pattern and carrying the cause when the publish fails', async () => {
    const cause = new Error('Connection closed')
    client.dispatch = async () => { throw cause }

    const error = await emitAndWait(client, 'external_order_results', {}).catch((e) => e)
    expect(error).toBeInstanceOf(EmitFailedError)
    expect(error.pattern).toBe('external_order_results')
    expect(error.reason).toBe(cause)
    expect(error.cause).toBe(cause)
    expect(error.timedOut).toBe(false)
    expect(error.message).toBe("emit 'external_order_results' failed: Connection closed")
  })

  it('keeps failing with the first connect error, as ClientMqtt does', async () => {
    client.connectError = new Error('connect ECONNREFUSED 127.0.0.1:1883')

    const first = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(first).toBeInstanceOf(EmitFailedError)
    expect(first.timedOut).toBe(false)
    expect(first.message).toBe("emit 'external_results' failed: connect ECONNREFUSED 127.0.0.1:1883")

    client.connectError = undefined
    const second = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(second.message).toBe("emit 'external_results' failed: connect ECONNREFUSED 127.0.0.1:1883")
    expect(client.dispatched).toEqual([])
  })

  it('reads the inner reasons of an error with an empty message, as Node gives for localhost', async () => {
    client.connectError = Object.assign(new Error(''), {
      code: 'ECONNREFUSED',
      errors: [new Error('connect ECONNREFUSED ::1:1883'), new Error('connect ECONNREFUSED 127.0.0.1:1883')]
    })

    const error = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(error.message).toBe("emit 'external_results' failed: connect ECONNREFUSED ::1:1883; connect ECONNREFUSED 127.0.0.1:1883")
  })

  it('falls back to the code of an error with no message', async () => {
    client.dispatch = async () => { throw Object.assign(new Error(''), { code: 'ECONNRESET' }) }

    const error = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(error.message).toBe("emit 'external_results' failed: ECONNRESET")
  })

  it('says so when the transport rejects with no reason, as ClientMqtt does on a close before CONNACK', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    client.dispatch = async () => await Promise.reject(undefined)

    const error = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(error).toBeInstanceOf(EmitFailedError)
    expect(error.reason).toBeUndefined()
    expect(error.message).toBe("emit 'external_results' failed: no reason given by the transport")
  })

  it('times out while the publish stays queued, as mqtt.js does while disconnected', async () => {
    jest.useFakeTimers()
    client.dispatch = async () => await new Promise(noop)

    const waiting = emitAndWait(client, 'external_results', {}, { timeoutMs: 2000 }).catch((e) => e)
    await jest.advanceTimersByTimeAsync(2000)

    const error = await waiting
    expect(error).toBeInstanceOf(EmitFailedError)
    expect(error.timedOut).toBe(true)
    expect(error.message).toBe("emit 'external_results' failed: not published within 2000 ms")
  })

  it('waits DEFAULT_EMIT_TIMEOUT_MS when no timeout is given', async () => {
    jest.useFakeTimers()
    client.dispatch = async () => await new Promise(noop)

    let settled = false
    const waiting = emitAndWait(client, 'external_results', {}).catch((e) => { settled = true; return e })
    await jest.advanceTimersByTimeAsync(DEFAULT_EMIT_TIMEOUT_MS - 1)
    expect(settled).toBe(false)

    await jest.advanceTimersByTimeAsync(1)
    expect((await waiting).message).toBe(`emit 'external_results' failed: not published within ${DEFAULT_EMIT_TIMEOUT_MS} ms`)
  })

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 31])('rejects a timeoutMs of %p without emitting', async (timeoutMs) => {
    await expect(emitAndWait(client, 'external_results', {}, { timeoutMs })).rejects.toThrow(RangeError)
    expect(client.dispatched).toEqual([])
  })
})
