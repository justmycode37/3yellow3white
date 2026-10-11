import { expect, test } from 'bun:test'
import { proxyUser } from '../src/identity.js'
import { createHandler } from '../src/server.js'

const request = (headers: HeadersInit = {}) => new Request('http://localhost/api/me', { headers })

test('VIScon identity preserves the email ID and decodes the name once', () => {
  expect(proxyUser(request({ 'X-User-Id': 'zoe@ethz.ch', 'X-User-Name': 'Zo%C3%AB M%C3%BCller' })))
    .toEqual({ id: 'zoe@ethz.ch', name: 'Zoë Müller' })
  expect(proxyUser(request({ 'x-user-id': 'reviewer@example.org', 'x-user-name': 'A+B %2520' }))?.name).toBe('A+B %20')
})

test('missing and malformed display names do not break a trusted user identity', () => {
  const id = 'reviewer%20@example.org'
  for (const name of [undefined, '', '   ', '%00', '%0A']) {
    expect(proxyUser(request({ 'x-user-id': id, ...(name === undefined ? {} : { 'x-user-name': name }) })))
      .toEqual({ id, name: id })
  }
  expect(proxyUser(request({ 'x-user-id': id, 'x-user-name': 'Name%ZZ' }))?.name).toBe('Name%ZZ')
  expect(proxyUser(request({ 'x-user-id': id, 'x-user-name': '%E0%A4' }))?.name).toBe('%E0%A4')
})

test('a missing or ambiguous ID is anonymous, even with a name or old cookie', () => {
  const cases: HeadersInit[] = [{}, { 'x-user-name': 'Staff' }, { 'x-user-id': '  ' },
    { 'x-user-id': 'alice@example.org, bob@example.org' }, { cookie: 'aha-session=old-login' }]
  for (const headers of cases) {
    expect(proxyUser(request(headers))).toBeNull()
  }
})

test('identity endpoints use each request without storing a cookie or caching personal information', async () => {
  const handle = createHandler()
  for (const route of ['/api/me', '/api/hello']) {
    for (const id of ['participant@ethz.ch', 'staff@example.org']) {
      const response = await handle(new Request(`http://localhost${route}`, {
        headers: { 'X-User-Id': id, 'X-User-Name': 'VIScon Reviewer' },
      }))
      expect(response.status).toBe(200)
      expect((await response.json()).user).toEqual({ id, name: 'VIScon Reviewer' })
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
      expect(response.headers.get('Vary')).toBe('X-User-Id, X-User-Name')
      expect(response.headers.get('Set-Cookie')).toBeNull()
    }
    const anonymous = await handle(new Request(`http://localhost${route}?userId=forged@example.org`, {
      headers: { cookie: 'aha-session=old-login' },
    }))
    expect(anonymous.status).toBe(200)
    expect((await anonymous.json()).user).toBeNull()
    const head = await handle(new Request(`http://localhost${route}`, { method: 'HEAD', headers: { 'X-User-Id': 'staff@example.org' } }))
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    expect(head.headers.get('Cache-Control')).toBe('private, no-store')
    expect((await handle(new Request(`http://localhost${route}`, { method: 'POST' }))).status).toBe(405)
  }
})
