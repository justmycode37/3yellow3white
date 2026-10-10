import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Check, Plus, Trash, Upload, X } from './Icons'
import type { CourseSubject } from './curriculum'
import type { SavedMaterial } from './subjectPlans'

type OutlineProps = {
  subject: CourseSubject
  materials: SavedMaterial[]
  onAdd: (name: string) => void
  onDelete: (materialId: string, chapterId: string) => void
  onOpenTopic: (materialId: string, chapterId: string) => void
  onUpload: () => void
}

export function OutlineDisclosure({ id, expanded, children }: { id: string; expanded: boolean; children: ReactNode }) {
  return <div id={id} className={`course-outline-disclosure ${expanded ? 'is-open' : ''}`} inert={!expanded} aria-hidden={!expanded}>
    <div className="course-outline-clip">{children}</div>
  </div>
}

export default function CourseOutline({ subject, materials, onAdd, onDelete, onOpenTopic, onUpload }: OutlineProps) {
  const outline = useRef<HTMLDivElement>(null)
  const removeTopic = (materialId: string, chapterId: string) => {
    onDelete(materialId, chapterId)
    requestAnimationFrame(() => outline.current?.querySelector<HTMLButtonElement>('.course-topic-row, .course-outline-add')?.focus())
  }
  return <div className="course-outline" ref={outline}>
    <ul className="course-topic-list" aria-label={`Topics in ${subject.title}`}>
      {materials.flatMap(material => material.plan.chapters.map(chapter => <TopicRow key={`${material.id}-${chapter.id}`} title={chapter.title} onOpen={() => onOpenTopic(material.id, chapter.id)} onDelete={() => removeTopic(material.id, chapter.id)}/>))}
    </ul>
    <OutlineAdd label={`Add topic to ${subject.title}`} onAdd={onAdd} onUpload={onUpload}/>
  </div>
}

function TopicRow({ title, onOpen, onDelete }: { title: string; onOpen: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const deleteButton = useRef<HTMLButtonElement>(null)
  const cancel = () => { setConfirming(false); requestAnimationFrame(() => deleteButton.current?.focus()) }
  return <li className="course-topic-widget" onKeyDown={event => { if (confirming && event.key === 'Escape') { event.preventDefault(); cancel() } }}>
    {confirming ? <div className="course-topic-delete-confirm" role="group" aria-label={`Delete ${title} topic?`}>
      <span>Delete {title}?</span>
      <button type="button" className="course-topic-confirm-button" aria-label={`Confirm delete ${title} topic`} onClick={onDelete}>Delete</button>
      <button type="button" className="course-topic-delete" autoFocus aria-label={`Cancel deleting ${title} topic`} title="Cancel" onClick={cancel}><X size={14}/></button>
    </div> : <>
      <button type="button" className="course-topic-row" aria-label={`Open ${title} topic`} onClick={onOpen}><span>{title}</span><ArrowUpRight size={14}/></button>
      <button type="button" className="course-topic-delete" ref={deleteButton} aria-label={`Delete ${title} topic`} title="Delete topic" onClick={() => setConfirming(true)}><Trash size={14}/></button>
    </>}
  </li>
}

function OutlineAdd({ label, onAdd, onUpload }: { label: string; onAdd: (name: string) => void; onUpload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const close = () => {
    setAdding(false); setName(''); setError('')
    requestAnimationFrame(() => addButton.current?.focus())
  }
  if (!adding) return <button ref={addButton} type="button" className="course-outline-add" aria-label={label} title={label} onClick={() => setAdding(true)}><Plus size={16}/></button>
  return <form className="course-topic-form" aria-label="New topic" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }} onSubmit={event => {
    event.preventDefault()
    try { onAdd(name); close() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this topic.') }
  }}>
    <div className="course-topic-input">
      <input autoFocus required maxLength={80} aria-label="Topic name" placeholder="Topic name" value={name} aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={event => { setName(event.target.value); setError('') }}/>
      <button type="submit" className="course-topic-submit" disabled={!name.trim()} aria-label="Create topic"><Check size={14}/></button>
      <button type="button" aria-label="Cancel new topic" onClick={close}><X size={14}/></button>
    </div>
    {error && <p id={id} className="course-topic-error" role="alert">{error}</p>}
    {onUpload && <button type="button" className="course-topic-upload" onClick={() => { close(); onUpload() }}><Upload size={13}/>Add from course material</button>}
  </form>
}
