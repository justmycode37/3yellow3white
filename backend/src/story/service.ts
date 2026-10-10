import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";
import { buildStoryPackage, sha256 } from "./package.js";
import type { PackageProvenance } from "./package.js";
import { generationMessages, loadStoryGuidance, packageContract, reviewMessages } from "./prompts.js";
import { readReview, readStory, readStoryRequest, reviewSchema, storySchema } from "./schema.js";
import { storyProviderFromEnv } from "./provider.js";
import { STORY_MODEL, STORY_VERSION, StoryError, safeStoryError } from "./types.js";
import type { StoryJob, StoryProvider, StoryRequest, StoryReview, StoryImage } from "./types.js";
import { validateStory } from "./validate.js";

async function atomic(path: string, value: string | Uint8Array) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await rename(temporary, path);
}
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
function withImages(messages: import("./types.js").ModelMessage[], images?: StoryImage[]) {
  const source = messages.find(message => message.role === "user");
  if (source && images?.length) source.images = images;
  return messages;
}
interface SavedInput { request: StoryRequest; guidance: string; images?: StoryImage[] }

/** One process owns this data directory. Queued jobs are durable; restart requires explicit retry. */
export class StoryService {
  readonly root: string;
  private ready?: Promise<void>;
  private jobs = new Map<string, StoryJob>();
  private tasks = new Map<string, Promise<void>>();
  private tail: Promise<void> = Promise.resolve();
  private controller = new AbortController();
  private closing = false;
  private provider?: StoryProvider;
  private submission: Promise<unknown> = Promise.resolve();
  private workerLock?: Database;
  constructor(private options: { root?: string; provider?: StoryProvider; guidance?: string; maxAttempts?: number; onProgress?: (job: StoryJob) => void } = {}) {
    this.root = resolve(options.root ?? process.env.STORY_DATA_DIR ?? "data/stories");
    this.provider = options.provider;
  }
  private initialize(): Promise<void> {
    return this.ready ??= (async () => {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      // An OS-backed SQLite transaction prevents a second process from marking a live
      // worker's jobs interrupted. It is released automatically on a process crash.
      const lock = new Database(join(this.root, ".worker-lock.sqlite"), { create: true });
      try { lock.exec("PRAGMA busy_timeout=0; BEGIN EXCLUSIVE;"); }
      catch { lock.close(); throw new StoryError("WORKER_ACTIVE", "Another story service owns this data directory. Use its API or a separate STORY_DATA_DIR.", 503, true); }
      this.workerLock = lock;
      for (const id of await readdir(this.root)) {
        if (!/^[a-f0-9]{64}$/.test(id)) continue;
        let job: StoryJob;
        try { job = JSON.parse(await readFile(join(this.root, id, "job.json"), "utf8")); }
        catch { continue; }
        if (job.id !== id || typeof job.owner !== "string") continue;
        if (!["complete", "failed", "interrupted"].includes(job.status)) {
          job.status = "interrupted";
          job.error = { code: "INTERRUPTED", message: "The server restarted during generation. Retry to generate the ZIP.", retryable: true };
          await this.save(job);
        }
        this.jobs.set(id, job);
      }
    })().catch(error => { this.workerLock?.close(); this.workerLock = undefined; this.ready = undefined; throw error; });
  }
  private async save(job: StoryJob) {
    job.updatedAt = new Date().toISOString();
    await atomic(join(this.root, job.id, "job.json"), json(job));
    this.options.onProgress?.({ ...job });
  }
  private getProvider() {
    const provider = this.provider ??= storyProviderFromEnv();
    if (provider.model !== STORY_MODEL) throw new StoryError("MODEL_CONFIG", "Story orchestration requires gpt-6-astra.", 503);
    return provider;
  }
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.submission.then(fn, fn);
    this.submission = next.catch(() => {});
    return next;
  }
  async submit(owner: string, input: unknown, images: StoryImage[] = []): Promise<StoryJob> {
    const request = readStoryRequest(input);
    if (images.length > 40 || images.reduce((sum, image) => sum + image.base64.length, 0) > 32_000_000 || images.some(image => !image.label || image.label.length > 300 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64))) throw new StoryError("SOURCE_SIZE", "Source images exceed the supported limits.");
    if (!owner) throw new StoryError("UNAUTHORIZED", "An owner is required.", 401);
    await this.initialize();
    const guidance = this.options.guidance ?? await loadStoryGuidance();
    const provider = this.getProvider();
    return this.serialize(async () => {
      if (this.closing) throw new StoryError("SHUTDOWN", "The server is shutting down.", 503, true);
      const id = sha256(json({ version: STORY_VERSION, owner, request, images, guidance, contract: packageContract, schema: storySchema, model: provider.model, provider: provider.name, effort: provider.reasoningEffort }));
      const existing = this.jobs.get(id);
      if (existing) return { ...existing };
      if (this.tasks.size >= 10) throw new StoryError("QUEUE_FULL", "The story queue is full. Try again shortly.", 429, true);
      const now = new Date().toISOString();
      const job: StoryJob = { id, owner, status: "queued", model: provider.model, createdAt: now, updatedAt: now, attempt: 0 };
      await mkdir(join(this.root, id), { recursive: true, mode: 0o700 });
      await atomic(join(this.root, id, "input.json"), json({ request, guidance, images }));
      await this.save(job);
      this.jobs.set(id, job);
      this.enqueue(job);
      return { ...job };
    });
  }
  private enqueue(job: StoryJob) {
    const task = this.tail.then(() => this.run(job));
    this.tasks.set(job.id, task);
    this.tail = task.catch(() => {}).then(() => { this.tasks.delete(job.id); });
  }
  private async run(job: StoryJob) {
    try {
      if (this.closing) throw new StoryError("INTERRUPTED", "Generation stopped during server shutdown. Retry the job.", 503, true);
      const { request, guidance, images }: SavedInput = JSON.parse(await readFile(join(this.root, job.id, "input.json"), "utf8"));
      const provider = this.getProvider();
      const provenance: PackageProvenance = { model: provider.model, provider: provider.name, reasoningEffort: provider.reasoningEffort, generatedAt: new Date().toISOString(), calls: [] };
      const attempts = Math.min(3, Math.max(1, this.options.maxAttempts ?? 3));
      let repair: { draft: unknown; issues: string[] } | undefined;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        job.attempt = attempt; job.status = attempt === 1 ? "generating" : "repairing"; await this.save(job);
        const generated = await provider.generate(withImages(generationMessages(request, guidance, repair), images), storySchema, "video_story", this.controller.signal);
        if (!/^gpt-6-astra(?:-|$)/.test(generated.model)) throw new StoryError("MODEL_MISMATCH", "The generation provider did not return Astra.", 502);
        provenance.calls.push({ stage: `draft-${attempt}`, model: generated.model, responseId: generated.responseId, usage: generated.usage });
        await atomic(join(this.root, job.id, `draft-${attempt}.json`), json(generated.value));
        let story;
        try { story = readStory(generated.value); }
        catch (error) {
          if (!(error instanceof StoryError) || error.code !== "STORY_SCHEMA") throw error;
          repair = { draft: generated.value, issues: [error.message] }; continue;
        }
        const errors = validateStory(story, request);
        if (errors.length) {
          await atomic(join(this.root, job.id, `validation-${attempt}.json`), json(errors));
          repair = { draft: story, issues: errors }; continue;
        }
        job.status = "reviewing"; await this.save(job);
        const reviewed = await provider.generate(withImages(reviewMessages(request, story, guidance), images), reviewSchema, "story_review", this.controller.signal);
        if (!/^gpt-6-astra(?:-|$)/.test(reviewed.model)) throw new StoryError("MODEL_MISMATCH", "The review provider did not return Astra.", 502);
        provenance.calls.push({ stage: `review-${attempt}`, model: reviewed.model, responseId: reviewed.responseId, usage: reviewed.usage });
        const review: StoryReview = readReview(reviewed.value);
        await atomic(join(this.root, job.id, `review-${attempt}.json`), json(review));
        if (review.verdict !== "pass") { repair = { draft: story, issues: [review.summary, ...review.issues.map(i => `${i.sceneId ?? "story"}: ${i.detail}`)] }; continue; }
        job.status = "packaging"; await this.save(job);
        const pkg = buildStoryPackage(story, request, guidance, review, provenance);
        // Archive is fully built and verified before its atomic publication and the complete status.
        await atomic(join(this.root, job.id, "story.zip"), pkg.zip);
        await atomic(join(this.root, job.id, "manifest.json"), json(pkg.manifest));
        job.status = "complete"; job.title = story.title; job.sceneCount = story.scenes.length;
        job.estimatedDurationSec = pkg.timing.estimatedDurationSec; job.zipSha256 = pkg.zipSha256; delete job.error;
        await this.save(job); return;
      }
      throw new StoryError("QUALITY_FAILED", `The story did not pass validation and editorial review after ${attempts} drafts. No ZIP was published.`, 422, true);
    } catch (error) {
      const failure = safeStoryError(error);
      job.status = this.closing ? "interrupted" : "failed";
      job.error = { code: failure.code, message: failure.message, retryable: failure.retryable };
      await this.save(job);
    }
  }
  async get(owner: string, id: string): Promise<StoryJob> {
    await this.initialize();
    const job = this.jobs.get(id);
    if (!job || job.owner !== owner) throw new StoryError("NOT_FOUND", "Story not found.", 404);
    return { ...job };
  }
  async retry(owner: string, id: string): Promise<StoryJob> {
    await this.get(owner, id);
    return this.serialize(async () => {
      if (this.closing) throw new StoryError("SHUTDOWN", "The server is shutting down.", 503, true);
      const job = this.jobs.get(id)!;
      if (this.tasks.has(id) || job.status === "complete") return { ...job };
      if (!job.error?.retryable) throw new StoryError("RETRY", "This failure requires a corrected request or configuration.", 409);
      if (this.tasks.size >= 10) throw new StoryError("QUEUE_FULL", "The story queue is full.", 429, true);
      job.status = "queued"; job.attempt = 0; delete job.error; await this.save(job);
      this.enqueue(job); return { ...job };
    });
  }
  async artifact(owner: string, id: string, name: "story.zip" | "manifest.json") {
    const job = await this.get(owner, id);
    if (job.status !== "complete") throw new StoryError("NOT_READY", "The ZIP is not ready. Check the story status.", 409, true);
    const value = await readFile(join(this.root, id, name));
    if (name === "story.zip" && sha256(value) !== job.zipSha256) throw new StoryError("ZIP_CORRUPT", "The saved ZIP failed its integrity check.", 500);
    return value;
  }
  async idle() { await this.submission; await this.tail; }
  async close() {
    this.closing = true; this.controller.abort();
    try { await this.ready?.catch(() => {}); await this.idle(); }
    finally { this.workerLock?.close(); this.workerLock = undefined; }
  }
}
