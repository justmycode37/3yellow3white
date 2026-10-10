import { expect, test } from 'bun:test';
import { parsePlanDocument, parseTopicPlan, generateStudyPlan } from '../src/agents/study-plan.js';
import { studyPlanRoutes } from '../src/study-plans.js';

const document = { name: 'Lecture.pdf', pages: 2, lines: [
  { text: 'Vectors have magnitude and direction. A basis represents each vector by its coordinates along independent directions.', page: 1 },
  { text: 'A linear map preserves vector addition and scaling. Its matrix columns record the images of the basis vectors.', page: 2 },
] };
const topic = (id: string, line: number, requires: string[] = []) => ({ id, title: id, summary: 'Understand the concept', whyVisual: 'Watch a vector transform', keyIdeas: ['Coordinates'], requires, sourceRefs: [{ startLine: line, endLine: line }], minutes: 4 });
const output = () => ({ title: 'Linear algebra', audience: 'Beginners', assumed: ['Arithmetic'], chapters: [{ title: 'Vectors and maps', topics: [topic('vectors', 1), topic('maps', 2, ['vectors'])] }] });

test('semantic topics retain exact source excerpts, real page numbers and prerequisite order', () => {
  const plan = parseTopicPlan(JSON.stringify(output()), parsePlanDocument(document));
  expect(plan.chapters[0].segments[1]).toMatchObject({ text: document.lines[1].text, pageStart: 2, pageEnd: 2, requires: ['vectors'] });
  expect(plan.sourceName).toBe(document.name);
});

test('reject hallucinated references, forward/self dependencies, duplicate IDs and empty topics', () => {
  for (const mutate of [
    (v: ReturnType<typeof output>) => { v.chapters[0].topics[0].sourceRefs[0].endLine = 9; },
    (v: ReturnType<typeof output>) => { v.chapters[0].topics[0].requires = ['maps']; },
    (v: ReturnType<typeof output>) => { v.chapters[0].topics[0].requires = ['vectors']; },
    (v: ReturnType<typeof output>) => { v.chapters[0].topics[1].id = 'vectors'; },
    (v: ReturnType<typeof output>) => { v.chapters[0].topics = []; },
  ]) { const value = output(); mutate(value); expect(() => parseTopicPlan(JSON.stringify(value), document)).toThrow(); }
});

test('reject oversized and malformed input before model work', async () => {
  expect(() => parsePlanDocument({ ...document, lines: [{ text: 'x'.repeat(200001) }] })).toThrow();
  let called = false;
  const route = studyPlanRoutes(() => { called = true; throw new Error('should not run'); });
  expect((await route(new Request('http://localhost/api/study-plans', { method: 'POST', body: '{}' }))).status).toBe(400);
  expect((await route(new Request('http://localhost/api/study-plans', { method: 'POST', body: 'x'.repeat(2000001) }))).status).toBe(413);
  expect(called).toBe(false);
});

test('model receives numbered source and validation feedback, final response validated again', async () => {
  const plan = await generateStudyPlan({ run: async task => {
    expect(JSON.parse(task.prompt).lines[1].line).toBe(2);
    await expect(task.validate!('{}')).rejects.toThrow();
    return JSON.stringify(output());
  } }, document, new AbortController().signal);
  expect(plan.chapters[0].segments.length).toBe(2);
  await expect(generateStudyPlan({ run: async () => '{}' }, document, new AbortController().signal)).rejects.toThrow();
});

test('endpoint bounds concurrency and sanitizes provider failures', async () => {
  const previous = process.env.VIDEO_GENERATOR;
  delete process.env.VIDEO_GENERATOR;
  try {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const route = studyPlanRoutes(() => ({ run: async () => { await pending; throw new Error('secret provider token'); } }));
    const req = () => new Request('http://localhost/api/study-plans', { method: 'POST', body: JSON.stringify(document) });
    const one = route(req()), two = route(req());
    expect((await route(req())).status).toBe(429);
    finish();
    for (const result of await Promise.all([one, two])) { expect(result.status).toBe(503); expect(await result.text()).not.toContain('secret'); }
    expect((await route(new Request('http://localhost/api/study-plans'))).status).toBe(405);
  } finally { if (previous === undefined) delete process.env.VIDEO_GENERATOR; else process.env.VIDEO_GENERATOR = previous; }
});

test('long single-line lectures become citable spans while retaining every source character and page', () => {
  const paragraph = 'Vectors retain their meaning and coordinates throughout a linear transformation. '.repeat(800);
  const normalized = parsePlanDocument({ name: 'notes', pages: 1, lines: [{ text: paragraph, page: 1 }] });
  expect(normalized.lines.map(l => l.text).join('')).toBe(paragraph);
  expect(normalized.lines.every(l => l.text.length <= 4001 && l.page === 1)).toBe(true);
  expect(parseTopicPlan(JSON.stringify(output()), normalized).chapters[0].segments[0].pageStart).toBe(1);
});
