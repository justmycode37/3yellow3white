import { useEffect } from 'react'
import CurriculumView from './CurriculumView'
import SubjectPlan from './SubjectPlan'
import { ArrowUpRight, Atom, BookOpen, Layers3, Library, ListTree } from './Icons'
import type { Curriculum } from './curriculum'
import type { StudyPlan } from './plan'
import type { SubjectPlans, TopicVideoRequest } from './subjectPlans'

export default function PlanPage({ curriculum, selectedId, onSelect, plans, onAddMaterial, onMakeVideo, storageNote }: { curriculum: Curriculum; selectedId?: string; onSelect: (id: string) => void; plans: SubjectPlans; onAddMaterial: (subjectId: string, plans: StudyPlan[]) => void; onMakeVideo: (request: TopicVideoRequest) => void; storageNote: string }) {
  const selectedSubject = curriculum.subjects.find(subject => subject.id === selectedId)
  const icons = [BookOpen, ListTree, Layers3, Atom, Library]
  const scrollToPlan = () => document.getElementById('subject-plan')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  useEffect(() => { if (selectedId) scrollToPlan() }, [selectedId])
  const selectSubject = (id: string) => { if (id === selectedId) scrollToPlan(); else onSelect(id) }

  return <main className="plan-page" aria-label="Plan">
    <h1>Plan</h1>
    <div className="plan-overview">
      <ul className="plan-subject-list" aria-label="Subjects">
        {curriculum.subjects.map((subject, index) => {
          const Icon = icons[index % icons.length]
          return <li key={subject.id}>
            <button className={`plan-subject-row subject-${subject.color} ${selectedId === subject.id ? 'selected' : ''}`} aria-label={`Open ${subject.title} plan`} aria-pressed={selectedId === subject.id} aria-controls={selectedId === subject.id ? 'subject-plan' : undefined} onClick={() => selectSubject(subject.id)}>
              <span className="plan-subject-icon"><Icon size={25}/></span>
              <span className="plan-subject-name">{subject.title}</span>
              <ArrowUpRight className="plan-subject-arrow" size={20}/>
            </button>
          </li>
        })}
      </ul>
      <CurriculumView curriculum={curriculum} selectedId={selectedId} onSelect={selectSubject}/>
    </div>
    {selectedSubject && <SubjectPlan key={selectedSubject.id} subject={selectedSubject} materials={plans.subjects[selectedSubject.id] || []} onAdd={material => onAddMaterial(selectedSubject.id, material)} onMakeVideo={onMakeVideo}/>}
    {storageNote && <p className="subject-plan-error" role="status">{storageNote}</p>}
  </main>
}
