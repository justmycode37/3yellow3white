import test from 'node:test'
import assert from 'node:assert/strict'
import { topicLessonText } from '../src/studyPlanClient.ts'
import type { StudyPlan } from '../src/plan.ts'

test('topic handoff uses original distill.py topic_notes wording', () => {
  const plan: StudyPlan = { version: 1, title: 'Course', sourceName: 'lecture.pdf', chapters: [{ id: 'c', title: 'Chapter', segments: [
    { id: 'basis', title: 'Basis vectors', text: 'Original basis text.', minutes: 3 },
    { id: 'maps', title: 'Maps', text: 'Original map text.', minutes: 4, summary: 'Understand a map', whyVisual: 'Transform a grid', keyIdeas: ['Linearity'], requires: ['basis'], sourceReference: 'Pages 2–3', sourceKind: 'notes' },
  ] }] }
  assert.equal(topicLessonText(plan.chapters[0].segments[0], plan), 'Original basis text.')
  const packet = topicLessonText(plan.chapters[0].segments[1], plan)
  assert.equal(packet, 'From: Course (Pages 2–3)\n\nSummary: Understand a map\n\nWhat makes it visual: Transform a grid\n\nKey ideas, in order:\n- Linearity\n\nSource notes:\nOriginal map text.\n\nAlready explained in earlier films (build on it, do not re-teach): Basis vectors')
})
