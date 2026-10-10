// From repository root: node_modules/.bin/bun docs/demos/rna-quality/publish.ts
// Frozen audio/plan are local experiment inputs; no model or TTS request is made.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileSource, evaluateScene } from 'animlib/core';
import type { Frame } from 'animlib/core';
import { validateSceneQuality } from '../../../backend/src/agents/scene-quality';
import { QUALITY_DEMO_PROMPT } from '../../../backend/src/agents/quality-demo';
import { atomicWrite } from '../../../backend/src/narration/service';
const root = 'data/animation-quality';
const narration = JSON.parse(await readFile('data/scene-speed/fixtures/rna/narration.json', 'utf8'));
const result = {
  id: 'm6-frame-reviewed', variant: 'm6-frame-reviewed', status: 'complete', model: 'gpt-6-astra',
  prompt: QUALITY_DEMO_PROMPT, promptSha256: createHash('sha256').update(QUALITY_DEMO_PROMPT).digest('hex'),
  refinement: 'Manual source repair from actual viewport frames; same prompt, plan and audio as m4-spatial. Includes geometry-only orbit hit testing.',
  parentRun: '05a5371f-00b9-4371-acb8-32233518a1ee',
  scenes: narration.scenes.map((scene: { id: string; audio: { id: string } }) => ({
    id: scene.id, source: '', audio: { id: scene.audio.id, url: `http://127.0.0.1:5208/audio/${scene.id}.wav` },
  })),
};
await mkdir(`${root}/m6-frame-reviewed`, { recursive: true });
let previous: Frame | undefined;
for (let i = 0; i < result.scenes.length; i++) {
  const source = await readFile(new URL(`scene-${i}.js`, import.meta.url), 'utf8');
  const compiled = await compileSource(source, { previous });
  validateSceneQuality(compiled);
  previous = evaluateScene(compiled, compiled.duration);
  result.scenes[i].source = source;
  await writeFile(`${root}/m6-frame-reviewed/scene-${i}.final-frame.json`, JSON.stringify(previous));
}
await atomicWrite(`${root}/m6-frame-reviewed.result.json`, JSON.stringify(result));
console.log('Published m6-frame-reviewed; two scenes validated and final frames saved.');
