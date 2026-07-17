export type EngineRole = 'all' | 'api' | 'worker'

/**
 * Parse the ENGINE_ROLE environment value into an EngineRole.
 *
 * Defaults to `process.env.ENGINE_ROLE`, so `parseEngineRole()` reads the
 * environment directly; pass an explicit value to override. Any value other
 * than the exact strings 'api' or 'worker' (including undefined, '', or a
 * differently-cased 'API') silently defaults to 'all'.
 */
export function parseEngineRole (value: string | undefined = process.env.ENGINE_ROLE): EngineRole {
  if (value === 'api' || value === 'worker') {
    return value
  }
  return 'all'
}

/** Roles that attach inbound MQTT message handlers (everything except the job-only worker). */
export function roleServesMqtt (role: EngineRole): boolean {
  return role !== 'worker'
}

/** Roles that consume queue jobs (everything except the request/reply-only api). */
export function roleProcessesJobs (role: EngineRole): boolean {
  return role !== 'api'
}
