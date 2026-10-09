import type { Player, PlayerState, SceneSource } from 'animlib'

type AnimationPlayer = Pick<Player, 'submit' | 'seek' | 'play' | 'pause' | 'subscribe' | 'dispose'>
export interface LessonPlaybackState {
  time: number
  duration: number
  playing: boolean
  ended: boolean
  ready: boolean
  error: string
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

  constructor(player: AnimationPlayer) {
    this.player = player
    this.unsubscribe = player.subscribe(state => {
      if (this.disposed) return
      this.scenes = state.scenes
      const duration = state.scenes.reduce((total, scene) => total + scene.duration, 0)
      const time = sequenceTime(state)
      const ended = duration > 0 && time >= duration
      if (ended || state.status === 'ended' || state.status === 'blocked') this.wantsPlay = false
      this.update({
        time, duration,
        playing: state.status === 'playing', ended, error: state.error ?? '',
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

  toggle() {
    if (!this.state.ready || this.state.error || this.suspended) return Promise.resolve()
    if (this.state.ended) return this.restart()
    this.wantsPlay = !this.wantsPlay
    // Stop immediately, even if a prior seek is still queued.
    if (!this.wantsPlay) this.player.pause()
    return this.run(() => this.syncPlayback())
  }

  seek(time: number) {
    if (!this.state.ready || this.state.error) return Promise.resolve()
    return this.run(async () => {
      await this.player.seek(scenePosition(this.scenes, time))
      if (this.disposed) return
      if (time >= this.state.duration) this.wantsPlay = false
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
