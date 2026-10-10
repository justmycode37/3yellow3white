import type { Curriculum, SubjectColor } from './curriculum'
import type { StudyPlan } from './plan'

export interface SavedMaterial { id: string; plan: StudyPlan }
export interface SubjectPlans { version: 1; subjects: Record<string, SavedMaterial[]> }
export interface TopicVideoRequest {
  title: string
  text: string
  subject: string
  color: SubjectColor
  chapter: string
  sourceName: string
  minutes: number
}
export const subjectPlansKey = 'aha-subject-plans-v1'
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

export function isStudyPlan(value: unknown): value is StudyPlan {
  return record(value) && value.version === 1 && typeof value.title === 'string' && typeof value.sourceName === 'string'
    && (value.sourceNames === undefined || (Array.isArray(value.sourceNames) && value.sourceNames.every(name => typeof name === 'string')))
    && Array.isArray(value.chapters) && value.chapters.length > 0 && value.chapters.every(chapter => record(chapter) && typeof chapter.id === 'string' && typeof chapter.title === 'string' && Array.isArray(chapter.segments) && chapter.segments.length > 0 && chapter.segments.every(segment => record(segment) && typeof segment.id === 'string' && typeof segment.title === 'string' && typeof segment.text === 'string' && typeof segment.minutes === 'number' && Number.isFinite(segment.minutes) && segment.minutes > 0))
}

export function loadSubjectPlans(storage: Pick<Storage, 'getItem'>, curriculum: Curriculum): SubjectPlans {
  const result: SubjectPlans = { version: 1, subjects: {} }
  try {
    const saved: unknown = JSON.parse(storage.getItem(subjectPlansKey) || 'null')
    if (record(saved) && saved.version === 1 && record(saved.subjects)) {
      for (const subject of curriculum.subjects) {
        const materials = saved.subjects[subject.id]
        if (Array.isArray(materials)) result.subjects[subject.id] = materials.filter((item): item is SavedMaterial => record(item) && typeof item.id === 'string' && isStudyPlan(item.plan))
      }
      return result
    }
    // Keep scripts saved by earlier versions of the Plan page.
    const previous: unknown = JSON.parse(storage.getItem('aha-curriculum-v1') || 'null')
    if (record(previous) && Array.isArray(previous.subjects)) {
      for (const old of previous.subjects) {
        if (!record(old) || !isStudyPlan(old.plan)) continue
        const subject = curriculum.subjects.find(subject => subject.id === old.id || subject.title === old.title)
        if (subject) result.subjects[subject.id] = [{ id: `migrated-${subject.id}`, plan: old.plan }]
      }
    }
    const legacy: unknown = JSON.parse(storage.getItem('aha-study-plan') || 'null')
    if (isStudyPlan(legacy)) {
      const subject = curriculum.subjects.find(subject => subject.title.toLowerCase() === legacy.title.toLowerCase() || (subject.id === 'lineare-algebra' && /linear algebra/i.test(legacy.title)))
      if (subject && !result.subjects[subject.id]?.length) result.subjects[subject.id] = [{ id: `legacy-${subject.id}`, plan: legacy }]
    }
  } catch { /* Unavailable or damaged browser storage starts with empty subject plans. */ }
  return result
}

export function appendSubjectMaterials(current: SubjectPlans, subjectId: string, plans: StudyPlan[]): SubjectPlans {
  const existing = current.subjects[subjectId] || []
  const names = new Set(existing.map(material => material.plan.sourceName))
  for (const plan of plans) {
    if (names.has(plan.sourceName)) throw new Error(`${plan.sourceName} is already in this subject. Choose a different script.`)
    names.add(plan.sourceName)
  }
  return { version: 1, subjects: { ...current.subjects, [subjectId]: [...existing, ...plans.map(plan => ({ id: crypto.randomUUID(), plan }))] } }
}
