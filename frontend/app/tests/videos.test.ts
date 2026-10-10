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
  const merged = mergeVideoLessons([earlier], [created, local, videoLesson(earlier)], [created.id])
  assert.deepEqual(merged.map(lesson => lesson.id), ['earlier', 'just-created', 'local'])
  assert.equal(new Set(merged.map(lesson => lesson.id)).size, merged.length)
  assert.equal(mergeVideoLessons([earlier], [])[0].subject, 'My ideas')
})

test('authoritative refresh removes deleted server videos and reflects generation status', () => {
  const removed = videoLesson(manifest('deleted'))
  const running = { ...manifest('running'), status: 'generating' as const, provider: 'pi' as const }
  const merged = mergeVideoLessons([running], [removed])
  assert.deepEqual(merged.map(lesson => lesson.id), ['running'])
  assert.equal(merged[0].generationStatus, 'generating')
  assert.equal(merged[0].demo, false)
  assert.equal(merged[0].subtitle, 'Visual explanation')
})
