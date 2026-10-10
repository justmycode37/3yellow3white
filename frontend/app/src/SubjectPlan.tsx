import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, FileText, LoaderCircle, Plus, Upload, X } from './Icons'
import { createStudyPlan } from './plan'
import type { CourseSubject } from './curriculum'
import type { PlanDocument, StudyPlan } from './plan'
import { requestStudyPlan, topicLessonText } from './studyPlanClient'
import type { SavedMaterial, TopicVideoRequest } from './subjectPlans'

export default function SubjectPlan({ subject, materials, onAdd, onMakeVideo }: { subject: CourseSubject; materials: SavedMaterial[]; onAdd: (plans: StudyPlan[]) => void; onMakeVideo: (request: TopicVideoRequest) => void }) {
  const [adding, setAdding] = useState(false)
  const chapters = materials.flatMap(material => material.plan.chapters.map(chapter => ({ ...chapter, material })))
  const topicCount = chapters.reduce((total, chapter) => total + chapter.segments.length, 0)
  return <section id="subject-plan" className={`subject-plan subject-${subject.color}`} aria-labelledby="subject-plan-title">
    <div className="subject-plan-heading"><div><h2 id="subject-plan-title">{subject.title}</h2>{chapters.length > 0 && <p>{chapters.length} chapters · {topicCount} topics</p>}</div>{materials.length > 0 && !adding && <button className="subject-add-material" onClick={() => setAdding(true)}><Plus size={16}/> Add material</button>}</div>
    {!materials.length || adding ? <MaterialUpload subject={subject} nextNote={materials.length + 1} onCancel={materials.length ? () => setAdding(false) : undefined} onAdd={plans => { onAdd(plans); setAdding(false) }}/>
    : <div className="subject-material-tags">{materials.map(material => <span key={material.id}><FileText size={13}/>{material.plan.sourceName}</span>)}</div>}
    {chapters.length > 0 && <div className="subject-chapters">{chapters.map((chapter, index) => <section className="subject-chapter" key={`${chapter.material.id}-${chapter.id}`} aria-labelledby={`chapter-${chapter.material.id}-${chapter.id}`}>
      <div className="subject-chapter-heading"><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><div><span className="subject-plan-kicker">Chapter {index + 1}</span><h3 id={`chapter-${chapter.material.id}-${chapter.id}`}>{chapter.title}</h3></div></div>
      <ol className="topic-widget-grid">{chapter.segments.map((topic, topicIndex) => <li key={topic.id}><button className="topic-video-widget" aria-label={`Make me a video: ${topic.title}`} onClick={() => onMakeVideo({ title: topic.title, text: topicLessonText(topic, chapter.material.plan) || `Explain the topic “${topic.title}” from the chapter “${chapter.title}” in ${subject.title}. Only a chapter outline was provided.`, subject: subject.title, color: subject.color, chapter: chapter.title, sourceName: chapter.material.plan.sourceName, minutes: topic.minutes })}>
        <span className="topic-widget-number">{index + 1}.{topicIndex + 1}</span><span className="topic-widget-title">{topic.title}</span><span className="topic-widget-cta" aria-hidden="true"><span>Make me a video <ArrowRight size={15}/></span></span>
      </button></li>)}</ol>
    </section>)}</div>}
  </section>
}

