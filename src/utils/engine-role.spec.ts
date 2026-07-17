import { EngineRole, parseEngineRole, roleServesMqtt, roleProcessesJobs } from './engine-role'

describe('engine-role', () => {
  const originalEnvRole = process.env.ENGINE_ROLE

  beforeEach(() => {
    delete process.env.ENGINE_ROLE
  })

  afterAll(() => {
    if (originalEnvRole === undefined) {
      delete process.env.ENGINE_ROLE
    } else {
      process.env.ENGINE_ROLE = originalEnvRole
    }
  })

  describe('parseEngineRole', () => {
    it.each([
      ['api', 'api'],
      ['worker', 'worker'],
      ['all', 'all']
    ])('parses the recognized value %p to %p', (input, expected) => {
      expect(parseEngineRole(input)).toBe(expected)
    })

    it.each([
      [undefined],
      [''],
      ['API'],
      ['Worker'],
      ['wroker'],
      ['none']
    ])('silently defaults unrecognized value %p to "all"', (input) => {
      expect(parseEngineRole(input)).toBe('all')
    })

    it('defaults to process.env.ENGINE_ROLE when no argument is passed', () => {
      process.env.ENGINE_ROLE = 'worker'
      expect(parseEngineRole()).toBe('worker')
    })

    it('returns "all" when no argument is passed and ENGINE_ROLE is unset', () => {
      expect(parseEngineRole()).toBe('all')
    })

    it('lets an explicit argument override the environment', () => {
      process.env.ENGINE_ROLE = 'worker'
      expect(parseEngineRole('api')).toBe('api')
    })
  })

  describe('roleServesMqtt', () => {
    it.each<[EngineRole, boolean]>([
      ['all', true],
      ['api', true],
      ['worker', false]
    ])('returns %p -> %p', (role, expected) => {
      expect(roleServesMqtt(role)).toBe(expected)
    })
  })

  describe('roleProcessesJobs', () => {
    it.each<[EngineRole, boolean]>([
      ['all', true],
      ['worker', true],
      ['api', false]
    ])('returns %p -> %p', (role, expected) => {
      expect(roleProcessesJobs(role)).toBe(expected)
    })
  })
})
