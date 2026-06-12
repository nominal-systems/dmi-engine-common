import { getRequestContext, runWithRequestContext } from './request-context'

describe('request-context', () => {
  it('returns undefined outside of a context', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('provides the context inside runWithRequestContext', () => {
    runWithRequestContext({ integrationId: 'integration-1' }, () => {
      expect(getRequestContext()).toEqual({ integrationId: 'integration-1' })
    })
  })

  it('propagates the context through async/await chains', async () => {
    await runWithRequestContext({ integrationId: 'integration-1' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      expect(getRequestContext()?.integrationId).toBe('integration-1')
    })
  })

  it('keeps concurrent contexts isolated', async () => {
    const seen: string[] = []

    await Promise.all(['a', 'b', 'c'].map(async (id) =>
      await runWithRequestContext({ integrationId: id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
        seen.push(getRequestContext()?.integrationId as string)
      })
    ))

    expect(seen.sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not leak the context after the run completes', async () => {
    await runWithRequestContext({ integrationId: 'integration-1' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    expect(getRequestContext()).toBeUndefined()
  })
})
