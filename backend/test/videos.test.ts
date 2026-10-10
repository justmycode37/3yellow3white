import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SHARED_OWNER, VideoService } from '../src/videos'
import type { Generator } from '../src/videos'
import { parseThumbnailSVG } from '../src/agents/thumbnail'

const services: VideoService[] = []
afterEach(async () => { await Promise.all(services.splice(0).map(service => service.close())) })
const source = "export default scene({ end: 'advance' }, s => { const x = s.slider('x', { min: 0, max: 3, default: 1 }); s.circle('dot', { position: [x, 0] }); s.wait(1); });"
const fixture: Generator = async (_request, index) => index >= 2 ? null : ({ audio: new Uint8Array([1, 2, 3]), scene: { id: `scene-${index}`, index, duration: 1, source, captions: [] } })
const input = { title: 'Vectors', topic: 'Explain vectors', documents: [] }
const thumbnail = parseThumbnailSVG('<svg viewBox="0 0 420 270"><path d="M100 200Q200 130 280 80"/></svg>')
const api = (path = '', init?: RequestInit) => new Request(`http://localhost/api/videos${path}`, init)
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 300; i++) { if (check()) return; await Bun.sleep(10) }
  throw new Error('Timed out waiting for generation')
}

test('thumbnail generation overlaps scenes, persists, and finishes before the terminal event', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-thumbnails-'))
  let release!: () => void, calls = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  const service = new VideoService(join(dir, 'db'), fixture, 'pi', async request => {
    calls++; expect(request.topic).toBe(input.topic); await gate; return thumbnail
  }); services.push(service)
  try {
    const video = service.create(SHARED_OWNER, 'one', input)
    await waitFor(() => service.get(video.id, SHARED_OWNER)?.scenes.length === 2)
    expect(service.get(video.id, SHARED_OWNER)?.thumbnailStatus).toBe('generating')
    expect(service.get(video.id, SHARED_OWNER)?.status).toBe('generating')
    release()
    await waitFor(() => service.get(video.id, SHARED_OWNER)?.status === 'complete')
    expect(service.get(video.id, SHARED_OWNER)?.thumbnail).toEqual(thumbnail)
    const events = await service.handle(api(`/${video.id}/events`))
    expect(await events.text()).toContain('"thumbnailStatus":"complete"')
    await service.close(); services.splice(services.indexOf(service), 1)
    const reopened = new VideoService(join(dir, 'db'), fixture, 'pi', async () => { calls++; return thumbnail }); services.push(reopened)
    expect(reopened.get(video.id, SHARED_OWNER)?.thumbnail).toEqual(thumbnail)
    expect(calls).toBe(1)
  } finally { release(); await Promise.all(services.splice(0).map(s => s.close())); await rm(dir, { recursive: true, force: true }) }
})

test('thumbnail failure preserves playable videos and does not stop the queue', async () => {
  const service = new VideoService(':memory:', fixture, 'pi', async () => { throw new Error('private provider error') }); services.push(service)
  const first = service.create(SHARED_OWNER, 'one', input), second = service.create(SHARED_OWNER, 'two', input)
  await waitFor(() => service.get(second.id, SHARED_OWNER)?.status === 'complete')
  const video = service.get(first.id, SHARED_OWNER)!
  expect(video).toMatchObject({ status: 'complete', thumbnailStatus: 'failed' })
  expect(video.scenes).toHaveLength(2)
  expect(video.thumbnail).toBeUndefined()
  expect(JSON.stringify(video)).not.toContain('private provider error')
})

test('deleting a video cancels its thumbnail and prevents late publication', async () => {
  let started = false, aborted = false
  const service = new VideoService(':memory:', fixture, 'pi', async (_request, context) => {
    started = true
    await new Promise<void>((_, reject) => context.signal.addEventListener('abort', () => { aborted = true; reject(context.signal.reason) }, { once: true }))
    return thumbnail
  }); services.push(service)
  const video = service.create(SHARED_OWNER, 'one', input)
  await waitFor(() => started)
  service.delete(video.id)
  await waitFor(() => aborted)
  expect(service.get(video.id, SHARED_OWNER)).toBeUndefined()
})

