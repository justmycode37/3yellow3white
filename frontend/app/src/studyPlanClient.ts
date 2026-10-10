import type { PlanDocument, StudyPlan, VideoSegment } from './plan'
import { isStudyPlan } from './subjectPlans.ts'

export async function requestStudyPlan(document: PlanDocument, signal: AbortSignal): Promise<StudyPlan> {
  const response = await fetch('/api/study-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document), signal })
  const data: unknown = await response.json()
  if (!response.ok) throw new Error(data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' ? data.detail : 'Could not create a study plan.')
  if (!isStudyPlan(data)) throw new Error('The server returned an invalid study plan. Try again or use the document outline.')
  return data
}

/** Keep original source excerpts distinct from generated teaching suggestions. */
export function topicLessonText(topic: VideoSegment, plan: StudyPlan): string {
  if (!topic.summary) return topic.text
  const all = plan.chapters.flatMap(chapter => chapter.segments)
  return [
    `Learning goal: ${topic.summary}`, `Visual idea: ${topic.whyVisual ?? ''}`,
    `Key ideas: ${(topic.keyIdeas ?? []).join('; ')}`,
    `Suggested earlier topics (do not assume mastery): ${(topic.requires ?? []).map(id => all.find(t => t.id === id)?.title ?? id).join('; ') || 'none'}`,
    `Original source excerpts from ${plan.sourceName}${topic.pageStart ? `, pages ${topic.pageStart}–${topic.pageEnd}` : ''}:`, topic.text,
  ].join('\n\n')
}
