import type { Player, PlayerState, SceneSource } from 'animlib'
import type { VideoManifest } from '../../../shared/video/contract'

type AnimationPlayer = Pick<Player, 'submit' | 'seek' | 'play' | 'pause' | 'subscribe' | 'dispose'> & Partial<Pick<Player, 'registerAssets' | 'unlockAudio'>>
export interface LessonPlaybackState {
  time: number
  duration: number
  playing: boolean
  ended: boolean
  ready: boolean
  error: string
  buffering?: boolean
  generating?: boolean
  generationError?: string
  wantsPlay?: boolean
}

export function sequenceTime(state: PlayerState): number {
  let offset = 0
  for (const scene of state.scenes) {
    if (scene.id === state.scene) return offset + state.time
    offset += scene.duration
  }
  return 0
}

export function scenePosition(scenes: PlayerState['scenes'], time: number) {
  let remaining = Math.max(0, time)
  for (const [index, scene] of scenes.entries()) {
    if (remaining < scene.duration || index === scenes.length - 1) {
      return { scene: scene.id, time: Math.min(remaining, scene.duration) }
    }
    remaining -= scene.duration
  }
  throw new Error('This lesson has no animation scenes.')
}

// Keeps user playback intent separate from temporary pauses caused by overlays.
// Animlib owns the clock; this adapter only maps it onto the app's controls.
export class LessonPlayback {
  private state: LessonPlaybackState = { time: 0, duration: 0, playing: false, ended: false, ready: false, error: '' }
  private scenes: PlayerState['scenes'] = []
  private listeners = new Set<() => void>()
  private wantsPlay = true
  private suspended = false
  private disposed = false
  private operations: Promise<void> = Promise.resolve()
  private unsubscribe: () => void
  private player: AnimationPlayer
  private complete = true
  private manifestRevision = -1
  private extendingBoundary = Infinity

  constructor(player: AnimationPlayer, autoplay = true) {
    this.player = player
    this.wantsPlay = autoplay
    this.unsubscribe = player.subscribe(state => {
      if (this.disposed) return
      this.scenes = state.scenes
      const duration = state.scenes.reduce((total, scene) => total + scene.duration, 0)
      const time = sequenceTime(state)
      const atEdge = duration > 0 && time >= duration
      const ended = this.complete && atEdge
      const waitingAtAppend = time >= this.extendingBoundary
      if (ended || state.status === 'ended' && !waitingAtAppend && (!atEdge || this.complete) || state.status === 'blocked') this.wantsPlay = false
      this.update({
        time, duration,
        playing: state.status === 'playing', ended, error: state.error ?? '',
        buffering: !this.complete && (atEdge || !duration), wantsPlay: this.wantsPlay,
      })
    })
  }

  getState = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private update(change: Partial<LessonPlaybackState>) {
    if (this.disposed) return
    this.state = { ...this.state, ...change }
    this.listeners.forEach(listener => listener())
  }

  private async syncPlayback() {
    if (this.disposed || !this.state.ready) return
    if (this.state.buffering) { this.player.pause(); return }
    if (this.wantsPlay && !this.suspended) await this.player.play()
    else this.player.pause()
  }

  private run(operation: () => Promise<void>) {
    this.operations = this.operations.then(async () => {
      if (!this.disposed) await operation()
    }).catch(error => {
      if (!this.disposed) {
        this.wantsPlay = false
        this.update({ playing: false, error: error instanceof Error ? error.message : String(error) })
      }
    })
    return this.operations
  }

  load(sources: SceneSource[], initialTime = 0) {
    return this.run(async () => {
      const result = await this.player.submit({ type: 'load', scenes: sources })
      if (this.disposed) return
      if (!result.ok) throw new Error(result.diagnostics.map(diagnostic => diagnostic.message).join('\n'))
      await this.player.seek(scenePosition(this.scenes, initialTime))
      if (this.disposed) return
      this.update({ ready: true })
      await this.syncPlayback()
    })
  }

  acceptManifest(manifest: VideoManifest) {
    return this.run(async () => {
      if (manifest.schemaVersion !== 1) throw new Error('Unsupported video format')
      if (manifest.revision <= this.manifestRevision) return
      this.complete = false
      this.update({ generating: manifest.status === 'generating' || manifest.status === 'queued', generationError: manifest.error })
      for (const scene of manifest.scenes) {
        if (this.scenes.some(existing => existing.id === scene.id)) continue
        if (scene.index !== this.scenes.length) throw new Error('Video scenes arrived out of order')
        const boundary = this.state.duration
        this.player.registerAssets?.({ [scene.audio.id]: { kind: 'audio', url: scene.audio.url } })
        this.extendingBoundary = boundary || Infinity
        let result
        try { result = await this.player.submit({ type: 'insert', after: this.scenes.at(-1)?.id ?? null, scenes: [scene] }) }
        finally { this.extendingBoundary = Infinity }
        if (this.disposed) return
        if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join('\n'))
        // Playback can reach the old edge while the new audio is downloading.
        if (boundary > 0 && this.state.time >= boundary) await this.player.seek(scenePosition(this.scenes, boundary))
        this.update({ ready: true, buffering: false })
        await this.syncPlayback()
      }
      this.complete = manifest.status === 'complete' || manifest.status === 'failed'
      this.manifestRevision = manifest.revision
      const atEdge = this.state.duration > 0 && this.state.time >= this.state.duration
      if (this.complete && atEdge) this.wantsPlay = false
      this.update({ ended: this.complete && atEdge, buffering: !this.complete && (atEdge || !this.state.ready), wantsPlay: this.wantsPlay })
    })
  }

  toggle() {
    if (!this.state.ready || this.state.error || this.suspended) return Promise.resolve()
    if (!this.wantsPlay) void this.player.unlockAudio?.().catch(error => this.update({ error: String(error) }))
    if (this.state.ended) return this.restart()
    this.wantsPlay = !this.wantsPlay
    this.update({ wantsPlay: this.wantsPlay })
    // Stop immediately, even if a prior seek is still queued.
    if (!this.wantsPlay) this.player.pause()
    return this.run(() => this.syncPlayback())
  }

  seek(time: number) {
    if (!this.state.ready || this.state.error) return Promise.resolve()
    return this.run(async () => {
      await this.player.seek(scenePosition(this.scenes, time))
      if (this.disposed) return
      if (time >= this.state.duration && this.complete) this.wantsPlay = false
      await this.syncPlayback()
    })
  }

  restart() {
    if (!this.state.ready || this.state.error) return Promise.resolve()
    this.wantsPlay = true
    return this.seek(0)
  }

  setSuspended(suspended: boolean) {
    this.suspended = suspended
    if (suspended && this.state.ready) this.player.pause()
    return this.run(() => this.syncPlayback())
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
    this.listeners.clear()
    this.player.dispose()
  }
}
