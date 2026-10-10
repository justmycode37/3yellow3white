import type { PlanDocument, StudyPlan, VideoSegment } from './plan'
import { isStudyPlan } from './subjectPlans.ts'

export async function requestStudyPlan(document: PlanDocument, signal: AbortSignal): Promise<StudyPlan> {
  const response = await fetch('/api/study-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document), signal })
  const data: unknown = await response.json()
  if (!response.ok) throw new Error(data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' ? data.detail : 'Could not create a study plan.')
  if (!isStudyPlan(data)) throw new Error('The server returned an invalid study plan. Please try again.')
  return data
}

/** Submit files and notes together so AI can group overlapping material. */
export async function requestMaterialPlan(material: { name: string; files: File[]; text: string }, signal: AbortSignal): Promise<StudyPlan> {
  const body = new FormData()
  body.set('name', material.name)
  body.set('text', material.text)
  for (const file of material.files) body.append('files', file)
  const response = await fetch('/api/study-plans', { method: 'POST', body, signal })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' ? data.detail : 'AI planning is unavailable. Your material is still here — please try again.')
  if (!isStudyPlan(data)) throw new Error('AI returned an incomplete plan. Your material is still here — please try again.')
  return data
}

/** Original distill.py:topic_notes wording, with app field-name adapters only. */
export function topicLessonText(topic: VideoSegment, plan: StudyPlan): string {
  if (!topic.summary) return topic.text
  const all = plan.chapters.flatMap(chapter => chapter.segments)
  const earlier = (topic.requires ?? []).flatMap(id => {
    const found = all.find(t => t.id === id)
    return found ? [found.title] : []
  })
  const parts = [
    `From: ${plan.title} (${topic.sourceReference ?? ''})`,
    `Summary: ${topic.summary}`,
    `What makes it visual: ${topic.whyVisual ?? ''}`,
    'Key ideas, in order:\n' + (topic.keyIdeas ?? []).map(k => `- ${k}`).join('\n'),
    'Source notes:\n' + topic.text,
  ]
  if (earlier.length) parts.push('Already explained in earlier films (build on it, do not re-teach): ' + earlier.join(', '))
  return parts.join('\n\n')
}