test('interrupted thumbnails resume while completed thumbnails are reused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-thumbnail-resume-'))
  let started = false
  const service = new VideoService(join(dir, 'db'), fixture, 'pi', async (_request, context) => {
    started = true
    await new Promise<void>((_, reject) => context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true }))
    return thumbnail
  }); services.push(service)
  try {
    const video = service.create(SHARED_OWNER, 'one', input)
    await waitFor(() => started)
    await service.close(); services.splice(services.indexOf(service), 1)
    let calls = 0
    const reopened = new VideoService(join(dir, 'db'), fixture, 'pi', async () => { calls++; return thumbnail }); services.push(reopened)
    await waitFor(() => reopened.get(video.id, SHARED_OWNER)?.status === 'complete')
    expect(reopened.get(video.id, SHARED_OWNER)?.thumbnail).toEqual(thumbnail)
    expect(calls).toBe(1)
  } finally { await Promise.all(services.splice(0).map(s => s.close())); await rm(dir, { recursive: true, force: true }) }
})

test('creation is idempotent, shared, durable and publishes assets before scenes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-videos-'))
  try {
    const service = new VideoService(join(dir, 'videos.sqlite'), fixture); services.push(service)
    const response = await service.handle(api('', { method: 'POST', headers: { 'Idempotency-Key': 'one' }, body: JSON.stringify(input) }))
    expect(response.status).toBe(202)
    const cookie = 'aha-session=' + crypto.randomUUID()
    const video = await response.json()
    const again = await service.handle(api('', { method: 'POST', headers: { cookie, 'Idempotency-Key': 'one' }, body: JSON.stringify(input) }))
    expect((await again.json()).id).toBe(video.id)
    expect((await service.handle(api(`/${video.id}`))).status).toBe(200)
    const owner = SHARED_OWNER
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

test('configured public origin permits proxied writes while rejecting other origins and cross-site requests', async () => {
  const previousOrigin = process.env.NARRATION_PUBLIC_ORIGIN
  const publicOrigin = 'https://11.hackathon.ethz.ch'
  process.env.NARRATION_PUBLIC_ORIGIN = publicOrigin
  try {
    const service = new VideoService(':memory:', async () => null); services.push(service)
    const headers = { 'Idempotency-Key': 'proxied', origin: publicOrigin, 'sec-fetch-site': 'same-origin' }
    const internalURL = 'http://app:8080/api/videos'
    const response = await service.handle(new Request(internalURL, { method: 'POST', headers, body: JSON.stringify(input) }))
    expect(response.status).toBe(202)
    const video = await response.json()
    for (const method of ['POST', 'DELETE']) {
      const url = method === 'POST' ? internalURL : `${internalURL}/${video.id}`
      for (const origin of ['https://evil.test', 'http://11.hackathon.ethz.ch', 'http://app:8080']) {
        expect((await service.handle(new Request(url, { method, headers: { ...headers, origin } }))).status).toBe(403)
      }
      expect((await service.handle(new Request(url, { method, headers: { ...headers, 'sec-fetch-site': 'cross-site' } }))).status).toBe(403)
    }
    expect((await service.handle(new Request(`${internalURL}/${video.id}`, { method: 'DELETE', headers: { ...headers, 'x-forwarded-proto': 'http' } }))).status).toBe(204)
  } finally {
    if (previousOrigin === undefined) delete process.env.NARRATION_PUBLIC_ORIGIN
    else process.env.NARRATION_PUBLIC_ORIGIN = previousOrigin
  }
})

test('multipart uploads are durable, extracted in the worker, and included in idempotency', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aha-uploads-'))
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const received: string[] = []
  const service = new VideoService(join(dir, 'db'), async (request, index) => {
    received.push(request.documents[0].text)
    await gate
    return fixture(request, index)
  }); services.push(service)
  const post = (text: string) => {
    const form = new FormData()
    form.set('request', JSON.stringify({ ...input, topic: '' }))
    form.append('files', new File([text], 'notes.md', { type: 'text/markdown' }))
    return service.handle(api('', { method: 'POST', headers: { 'Idempotency-Key': 'upload' }, body: form }))
  }
  try {
    const created = await post('Vectors have direction.')
    expect(created.status).toBe(202)
    const video = await created.json()
    expect((await (await post('Vectors have direction.')).json()).id).toBe(video.id)
    expect((await post('Changed content, same filename.')).status).toBe(409)
    await waitFor(() => received.length > 0)
    expect(received[0]).toBe('Vectors have direction.')
    const closing = service.close(); release(); await closing; services.splice(services.indexOf(service), 1)
    const restarted = new VideoService(join(dir, 'db'), async (request, index) => {
      expect(request.documents).toEqual([{ name: 'notes.md', text: 'Vectors have direction.' }])
      return fixture(request, index)
    }); services.push(restarted)
    await waitFor(() => restarted.get(video.id, SHARED_OWNER)?.status === 'complete')
    expect((await (await restarted.handle(api('', { headers: { 'x-user-id': 'another-user' } }))).json())[0].id).toBe(video.id)
  } finally { release(); await Promise.all(services.splice(0).map(service => service.close())); await rm(dir, { recursive: true, force: true }) }
})

