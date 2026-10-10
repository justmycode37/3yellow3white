import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
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
import { validateScenePlan } from './scene-plan.js';
import { validationMessage } from './runtime.js';
import { logEvent, logStage } from '../logging.js';

export function sceneSource(output: string): string {
  const fenced = /^```(?:js|javascript)?\s*\n([\s\S]*?)\n```$/.exec(output.trim());
  return (fenced ? fenced[1] : output).trim();
}

async function saved(path: string): Promise<string | undefined> {
  try { return await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}

/** Host-owned stages. Script and narration identity survive restarts; model tools cannot access disk. */
export function createPiGenerator(runner: AgentRunner, narration: NarrationService, root: string, options: { outputMode?: AgentTask['outputMode']; timingMode?: 'inline' | 'host' } = {}): Generator {
  return async (request, index, context?: GenerationContext) => {
    if (!context) throw new AgentError("CONTEXT", "Pi generation requires a video job context.");
    const { videoId, owner, previousFrame, signal } = context;
    if (!/^[a-f0-9-]{36}$/.test(videoId)) throw new AgentError("CONTEXT", "Invalid video job ID.");
    signal.throwIfAborted();
    if (!narration.available) throw new AgentError("NARRATION", "Configure ElevenLabs before generating a narrated video.");
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
    if (cachedLesson) {
      const lesson = parsePlannedLesson(cachedLesson, request);
      markdown = lesson.markdown; plan = lesson.plan;
    } else markdown = await saved(join(directory, 'script.md')); // Resume videos authored before structured planning.
    if (!markdown) {
      const lesson = await logStage({ videoId, stage: 'script' }, () => authorReviewedLesson(runner, request, directory, signal, context.images, videoId));
      markdown = lesson.markdown; plan = lesson.plan;
      signal.throwIfAborted();
      await atomicWrite(join(directory, 'storyline.prompt.md'), await readFile(join(directory, 'editorial', lesson.editorialReview.runId,
        `lesson-draft-${lesson.editorialReview.attempt}.prompt.md`), 'utf8'));
      // The atomic envelope is authoritative; script.md is a readable export for local review.
      await atomicWrite(lessonPath, JSON.stringify(lesson, null, 2));
      await atomicWrite(join(directory, "script.md"), markdown);
    } else logEvent('script.reused', { videoId, cached: true });
    const story = parseStoryline(markdown); validateStory(story);
    if (index >= story.beats.length) return null;
    const narrationId = await saved(join(directory, "narration-id"));
    const job = narrationId ? await narration.get(owner, narrationId) : await narration.submit(owner, markdown);
    if (!narrationId) await atomicWrite(join(directory, "narration-id"), job.id);
    if (job.status === 'interrupted') await narration.retry(owner, job.id);
    const pkg = await logStage({ videoId, narrationId: job.id, stage: 'narration', sceneIndex: index }, async () => {
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
    const scene = pkg.scenes[index];
    if (!scene) return null;
    const { instructions, ...input } = buildSceneAgentInput(pkg, scene.id, previousFrame);
    const planning = scenePlanningContext(story, index, plan);
    const assemble = (output: string) => options.timingMode === 'host'
      ? attachTimingPrelude(sceneSource(output), input) : sceneSource(output);
    const diagnostics: string[] = [];
    // Cached sources are already self-contained; only new model output needs assembly.
    const validateSource = async (output: string) => {
      try {
        const { compiled, finalFrame } = await validateSceneAgainstNarration(sceneSource(output), pkg, scene.id, previousFrame);
        if (Math.abs(compiled.duration - scene.durationSec) > 1e-6) throw new Error(`The scene must last ${scene.durationSec} seconds; it currently lasts ${compiled.duration}. Add the remaining time with a final s.wait().`);
        if (plan) validateScenePlan(compiled, finalFrame, plan.scenes[index]);
      } catch (error) {
        diagnostics.push(validationMessage(error));
        logEvent('scene.validation_failed', { videoId, sceneIndex: index, attempt: diagnostics.length }, 'warn');
        await atomicWrite(join(directory, `scene-${index}.diagnostics.json`), JSON.stringify(diagnostics.slice(-20), null, 2));
        throw error;
      }
    };
    const validate = (output: string) => validateSource(assemble(output));
    const path = join(directory, `scene-${index}.js`);
    let source = await saved(path);
    if (!source) {
      const reference = await readFile(new URL("../../../shared/animlib/docs/reference.md", import.meta.url), "utf8");
      const craft = await readFile(new URL('../../prompts/scene-craft.md', import.meta.url), 'utf8');
      const task = {
        outputMode: options.outputMode ?? 'text',
        systemPrompt: `${instructions.replace("Return animlib SceneSource { id, source }.", "Return only JavaScript with one default-exported scene, without a JSON wrapper.")}\nFor video delivery, end your timeline at exactly durationSec using a final s.wait() as needed. Use validate_output before finishing.\n\n${craft}\n\n${reference}`,
        prompt: `Generate this scene using the authoritative narration packet and lesson plan:${options.timingMode === 'host' ? '\n' + TIMING_PRELUDE_INSTRUCTIONS : ''}\n${JSON.stringify({ ...input, planning })}`, validate, signal,
        logContext: { videoId, sceneIndex: index, stage: 'scene' as const },
      };
      await atomicWrite(join(directory, `scene-${index}.prompt.md`), `${task.systemPrompt}\n\n${task.prompt}`);
      await atomicWrite(join(directory, `scene-${index}.input.json`), JSON.stringify({ ...input, planning }));
      source = assemble(await logStage({ videoId, sceneIndex: index, stage: 'scene' }, () => runner.run(task)));
      await validateSource(source);
      signal.throwIfAborted();
      await atomicWrite(path, source);
    } else { await validateSource(source); logEvent('scene.reused', { videoId, sceneIndex: index, cached: true }); }
    const audio = new Uint8Array(await readFile(await narration.audio(owner, job.id, scene.audio.id)));
    return { audio, scene: { id: scene.id, index, source, duration: scene.durationSec,
      audio: { id: scene.audio.id },
      narration: scene.utterances.map(utterance => utterance.text).join(' '), visualDescription: scene.context,
      words: scene.utterances.flatMap(utterance => utterance.words.map(word => ({ id: word.id, text: word.text, start: word.startSec, end: word.endSec }))),
      captions: scene.utterances.flatMap(utterance => utterance.sentences.map(sentence => ({ start: sentence.startSec, end: sentence.endSec, text: sentence.text }))),
    } };
  };
}
