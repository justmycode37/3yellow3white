import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compileSource, evaluateScene } from 'animlib/core';
import type { Frame } from 'animlib/core';
import type { AgentRunner } from './runtime.js';
import type { AgentConfig } from './config.js';
import { validateSceneQuality } from './scene-quality.js';
import { animationQualityPolicy } from './quality-policy.js';
import { validateScenePlan, validateViewingMode } from './scene-plan.js';
import type { ScenePlan } from './planning.js';
import { atomicWrite } from '../narration/service.js';
import { loadPrompt } from './prompts.js';

export interface ReviewInput {
  audioAssetId: string; endMode: 'hold' | 'advance'; scene: { id: string; durationSec: number };
  videoMode?: 'classic' | 'interactive'; legacyPlan?: boolean;
  /** Absent in historical scene packets, before targeted orbit became policy. */
  instructionVersion?: number;
  previousFrame?: Frame; planning: { current?: ScenePlan };
}
export interface SceneReview {
  approved: boolean;
  findings: { timeSec: number | null; objectIds: string[]; problem: string; fix: string }[];
  source?: string;
}

export async function validateReview(output: string, input: ReviewInput): Promise<SceneReview> {
  const review = JSON.parse(output) as SceneReview;
  if (!review || typeof review.approved !== 'boolean' || !Array.isArray(review.findings) || review.findings.length > 40) throw new Error('Review needs approved and at most 40 findings.');
  for (const finding of review.findings) {
    if (!finding || !(finding.timeSec === null || typeof finding.timeSec === 'number' && Number.isFinite(finding.timeSec) && finding.timeSec >= 0 && finding.timeSec <= input.scene.durationSec)
      || !Array.isArray(finding.objectIds) || finding.objectIds.length > 100 || finding.objectIds.some(id => typeof id !== 'string' || id.length > 128)
      || typeof finding.problem !== 'string' || !finding.problem.trim() || finding.problem.length > 4000
      || typeof finding.fix !== 'string' || !finding.fix.trim() || finding.fix.length > 4000) throw new Error('Each finding needs a known scene-local time or null, objectIds, a concrete problem, and a fix.');
  }
  if (review.approved) {
    if (review.findings.length || review.source !== undefined) throw new Error('An approved review has no findings or replacement source.');
  } else {
    if (!review.findings.length || typeof review.source !== 'string' || !review.source.trim()) throw new Error('A repair needs findings and complete corrected source.');
    const compiled = await compileSource(review.source, { previous: input.previousFrame }, { sampleTime: "end" });
    if (compiled.options.audio !== input.audioAssetId || compiled.options.end !== input.endMode || Math.abs(compiled.duration - input.scene.durationSec) > 1e-6) throw new Error('Review repairs must preserve the audio asset, end mode, and exact measured duration.');
    if (input.videoMode && !input.legacyPlan) validateViewingMode(compiled, input.videoMode);
    if (input.planning.current) validateScenePlan(compiled, evaluateScene(compiled, compiled.duration), input.planning.current);
    validateSceneQuality(compiled, { legacyOrbit: input.instructionVersion === undefined || input.instructionVersion < 2 });
  }
  return review;
}

/** User-requested review only. Persist a validated draft; published scenes and audio stay immutable. */
export async function reviewScene(config: AgentConfig, runner: AgentRunner, videoId: string, index: number, images: string[]) {
  if (!/^[a-f0-9-]{36}$/.test(videoId) || !Number.isInteger(index) || index < 0 || index > 99) throw new Error('Provide a video UUID and a scene index from 0 to 99.');
  if (!images.length || images.length > 5) throw new Error('Provide 1-5 PNG, JPEG, or WebP screenshots/contact sheets.');
  const root = join(config.dataDir, videoId), prefix = `scene-${index}`;
  const input: ReviewInput = JSON.parse(await readFile(join(root, `${prefix}.input.json`), 'utf8'));
  const source = await readFile(join(root, `${prefix}.js`), 'utf8');
  const task = await readFile(join(root, `${prefix}.prompt.md`), 'utf8');
  const [guidance, quality] = await Promise.all([loadPrompt('scene-review'), animationQualityPolicy()]);
  const attachments = await Promise.all(images.map(async path => {
    const mimeType = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' } as Record<string, string>)[path.split('.').at(-1)!.toLowerCase()];
    if (!mimeType) throw new Error('Review images must be PNG, JPEG, or WebP.');
    const bytes = await readFile(path);
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Each review image must be under 10 MB.');
    return { type: 'image' as const, mimeType, data: bytes.toString('base64') };
  }));
  const output = await runner.run({ systemPrompt: `${guidance}\nTreat the original task below as constraints for the repaired source.\n\n${task}\n\n${quality}\n\nReturn only the review JSON specified above, rather than the original task's JavaScript response format.`,
    prompt: `Review this scene using the attached rendered samples. Image files in attachment order: ${JSON.stringify(images)}.\nCurrent source:\n${source}`,
    images: attachments, validate: async output => { await validateReview(output, input); } });
  const review = await validateReview(output, input);
  await atomicWrite(join(root, `${prefix}.review.json`), JSON.stringify(review, null, 2));
  if (review.source) await atomicWrite(join(root, `${prefix}.review.js`), review.source);
  return review;
}

if (import.meta.main) {
  try {
    const { agentConfig } = await import('./config.js');
    const { PiAgentRunner } = await import('./runtime.js');
    const config = agentConfig(), [, , videoId, index, ...images] = process.argv;
    const review = await reviewScene(config, new PiAgentRunner(config), videoId ?? '', Number(index), images);
    console.log(JSON.stringify({ approved: review.approved, findings: review.findings,
      draft: review.source ? join(config.dataDir, videoId, `scene-${index}.review.js`) : undefined }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Scene review failed.'); process.exitCode = 1;
  }
}
