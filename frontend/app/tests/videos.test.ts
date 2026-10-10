import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeVideoLessons, videoLesson } from '../src/videos.ts'
import type { VideoManifest } from '../../../shared/video/contract.ts'

const manifest = (id = 'video-1'): VideoManifest => ({
  schemaVersion: 1, id, title: 'Convergent sequences', revision: 2,
  status: 'complete', provider: 'simulated', createdAt: '2026-10-10T00:00:00Z',
  scenes: [{ id: 'scene-1', index: 0, source: '', duration: 6, audio: { id: 'audio-1', url: '/audio.wav' }, captions: [] }],
})

test('server refresh preserves curriculum context and updates measured duration', () => {
  const video = manifest()
  const previous = { ...videoLesson(video), subject: 'Analysis', subtitle: 'Sequences', color: 'blue', duration: 0,
    artwork: 'idea' as const, source: { name: 'Lecture.pdf', chapter: 'Sequences', text: 'The original course material.' } }
  const [updated] = mergeVideoLessons([video], [previous])
  assert.equal(updated.videoId, video.id)
  assert.equal(updated.duration, 6)
  assert.equal(updated.subject, 'Analysis')
  assert.equal(updated.subtitle, 'Sequences')
  assert.equal(updated.artwork, 'idea')
  assert.deepEqual(updated.source, previous.source)
})

test('a list response does not erase a just-created job or older local previews', () => {
  const earlier = manifest('earlier'), created = videoLesson(manifest('just-created'))
  const local = { ...videoLesson(manifest('local')), videoId: undefined }
  const merged = mergeVideoLessons([earlier], [created, local, videoLesson(earlier)])
  assert.deepEqual(merged.map(lesson => lesson.id), ['earlier', 'just-created', 'local'])
  assert.equal(new Set(merged.map(lesson => lesson.id)).size, merged.length)
  assert.equal(mergeVideoLessons([earlier], [])[0].subject, 'My ideas')
})

test('Astra preparation is not presented as simulated or playable video', () => {
  const video: VideoManifest = { ...manifest(), provider: 'astra', status: 'script_ready', scenes: [] }
  const lesson = videoLesson(video)
  assert.equal(lesson.demo, false)
  assert.equal(lesson.duration, 0)
  assert.equal(lesson.subtitle, 'Explanation prepared')
  const earlier = { ...lesson, subtitle: 'Preparing your explanation' }
  assert.equal(mergeVideoLessons([video], [earlier])[0].subtitle, 'Explanation prepared')
})

test('workspace sends actual upload bytes with JSON metadata and an idempotency key', async () => {
  const { requestVideo } = await import('../src/videos.ts')
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/videos')
    assert.equal((options!.headers as Record<string, string>)['Idempotency-Key'], 'upload-key')
    assert.equal((options!.headers as Record<string, string>)['Content-Type'], undefined)
    const body = options!.body as FormData
    assert.deepEqual(JSON.parse(body.get('request') as string), { title: 'Topic', topic: 'Explain this page.', documents: [] })
    assert.equal((body.get('files') as File).name, 'page.png')
    assert.equal(await (body.get('files') as File).text(), 'image pixels')
    return Response.json({ ...manifest(), provider: 'astra', status: 'queued', scenes: [] })
  }
  try { await requestVideo({ title: 'Topic', topic: 'Explain this page.', documents: [] }, 'upload-key', [new File(['image pixels'], 'page.png')]) }
  finally { globalThis.fetch = original }
})
