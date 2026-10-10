import test from 'node:test'
import assert from 'node:assert/strict'
import { topicLessonText } from '../src/studyPlanClient.ts'
import type { StudyPlan } from '../src/plan.ts'

test('topic handoff includes source and suggested prerequisites without assuming prior mastery', () => {
  const plan: StudyPlan = { version: 1, title: 'Course', sourceName: 'lecture.pdf', chapters: [{ id: 'c', title: 'Chapter', segments: [
    { id: 'basis', title: 'Basis vectors', text: 'Original basis text.', minutes: 3 },
    { id: 'maps', title: 'Maps', text: 'Original map text.', minutes: 4, summary: 'Understand a map', whyVisual: 'Transform a grid', keyIdeas: ['Linearity'], requires: ['basis'], pageStart: 2, pageEnd: 3 },
  ] }] }
  assert.equal(topicLessonText(plan.chapters[0].segments[0], plan), 'Original basis text.')
  const packet = topicLessonText(plan.chapters[0].segments[1], plan)
  assert.match(packet, /do not assume mastery.*Basis vectors/)
  assert.match(packet, /lecture.pdf, pages 2–3/)
  assert.match(packet, /Original map text/)
})
