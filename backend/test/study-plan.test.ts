import { expect, test } from 'bun:test';
import { parsePlanDocument, parseTopicPlan, generateStudyPlan, sourceMaterial, COURSE_CLASSIFICATION, MAX_TOPICS } from '../src/agents/study-plan.js';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';
import { studyPlanRoutes } from '../src/study-plans.js';

const document = { name: 'Lecture.pdf', pages: 2, lines: [
  { text: 'Vectors have magnitude and direction. A basis represents each vector by its coordinates along independent directions.', page: 1 },
  { text: 'A linear map preserves vector addition and scaling. Its matrix columns record the images of the basis vectors.', page: 2 },
] };
const topic = (id: string, page: number, requires: string[] = []) => ({ id, title: id, summary: 'Understand the concept', why_visual: 'Watch a vector transform', key_ideas: ['Coordinates'], requires, source_refs: `Page ${page}`, notes: `Condensed source notes for ${id}.` });
const output = () => ({ source_title: 'Linear algebra', audience: 'Beginners', assumed: ['Arithmetic'], topics: [topic('vectors', 1), topic('maps', 2, ['vectors'])] });

test('original topic schema adapts to app without claiming generated notes are source quotations', () => {
  const plan = parseTopicPlan(JSON.stringify(output()), parsePlanDocument(document));
  expect(plan.chapters[0].segments[1]).toMatchObject({ text: 'Condensed source notes for maps.', sourceReference: 'Page 2', sourceKind: 'notes', requires: ['vectors'] });
  expect(plan.chapters[0].segments[1].pageStart).toBeUndefined();
  expect(plan.sourceName).toBe(document.name);
  expect(plan.originalText).toBe(sourceMaterial(document));
});

test('reject missing notes/references, forward/self dependencies, duplicate IDs and empty topics', () => {
  for (const mutate of [
    (v: ReturnType<typeof output>) => { v.topics[0].notes = ''; },
    (v: ReturnType<typeof output>) => { v.topics[0].source_refs = ''; },
    (v: ReturnType<typeof output>) => { v.topics[0].requires = ['maps']; },
    (v: ReturnType<typeof output>) => { v.topics[0].requires = ['vectors']; },
    (v: ReturnType<typeof output>) => { v.topics[1].id = 'vectors'; },
    (v: ReturnType<typeof output>) => { v.topics = []; },
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

test('model receives the original prompts plus course grouping requirements, final response validated again', async () => {
  const plan = await generateStudyPlan({ run: async task => {
    expect(task.systemPrompt).toBe(await scenegenPrompt('topics-system'));
    expect(task.prompt).toBe((await scenegenPrompt('topics-format')).replace('{max_topics}', String(MAX_TOPICS)) + '\n\n' + COURSE_CLASSIFICATION + '\n\nSOURCE MATERIAL:\n<<<\n' + sourceMaterial(document) + '\n>>>');
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

test('long single-line lectures remain intact and work with the original notes response', () => {
  const paragraph = 'Vectors retain their meaning and coordinates throughout a linear transformation. '.repeat(800);
  const normalized = parsePlanDocument({ name: 'notes', pages: 1, lines: [{ text: paragraph, page: 1 }] });
  expect(normalized.lines.map(l => l.text).join('')).toBe(paragraph);
  expect(normalized.lines).toEqual([{ text: paragraph, page: 1 }]);
  expect(parseTopicPlan(JSON.stringify(output()), normalized).originalText).toBe('[Page 1]\n' + paragraph);
});


test('AI classifications group focused video lessons into distinct course topics', () => {
  const value = { ...output(), topics: [
    { ...topic('vectors', 1), group: 'Vectors', minutes: 2 },
    { ...topic('bases', 1, ['vectors']), group: 'Vectors', minutes: 3 },
    { ...topic('maps', 2, ['bases']), group: 'Linear maps', minutes: 5 },
  ] };
  const plan = parseTopicPlan(JSON.stringify(value), document);
  expect(plan.chapters.map(c => [c.title, c.segments.length])).toEqual([['Vectors', 2], ['Linear maps', 1]]);
  expect(plan.chapters[1].segments[0].minutes).toBe(5);
  value.topics[2].minutes = 12;
  expect(() => parseTopicPlan(JSON.stringify(value), document)).toThrow('2–5 minute');
  value.topics[2].minutes = 4;
  value.topics[1].group = 'Linear maps';
  value.topics[2].group = 'Vectors';
  expect(() => parseTopicPlan(JSON.stringify(value), document)).toThrow('teaching order');
});
