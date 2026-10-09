import test from 'node:test'
import assert from 'node:assert/strict'
import { exampleCurriculum } from '../src/curriculum.ts'
import { createStudyPlan, exampleDocument } from '../src/plan.ts'
import { appendSubjectMaterials, isStudyPlan, loadSubjectPlans, subjectPlansKey } from '../src/subjectPlans.ts'
import type { SubjectPlans } from '../src/subjectPlans.ts'

const empty = (): SubjectPlans => ({ version: 1, subjects: {} })
const store = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] || null })
const script = () => createStudyPlan(exampleDocument)

test('material belongs only to its selected subject and additional scripts preserve previous chapters', () => {
  const initial = empty()
  const first = appendSubjectMaterials(initial, 'analysis', [script()])
  const next = appendSubjectMaterials(first, 'analysis', [{ ...script(), sourceName: 'Second script.pdf' }])
  const other = appendSubjectMaterials(next, 'informatik', [{ ...script(), sourceName: 'Programming.pdf' }])
  assert.deepEqual(initial.subjects, {})
  assert.equal(first.subjects.analysis.length, 1)
  assert.equal(other.subjects.analysis.length, 2)
  assert.equal(other.subjects.informatik.length, 1)
  assert.equal(other.subjects.analysis[0].id, first.subjects.analysis[0].id)
  assert.equal(new Set(other.subjects.analysis.map(m => m.id)).size, 2)
  assert.equal(other.subjects.analysis.flatMap(m => m.plan.chapters).length, 8)
})

test('duplicate files do not partially add a batch or overwrite existing source material', () => {
  const current = appendSubjectMaterials(empty(), 'analysis', [script()])
  assert.throws(() => appendSubjectMaterials(current, 'analysis', [{ ...script(), sourceName: 'New.pdf' }, script()]), /already in this subject/)
  assert.equal(current.subjects.analysis.length, 1)
  assert.throws(() => appendSubjectMaterials(empty(), 'analysis', [script(), script()]), /already in this subject/)
})

test('saved plans restore source text, ordered chapters, and separate subject ownership', () => {
  const current = appendSubjectMaterials(appendSubjectMaterials(empty(), 'analysis', [script()]), 'physik', [{ ...script(), sourceName: 'Physics.pdf' }])
  const json = JSON.stringify(current)
  const restored = loadSubjectPlans(store({ [subjectPlansKey]: json }), exampleCurriculum)
  assert.deepEqual(restored, JSON.parse(json))
  assert.match(restored.subjects.analysis[0].plan.chapters[1].segments[1].text, /dot product/)
  assert.equal(restored.subjects.physik[0].plan.sourceName, 'Physics.pdf')
})

test('corrupt material is skipped while valid subject plans remain readable', () => {
  const current = appendSubjectMaterials(empty(), 'analysis', [script()])
  const data = { version: 1, subjects: { ...current.subjects, physik: [null, { id: 'bad', plan: { chapters: [null] } }] } }
  const restored = loadSubjectPlans(store({ [subjectPlansKey]: JSON.stringify(data) }), exampleCurriculum)
  assert.equal(restored.subjects.analysis.length, 1)
  assert.deepEqual(restored.subjects.physik, [])
  assert.equal(isStudyPlan({ version: 1, chapters: [null] }), false)
  assert.deepEqual(loadSubjectPlans(store({ [subjectPlansKey]: '{' }), exampleCurriculum), empty())
  assert.deepEqual(loadSubjectPlans({ getItem: () => { throw new Error('Storage unavailable') } }, exampleCurriculum), empty())
})

test('older saved scripts migrate into the matching curriculum subject', () => {
  const restored = loadSubjectPlans(store({ 'aha-study-plan': JSON.stringify(script()) }), exampleCurriculum)
  assert.equal(restored.subjects['lineare-algebra'][0].plan.title, 'Linear algebra')
  assert.equal(restored.subjects.analysis, undefined)
})
