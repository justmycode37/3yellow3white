import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentConfig } from '../src/agents/config.js';
import { createPiGenerator } from '../src/agents/generator.js';
import type { AgentTask } from '../src/agents/runtime.js';
import type { PlannedLesson } from '../src/agents/planning.js';
import type { NarrationService } from '../src/narration/service.js';
import type { NarrationScenePackage } from '../src/narration/types.js';

test('scene output config preserves text by default and accepts explicit supported modes', () => {
  expect(agentConfig({}).sceneOutputMode).toBe('text');
  expect(agentConfig({ AGENT_SCENE_OUTPUT_MODE: 'text' }).sceneOutputMode).toBe('text');
  expect(agentConfig({ AGENT_SCENE_OUTPUT_MODE: 'validated-reference' }).sceneOutputMode).toBe('validated-reference');
});

test('scene output config rejects unsupported or misspelled completion protocols', () => {
  for (const value of ['', 'submit', 'submit-only', 'validated_reference', 'TEXT']) {
    expect(() => agentConfig({ AGENT_SCENE_OUTPUT_MODE: value })).toThrow('AGENT_SCENE_OUTPUT_MODE');
  }
});

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

const lesson: PlannedLesson = {
  schemaVersion: 1,
  markdown: '# Counting\n\n## Beat 1\n\nContent needed: Show one dot.\n\nNarration: One dot.',
  plan: {
    audience: 'Newcomer', prerequisites: [], learningGoal: 'Recognize one', centralQuestion: 'How many dots?',
    keyInsight: 'One dot is one object', runningExample: 'One dot', misconceptions: [], entities: [],
    scenes: [{ id: 'beat-1', purpose: 'Count one dot', whyNow: 'Complete one-object example', keyPoints: ['One dot'],
      visualDescription: 'Show one dot', endsWith: 'One dot remains', carry: [], cleanup: [], sourceRefs: [], interactions: [] }],
  },
};
const packet: NarrationScenePackage = {
  id: 'saved-narration', scriptHash: 'test-script-hash', totalScenes: 1,
  scenes: [{ id: 'beat-1', title: 'Counting', context: 'Show one dot.', startSec: 0, durationSec: 1,
    audio: { id: 'saved-narration.beat-1', url: '/unused.wav', sha256: 'test-audio-hash', sampleCount: 24000 },
    utterances: [{ id: 'beat-1.u1', role: 'narration', text: 'One dot.', spokenText: 'One dot.',
      source: { start: 0, end: 8, line: 7 }, startSec: 0, endSec: 1,
      words: [{ id: 'beat-1.u1.w1', utteranceId: 'beat-1.u1', text: 'One', startSec: 0, endSec: 0.4, characterRange: [0, 3] },
        { id: 'beat-1.u1.w2', utteranceId: 'beat-1.u1', text: 'dot.', startSec: 0.5, endSec: 1, characterRange: [4, 8] }],
      sentences: [{ id: 'beat-1.u1.s1', wordIds: ['beat-1.u1.w1', 'beat-1.u1.w2'], text: 'One dot.', startSec: 0, endSec: 1 }],
    }], pauses: [] }],
};

for (const outputMode of [undefined, 'text', 'validated-reference'] as const) {
  test(`generator scopes ${outputMode ?? 'default'} output mode to scenes, preserving editorial tasks`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'aha-scene-output-')); roots.push(root);
    const tasks: AgentTask[] = [];
    // Stop at the model boundary: no provider, speech synthesis, or audio fixtures are needed.
    const stoppedAtScene = new Error('Scene task captured');
    const narration = {
      available: true,
      async submit() { return { id: packet.id, status: 'complete' }; },
      async scenePackage() { return packet; },
    } as unknown as NarrationService;
    const runner = { async run(task: AgentTask) {
      tasks.push(task);
      if (task.prompt.startsWith('Write')) return JSON.stringify(lesson);
      if (task.prompt.startsWith('Review')) return JSON.stringify({ schemaVersion: 1, verdict: 'pass',
        summary: 'The example counts one object.', issues: [], checks: ['One dot represents one object.'] });
      throw stoppedAtScene;
    } };
    const generator = outputMode === undefined
      ? createPiGenerator(runner, narration, root)
      : createPiGenerator(runner, narration, root, { outputMode });
    await expect(generator({ title: 'Counting', topic: 'One dot', documents: [] }, 0,
      { videoId: crypto.randomUUID(), owner: 'test-owner', signal: new AbortController().signal })).rejects.toBe(stoppedAtScene);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].outputMode).toBeUndefined();
    expect(tasks[1].outputMode).toBeUndefined();
    expect(tasks[2].outputMode).toBe(outputMode ?? 'text');
    expect(tasks[2].validate).toBeFunction();
    expect(tasks[0].sceneTools).toBeUndefined();
    expect(tasks[1].sceneTools).toBeUndefined();
    expect(tasks[2].sceneTools?.inspect).toBeFunction();
    expect(tasks[2].sceneTools?.preview).toBeUndefined();
    expect(tasks[2].prompt).toContain('saved-narration.beat-1');
  });
}