test('deleting an active video closes its subscription, removes assets, and keeps the queue running', async () => {
  let pending = false, aborted = false
  const service = new VideoService(':memory:', async (request, index, context) => {
    if (request.title === 'Delete me' && index === 1) {
      pending = true
      await new Promise<void>((_, reject) => context!.signal.addEventListener('abort', () => { aborted = true; reject(context!.signal.reason) }, { once: true }))
    }
    return fixture(request, index)
  }); services.push(service)
  const video = service.create(SHARED_OWNER, 'delete', { ...input, title: 'Delete me' })
  const next = service.create(SHARED_OWNER, 'next', input)
  await waitFor(() => pending)
  const audioURL = service.get(video.id, SHARED_OWNER)!.scenes[0].audio.url
  const events = await service.handle(api(`/${video.id}/events`))
  const reader = events.body!.getReader()
  await reader.read()
  expect((await service.handle(api(`/${video.id}`, { method: 'DELETE', headers: { origin: 'https://evil.test' } }))).status).toBe(403)
  expect((await service.handle(api(`/${video.id}`, { method: 'DELETE' }))).status).toBe(204)
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: deleted')
  expect((await reader.read()).done).toBe(true)
  await waitFor(() => service.get(next.id, SHARED_OWNER)?.status === 'complete')
  expect(aborted).toBe(true)
  expect(service.get(video.id, SHARED_OWNER)).toBeUndefined()
  expect((await service.handle(new Request(`http://localhost${audioURL}`))).status).toBe(404)
  expect(service.list()).toHaveLength(1)
})

test('uploaded photos are passed to the script agent as images', async () => {
  let image: string | undefined
  const service = new VideoService(':memory:', async (_request, _index, context) => { image = context?.images?.[0]?.data; return null }); services.push(service)
  const form = new FormData()
  form.set('request', JSON.stringify({ ...input, topic: '' }))
  form.append('files', new File([new Uint8Array([137, 80, 78, 71])], 'notes.png'))
  const response = await service.handle(api('', { method: 'POST', headers: { 'Idempotency-Key': 'photo' }, body: form }))
  expect(response.status).toBe(202)
  await waitFor(() => Boolean(image))
  expect(image).toBe(Buffer.from([137, 80, 78, 71]).toString('base64'))
})