function MaterialUpload({ subject, nextNote, onAdd, onCancel }: { subject: CourseSubject; nextNote: number; onAdd: (plans: StudyPlan[]) => void; onCancel?: () => void }) {
  const [mode, setMode] = useState<'files' | 'text'>('files')
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [drafts, setDrafts] = useState<StudyPlan[]>([])
  const picker = useRef<HTMLInputElement>(null)
  const reader = useRef<AbortController | null>(null)
  useEffect(() => () => reader.current?.abort(), [])

  const planDocument = async (document: PlanDocument, signal: AbortSignal) => {
    if (!useAI) return createStudyPlan(document)
    setStatus(`Planning topics for ${document.name}…`)
    return requestStudyPlan(document, signal)
  }

  const upload = async (files: File[]) => {
    if (!files.length) return
    if (files.length > 10) { setError('Add up to 10 files at a time.'); return }
    reader.current?.abort()
    const controller = new AbortController(); reader.current = controller
    setError(''); setStatus('Reading your course material…')
    try {
      const { readPlanDocument } = await import('./documentReader')
      const plans: StudyPlan[] = []
      for (const file of files) {
        if (controller.signal.aborted) return
        const document = await readPlanDocument(file, message => { if (!controller.signal.aborted) setStatus(`${file.name} · ${message}`) }, controller.signal)
        plans.push(await planDocument(document, controller.signal))
      }
      if (!controller.signal.aborted) setDrafts(plans)
    } catch (error) {
      if (!controller.signal.aborted) setError(`${error instanceof Error ? error.message : 'We couldn’t read this material. Try another file or paste the text.'}${files.length > 1 ? ' None of the selected files were added.' : ''}`)
    } finally { if (!controller.signal.aborted) setStatus('') }
  }
  const addText = async () => {
    reader.current?.abort()
    const controller = new AbortController(); reader.current = controller
    setError(''); setStatus('Finding topics…')
    try {
      const plan = await planDocument({ name: `${subject.title} notes ${nextNote}`, lines: text.split(/\r?\n/).map(text => ({ text })) }, controller.signal)
      if (!controller.signal.aborted) setDrafts([plan])
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not create topics.') }
    finally { if (!controller.signal.aborted) setStatus('') }
  }
  if (drafts.length) return <div className="subject-upload plan-draft">
    <h3>Review your study plan</h3><p>Edit topic titles and learning goals before adding them. Check the notes and references against your original material.</p>
    {drafts.map((plan, pi) => <section key={pi}><h4>{plan.sourceName}</h4>{plan.audience && <p>{plan.audience}</p>}{plan.originalText && <details><summary>Original material</summary><pre className="plan-original-text">{plan.originalText}</pre></details>}
      {plan.chapters.map((chapter, ci) => <section key={chapter.id}><h4>{chapter.title}</h4>{chapter.segments.map((topic, ti) => {
        const edit = (field: 'title' | 'summary', value: string) => setDrafts(current => current.map((p, i) => i !== pi ? p : { ...p, chapters: p.chapters.map((c, j) => j !== ci ? c : { ...c, segments: c.segments.map((t, k) => k !== ti ? t : { ...t, [field]: value }) }) }))
        const prerequisites = (topic.requires ?? []).map(id => plan.chapters.flatMap(c => c.segments).find(t => t.id === id)?.title ?? id)
        return <div className="plan-draft-topic" key={topic.id}>
          <label>Topic title<input value={topic.title} maxLength={200} onChange={e => edit('title', e.target.value)}/></label>
          {topic.summary !== undefined && <label>Learning goal<textarea value={topic.summary} maxLength={4000} onChange={e => edit('summary', e.target.value)}/></label>}
          {topic.whyVisual && <p>{topic.whyVisual}</p>}{!!prerequisites.length && <p>Builds on: {prerequisites.join(', ')}</p>}
          <details><summary>{topic.sourceKind === 'notes' ? 'AI-generated source notes' : 'Source excerpts'}{topic.pageStart ? ` · pages ${topic.pageStart}–${topic.pageEnd}` : ''}</summary>{topic.sourceReference && <p>Suggested source reference: {topic.sourceReference}</p>}<pre>{topic.text || 'Chapter outline only.'}</pre></details>
        </div>
      })}</section>)}
    </section>)}
    <div className="plan-draft-actions"><button className="primary-button" disabled={drafts.some(p => p.chapters.some(c => c.segments.some(t => !t.title.trim() || (t.summary !== undefined && !t.summary.trim()))))} onClick={() => { try { onAdd(drafts) } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this plan.') } }}>Add to study plan</button><button onClick={() => { setDrafts([]); setError('') }}>Back to material</button></div>
    {error && <p className="subject-plan-error" role="alert">{error}</p>}
  </div>
  return <div className="subject-upload" aria-label={`Course material for ${subject.title}`}>
    <div className="subject-upload-intro"><span className="subject-upload-symbol"><BookOpen size={24}/></span><div><h3>Add your course material</h3></div>{onCancel && <button className="icon-button" onClick={onCancel} aria-label="Close material upload"><X size={18}/></button>}</div>
    <div className="subject-input-tabs" role="group" aria-label="Course material input"><button className={mode === 'files' ? 'active' : ''} aria-pressed={mode === 'files'} disabled={!!status} onClick={() => { setMode('files'); setError('') }}><Upload size={15}/> Upload files</button><button className={mode === 'text' ? 'active' : ''} aria-pressed={mode === 'text'} disabled={!!status} onClick={() => { setMode('text'); setError('') }}><FileText size={15}/> Paste text</button></div>
    <label className="plan-ai-choice"><input type="checkbox" checked={useAI} disabled={!!status} onChange={e => { setUseAI(e.target.checked); setError('') }}/> Organize topics with AI</label>
    <p className="plan-input-note">{useAI ? 'Sends extracted text to the server to suggest topics and prerequisites. You can review the plan before saving.' : 'Uses document headings and text length locally to suggest an outline.'}</p>
    {mode === 'files' ? <><input hidden type="file" multiple ref={picker} accept=".pdf,.docx,.txt,.md" aria-label={`Upload course material for ${subject.title}`} onChange={event => { void upload(Array.from(event.target.files || [])); event.target.value = '' }}/><button className={`subject-dropzone ${dragging ? 'dragging' : ''}`} disabled={!!status} onClick={() => picker.current?.click()} onDragOver={event => { event.preventDefault(); if (!status) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!status) void upload(Array.from(event.dataTransfer.files)) }}>
      {status ? <LoaderCircle className="material-spinner" size={25}/> : <Upload size={25}/>}<strong>{status ? 'Finding chapters and topics…' : 'Drop your script here'}</strong><span>{status || 'PDF, Word, Markdown, or text · up to 50 MB per file'}</span>{!status && <span className="subject-upload-link">Choose files <Plus size={14}/></span>}
    </button></> : <div className="subject-pasted-text"><textarea aria-label={`Course notes for ${subject.title}`} value={text} disabled={!!status} onChange={event => setText(event.target.value)} maxLength={1000000} placeholder={'Paste your script, lecture notes, or course outline.\n\nKeep the chapter headings and subheadings.'}/><button className="primary-button" disabled={!text.trim() || !!status} onClick={() => { void addText() }}>Create topics <ArrowRight size={16}/></button></div>}
    {status && <div className="material-reading" role="status"><span>{status}</span><button onClick={() => { reader.current?.abort(); setStatus('') }}>Cancel <X size={13}/></button></div>}
    {error && <p className="subject-plan-error" role="alert">{error}</p>}
    {error && useAI && <button onClick={() => { setUseAI(false); setError('') }}>Use document outline instead</button>}
  </div>
}
