import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, FileText, LoaderCircle, Plus, Upload, X } from './Icons'
import type { CourseSubject } from './curriculum'
import type { StudyPlan } from './plan'
import { requestMaterialPlan, topicLessonText } from './studyPlanClient'
import type { SavedMaterial, TopicVideoRequest } from './subjectPlans'

export default function SubjectPlan({ subject, materials, onAdd, onMakeVideo }: { subject: CourseSubject; materials: SavedMaterial[]; onAdd: (plans: StudyPlan[]) => void; onMakeVideo: (request: TopicVideoRequest) => void }) {
  const [adding, setAdding] = useState(false)
  const chapters = materials.flatMap(material => material.plan.chapters.map(chapter => ({ ...chapter, material })))
  const topicCount = chapters.reduce((total, chapter) => total + chapter.segments.length, 0)
  return <section id="subject-plan" className={`subject-plan subject-${subject.color}`} aria-labelledby="subject-plan-title">
    <div className="subject-plan-heading"><div><h2 id="subject-plan-title">{subject.title}</h2>{chapters.length > 0 && <p>{chapters.length} topics · {topicCount} lessons</p>}</div>{materials.length > 0 && !adding && <button className="subject-add-material" onClick={() => setAdding(true)}><Plus size={16}/> Add material</button>}</div>
    {!materials.length || adding ? <MaterialUpload subject={subject} nextNote={materials.length + 1} onCancel={materials.length ? () => setAdding(false) : undefined} onAdd={plans => { onAdd(plans); setAdding(false) }}/>
    : <div className="subject-material-tags">{materials.map(material => <span key={material.id}><FileText size={13}/>{material.plan.sourceNames?.join(', ') || material.plan.sourceName}</span>)}</div>}
    {chapters.length > 0 && <div className="subject-chapters">{chapters.map((chapter, index) => <section className="subject-chapter" key={`${chapter.material.id}-${chapter.id}`} aria-labelledby={`chapter-${chapter.material.id}-${chapter.id}`}>
      <div className="subject-chapter-heading"><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><div><span className="subject-plan-kicker">Topic {index + 1}</span><h3 id={`chapter-${chapter.material.id}-${chapter.id}`}>{chapter.title}</h3></div></div>
      <ol className="topic-widget-grid">{chapter.segments.map((topic, topicIndex) => <li key={topic.id}><button className="topic-video-widget" aria-label={`Make me a video: ${topic.title}`} onClick={() => onMakeVideo({ title: topic.title, text: topicLessonText(topic, chapter.material.plan) || `Explain the topic “${topic.title}” from the chapter “${chapter.title}” in ${subject.title}. Only a chapter outline was provided.`, subject: subject.title, color: subject.color, chapter: chapter.title, sourceName: chapter.material.plan.sourceName, minutes: topic.minutes })}>
        <span className="topic-widget-number">{index + 1}.{topicIndex + 1}</span><span className="topic-widget-title">{topic.title}</span><span className="topic-widget-duration">~{topic.minutes} min lesson</span><span className="topic-widget-cta" aria-hidden="true"><span>Make me a video <ArrowRight size={15}/></span></span>
      </button></li>)}</ol>
    </section>)}</div>}
  </section>
}

