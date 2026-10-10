import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Color, compileSource, evaluateScene } from 'animlib'
import type { PlayerState, SceneSource, Submission, SubmitResult } from 'animlib'
import { LessonPlayback, scenePosition, sequenceTime } from '../src/lessonPlayback.ts'
import { lessonScenes } from '../src/lessonScenes.ts'
import { lessons } from '../src/data.ts'

class TestPlayer {
  state: PlayerState = { revision: 0, scene: null, time: 0, duration: 0, status: 'empty', scenes: [], controls: [], orbitEnabled: false }
  disposed = false
  calls: string[] = []
  result: SubmitResult = { ok: true, revision: 1, diagnostics: [] }
  submitGate: Promise<void> = Promise.resolve()
  listeners = new Set<(state: PlayerState) => void>()
  emit(change: Partial<PlayerState>) {
    assert.equal(this.disposed, false, 'no player operations after disposal')
    Object.assign(this.state, change)
    this.listeners.forEach(listener => listener(this.state))
  }
  async submit(_change: Submission) {
    await this.submitGate
    if (this.disposed) return this.result
    this.emit({ scene: 'first', scenes: [{ id: 'first', duration: 10 }, { id: 'second', duration: 20 }], duration: 10, status: 'paused' })
    return this.result
  }
  async seek(position: { scene: string; time: number }) {
    this.calls.push(`seek:${position.scene}:${position.time}`)
    this.emit({ ...position, duration: position.scene === 'first' ? 10 : 20, status: 'paused' })
  }
  async play() { this.calls.push('play'); this.emit({ status: 'playing' }) }
  pause() { this.calls.push('pause'); this.emit({ status: 'paused' }) }
  subscribe(listener: (state: PlayerState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    return () => { this.listeners.delete(listener) }
  }
  dispose() { this.disposed = true }
}
const sources: SceneSource[] = [{ id: 'first', source: '' }, { id: 'second', source: '' }]

test('sequence progress maps boundaries, clamped seeks, and final frames correctly', () => {
  const player = new TestPlayer()
  player.state.scenes = [{ id: 'first', duration: 10 }, { id: 'second', duration: 20 }]
  assert.deepEqual(scenePosition(player.state.scenes, -4), { scene: 'first', time: 0 })
  assert.deepEqual(scenePosition(player.state.scenes, 10), { scene: 'second', time: 0 })
  assert.deepEqual(scenePosition(player.state.scenes, 50), { scene: 'second', time: 20 })
  assert.equal(sequenceTime({ ...player.state, scene: 'second', time: 8 }), 18)
})

test('restores initial progress, follows animlib clock, and resumes a playing seek', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  await playback.load(sources, 12)
  assert.equal(playback.getState().time, 12)
  assert.equal(playback.getState().playing, true)
  player.emit({ time: 5 })
  assert.equal(playback.getState().time, 15)
  await playback.seek(22)
  assert.equal(playback.getState().time, 22)
  assert.equal(playback.getState().playing, true)
  await playback.toggle()
  await playback.seek(5)
  assert.equal(playback.getState().playing, false)
  playback.dispose()
})

test('overlays pause and resume user intent, including an overlay during loading', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  await playback.setSuspended(true)
  await playback.load(sources)
  assert.equal(playback.getState().playing, false)
  await playback.setSuspended(false)
  assert.equal(playback.getState().playing, true)
  await playback.toggle()
  await playback.setSuspended(true)
  await playback.setSuspended(false)
  assert.equal(playback.getState().playing, false, 'closing a menu preserves an intentional pause')
  playback.dispose()
})

test('seeking to the end holds the final frame and replay restarts playback', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  await playback.load(sources)
  await playback.seek(30)
  assert.equal(playback.getState().ended, true)
  assert.equal(playback.getState().playing, false)
  await playback.toggle()
  assert.equal(playback.getState().time, 0)
  assert.equal(playback.getState().playing, true)
  player.emit({ scene: 'second', time: 20, duration: 20, status: 'ended' })
  assert.equal(playback.getState().ended, true)
  await playback.setSuspended(true)
  await playback.setSuspended(false)
  assert.equal(playback.getState().playing, false)
  playback.dispose()
})

test('an intermediate scene hold pauses user intent until Play is pressed', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  await playback.load(sources)
  player.emit({ scene: 'first', time: 10, duration: 10, status: 'ended' })
  assert.equal(playback.getState().ended, false, 'the sequence still has another scene')
  await playback.setSuspended(true)
  await playback.setSuspended(false)
  assert.equal(playback.getState().playing, false, 'closing a menu must not replay a held scene')
  await playback.toggle()
  assert.equal(playback.getState().playing, true, 'the first Play click resumes')
  playback.dispose()
})

test('reports compilation and device failures without running a fake timeline', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  player.result = { ok: false, revision: 0, diagnostics: [{ severity: 'error', code: 'SUBMISSION', message: 'No WebGPU adapter' }] }
  await playback.load(sources)
  assert.equal(playback.getState().ready, false)
  assert.equal(playback.getState().error, 'No WebGPU adapter')
  assert.equal(player.calls.includes('play'), false)
  playback.dispose()
  const second = new TestPlayer(), ready = new LessonPlayback(second)
  await ready.load(sources)
  second.emit({ status: 'blocked', error: 'Device lost' })
  assert.equal(ready.getState().playing, false)
  assert.equal(ready.getState().error, 'Device lost')
  ready.dispose()
})

test('disposal cancels pending initialization and detaches subscriptions', async () => {
  const player = new TestPlayer(), playback = new LessonPlayback(player)
  let release = () => {}
  player.submitGate = new Promise(resolve => { release = resolve })
  const loading = playback.load(sources)
  await Promise.resolve()
  playback.dispose()
  release()
  await loading
  assert.equal(player.disposed, true)
  assert.equal(player.listeners.size, 0)
  assert.equal(player.calls.length, 0)
})

test('every sample lesson compiles into a deterministic animlib timeline with matching duration', async () => {
  for (const lesson of [...lessons, { ...lessons[0], id: 'idea-test', title: 'Convergent sequences', subject: 'Analysis', artwork: 'idea' as const, demo: true, duration: 120 }]) {
    for (const background of [Color.WHITE, Color.BLACK]) {
      const [source] = lessonScenes(lesson, { background, ink: Color.GREY_E, accent: Color.BLUE_E })
      const scene = await compileSource(source.source)
      assert.equal(scene.duration, lesson.duration, lesson.id)
      assert.equal(scene.options.background, background)
      const middle = evaluateScene(scene, scene.duration / 2)
      assert.ok(middle.elements.length > 0, lesson.id)
      assert.deepEqual(evaluateScene(scene, scene.duration / 2), middle)
      assert.notDeepEqual(evaluateScene(scene, 0).elements, middle.elements, lesson.id)
    }
  }
})
