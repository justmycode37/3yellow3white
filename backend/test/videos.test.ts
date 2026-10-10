import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VideoService } from '../src/videos'
import type { Generator } from '../src/videos'

const services: VideoService[] = []
afterEach(async () => { await Promise.all(services.splice(0).map(service => service.close())) })
const source = "export default scene({ end: 'advance' }, s => { const x = s.slider('x', { min: 0, max: 3, default: 1 }); s.circle('dot', { position: [x, 0] }); s.wait(1); });"
const fixture: Generator = async (_request, index) => index >= 2 ? null : ({ audio: new Uint8Array([1, 2, 3]), scene: { id: `scene-${index}`, index, duration: 1, source, captions: [] } })
const input = { title: 'Vectors', topic: 'Explain vectors', documents: [] }
const api = (path = '', init?: RequestInit) => new Request(`http://localhost/api/videos${path}`, init)
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 300; i++) { if (check()) return; await Bun.sleep(10) }
  throw new Error('Timed out waiting for generation')
}

test('creation is idempotent, private, durable and publishes assets before scenes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-videos-'))
  try {
    const service = new VideoService(join(dir, 'videos.sqlite'), fixture); services.push(service)
    const response = await service.handle(api('', { method: 'POST', headers: { 'Idempotency-Key': 'one' }, body: JSON.stringify(input) }))
    expect(response.status).toBe(202)
    const cookie = response.headers.get('Set-Cookie')!.split(';')[0]
    const video = await response.json()
    const again = await service.handle(api('', { method: 'POST', headers: { cookie, 'Idempotency-Key': 'one' }, body: JSON.stringify(input) }))
    expect((await again.json()).id).toBe(video.id)
    expect((await service.handle(api(`/${video.id}`))).status).toBe(404)
    const owner = `session:${cookie.split('=')[1]}`
    await waitFor(() => service.get(video.id, owner)?.status === 'complete')
    const manifest = service.get(video.id, owner)!
    expect(manifest.scenes.map(scene => scene.index)).toEqual([0, 1])
    for (const scene of manifest.scenes) expect((await service.handle(new Request(`http://localhost${scene.audio.url}`, { headers: { cookie } }))).status).toBe(200)
    const events = await service.handle(api(`/${video.id}/events`, { headers: { cookie, 'Last-Event-ID': '1' } }))
    expect(await events.text()).toContain(JSON.stringify(manifest))
    await service.close(); services.splice(services.indexOf(service), 1)
    const reopened = new VideoService(join(dir, 'videos.sqlite'), fixture); services.push(reopened)
    expect(reopened.get(video.id, owner)).toEqual(manifest)
    expect(reopened.list(owner)).toHaveLength(1)
  } finally { await Promise.all(services.splice(0).map(service => service.close())); await rm(dir, { recursive: true, force: true }) }
})

test('unfinished jobs resume after restart and subscriptions do not own generation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-resume-'))
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const service = new VideoService(join(dir, 'db'), async (request, index) => { if (index === 1) await gate; return fixture(request, index) }); services.push(service)
  const video = service.create('user:a', 'one', input)
  await waitFor(() => service.get(video.id, 'user:a')?.scenes.length === 1)
  const abort = new AbortController()
  const response = await service.handle(api(`/${video.id}/events`, { headers: { 'x-user-id': 'a' }, signal: abort.signal }))
  const reader = response.body!.getReader()
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('scene-0')
  abort.abort()
  const closing = service.close(); release(); await closing; services.splice(services.indexOf(service), 1)
  const reopened = new VideoService(join(dir, 'db'), fixture); services.push(reopened)
  await waitFor(() => reopened.get(video.id, 'user:a')?.status === 'complete')
  expect(reopened.get(video.id, 'user:a')?.scenes).toHaveLength(2)
  await reopened.close(); services.splice(services.indexOf(reopened), 1)
  await rm(dir, { recursive: true, force: true })
})

test('invalid requests and idempotency conflicts are rejected', async () => {
  const service = new VideoService(':memory:', async () => null); services.push(service)
  const headers = { 'x-user-id': 'a', 'Idempotency-Key': 'one' }
  expect((await service.handle(api('', { method: 'POST', headers, body: '{}' }))).status).toBe(400)
  expect((await service.handle(api('', { method: 'POST', headers: { ...headers, origin: 'https://other.test' }, body: JSON.stringify(input) }))).status).toBe(403)
  await service.handle(api('', { method: 'POST', headers, body: JSON.stringify(input) }))
  expect((await service.handle(api('', { method: 'POST', headers, body: JSON.stringify({ ...input, title: 'Different' }) }))).status).toBe(409)
  expect((await service.handle(api('', { method: 'POST', headers: { ...headers, origin: 'https://localhost', 'x-forwarded-proto': 'https' }, body: JSON.stringify(input) }))).status).toBe(202)
})
