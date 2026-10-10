import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentConfig } from '../src/agents/config.js';
import { reviewScene, validateReview } from '../src/agents/review.js';
import type { ReviewInput } from '../src/agents/review.js';

const input: ReviewInput = { audioAssetId: 'narration.beat-1', endMode: 'hold', scene: { id: 'beat-1', durationSec: 2 }, planning: {} };
const source = `export default scene({audio:'narration.beat-1',end:'hold'},s=>{s.circle('dot');s.wait(2);});`;
const finding = { timeSec: 1, objectIds: ['dot'], problem: 'The dot overlaps a label', fix: 'Move the label clear of the dot' };

test('rendered review validates a complete repair and forbids timing/audio changes', async () => {
  const repaired = { approved: false, findings: [finding], source };
  expect(await validateReview(JSON.stringify(repaired), input)).toEqual(repaired);
  await expect(validateReview(JSON.stringify({ ...repaired, source: source.replace('s.wait(2)', 's.wait(3)') }), input)).rejects.toThrow('exact measured duration');
  await expect(validateReview(JSON.stringify({ ...repaired, source: source.replace('narration.beat-1', 'other-audio') }), input)).rejects.toThrow('audio asset');
  await expect(validateReview(JSON.stringify({ ...repaired, findings: [{ ...finding, timeSec: 3 }] }), input)).rejects.toThrow('scene-local time');
  expect(await validateReview(JSON.stringify({ ...repaired, findings: [{ ...finding, timeSec: null }] }), input)).toMatchObject({ approved: false });
  await expect(validateReview(JSON.stringify({ approved: true, findings: [finding] }), input)).rejects.toThrow('no findings');
});

let root: string | undefined;
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); root = undefined; });
test('review sends actual screenshot attachments and saves a draft without changing published source', async () => {
  root = await mkdtemp(join(tmpdir(), 'aha-review-'));
  const config = agentConfig({ AGENT_DATA_DIR: root }), videoId = crypto.randomUUID(), directory = join(root, videoId);
  await mkdir(directory);
  await writeFile(join(directory, 'scene-0.input.json'), JSON.stringify(input));
  await writeFile(join(directory, 'scene-0.prompt.md'), 'Original scene constraints');
  await writeFile(join(directory, 'scene-0.js'), source);
  const image = join(root, 'sample.png');
  await writeFile(image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQi7rzHwAEQgJUZSSrPwAAAABJRU5ErkJggg==', 'base64'));
  const repairedSource = source.replace("s.circle('dot')", "s.circle('dot',{position:[1,0]})");
  const review = await reviewScene(config, { async run(task) {
    expect(task.images?.[0].mimeType).toBe('image/png');
    expect(Buffer.from(task.images![0].data, 'base64')).toEqual(await readFile(image));
    expect(task.systemPrompt).toContain('Original scene constraints');
    expect(task.prompt).toContain(source);
    const output = JSON.stringify({ approved: false, findings: [finding], source: repairedSource });
    await task.validate!(output); return output;
  } }, videoId, 0, [image]);
  expect(review.approved).toBe(false);
  expect(await readFile(join(directory, 'scene-0.js'), 'utf8')).toBe(source);
  expect(await readFile(join(directory, 'scene-0.review.js'), 'utf8')).toBe(repairedSource);
  expect(JSON.parse(await readFile(join(directory, 'scene-0.review.json'), 'utf8')).findings).toEqual([finding]);
});
