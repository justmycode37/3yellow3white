import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, FileText, Layers3, ListTree, LoaderCircle, Plus, Sparkles, Upload, X } from './Icons'
import { createStudyPlan, exampleDocument } from './plan'
import type { PlanDocument, StudyPlan } from './plan'

const storageKey = 'aha-study-plan'

function savedPlan(): StudyPlan | null {
  try {
    const plan = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (plan?.version === 1 && typeof plan.title === 'string' && Array.isArray(plan.chapters) && plan.chapters.every((chapter: StudyPlan['chapters'][number]) => typeof chapter.title === 'string' && Array.isArray(chapter.segments) && chapter.segments.every(segment => typeof segment.title === 'string' && typeof segment.text === 'string' && typeof segment.minutes === 'number'))) return plan
  } catch { /* An unavailable or outdated saved plan starts with the upload screen. */ }
  return null
}

export default function PlanPage() {
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
  const [activeChapter, setActiveChapter] = useState(0)
  const picker = useRef<HTMLInputElement>(null)
  const reader = useRef<AbortController | null>(null)
  const busy = !!status
  const showInput = !plan || editing
  const segments = plan?.chapters.flatMap(chapter => chapter.segments) || []
  const chapterIcons = [BookOpen, ListTree, Layers3, Sparkles]

  useEffect(() => () => reader.current?.abort(), [])

  const save = (next: StudyPlan) => {
    setPlan(next); setEditing(false); setActiveChapter(0); setError(''); setStorageNote('')
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
        <p>{plan.chapters.length} chapters<span>·</span>{segments.length} topics to explain</p>
      </section>
      <div className="plan-workspace" aria-label="Chapters and topics">
        <nav className="plan-chapter-nav" aria-label="Plan chapters">
          {plan.chapters.map((chapter, index) => {
            const Icon = chapterIcons[index % chapterIcons.length]
            return <button key={chapter.id} className={`plan-chapter-link chapter-tone-${index % 5} ${activeChapter === index ? 'active' : ''}`} aria-current={activeChapter === index ? 'true' : undefined} onClick={() => { setActiveChapter(index); window.document.getElementById(`plan-section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              <span className="plan-nav-icon"><Icon size={21}/></span>
              <span className="plan-nav-copy"><span>{chapter.title}</span><small>{chapter.segments.length} {chapter.segments.length === 1 ? 'topic' : 'topics'}</small></span>
              <ArrowUpRight className="plan-nav-arrow" size={17}/>
            </button>
          })}
        </nav>
        <div className="plan-topic-list">{plan.chapters.map((chapter, chapterIndex) => <section className={`plan-topic-panel chapter-tone-${chapterIndex % 5}`} key={chapter.id} id={`plan-section-${chapterIndex}`} aria-labelledby={`plan-chapter-${chapterIndex}`}>
          <div className="plan-topic-heading"><div><span className="plan-chapter-kicker">Chapter {String(chapterIndex + 1).padStart(2, '0')}</span><h2 id={`plan-chapter-${chapterIndex}`}>{chapter.title}</h2></div><span className="plan-topic-count">{chapter.segments.length} {chapter.segments.length === 1 ? 'topic' : 'topics'}</span></div>
          <ol className="plan-topic-grid">{chapter.segments.map(segment => <li key={segment.id}>
            <div className="plan-topic-card">
              <strong className="plan-topic-title">{segment.title}</strong>
              <span className="plan-topic-action" aria-hidden="true"><span>Explain</span></span>
            </div>
          </li>)}</ol>
        </section>)}</div>
      </div>
      <p className="plan-method-note">Suggested from your document. These topics are ready for future explanations.</p>
      {storageNote && <p className="plan-error" role="status">{storageNote}</p>}
    </>}
  </main>
}
