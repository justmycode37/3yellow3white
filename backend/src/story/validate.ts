import { parseStoryline } from "../narration/markdown.js";
import { narrationMarkdown, sceneMarkdown } from "./writing.js";
import type { Story, StoryRequest } from "./types.js";

export const WORDS_PER_MINUTE = 140;
export const countWords = (text: string) => (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
const round = (n: number) => Math.round(n * 10) / 10;
export function storyTiming(story: Story) {
  let cursor = 0;
  const scenes = story.scenes.map(scene => {
    const words = scene.blocks.reduce((n, b) => n + (b.kind === "speech" ? countWords(b.text) : 0), 0);
    const pauseSeconds = scene.blocks.reduce((n, b) => n + b.seconds, 0);
    const startSec = cursor;
    // Estimates are reproducible; no model-authored durations can hide missing speech.
    cursor += words * 60 / WORDS_PER_MINUTE + pauseSeconds;
    return { id: scene.id, words, pauseSeconds: round(pauseSeconds), estimatedStartSec: round(startSec), estimatedDurationSec: round(cursor - startSec) };
  });
  return { wordsPerMinute: WORDS_PER_MINUTE, totalWords: scenes.reduce((n, s) => n + s.words, 0), pauseSeconds: round(scenes.reduce((n, s) => n + s.pauseSeconds, 0)), estimatedDurationSec: round(cursor), scenes };
}

/** Deterministic integrity checks; factual and pedagogical checks are performed separately. */
export function validateStory(story: Story, request: StoryRequest): string[] {
  const errors: string[] = [];
  const allIds = new Set<string>();
  if (!story.goal.trim()) errors.push("Provide the video's overall goal.");
  let speechLength = 0, blockCount = 0;
  story.scenes.forEach((scene, index) => {
    const expected = `scene-${String(index + 1).padStart(2, "0")}`;
    if (scene.id !== expected) errors.push(`Scene ${index + 1} must use ID ${expected}.`);
    if (!scene.blocks.some(b => b.kind === "speech")) errors.push(`${scene.id}: each scene needs spoken narration.`);
    if (Object.values(scene.context).some(value => !value.trim())) errors.push(`${scene.id}: context must explain before, this scene's purpose, and after.`);
    scene.blocks.forEach((block, i) => {
      blockCount++;
      if (allIds.has(block.id)) errors.push(`${block.id}: duplicate cue ID.`);
      allIds.add(block.id);
      if (block.id !== `${scene.id}-b${String(i + 1).padStart(2, "0")}`) errors.push(`${scene.id}: use ordered cue IDs ${scene.id}-b01, b02, etc.`);
      if (block.kind === "speech") {
        speechLength += block.text.length;
        if (!block.text.trim() || block.seconds !== 0 || block.role === "silence") errors.push(`${block.id}: speech requires text, a spoken role, seconds=0.`);
        if (/[\r\n]/.test(block.text)) errors.push(`${block.id}: speech must be a single paragraph.`);
        if (block.invitesPause && scene.blocks[i + 1]?.kind !== "pause") errors.push(`${block.id}: an invitation flagged invitesPause must immediately precede a pause.`);
      } else {
        const previous = scene.blocks[i - 1];
        if (block.text !== "" || block.seconds <= 0 || block.role !== "silence" || block.invitesPause) errors.push(`${block.id}: pause requires empty text, positive seconds, silence role, invitesPause=false.`);
        if (!previous || previous.kind !== "speech" || !previous.invitesPause) errors.push(`${block.id}: silence must follow an explicit spoken invitation with invitesPause=true.`);
        if (index === story.scenes.length - 1 && i === scene.blocks.length - 1) errors.push(`${block.id}: finish with a spoken resolution, not unexplained trailing silence.`);
      }
    });
  });
  if (speechLength > 20_000) errors.push("Spoken text exceeds the narration stage's 20,000-character limit.");
  if (blockCount > 200) errors.push("Use at most 200 cues; consolidate redundant speech blocks.");
  const timing = storyTiming(story);
  if (Math.abs(timing.estimatedDurationSec - request.durationSec) > request.durationSec * 0.2) errors.push(`Estimated duration ${timing.estimatedDurationSec}s at 140 wpm must be within ±20% of requested ${request.durationSec}s. Adjust spoken content, not synthetic durations.`);
  try {
    const parsed = parseStoryline(narrationMarkdown(story));
    if (parsed.beats.length !== story.scenes.length) errors.push("Narration parser changed the scene count.");
    parsed.beats.forEach((beat, i) => {
      const expected = story.scenes[i];
      if (!expected || beat.id !== expected.id) { errors.push("Narration scene IDs did not round-trip."); return; }
      const actualSpeech = beat.blocks.filter(b => b.kind === "speech").map(b => b.text).join(" ");
      const wantedSpeech = expected.blocks.filter(b => b.kind === "speech").map(b => b.text).join(" ");
      if (actualSpeech !== wantedSpeech) errors.push(`${expected.id}: narration text changed during Markdown parsing.`);
      const withContext = parseStoryline(sceneMarkdown(story, i)).beats;
      const signature = (blocks: typeof beat.blocks) => blocks.map(block => block.kind === "speech" ? [block.kind, block.role, block.text] : [block.kind, block.durationSec]);
      if (withContext.length !== 1 || withContext[0].id !== expected.id || JSON.stringify(signature(withContext[0].blocks)) !== JSON.stringify(signature(beat.blocks))) errors.push(`${expected.id}: nonspoken context changed the spoken script or pause sequence.`);
      const pauses = beat.blocks.filter(b => b.kind === "pause").map(b => b.durationSec);
      if (JSON.stringify(pauses) !== JSON.stringify(expected.blocks.filter(b => b.kind === "pause").map(b => b.seconds))) errors.push(`${expected.id}: pause order or duration changed during Markdown parsing.`);
    });
  } catch (error) { errors.push(`Narration compatibility: ${error instanceof Error ? error.message : "invalid Markdown"}`); }
  return errors;
}
