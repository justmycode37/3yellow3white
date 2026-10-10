import test from 'node:test'
import assert from 'node:assert/strict'
import { addCourse, coursesKey, courseForSubject, loadCourses, loadRecentPlayback, recentLessons, recentPlaybackKey, recordPlayback } from '../src/courses.ts'
import { exampleCurriculum } from '../src/curriculum.ts'
import { lessons } from '../src/data.ts'
import { appendSubjectMaterials, loadSubjectPlans, subjectPlansKey } from '../src/subjectPlans.ts'
import { createStudyPlan, exampleDocument } from '../src/plan.ts'

const storage = (data: Record<string, string> = {}) => ({ getItem: (key: string) => data[key] ?? null })

test('new courses and their material survive reload without dropping the listed courses', () => {
  const courses = addCourse(exampleCurriculum, '  Organic   chemistry  ', 'sage')
  const course = courses.subjects.at(-1)!
  const plans = appendSubjectMaterials({ version: 1, subjects: {} }, course.id, [createStudyPlan(exampleDocument)])
  const saved = storage({ [coursesKey]: JSON.stringify({ version: 1, ...courses }), [subjectPlansKey]: JSON.stringify(plans) })
  const restored = loadCourses(saved)
  assert.deepEqual(restored, courses)
  assert.equal(course.title, 'Organic chemistry')
  assert.deepEqual(loadSubjectPlans(saved, restored).subjects[course.id], JSON.parse(JSON.stringify(plans.subjects[course.id])))
  assert.equal(exampleCurriculum.subjects.length, 5)
})

test('duplicate course names, translated sample names, and empty names are rejected', () => {
  assert.throws(() => addCourse(exampleCurriculum, ' ANALYSIS ', 'sage'), /already exists/)
  assert.throws(() => addCourse(exampleCurriculum, 'Linear algebra', 'sage'), /already exists/)
  assert.throws(() => addCourse(exampleCurriculum, '  ', 'sage'), /course name/)
  assert.throws(() => addCourse(exampleCurriculum, 'All subjects', 'sage'), /already exists/)
})

test('damaged course records do not prevent good courses from restoring', () => {
  const subjects = [null, { id: 'course-good', title: 'Biology', color: 'sage' }, { id: 'course-good', title: 'Other', color: 'blue' }, { id: 'course-bad', title: 'Bad color', color: 'orange' }, { id: 'course-duplicate', title: 'Analysis', color: 'blue' }]
  assert.equal(loadCourses(storage({ [coursesKey]: JSON.stringify({ version: 1, subjects }) })).subjects.length, 6)
  assert.deepEqual(loadCourses(storage({ [coursesKey]: '{' })), exampleCurriculum)
  assert.deepEqual(loadCourses({ getItem() { throw Error('Unavailable') } }), exampleCurriculum)
})

test('recent videos reflect actual playback order, replays move to the front, and missing videos are skipped', () => {
  let history: string[] = []
  for (const id of ['carbon', 'vectors', 'matrices', 'eigen', 'vectors']) history = recordPlayback(history, id)
  assert.deepEqual(history, ['vectors', 'eigen', 'matrices', 'carbon'])
  assert.deepEqual(recentLessons(['deleted', ...history], lessons, exampleCurriculum).map(lesson => lesson.id), ['vectors', 'eigen', 'matrices'])
  assert.deepEqual(recentLessons([], lessons, exampleCurriculum), [])
})

test('recent videos use their listed course color without mutating the original lesson', () => {
  const courses = addCourse(exampleCurriculum, 'Organic chemistry', 'peach')
  const recent = recentLessons(['matrices', 'carbon'], lessons, courses)
  assert.equal(recent[0].color, 'blue')
  assert.equal(recent[1].color, 'peach')
  assert.equal(lessons.find(lesson => lesson.id === 'carbon')!.color, 'sage')
  assert.equal(courseForSubject(courses, 'LINEAR ALGEBRA')!.id, 'lineare-algebra')
  assert.equal(recentLessons(['carbon'], lessons, exampleCurriculum)[0].color, 'sage')
})

test('history restores valid unique IDs and tolerates unavailable storage', () => {
  assert.deepEqual(loadRecentPlayback(storage({ [recentPlaybackKey]: JSON.stringify(['carbon', null, 'carbon', 'vectors', 42]) })), ['carbon', 'vectors'])
  assert.deepEqual(loadRecentPlayback({ getItem() { throw Error('Unavailable') } }), [])
})
