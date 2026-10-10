import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authorReviewedLesson, parseEditorialReview } from '../src/agents/editorial.js';
import type { EditorialReview } from '../src/agents/editorial.js';
import type { PlannedLesson } from '../src/agents/planning.js';
import type { AgentTask } from '../src/agents/runtime.js';
import { createPiGenerator } from '../src/agents/generator.js';
import { NarrationService } from '../src/narration/service.js';
import { settingsFromEnv } from '../src/narration/elevenlabs.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function directory() { const root = await mkdtemp(join(tmpdir(), 'aha-editorial-')); roots.push(root); return root; }
const request = { title: 'Halves', topic: 'Halve sixteen twice', documents: [{ name: 'notes.txt', text: 'Sixteen, eight, four.' }] };
function lesson(value = 'four'): PlannedLesson {
  return { schemaVersion: 1, markdown: `# Halves\n\n## Beat 1 — Halve\n\nContent needed: Halve sixteen twice to get ${value}.\n\nNarration: Halve sixteen twice to get ${value}.`, plan: {
    audience: 'Newcomer', prerequisites: [], learningGoal: 'Halve twice', centralQuestion: 'What remains?', keyInsight: 'Two halvings divide by four',
    runningExample: `Sixteen, eight, ${value}`, misconceptions: [], entities: [], scenes: [{ id: 'beat-1', purpose: 'Follow two halvings', whyNow: 'Opening and closing example',
      keyPoints: [`Result ${value}`], visualDescription: `Sixteen, eight, ${value}`, endsWith: `${value} remains`, carry: [], cleanup: [], sourceRefs: [], interactions: [] }],
  } };
}
function review(verdict: 'pass' | 'revise' = 'pass'): EditorialReview {
  return { schemaVersion: 1, verdict, summary: 'Checked the two halvings', issues: verdict === 'pass' ? []
    : [{ severity: 'error', sceneId: 'beat-1', detail: 'Sixteen halved twice is four, not five. Correct speech and all plan values.' }], checks: ['16 / 2 / 2 = 4.'] };
}
const image = { type: 'image' as const, mimeType: 'image/png', data: 'fixture-image' };

test('review verdicts agree with material findings and identify actual scenes', () => {
  const warnings = review(); warnings.issues = [{ severity: 'warning', sceneId: null, detail: 'Optional wording preference.' }];
  expect(parseEditorialReview(JSON.stringify(warnings), lesson())).toEqual(warnings);
  const contradictory = review('revise'); contradictory.verdict = 'pass';
  expect(() => parseEditorialReview(JSON.stringify(contradictory), lesson())).toThrow('exactly');
  const cosmetic = { ...warnings, verdict: 'revise' };
  expect(() => parseEditorialReview(JSON.stringify(cosmetic), lesson())).toThrow('exactly');
  const wrongScene = review('revise'); wrongScene.issues[0].sceneId = 'beat-99';
  expect(() => parseEditorialReview(JSON.stringify(wrongScene), lesson())).toThrow('actual sceneId');
  expect(() => parseEditorialReview(JSON.stringify({ ...review(), checks: [] }), lesson())).toThrow('specific checks');
  expect(() => parseEditorialReview('null', lesson())).toThrow();
});

test('editorial repairs update speech and plan together, forward sources, and preserve the review trail', async () => {
  const root = await directory(), tasks: AgentTask[] = [];
  const outputs = [lesson('five'), review('revise'), lesson(), review()];
  const approved = await authorReviewedLesson({ async run(task) {
    tasks.push(task); const output = JSON.stringify(outputs.shift()); await task.validate!(output); return output;
  } }, request, root, new AbortController().signal, [image]);
  expect(approved).toEqual(lesson()); expect(tasks).toHaveLength(4);
  tasks.forEach(task => expect(task.images).toEqual([image]));
  expect(tasks[1].prompt).toContain('Sixteen, eight, four.');
  expect(tasks[1].prompt).toContain('parsedScenes');
  expect(tasks[1].systemPrompt).toContain('Visual plans and reveal guards belong in nonspoken context');
  expect(tasks[2].prompt).toContain('Correct speech and all plan values');
  expect(JSON.parse(await readFile(join(root, 'lesson-review-0.json'), 'utf8')).verdict).toBe('revise');
  expect(JSON.parse(await readFile(join(root, 'lesson-draft-1.json'), 'utf8')).markdown).toContain('four');
  expect(JSON.parse(await readFile(join(root, 'lesson-review-1.json'), 'utf8')).verdict).toBe('pass');
});

test('warnings do not trigger a rewrite', async () => {
  const root = await directory(); let calls = 0;
  const warning = review(); warning.issues.push({ severity: 'warning', sceneId: 'beat-1', detail: 'Optional alternative phrasing.' });
  const approved = await authorReviewedLesson({ async run() { return JSON.stringify(calls++ === 0 ? lesson() : warning); } }, request, root, new AbortController().signal);
  expect(approved).toEqual(lesson()); expect(calls).toBe(2);
});

test('three rejected drafts fail before submitting paid speech or publishing a lesson', async () => {
  const root = await directory(); let calls = 0, speechCalls = 0;
  const narration = new NarrationService({ root: join(root, 'speech'), provider: {
    settings: settingsFromEnv({ ELEVENLABS_VOICE_ID: 'test' }), async synthesize() { speechCalls++; throw new Error('Speech must not run'); },
  } });
  const id = crypto.randomUUID();
  const generate = createPiGenerator({ async run() { return JSON.stringify(calls++ % 2 === 0 ? lesson('five') : review('revise')); } }, narration, root);
  await expect(generate(request, 0, { owner: 'shared-user', videoId: id, signal: new AbortController().signal })).rejects.toMatchObject({ code: 'EDITORIAL' });
  expect(calls).toBe(6); expect(speechCalls).toBe(0);
  const files = await readdir(join(root, id));
  expect(files).toContain('lesson-review-2.json'); expect(files).not.toContain('lesson.json'); expect(files).not.toContain('narration-id');
});

test('cancellation during review cannot publish an approved lesson or start speech', async () => {
  const root = await directory(), controller = new AbortController(); let calls = 0, speechCalls = 0;
  const narration = new NarrationService({ root: join(root, 'speech'), provider: {
    settings: settingsFromEnv({ ELEVENLABS_VOICE_ID: 'test' }), async synthesize() { speechCalls++; throw new Error('Speech must not run'); },
  } });
  const id = crypto.randomUUID();
  const generate = createPiGenerator({ async run(task) {
    expect(task.signal).toBe(controller.signal);
    if (calls++ === 0) return JSON.stringify(lesson());
    controller.abort(new Error('Stopped during review')); return JSON.stringify(review());
  } }, narration, root);
  await expect(generate(request, 0, { owner: 'shared-user', videoId: id, signal: controller.signal })).rejects.toThrow('Stopped during review');
  expect(calls).toBe(2); expect(speechCalls).toBe(0);
  expect(await readdir(join(root, id))).not.toContain('lesson.json');
});

test('malformed review cannot unlock speech even if a runner skips the validation tool', async () => {
  const root = await directory(); let calls = 0;
  await expect(authorReviewedLesson({ async run() { return calls++ === 0 ? JSON.stringify(lesson()) : JSON.stringify({ ...review(), checks: [] }); } }, request, root, new AbortController().signal)).rejects.toThrow('specific checks');
  expect(await readdir(root)).not.toContain('lesson.json');
});
