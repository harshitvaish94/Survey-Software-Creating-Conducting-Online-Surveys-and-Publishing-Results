import { describe, expect, it } from 'vitest'
import { resolveApiBase } from './http'

const here = { protocol: 'https:', hostname: 'sms.example.com' }

describe('resolveApiBase (deployment config)', () => {
  it('uses the runtime API_URL from config.js first', () => {
    expect(resolveApiBase({ apiUrl: 'https://api.example.com' }, 'http://build-time:3000', here)).toBe(
      'https://api.example.com',
    )
  })

  it('falls back to VITE_API_URL from the build', () => {
    expect(resolveApiBase({}, 'http://localhost:4000', here)).toBe('http://localhost:4000')
    expect(resolveApiBase(undefined, 'http://localhost:4000', here)).toBe('http://localhost:4000')
  })

  it('falls back to this host on port 3000 for local development', () => {
    expect(resolveApiBase({ apiUrl: '  ' }, undefined, here)).toBe('https://sms.example.com:3000')
  })

  it('drops trailing slashes so paths join cleanly', () => {
    expect(resolveApiBase({ apiUrl: 'https://api.example.com//' }, undefined, here)).toBe('https://api.example.com')
  })
})

describe('resolveApiBase with the nginx /api forwarding (BACKEND_URL)', () => {
  it('keeps a same-site relative path', () => {
    expect(resolveApiBase({ apiUrl: '/api' }, undefined, here)).toBe('/api')
    expect(resolveApiBase({ apiUrl: '/api/' }, undefined, here)).toBe('/api')
  })
})
