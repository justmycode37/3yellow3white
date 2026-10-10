import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import SubjectPlan from './SubjectPlan'
import { ArrowUpRight, Atom, BookOpen, Check, Layers3, Library, ListTree, Play, Plus, X } from './Icons'
import { courseColors } from './courses'
import type { Curriculum, SubjectColor } from './curriculum'
import type { Lesson } from './data'
import type { StudyPlan } from './plan'
import type { SubjectPlans, TopicVideoRequest } from './subjectPlans'

type CoursesPageProps = {
  curriculum: Curriculum
  selectedId?: string
  onSelect: (id: string) => void
  plans: SubjectPlans
  onAddMaterial: (subjectId: string, plans: StudyPlan[]) => void
  onMakeVideo: (request: TopicVideoRequest) => void
  onAddCourse: (name: string, color: SubjectColor) => void
  onNewVideo: () => void
  recent: Lesson[]
  renderVideo: (lesson: Lesson) => ReactNode
  storageNote: string
}

export default function CoursesPage({ curriculum, selectedId, onSelect, plans, onAddMaterial, onMakeVideo, onAddCourse, onNewVideo, recent, renderVideo, storageNote }: CoursesPageProps) {
  const selectedSubject = curriculum.subjects.find(subject => subject.id === selectedId)
  const [adding, setAdding] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  const icons = [BookOpen, ListTree, Layers3, Atom, Library]
  const scrollToPlan = () => document.getElementById('subject-plan')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  useEffect(() => { if (selectedId) scrollToPlan() }, [selectedId])
  const selectSubject = (id: string) => { if (id === selectedId) scrollToPlan(); else onSelect(id) }

  return <main className="plan-page courses-page" aria-label="Courses">
    <h1>Courses</h1>
    <section className="recent-videos" aria-labelledby="recent-videos-title">
      <h2 id="recent-videos-title">Recently played</h2>
      <div className="recent-video-grid">
        {Array.from({ length: 3 }, (_, index) => recent[index]
          ? <div className={`recent-video subject-${recent[index].color}`} key={recent[index].id}>{renderVideo(recent[index])}<p>{recent[index].subject}</p></div>
          : <div className="recent-video-placeholder" key={`empty-${index}`}><Play size={22}/><span>{index === 0 ? 'Your last played videos will appear here' : 'More learning ahead'}</span></div>)}
        <button className="new-video-tile" onClick={onNewVideo}><Plus size={32}/><span>New video</span></button>
      </div>
    </section>
    <section className="courses-overview" aria-labelledby="your-courses-title">
      <h2 id="your-courses-title">Your courses</h2>
      <ul className="plan-subject-list" aria-label="Courses">
        {curriculum.subjects.map((subject, index) => {
          const Icon = icons[index % icons.length]
          return <li key={subject.id}>
            <button className={`plan-subject-row subject-${subject.color} ${selectedId === subject.id ? 'selected' : ''}`} aria-label={`Open ${subject.title} course`} aria-pressed={selectedId === subject.id} aria-controls={selectedId === subject.id ? 'subject-plan' : undefined} onClick={() => selectSubject(subject.id)}>
              <span className="plan-subject-icon"><Icon size={25}/></span>
              <span className="plan-subject-name">{subject.title}</span>
              <ArrowUpRight className="plan-subject-arrow" size={20}/>
            </button>
          </li>
        })}
      </ul>
      {adding ? <NewCourseForm defaultColor={courseColors[curriculum.subjects.length % courseColors.length]} onAdd={(name, color) => { onAddCourse(name, color); setAdding(false) }} onCancel={() => { setAdding(false); requestAnimationFrame(() => addButton.current?.focus()) }}/>
        : <button className="add-course-button" ref={addButton} onClick={() => setAdding(true)}><span><Plus size={23}/></span>Add course</button>}
    </section>
    {selectedSubject && <SubjectPlan key={selectedSubject.id} subject={selectedSubject} materials={plans.subjects[selectedSubject.id] || []} onAdd={material => onAddMaterial(selectedSubject.id, material)} onMakeVideo={onMakeVideo}/>}
    {storageNote && <p className="subject-plan-error" role="status">{storageNote}</p>}
  </main>
}

function NewCourseForm({ defaultColor, onAdd, onCancel }: { defaultColor: SubjectColor; onAdd: (name: string, color: SubjectColor) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor)
  const [error, setError] = useState('')
  return <form className="new-course-form" aria-label="New course" onKeyDown={event => { if (event.key === 'Escape') onCancel() }} onSubmit={event => {
    event.preventDefault()
    try { onAdd(name, color) } catch (error) { setError(error instanceof Error ? error.message : 'Could not add this course.') }
  }}>
    <div className="new-course-heading"><h3>New course</h3><button type="button" className="icon-button" aria-label="Cancel new course" onClick={onCancel}><X size={18}/></button></div>
    <label htmlFor="course-name">Course name</label>
    <input id="course-name" autoFocus required maxLength={80} placeholder="e.g. Organic chemistry" value={name} aria-invalid={!!error} aria-describedby={error ? 'course-name-error' : undefined} onChange={event => { setName(event.target.value); setError('') }}/>
    <div className="course-color-options" role="group" aria-label="Course color">{courseColors.map(option => <button type="button" key={option} className={`course-color-option subject-${option}`} aria-label={`${option} color`} aria-pressed={color === option} onClick={() => setColor(option)}>{color === option && <Check size={18}/>}</button>)}</div>
    {error && <p id="course-name-error" className="subject-plan-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={!name.trim()} type="submit"><Plus size={16}/>Create course</button>
  </form>
}
