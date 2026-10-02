// Credential redaction for what this package logs or emits about provider HTTP
// calls: request URLs, request headers and request bodies. A redacted value is
// the literal string `***`, names are matched case-insensitively, and the input
// is never mutated: every function returns a copy (or its input, unchanged).

const REDACTED = '***'

const CIRCULAR = '[Circular]'

/** Query parameter names whose values are redacted by `redactUrl()`. */
export const SENSITIVE_PARAM_NAMES: readonly string[] = [
  'accesstoken',
  'access_token',
  'token',
  'refresh_token',
  'apikey',
  'api_key',
  'api-key',
  'password',
  'secret',
  'client_secret',
  'signature',
  'authorization'
]

// Header names and object keys are sensitive when they contain one of these...
const SENSITIVE_KEY_FRAGMENTS = ['password', 'token', 'secret', 'authorization', 'apikey', 'api_key', 'api-key']
// ...or are exactly one of these.
const SENSITIVE_KEY_NAMES = ['pass', 'pwd']
// Headers that carry credentials without a telling name.
const SENSITIVE_HEADER_NAMES = ['cookie', 'set-cookie']

function isSensitiveKey (name: string): boolean {
  const lower = name.toLowerCase()
  return SENSITIVE_KEY_NAMES.includes(lower) || SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment))
}

function isSensitiveHeader (name: string): boolean {
  return SENSITIVE_HEADER_NAMES.includes(name.toLowerCase()) || isSensitiveKey(name)
}

function isSensitiveParam (name: string): boolean {
  let decoded = name
  try {
    decoded = decodeURIComponent(name)
  } catch {
    // Not valid percent-encoding: match the name as written.
  }
  return SENSITIVE_PARAM_NAMES.includes(decoded.toLowerCase())
}

function isPlainObject (value: any): boolean {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Replace the value of every query parameter named in `SENSITIVE_PARAM_NAMES`
 * with `***`. Everything else (parameter order, encoding, fragment) is kept
 * byte for byte, and a URL without such a parameter is returned unchanged.
 * Never throws: the query string is split by hand rather than parsed with
 * `new URL()`.
 *
 * Works on encoded and decoded URLs alike, but redact before decoding where
 * you can: once decoded, a value containing `&` or `#` can no longer be told
 * apart from the next parameter or the fragment.
 */
export function redactUrl (url: string): string {
  if (typeof url !== 'string') return url

  const queryStart = url.indexOf('?')
  if (queryStart === -1) return url

  const fragmentStart = url.indexOf('#', queryStart)
  const queryEnd = fragmentStart === -1 ? url.length : fragmentStart

  const query = url
    .slice(queryStart + 1, queryEnd)
    .split('&')
    .map((pair) => {
      const separator = pair.indexOf('=')
      if (separator === -1) return pair
      return isSensitiveParam(pair.slice(0, separator)) ? `${pair.slice(0, separator)}=${REDACTED}` : pair
    })
    .join('&')

  return `${url.slice(0, queryStart + 1)}${query}${url.slice(queryEnd)}`
}

/**
 * A shallow copy of `headers` with the value of every credential-bearing
 * header replaced by `***`: `authorization`, `proxy-authorization`, `cookie`,
 * `set-cookie`, `x-api-key`, and any header whose name contains `token`,
 * `secret`, `password` or `apikey`/`api_key`/`api-key`. Anything that is not
 * an object is returned as is.
 */
export function redactHeaders (headers: any): any {
  if (headers === null || typeof headers !== 'object' || Array.isArray(headers)) return headers

  const copy = { ...headers }
  for (const name of Object.keys(copy)) {
    if (isSensitiveHeader(name)) {
      copy[name] = REDACTED
    }
  }
  return copy
}

/**
 * A deep copy of `value` in which every key whose name contains `password`,
 * `token`, `secret`, `authorization` or `apikey`/`api_key`/`api-key`, or is
 * exactly `pass` or `pwd`, has its value replaced by `***`, at any depth and
 * inside arrays. Only plain objects and arrays are copied: primitives, `null`,
 * `undefined`, `Buffer`s and other class instances are returned as is. A
 * circular reference is replaced by the string `[Circular]`.
 */
export function redactObject (value: any): any {
  return redactValue(value, new WeakSet())
}

function redactValue (value: any, ancestors: WeakSet<any>): any {
  const isArray = Array.isArray(value)
  if (!isArray && !isPlainObject(value)) return value
  if (ancestors.has(value)) return CIRCULAR

  ancestors.add(value)
  let copy: any
  if (isArray) {
    copy = value.map((item: any) => redactValue(item, ancestors))
  } else {
    copy = {}
    for (const key of Object.keys(value)) {
      copy[key] = isSensitiveKey(key) ? REDACTED : redactValue(value[key], ancestors)
    }
  }
  ancestors.delete(value)
  return copy
}
