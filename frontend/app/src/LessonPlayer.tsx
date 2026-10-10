import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Maximize, MenuGlyph, Pause, Play, RotateCcw } from './Icons'
import type { Lesson } from './data'
import { formatTime } from './data'
import { LessonPlayback } from './lessonPlayback'
import type { LessonPlaybackState } from './lessonPlayback'
import { lessonScenes } from './lessonScenes'
import { watchVideo } from './videos'
import type { Player } from 'animlib'
import CanvasQuestion, { useCanvasQuestion } from './CanvasQuestion'

const loadingState: LessonPlaybackState = { time: 0, duration: 0, playing: false, ended: false, ready: false, error: '' }
const getLoadingState = () => loadingState
const subscribeLoading = () => () => {}
export default function LessonPlayer({ lesson, menuOpen, onMenu, menuContent, onHome, overlayOpen }: {
  lesson: Lesson; menuOpen: boolean; onMenu: () => void
  menuContent: ReactNode; onHome: () => void; overlayOpen: boolean
}) {
  const canvasHost = useRef<HTMLDivElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const renderer = useRef<Player | undefined>(undefined)
  const latestLesson = useRef(lesson)
  latestLesson.current = lesson
  const suspended = useRef(menuOpen || overlayOpen)
  const [playback, setPlayback] = useState<LessonPlayback>()
  const [startupError, setStartupError] = useState('')
  const [connection, setConnection] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [isFullscreen, setFullscreen] = useState(false)
  const [cursorHidden, setCursorHidden] = useState(false)
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const state = useSyncExternalStore(playback?.subscribe ?? subscribeLoading, playback?.getState ?? getLoadingState)
  const { draft, openQuestion, closeQuestion, changeQuestion } = useCanvasQuestion({
    lesson, time: state.time, disabled: menuOpen || overlayOpen || !state.ready || Boolean(startupError || state.error),
    getScene: () => {
      const player = renderer.current
      if (!player) return undefined
      const current = player.getState()
      return { id: current.scene, time: current.time, frame: player.getInteractionSnapshot()?.frame }
    },
  })
  const questionOpen = Boolean(draft)
  suspended.current = menuOpen || overlayOpen || questionOpen
  const error = startupError || state.error
  const duration = state.duration || lesson.duration
  const progress = duration ? Math.min(1, state.time / duration) : 0
  const enabled = state.ready && !error && !menuOpen && !overlayOpen && !questionOpen
  const playbackRequested = state.playing || state.buffering && state.wantsPlay
  const revealCursor = useCallback(() => {
    clearTimeout(cursorTimer.current)
    setCursorHidden(false)
    if (state.playing && !menuOpen && !overlayOpen && !questionOpen) {
      cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000)
    }
  }, [state.playing, menuOpen, overlayOpen, questionOpen])

  useEffect(() => {
    revealCursor()
    return () => clearTimeout(cursorTimer.current)
  }, [revealCursor])

  useEffect(() => {
    // Library refreshes replace lesson metadata, including on window focus.
    // Key playback to lesson/video identity, not the metadata object's reference.
    const lesson = latestLesson.current
    let active = true
    let controller: LessonPlayback | undefined
    const host = canvasHost.current
    let disconnect: (() => void) | undefined
    setPlayback(undefined)
    setStartupError('')
    // Load the renderer only when opening a lesson, keeping the workspace light.
    void import('animlib').then(({ createPlayer, Color, THREE_BLUE_ONE_BROWN_PALETTE }) => {
      if (!active || !host || !screen.current) return
      // Own the canvas imperatively: renderer recovery can replace a context-locked surface.
      const canvas = document.createElement('canvas')
      canvas.className = 'lesson-canvas'
      canvas.setAttribute('aria-label', `Animated preview: ${lesson.title}`)
      canvas.setAttribute('role', 'img')
      host.append(canvas)
      const player = createPlayer({ canvas, controlsRoot: host.parentElement! })
      renderer.current = player
      // Keep the lesson canvas black regardless of the surrounding app theme.
      player.setDisplayPalette(THREE_BLUE_ONE_BROWN_PALETTE)
      controller = new LessonPlayback(player, !lesson.videoId)
      void controller.setSuspended(suspended.current)
      setPlayback(controller)
      if (lesson.videoId) {
        const current = controller
        disconnect = watchVideo(lesson.videoId, manifest => {
          void current.acceptManifest(manifest)
        }, setConnection)
        return
      }
      void controller.load(lessonScenes(lesson, {
        background: Color.BLACK,
        ink: Color.WHITE,
        accent: Color.BLUE,
      }), lesson.duration * (lesson.progress ?? 0))
    }).catch(error => {
      if (active) setStartupError(error instanceof Error ? error.message : String(error))
    })
    return () => { active = false; disconnect?.(); renderer.current = undefined; controller?.dispose(); host?.replaceChildren() }
  }, [lesson.id, lesson.videoId, attempt])

  useEffect(() => { void playback?.setSuspended(menuOpen || overlayOpen || questionOpen) }, [playback, menuOpen, overlayOpen, questionOpen])
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === screen.current)
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (menuOpen || overlayOpen || questionOpen || (event.target as HTMLElement).closest('input,select,textarea,button,[contenteditable="true"]')) return
      if (event.key === 'Escape') { onHome(); return }
      if (!enabled || !playback) return
      if (event.code === 'Space') { event.preventDefault(); void playback.toggle() }
      if (event.key === 'ArrowRight') { event.preventDefault(); void playback.seek(playback.getState().time + 10) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); void playback.seek(playback.getState().time - 10) }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [enabled, playback, onHome, menuOpen, overlayOpen, questionOpen])

  const fullscreen = () => {
    const action = document.fullscreenElement ? document.exitFullscreen?.() : screen.current?.requestFullscreen?.()
    void action?.catch(() => {})
  }

  return <div className={`player-page ${state.playing ? 'is-playing' : ''} ${cursorHidden && state.playing && !menuOpen && !overlayOpen && !questionOpen ? 'is-player-idle' : ''}`} ref={screen} tabIndex={-1} onContextMenu={openQuestion} onPointerMove={revealCursor} onPointerDown={revealCursor} onKeyDown={revealCursor} onFocusCapture={revealCursor}>
    <div className="player-menu-anchor"><button className={`icon-button player-menu-toggle ${menuOpen ? 'is-open' : ''}`} aria-label="Open video menu and settings" aria-expanded={menuOpen} aria-controls="navigation-drawer" onClick={onMenu}><MenuGlyph/></button>{menuContent}</div>
    {(connection || (state.ready && state.generationError)) && <p className="player-notice" role="status">{state.generationError || connection}</p>}
    <div className="player-stage">
      <div ref={canvasHost} className="lesson-canvas-host"/>
      {!state.ready && !error && <p className="player-status" role="status">{state.generationError || 'Loading your lesson…'}</p>}
      {state.ready && state.buffering && <p className="player-status" role="status">Preparing the next scene…</p>}
      {error && <div className="player-status player-error" role="alert"><strong>This lesson couldn’t play.</strong><p>{error}</p><button className="secondary-button" onClick={() => setAttempt(old => old + 1)}>Try again</button></div>}
    </div>
    {draft && <CanvasQuestion draft={draft} screen={screen} onChange={changeQuestion} onClose={closeQuestion}/>}
    <div className="player-controls">
      <div className="player-control-row">
        <button className="icon-button" disabled={!enabled} aria-label={state.ended ? 'Replay lesson' : playbackRequested ? 'Pause lesson' : 'Play lesson'} onClick={() => { void playback?.toggle() }}>{state.ended ? <RotateCcw size={19}/> : playbackRequested ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}</button>
        <div className="player-timeline">
          <div className="progress-wrap"><div className="progress-track"><span className="progress-fill" style={{ width: `${progress * 100}%` }}/><span className="progress-thumb" style={{ left: `${progress * 100}%` }}/></div><input type="range" min="0" max={duration} step="0.1" value={state.time} disabled={!enabled} onChange={event => { void playback?.seek(Number(event.target.value)) }} aria-label="Video progress" aria-valuetext={`${formatTime(state.time)} of ${formatTime(duration)}`}/></div>
          <div className="progress-meta"><span>{formatTime(state.time)}</span><span>{state.playing ? 'A little more understanding, every second.' : state.ended ? 'That’s an aha! moment.' : 'Take your time. Curiosity can wait.'}</span><span>{formatTime(duration)}</span></div>
        </div>
        <button className="icon-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={fullscreen}><Maximize size={17}/></button>
      </div>
    </div>
    {state.ended && <div className="lesson-complete"><button onClick={onHome}>Back to your library <ArrowRight size={16}/></button></div>}
    {enabled && !state.playing && !state.ended && !state.buffering && <button className="paused-indicator" onClick={() => { void playback?.toggle() }} aria-label="Resume lesson"><Play size={24} fill="currentColor"/></button>}
  </div>
}
