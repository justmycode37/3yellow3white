import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, FileText, ListTree, LoaderCircle, Plus, Upload, X } from 'lucide-react'
import { createStudyPlan, exampleDocument } from './plan'
import type { PlanDocument, StudyPlan, VideoSegment } from './plan'

const storageKey = 'aha-study-plan'

function savedPlan(): StudyPlan | null {
  try {
    const plan = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (plan?.version === 1 && typeof plan.title === 'string' && Array.isArray(plan.chapters) && plan.chapters.every((chapter: StudyPlan['chapters'][number]) => typeof chapter.title === 'string' && Array.isArray(chapter.segments) && chapter.segments.every(segment => typeof segment.title === 'string' && typeof segment.text === 'string' && typeof segment.minutes === 'number'))) return plan
  } catch { /* An unavailable or outdated saved plan starts with the upload screen. */ }
  return null
}

export default function PlanPage({ onCreateVideo }: { onCreateVideo: (segment: VideoSegment) => void }) {
  const [plan, setPlan] = useState<StudyPlan | null>(savedPlan)
  const [editing, setEditing] = useState(false)
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [document, setDocument] = useState<PlanDocument | null>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [storageNote, setStorageNote] = useState('')
  const [dragging, setDragging] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const reader = useRef<AbortController | null>(null)
  const busy = !!status
  const showInput = !plan || editing
  const segments = plan?.chapters.flatMap(chapter => chapter.segments) || []

  useEffect(() => () => reader.current?.abort(), [])

  const save = (next: StudyPlan) => {
    setPlan(next); setEditing(false); setError(''); setStorageNote('')
    window.scrollTo({ top: 0, behavior: 'instant' })
    try { localStorage.setItem(storageKey, JSON.stringify(next)) }
    catch { setStorageNote('This plan is available here, but couldn’t be saved on this browser. Keep this page open to use it.') }
  }

  const loadFile = async (file?: File) => {
    if (!file) return
    reader.current?.abort()
    const controller = new AbortController()
    reader.current = controller
    setError(''); setDocument(null); setStatus('Reading your document…')
    try {
      const { readPlanDocument } = await import('./documentReader')
      const next = await readPlanDocument(file, message => { if (!controller.signal.aborted) setStatus(message) }, controller.signal)
      if (!controller.signal.aborted) setDocument(next)
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'We couldn’t read this file. Try another document or paste its text.')
    } finally {
      if (!controller.signal.aborted) setStatus('')
    }
  }

  const build = () => {
    try {
      const source = mode === 'file' ? document : { name: title.trim() || 'Your notes', lines: text.split(/\r?\n/).map(text => ({ text })) }
      if (!source) return
      save(createStudyPlan(source))
    } catch (error) { setError(error instanceof Error ? error.message : 'We couldn’t make a plan from this material.') }
  }

  const useExample = () => save({ ...createStudyPlan(exampleDocument), example: true })

  return <main className="plan-page">
    <div className="plan-page-heading"><div><h1>Plan</h1>{showInput && <p>Break your course into short videos.</p>}</div>{plan && !editing && <button className="plan-new-button" aria-label="New plan" onClick={() => { setEditing(true); setError('') }}><Plus size={18}/><span>New plan</span></button>}</div>
    {showInput ? <section className="plan-input-panel" aria-label="Create a study plan">
      <div className="plan-input-tabs" role="group" aria-label="Material input"><button aria-pressed={mode === 'file'} disabled={busy} className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); setError('') }}><Upload size={16}/> Document</button><button aria-pressed={mode === 'text'} disabled={busy} className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); setError('') }}><FileText size={16}/> Paste text</button></div>
      {mode === 'file' ? <>
        <input ref={picker} type="file" accept=".pdf,.docx,.txt,.md" hidden aria-label="Upload course document" onChange={event => { void loadFile(event.target.files?.[0]); event.target.value = '' }}/>
        <button className={`plan-dropzone ${dragging ? 'dragging' : ''} ${document ? 'has-document' : ''}`} disabled={busy} onClick={() => picker.current?.click()} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) void loadFile(event.dataTransfer.files[0]) }}>
          <span className="plan-upload-icon">{busy ? <LoaderCircle className="loading-icon" size={27}/> : document ? <Check size={27}/> : <Upload size={27}/>}</span>
          <strong>{busy ? 'Reading your material' : document ? document.name : 'Drop your course material here'}</strong>
          <span>{busy ? status : document ? `${document.pages ? `${document.pages} pages · ` : ''}Ready to make a plan` : 'PDF, Word, or text · up to 50 MB'}</span>
          {!busy && <span className="plan-browse">{document ? 'Choose another file' : 'Choose a document'} <Plus size={15}/></span>}
        </button>
        <span className="sr-only" role="status">{status}</span>
        {busy && <button className="plan-cancel-reading" onClick={() => { reader.current?.abort(); setStatus('') }}>Cancel reading <X size={14}/></button>}
      </> : <div className="plan-text-input"><input aria-label="Plan title" placeholder="Subject or document title" value={title} onChange={event => setTitle(event.target.value)} maxLength={100}/><textarea aria-label="Course material" placeholder={'Paste your script or notes here.\n\nInclude chapter headings if you have them.'} value={text} onChange={event => setText(event.target.value)} maxLength={1000000}/></div>}
      {error && <p className="plan-error" role="alert">{error}</p>}
      <div className="plan-input-footer"><span>Your document stays on this device.</span><button className="primary-button" disabled={busy || (mode === 'file' ? !document : !text.trim())} onClick={build}>Make a plan <ArrowRight size={17}/></button></div>
      <div className="plan-input-note">{plan ? <button onClick={() => { reader.current?.abort(); setStatus(''); setEditing(false) }}>Back to your plan</button> : <button disabled={busy} onClick={useExample}>Try a linear algebra example <ArrowRight size={14}/></button>}</div>
    </section> : <>
      <section className="plan-summary" aria-label="Plan overview">
        <div className="plan-source"><FileText size={15}/><span>{plan.sourceName}{plan.sourcePages ? ` · ${plan.sourcePages} pages` : ''}</span>{plan.example && <span className="plan-example-label">Example</span>}</div>
        <h2>{plan.title}</h2>
        <p>{plan.chapters.length} chapters<span>·</span>{segments.length} video topics<span>·</span>~{segments.reduce((sum, segment) => sum + segment.minutes, 0)} min</p>
      </section>
      <div className="plan-outline" aria-label="Chapters and video topics">
        {plan.chapters.map((chapter, chapterIndex) => <section className={`plan-chapter-row chapter-tone-${chapterIndex % 5}`} key={chapter.id} aria-labelledby={`plan-chapter-${chapterIndex}`}>
          <div className="plan-chapter-card">
            <span className="plan-chapter-icon"><ListTree size={24} strokeWidth={1.7}/></span>
            <div><span className="plan-chapter-kicker">Chapter {String(chapterIndex + 1).padStart(2, '0')}</span><h2 id={`plan-chapter-${chapterIndex}`}>{chapter.title}</h2><span className="plan-chapter-count">{chapter.segments.length} {chapter.segments.length === 1 ? 'video' : 'videos'}</span></div>
          </div>
          <ol className="plan-segments">{chapter.segments.map((segment, segmentIndex) => <li key={segment.id}><details className="plan-segment">
            <summary><span className="segment-number">Video {String(segmentIndex + 1).padStart(2, '0')}</span><span className="segment-title">{segment.title}</span><span className="segment-card-bottom"><span className="segment-duration">~{segment.minutes} min</span><span className="segment-open-icon"><ChevronDown size={16}/></span></span></summary>
            <div className="segment-detail"><div className="segment-source-label">Source notes{segment.pageStart && <span> · {segment.pageStart === segment.pageEnd ? `Page ${segment.pageStart}` : `Pages ${segment.pageStart}–${segment.pageEnd}`}</span>}</div><p>{segment.text || 'This topic was found in the document outline. Add your notes when creating the preview.'}</p><button className="secondary-button" onClick={() => onCreateVideo(segment)}>Create a preview <ArrowRight size={15}/></button></div>
          </details></li>)}</ol>
        </section>)}
      </div>
      <p className="plan-method-note">Suggested from your document. Review the topics and estimated lengths before creating a video.</p>
      {storageNote && <p className="plan-error" role="status">{storageNote}</p>}
    </>}
  </main>
}
