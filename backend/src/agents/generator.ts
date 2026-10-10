import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Frame } from 'animlib/core';
import type { Generator, GenerationContext } from "../videos.js";
import { parseStoryline } from "../narration/markdown.js";
import { buildSceneAgentInput, validateSceneAgainstNarration } from "../narration/handoff.js";
import { atomicWrite } from "../narration/service.js";
import type { NarrationService } from "../narration/service.js";
import { AgentError } from "./config.js";
import { attachTimingPrelude, TIMING_PRELUDE_INSTRUCTIONS } from "./timing-prelude.js";
import type { AgentRunner, AgentTask } from "./runtime.js";
import { parsePlannedLesson, scenePlanningContext, validateStory } from './planning.js';
import { authorReviewedLesson } from './editorial.js';
import type { LessonPlan } from './planning.js';
import { validateSceneQuality } from './scene-quality.js';
import { animationQualityPolicy } from './quality-policy.js';
import { validateScenePlan, validateViewingMode } from './scene-plan.js';
import { instructionSnapshot, loadPrompt } from './prompts.js';
import { buildAuthoringReference } from './authoring-reference.js';
import { validationMessage } from './runtime.js';
import { logEvent, logStage } from '../logging.js';
import { buildSubtitlePackage } from '../narration/subtitles.js';
import { silence, wav, hash } from '../narration/audio.js';
import type { NarrationScenePackage } from '../narration/types.js';
import { reviewGeneratedScene } from './visual-gate.js';

export function sceneSource(output: string): string {
  const fenced = /^```(?:js|javascript)?\s*\n([\s\S]*?)\n```$/.exec(output.trim());
  return (fenced ? fenced[1] : output).trim();
}

