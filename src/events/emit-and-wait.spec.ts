import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices'
import { EMPTY, noop } from 'rxjs'
import { DEFAULT_EMIT_TIMEOUT_MS, EmitFailedError, emitAndWait } from './emit-and-wait'

// Uses the real ClientProxy.emit(); only the transport underneath is faked
class FakeClient extends ClientProxy {
  dispatched: ReadPacket[] = []
  dispatch: (packet: ReadPacket) => Promise<any> = async () => undefined
  connectError?: Error

  async connect () {
    if (this.connectError != null) throw this.connectError
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

  it('resolves once the publish has gone through', async () => {
    let settle: () => void = noop
    client.dispatch = async () => await new Promise<void>((resolve) => { settle = resolve })

    let done = false
    const waiting = emitAndWait(client, 'external_results', { integrationId: 'i-1' }).then(() => { done = true })
    await new Promise((resolve) => setImmediate(resolve))
    expect(done).toBe(false)

    settle()
    await waiting
    expect(done).toBe(true)
    expect(client.dispatched).toEqual([{ pattern: 'external_results', data: { integrationId: 'i-1' } }])
  })

  it('resolves for an emit that completes without a value, as test doubles often return', async () => {
    const double = { emit: () => EMPTY } as unknown as ClientProxy
    await expect(emitAndWait(double, 'external_results', {})).resolves.toBeUndefined()
  })

  it('throws an EmitFailedError naming the pattern when the publish fails', async () => {
    const cause = new Error('Connection closed')
    client.dispatch = async () => { throw cause }

    const error = await emitAndWait(client, 'external_order_results', {}).catch((e) => e)
    expect(error).toBeInstanceOf(EmitFailedError)
    expect(error.pattern).toBe('external_order_results')
    expect(error.reason).toBe(cause)
    expect(error.message).toBe("emit 'external_order_results' failed: Connection closed")
  })

  it('throws when the client cannot connect', async () => {
    client.connectError = new Error('connect ECONNREFUSED 127.0.0.1:1883')

    const error = await emitAndWait(client, 'external_results', {}).catch((e) => e)
    expect(error).toBeInstanceOf(EmitFailedError)
    expect(error.message).toBe("emit 'external_results' failed: connect ECONNREFUSED 127.0.0.1:1883")
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
})
