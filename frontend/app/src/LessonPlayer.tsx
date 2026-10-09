import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Maximize, Menu, Pause, Play, RotateCcw } from 'lucide-react'
import type { Lesson } from './data'
import { formatTime } from './data'
import { LessonPlayback } from './lessonPlayback'
import type { LessonPlaybackState } from './lessonPlayback'
import { lessonScenes } from './lessonScenes'

const loadingState: LessonPlaybackState = { time: 0, duration: 0, playing: false, ended: false, ready: false, error: '' }
const getLoadingState = () => loadingState
const subscribeLoading = () => () => {}
const titleSets: Record<string, string[]> = {
  carbon: ['Carbon bonds.', 'Four connections.', 'Sharing electrons.', 'Structure matters.'],
  orbitals: ['Atomic\norbitals.', 'Where electrons\nlive.', 'Shapes in space.', 'Bonds begin here.'],
  reactions: ['Reaction\nmechanisms.', 'Follow the\nelectrons.', 'Breaking &\nforming.', 'A new molecule.'],
  vectors: ['Vectors.', 'Direction &\ndistance.', 'Adding journeys.', 'One new direction.'],
  matrices: ['Matrix\ntransformations.', 'A new basis.', 'Stretch.\nRotate. Shear.', 'Space, transformed.'],
  eigen: ['Eigenvectors.', 'Same direction.', 'A different length.', 'Av = λv.'],
}

export default function LessonPlayer({ lesson, theme, menuOpen, onMenu, menuContent, onHome, overlayOpen }: {
  lesson: Lesson; theme: 'light' | 'dark'; menuOpen: boolean; onMenu: () => void
  menuContent: ReactNode; onHome: () => void; overlayOpen: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const suspended = useRef(menuOpen || overlayOpen)
  suspended.current = menuOpen || overlayOpen
  const [playback, setPlayback] = useState<LessonPlayback>()
  const [startupError, setStartupError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [controls, setControls] = useState(false)
  const [isFullscreen, setFullscreen] = useState(false)
  const state = useSyncExternalStore(playback?.subscribe ?? subscribeLoading, playback?.getState ?? getLoadingState)
  const error = startupError || state.error
  const duration = state.duration || lesson.duration
  const progress = Math.min(1, state.time / duration)
  const chapter = Math.min(3, Math.floor(progress * 4))
  const isMath = lesson.subject === 'Linear algebra'
  const titles = titleSets[lesson.id] || (isMath ? titleSets.vectors : titleSets.carbon)
  const enabled = state.ready && !error && !menuOpen && !overlayOpen

  useEffect(() => {
    let active = true
    let controller: LessonPlayback | undefined
    setPlayback(undefined)
    setStartupError('')
    // Load the renderer only when opening a lesson, keeping the workspace light.
    void import('animlib').then(({ createPlayer }) => {
      if (!active || !canvas.current || !screen.current) return
      const palette = getComputedStyle(screen.current)
      controller = new LessonPlayback(createPlayer({ canvas: canvas.current }))
      void controller.setSuspended(suspended.current)
      setPlayback(controller)
      void controller.load(lessonScenes(lesson, {
        background: theme === 'dark' ? '#000000' : palette.getPropertyValue('--art-bg').trim(),
        ink: palette.color,
        accent: theme === 'dark' ? '#8acde5' : '#365f80',
      }), lesson.duration * (lesson.progress ?? 0))
    }).catch(error => {
      if (active) setStartupError(error instanceof Error ? error.message : String(error))
    })
    return () => { active = false; controller?.dispose() }
  }, [lesson, theme, attempt])

  useEffect(() => { void playback?.setSuspended(menuOpen || overlayOpen) }, [playback, menuOpen, overlayOpen])
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === screen.current)
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (menuOpen || overlayOpen || (event.target as HTMLElement).closest('input,select,textarea,button,[contenteditable="true"]')) return
      if (event.key === 'Escape') { onHome(); return }
      if (!enabled || !playback) return
      if (event.code === 'Space') { event.preventDefault(); void playback.toggle() }
      if (event.key === 'ArrowRight') { event.preventDefault(); void playback.seek(playback.getState().time + 10) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); void playback.seek(playback.getState().time - 10) }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [enabled, playback, onHome, menuOpen, overlayOpen])

  const fullscreen = () => {
    const action = document.fullscreenElement ? document.exitFullscreen?.() : screen.current?.requestFullscreen?.()
    void action?.catch(() => {})
  }

  return <div className={`player-page ${isMath ? 'blue' : lesson.color} ${state.playing ? 'is-playing' : ''}`} ref={screen} onMouseMove={() => setControls(true)} onMouseLeave={() => setControls(false)}>
    <div className="player-menu-anchor"><button className={`icon-button player-menu-toggle ${menuOpen ? 'is-open' : ''}`} aria-label="Open video menu and settings" aria-expanded={menuOpen} aria-controls="navigation-drawer" onClick={onMenu}><Menu size={23}/></button>{menuContent}</div>
    <div className="lesson-stage"><div className="lesson-layout"><div className="lesson-text" key={chapter}><span className="lesson-subject">{lesson.subject}</span><h1>{titles[chapter].split('\n').map((line, i) => <span key={i}>{line}</span>)}</h1><div className="lesson-underline"><svg viewBox="0 0 270 22"><path d="M4 14c68-13 173-13 260-6M17 21c70-8 144-9 222-8"/></svg></div><p>{lesson.title}</p></div><div className="lesson-visual">
      <canvas ref={canvas} className="lesson-canvas" aria-label={`Animated preview: ${lesson.title}`} role="img"/>
      {!state.ready && !error && <p className="player-status" role="status">Loading your lesson…</p>}
      {error && <div className="player-status player-error" role="alert"><strong>This lesson couldn’t play.</strong><p>{error}</p><button className="secondary-button" onClick={() => setAttempt(old => old + 1)}>Try again</button></div>}
    </div></div></div>
    <div className={`player-controls ${controls || !state.playing ? 'show-controls' : ''}`}><div className="playback-buttons"><button className="icon-button" disabled={!enabled} aria-label={state.ended ? 'Replay lesson' : state.playing ? 'Pause lesson' : 'Play lesson'} onClick={() => { void playback?.toggle() }}>{state.ended ? <RotateCcw size={19}/> : state.playing ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}</button><span>Animated lesson preview</span><button className="icon-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={fullscreen}><Maximize size={17}/></button></div><div className="progress-wrap"><div className="progress-track"><span className="progress-fill" style={{ width: `${progress * 100}%` }}/><span className="progress-thumb" style={{ left: `${progress * 100}%` }}/>{[25, 50, 75].map(p => <i key={p} style={{ left: `${p}%` }}/>)}</div><input type="range" min="0" max={duration} step="0.1" value={state.time} disabled={!enabled} onChange={event => { void playback?.seek(Number(event.target.value)) }} aria-label="Video progress" aria-valuetext={`${formatTime(state.time)} of ${formatTime(duration)}`}/></div><div className="progress-meta"><span>{formatTime(state.time)}</span><span>{state.playing ? 'A little more understanding, every second.' : state.ended ? 'That’s an aha! moment.' : 'Take your time. Curiosity can wait.'}</span><span>{formatTime(duration)}</span></div></div>
    {state.ended && <div className="lesson-complete"><button onClick={onHome}>Back to your library <ArrowRight size={16}/></button></div>}
    {enabled && !state.playing && !state.ended && <button className="paused-indicator" onClick={() => { void playback?.toggle() }} aria-label="Resume lesson"><Play size={24} fill="currentColor"/></button>}
  </div>
}