async function saved(path: string): Promise<string | undefined> {
  try { return await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}

/** Host-owned stages. Script and narration identity survive restarts; model tools cannot access disk. */
export function createPiGenerator(runner: AgentRunner, narration: NarrationService, root: string, options: { outputMode?: AgentTask['outputMode']; timingMode?: 'inline' | 'host'; visualGate?: typeof reviewGeneratedScene } = {}): Generator {
  return async (request, index, context?: GenerationContext) => {
    if (!context) throw new AgentError("CONTEXT", "Pi generation requires a video job context.");
    const { videoId, owner, previousFrame, signal } = context;
    if (!/^[a-f0-9-]{36}$/.test(videoId)) throw new AgentError("CONTEXT", "Invalid video job ID.");
    signal.throwIfAborted();
    const subtitles = request.narrationMode === 'subtitles';
    if (!subtitles && !narration.available) throw new AgentError("NARRATION", "Configure ElevenLabs before generating a narrated video.");
    const directory = join(root, videoId);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const fingerprint = createHash("sha256").update(JSON.stringify({ owner, request })).digest("hex");
    const prior = await saved(join(directory, "request.sha256"));
    if (prior && prior !== fingerprint) throw new AgentError("CONTEXT", "Saved generation belongs to a different request.");
    if (!prior) await atomicWrite(join(directory, "request.sha256"), fingerprint);
    const lessonPath = join(directory, 'lesson.json');
    const cachedLesson = await saved(lessonPath);
    let plan: LessonPlan | undefined;
    let markdown: string | undefined;
    let legacyPlan = false;
    let instructionVersion: number | undefined;
    if (cachedLesson) {
      instructionVersion = JSON.parse(cachedLesson).instructionVersion;
      legacyPlan = instructionVersion === undefined;
      const lesson = parsePlannedLesson(cachedLesson, request, { legacy: legacyPlan });
      markdown = lesson.markdown; plan = lesson.plan;
    } else {
      markdown = await saved(join(directory, 'script.md')); // Resume videos authored before structured planning.
      legacyPlan = !!markdown;
    }
    if (!markdown) {
      const lesson = await logStage({ videoId, stage: 'script' }, () => authorReviewedLesson(runner, request, directory, signal, context.images, videoId));
      markdown = lesson.markdown; plan = lesson.plan; instructionVersion = lesson.instructionVersion;
      signal.throwIfAborted();
      await atomicWrite(join(directory, 'storyline.prompt.md'), await readFile(join(directory, 'editorial', lesson.editorialReview.runId,
        `lesson-draft-${lesson.editorialReview.attempt}.prompt.md`), 'utf8'));
      // The atomic envelope is authoritative; script.md is a readable export for local review.
      await atomicWrite(lessonPath, JSON.stringify(lesson, null, 2));
      await atomicWrite(join(directory, "script.md"), markdown);
    } else logEvent('script.reused', { videoId, cached: true });
    const story = parseStoryline(markdown); validateStory(story);
    if (index >= story.beats.length) return null;
    const pkg: NarrationScenePackage = subtitles ? await (async () => {
      const path = join(directory, 'subtitles.json');
      const cached = await saved(path);
      const packet: NarrationScenePackage = cached ? JSON.parse(cached) : buildSubtitlePackage(story);
      if (packet.scriptHash !== hash(markdown) || packet.timingBasis !== 'subtitle-reading') throw new AgentError('CONTEXT', 'Subtitle timing belongs to a different script.');
      if (!cached) await atomicWrite(path, JSON.stringify(packet));
      return packet;
    })() : await (async () => {
      const narrationId = await saved(join(directory, "narration-id"));
      const job = narrationId ? await narration.get(owner, narrationId) : await narration.submit(owner, markdown);
      if (!narrationId) await atomicWrite(join(directory, "narration-id"), job.id);
      if (job.status === 'interrupted') await narration.retry(owner, job.id);
      return await logStage({ videoId, narrationId: job.id, stage: 'narration', sceneIndex: index }, async () => {
        // Poll only local durable state; the speech service owns its work and retry policy.
        while (true) {
          signal.throwIfAborted();
          const ready = await narration.scenePackage(owner, job.id, index);
          if (ready) return ready;
          const status = await narration.get(owner, job.id);
          if (status.status === "failed" || status.status === "interrupted") throw new AgentError("NARRATION", status.error?.message ?? "Narration failed.");
          await new Promise<void>((resolve, reject) => {
            const abort = () => { clearTimeout(timer); reject(signal.reason); };
            const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 200);
            signal.addEventListener("abort", abort, { once: true });
          });
        }
      });
    })();
    const scene = pkg.scenes[index];
    if (!scene) return null;
    const { instructions, ...input } = buildSceneAgentInput(pkg, scene.id, previousFrame);
    const planning = scenePlanningContext(story, index, plan);
    // Preserve explicit visual preferences even when a saved plan omitted them.
    const packet = { ...input, planning, videoMode: request.videoMode ?? 'classic', legacyPlan, instructionVersion,
      request: { title: request.title, topic: request.topic, videoMode: request.videoMode ?? 'classic' } };
    const assemble = (output: string) => options.timingMode === 'host'
      ? attachTimingPrelude(sceneSource(output), input) : sceneSource(output);
    const diagnostics: string[] = [];
    // Scoped to this immutable narration/previous-frame context; failures are never cached.
    const verifiedSources = new Map<string, Frame>();
    // Cached sources are already self-contained; only new model output needs assembly.
    const validateSource = async (output: string, checkQuality = true) => {
      signal.throwIfAborted();
      const normalizedSource = sceneSource(output);
      const key = `${checkQuality}\0${normalizedSource}`;
      const cached = verifiedSources.get(key);
      if (cached) return structuredClone(cached);
      try {
        const { compiled, finalFrame } = await validateSceneAgainstNarration(normalizedSource, pkg, scene.id, previousFrame);
        if (Math.abs(compiled.duration - scene.durationSec) > 1e-6) throw new Error(`The scene must last ${scene.durationSec} seconds; it currently lasts ${compiled.duration}. Add the remaining time with a final s.wait().`);
        if (!legacyPlan) validateViewingMode(compiled, packet.videoMode);
        if (plan) validateScenePlan(compiled, finalFrame, plan.scenes[index]);
        if (checkQuality) validateSceneQuality(compiled, { legacyOrbit: instructionVersion === undefined || instructionVersion < 2 });
        if (verifiedSources.size >= 4) verifiedSources.delete(verifiedSources.keys().next().value!);
        verifiedSources.set(key, structuredClone(finalFrame));
        return finalFrame;
      } catch (error) {
        diagnostics.push(validationMessage(error));
        logEvent('scene.validation_failed', { videoId, sceneIndex: index, attempt: diagnostics.length }, 'warn');
        await atomicWrite(join(directory, `scene-${index}.diagnostics.json`), JSON.stringify(diagnostics.slice(-20), null, 2));
        throw error;
      }
    };
    const validate = async (output: string) => { await validateSource(assemble(output)); };
    const path = join(directory, subtitles ? `scene-${index}.subtitles.js` : `scene-${index}.js`);
    let source = await saved(path);
    if (!source) {
      const [reference, craft, viewingMode, quality] = await Promise.all([
        readFile(new URL("../../../shared/animlib/docs/reference.md", import.meta.url), "utf8").then(buildAuthoringReference),
        loadPrompt('scene-craft'), loadPrompt('viewing-mode'), animationQualityPolicy(),
      ]);
      const task = {
        outputMode: options.outputMode ?? 'text',
        systemPrompt: `${instructions.replace("Return animlib SceneSource { id, source }.", "Return only JavaScript with one default-exported scene, without a JSON wrapper.")}\nFor video delivery, end your timeline at exactly durationSec using a final s.wait() as needed. Use validate_output before finishing. The host output/timing contract and viewing-mode policy take priority over illustrative API examples; implement the approved plan within those constraints.\n\n${viewingMode}\n\n${craft}\n\n${quality}\n\n${reference}`,
        prompt: `Generate this scene using the authoritative narration packet and lesson plan:${options.timingMode === 'host' ? '\n' + TIMING_PRELUDE_INSTRUCTIONS : ''}\n${JSON.stringify(packet)}`, validate, signal,
        logContext: { videoId, sceneIndex: index, stage: 'scene' as const },
      };
      await atomicWrite(join(directory, `scene-${index}.instructions.json`), JSON.stringify(instructionSnapshot(task.systemPrompt)));
      await atomicWrite(join(directory, `scene-${index}.prompt.md`), `${task.systemPrompt}\n\n${task.prompt}`);
      await atomicWrite(join(directory, `scene-${index}.input.json`), JSON.stringify(packet));
      source = assemble(await logStage({ videoId, sceneIndex: index, stage: 'scene' }, () => runner.run(task)));
      source = await (options.visualGate ?? reviewGeneratedScene)({ runner, source, input: packet, task,
        directory, index, videoId, signal, validate: validateSource });
      const finalFrame = await validateSource(source);
      signal.throwIfAborted();
      await atomicWrite(path, source);
      await atomicWrite(join(directory, `scene-${index}.final-frame.json`), JSON.stringify(finalFrame));
    } else {
      // New quality policy must not make already published legacy scenes unplayable.
      const finalFrame = await validateSource(source, false);
      await atomicWrite(join(directory, `scene-${index}.final-frame.json`), JSON.stringify(finalFrame));
      logEvent('scene.reused', { videoId, sceneIndex: index, cached: true });
    }
    const audio = subtitles ? wav(silence(scene.durationSec)) : new Uint8Array(await readFile(await narration.audio(owner, pkg.id, scene.audio.id)));
    return { audio, scene: { id: scene.id, index, source, duration: scene.durationSec,
      audio: { id: scene.audio.id },
      narration: scene.utterances.map(utterance => utterance.text).join(' '), visualDescription: scene.context,
      words: scene.utterances.flatMap(utterance => utterance.words.map(word => ({ id: word.id, text: word.text, start: word.startSec, end: word.endSec }))),
      captions: scene.utterances.flatMap(utterance => utterance.sentences.map(sentence => ({ start: sentence.startSec, end: sentence.endSec, text: sentence.text }))),
    } };
  };
}