function MaterialUpload({ subject, nextNote, onAdd, onCancel }: { subject: CourseSubject; nextNote: number; onAdd: (plans: StudyPlan[]) => void; onCancel?: () => void }) {
  const [mode, setMode] = useState<'files' | 'text'>('files')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const reader = useRef<AbortController | null>(null)
  useEffect(() => () => reader.current?.abort(), [])
  const busy = !!status

  const selectFiles = (selected: File[]) => {
    if (!selected.length || reader.current) return
    const next = [...files]
    for (const file of selected) {
      if (!next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file)
    }
    if (next.length > 10) { setError('Add up to 10 files at a time.'); return }
    const oversized = next.find(file => file.size > 50 * 1024 * 1024)
    if (oversized) { setError(`${oversized.name} is larger than 50 MB. Split it into smaller files.`); return }
    if (next.reduce((size, file) => size + file.size, 0) > 100 * 1024 * 1024) { setError('Add up to 100 MB of material at a time.'); return }
    setFiles(next); setError('')
  }
  const addMaterial = async () => {
    if (reader.current || (!files.length && !text.trim())) return
    const controller = new AbortController(); reader.current = controller
    setError(''); setStatus('AI is reading your material and creating topics and lessons…')
    try {
      const plan = await requestMaterialPlan({ name: `${subject.title} material ${nextNote}`, files, text }, controller.signal)
      if (!controller.signal.aborted) { onAdd([plan]); setFiles([]); setText('') }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not organize your material. Your files are still here — try again.')
    } finally {
      if (reader.current === controller) { reader.current = null; setStatus('') }
    }
  }
  const cancel = () => { reader.current?.abort(); reader.current = null; setStatus('') }
  return <div className="subject-upload" aria-label={`Course material for ${subject.title}`} aria-busy={busy}>
    <div className="subject-upload-intro">
      <span className="subject-upload-symbol"><BookOpen size={24}/></span>
      <div className="subject-upload-copy"><h3>Add your course material</h3><p>AI groups your material into topics. Each lesson becomes one short video.</p></div>
      <div className="subject-upload-actions"><button type="button" className="primary-button subject-submit" disabled={busy || (!files.length && !text.trim())} onClick={() => { void addMaterial() }}>{busy ? <LoaderCircle className="material-spinner" size={16}/> : <Plus size={16}/>} {busy ? 'Adding…' : 'Add'}</button>{onCancel && <button type="button" className="icon-button" onClick={onCancel} aria-label="Close material upload"><X size={18}/></button>}</div>
    </div>
    <div className="subject-input-tabs" role="tablist" aria-label="Course material input">
      <button type="button" role="tab" id="material-files-tab" aria-controls="material-files-panel" aria-selected={mode === 'files'} className={mode === 'files' ? 'active' : ''} onClick={() => setMode('files')}><Upload size={15}/> Upload files{files.length > 0 && <span className="material-count">{files.length}</span>}</button>
      <button type="button" role="tab" id="material-text-tab" aria-controls="material-text-panel" aria-selected={mode === 'text'} className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}><FileText size={15}/> Paste text{text.trim() && <span className="material-count">1</span>}</button>
    </div>
    <div id="material-files-panel" role="tabpanel" aria-labelledby="material-files-tab" hidden={mode !== 'files'}>
      <input hidden type="file" multiple ref={picker} disabled={busy} aria-label={`Upload course material for ${subject.title}`} onChange={event => { selectFiles(Array.from(event.target.files || [])); event.target.value = '' }}/>
      <div className={`subject-dropzone ${dragging ? 'dragging' : ''} ${files.length ? 'has-files' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); selectFiles(Array.from(event.dataTransfer.files)) }}>
        {files.length ? <ul className="material-file-list" aria-label="Selected files">{files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`}>
          <span className="material-file-icon"><FileText size={21}/></span><span className="material-file-info"><strong>{file.name}</strong><small>{file.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</small></span><button type="button" className="icon-button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setError('') }}><X size={16}/></button>
        </li>)}</ul> : <><Upload size={25}/><strong>Drop your material here</strong><span>Documents, slides, images, recordings, or notes</span></>}
        <button type="button" className="subject-upload-link" disabled={busy} onClick={() => picker.current?.click()}>{files.length ? 'Add more files' : 'Choose files'} <Plus size={14}/></button>
        <span>Up to 10 files · 50 MB per file</span>
      </div>
    </div>
    <div id="material-text-panel" role="tabpanel" aria-labelledby="material-text-tab" hidden={mode !== 'text'}>
      <div className="subject-pasted-text"><textarea aria-label={`Course notes for ${subject.title}`} value={text} readOnly={busy} onChange={event => { setText(event.target.value); setError('') }} maxLength={200000} placeholder={'Paste your lecture notes, a course outline, or anything you want to learn.\n\nYou can combine notes with uploaded files.'}/></div>
    </div>
    {status && <div className="material-reading" role="status"><span>{status}</span><button type="button" onClick={cancel}>Cancel <X size={13}/></button></div>}
    {error && <p className="subject-plan-error" role="alert">{error}</p>}
  </div>
}
