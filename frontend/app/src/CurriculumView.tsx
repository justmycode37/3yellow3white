import type { CSSProperties } from 'react'
import { dayNames } from './curriculum'
import type { Curriculum } from './curriculum'

export default function CurriculumView({ curriculum, compact = false, onOpen, selectedId, onSelect }: { curriculum: Curriculum; compact?: boolean; onOpen?: () => void; selectedId?: string; onSelect?: (id: string) => void }) {
  const sessions = curriculum.subjects.flatMap(subject => subject.sessions.map(session => ({ ...session, subject })))
  const first = Math.min(8, ...sessions.map(session => session.start))
  const last = Math.max(18, ...sessions.map(session => session.end))
  const days = dayNames.slice(0, Math.max(5, ...sessions.map(session => session.day + 1)))
  return <section className={`simple-curriculum ${compact ? 'is-compact' : ''}`} aria-label="Curriculum" style={{ '--days': days.length } as CSSProperties}>
    {days.map((day, index) => <div className="curriculum-day" key={day} role="group" aria-label={day}>
      {sessions.filter(session => session.day === index).sort((a, b) => a.start - b.start).map(session => {
        const style = { top: `calc(${(session.start - first) / (last - first) * 100}% + 3px)`, height: `calc(${(session.end - session.start) / (last - first) * 100}% - 6px)` }
        const className = `curriculum-block subject-${session.subject.color}`
        return onSelect || onOpen ? <button key={session.id} className={className} style={style} onClick={() => onSelect ? onSelect(session.subject.id) : onOpen?.()} aria-pressed={onSelect ? selectedId === session.subject.id : undefined} aria-label={`${onSelect ? 'Select' : 'Open plan:'} ${session.subject.title}, ${day}`}>{session.subject.title}</button>
          : <div key={session.id} className={className} style={style}>{session.subject.title}</div>
      })}
    </div>)}
  </section>
}
