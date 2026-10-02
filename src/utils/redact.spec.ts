import { redactHeaders, redactObject, redactUrl, SENSITIVE_PARAM_NAMES } from './redact'

describe('redact', () => {
  describe('redactUrl', () => {
    it('masks a credential query parameter and keeps the others', () => {
      expect(redactUrl('https://api.example.com/Tests/v6?accesstoken=abc&x=1'))
        .toBe('https://api.example.com/Tests/v6?accesstoken=***&x=1')
    })

    it('returns a URL without credential parameters unchanged', () => {
      const url = 'https://api.example.com/resource?q=a%20b&page=2&tags=x&tags=y#section'
      expect(redactUrl(url)).toBe(url)
    })

    it('returns a URL without a query string unchanged', () => {
      expect(redactUrl('https://api.example.com/resource')).toBe('https://api.example.com/resource')
    })

    it('matches parameter names case-insensitively', () => {
      expect(redactUrl('https://api.example.com/x?AccessToken=abc&API_KEY=def&Signature=ghi'))
        .toBe('https://api.example.com/x?AccessToken=***&API_KEY=***&Signature=***')
    })

    it.each(SENSITIVE_PARAM_NAMES.map((name) => [name]))('masks the %s parameter', (name) => {
      expect(redactUrl(`https://api.example.com/x?${name}=dummy-value&keep=1`))
        .toBe(`https://api.example.com/x?${name}=***&keep=1`)
    })

    it('masks an encoded value whole, including encoded separators', () => {
      expect(redactUrl('https://api.example.com/x?a=1&token=ab%2Bc%26d%3De%23f&b=2'))
        .toBe('https://api.example.com/x?a=1&token=***&b=2')
    })

    it('matches a percent-encoded parameter name', () => {
      expect(redactUrl('https://api.example.com/x?access%5Ftoken=abc'))
        .toBe('https://api.example.com/x?access%5Ftoken=***')
    })

    it('works on a decoded URL', () => {
      expect(redactUrl('https://api.example.com/x?name=Test User&password=p@ss w0rd'))
        .toBe('https://api.example.com/x?name=Test User&password=***')
    })

    it('keeps the fragment as is and masks every occurrence of a repeated parameter', () => {
      expect(redactUrl('https://api.example.com/x?token=a&token=b&x=1#top&token=frag'))
        .toBe('https://api.example.com/x?token=***&token=***&x=1#top&token=frag')
    })

    it('does not mask parameters whose names only contain a sensitive name', () => {
      const url = 'https://api.example.com/x?tokenType=bearer&passwordHint=1'
      expect(redactUrl(url)).toBe(url)
    })

    it('does not throw on a malformed URL', () => {
      expect(redactUrl('not a url?token=abc&%E0%A4%A=1')).toBe('not a url?token=***&%E0%A4%A=1')
      expect(redactUrl('?%=x&token')).toBe('?%=x&token')
    })
  })

  describe('redactHeaders', () => {
    it('masks credential headers and leaves the others untouched', () => {
      expect(redactHeaders({
        Authorization: 'Bearer abc',
        accessToken: 'def',
        'content-type': 'application/json',
        'x-request-id': '123'
      })).toEqual({
        Authorization: '***',
        accessToken: '***',
        'content-type': 'application/json',
        'x-request-id': '123'
      })
    })

    it.each([
      'authorization',
      'Proxy-Authorization',
      'Cookie',
      'set-cookie',
      'X-Api-Key',
      'x-apikey',
      'X-Auth-Token',
      'client-secret',
      'x-password'
    ])('masks the %s header', (name) => {
      expect(redactHeaders({ [name]: 'dummy-value' })).toEqual({ [name]: '***' })
    })

    it('does not mutate its input', () => {
      const headers = { Authorization: 'Bearer abc', accept: 'application/json' }
      const redacted = redactHeaders(headers)
      expect(redacted).not.toBe(headers)
      expect(headers).toEqual({ Authorization: 'Bearer abc', accept: 'application/json' })
    })

    it.each([[undefined], [null], ['Authorization: Bearer abc'], [42]])('returns %p as is', (value) => {
      expect(redactHeaders(value)).toBe(value)
    })
  })

  describe('redactObject', () => {
    it('masks credential keys at any depth, inside arrays too', () => {
      expect(redactObject({
        UserName: 'u',
        Password: 'p',
        credentials: { Password: 'p', ClinicID: 1 },
        users: [{ name: 'a', pwd: 'x' }, { name: 'b', client_secret: 'y' }],
        auth: { access_token: 'abc', refresh_token: 'def', apiKey: 'ghi', pass: 'jkl' }
      })).toEqual({
        UserName: 'u',
        Password: '***',
        credentials: { Password: '***', ClinicID: 1 },
        users: [{ name: 'a', pwd: '***' }, { name: 'b', client_secret: '***' }],
        auth: { access_token: '***', refresh_token: '***', apiKey: '***', pass: '***' }
      })
    })

    it('masks the whole value of a credential key, objects included', () => {
      expect(redactObject({ token: { value: 'abc', expires: 1 } })).toEqual({ token: '***' })
    })

    it('keeps keys that merely start like a credential name', () => {
      const value = { passport: 'x', passive: true, grant_type: 'password' }
      expect(redactObject(value)).toEqual(value)
    })

    it('does not mutate its input', () => {
      const value = { credentials: { Password: 'p' }, list: [{ token: 't' }] }
      const redacted = redactObject(value)
      expect(redacted).not.toBe(value)
      expect(redacted.credentials).not.toBe(value.credentials)
      expect(value).toEqual({ credentials: { Password: 'p' }, list: [{ token: 't' }] })
    })

    it.each([[undefined], [null], ['password=p'], [42], [true]])('returns %p as is', (value) => {
      expect(redactObject(value)).toBe(value)
    })

    it('returns Buffers and other class instances as is', () => {
      const buffer = Buffer.from('password')
      const date = new Date(0)
      const params = new URLSearchParams({ password: 'p' })
      const redacted = redactObject({ buffer, date, params })
      expect(redacted.buffer).toBe(buffer)
      expect(redacted.date).toBe(date)
      expect(redacted.params).toBe(params)
    })

    it('replaces a circular reference instead of looping', () => {
      const value: any = { name: 'a', password: 'p' }
      value.self = value
      value.list = [value]
      expect(redactObject(value)).toEqual({
        name: 'a',
        password: '***',
        self: '[Circular]',
        list: ['[Circular]']
      })
    })

    it('copies an object that is referenced twice without a cycle', () => {
      const shared = { token: 't', id: 1 }
      expect(redactObject({ a: shared, b: shared })).toEqual({
        a: { token: '***', id: 1 },
        b: { token: '***', id: 1 }
      })
    })
  })
})
