import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync, strFromU8, strToU8, zipSync } from "fflate";
import { buildStoryPackage, sha256 } from "../src/story/package.js";
import { createOpenAIStoryProvider } from "../src/story/provider.js";
import { readStory, readStoryRequest, storySchema } from "../src/story/schema.js";
import { StoryService } from "../src/story/service.js";
import { storyRoutes } from "../src/story/routes.js";
import { STORY_MODEL, StoryError } from "../src/story/types.js";
import type { StoryProvider } from "../src/story/types.js";
import { storyTiming, validateStory } from "../src/story/validate.js";
import { parseStoryline } from "../src/narration/markdown.js";
import { readStoryArchive, buildStorySceneInput } from "../src/story/handoff.js";
import { fixtureStory, passingReview, storyRequest } from "./story.fixture.js";

const roots: string[] = [];
const services: StoryService[] = [];
afterEach(async () => { for (const service of services.splice(0)) await service.close(); for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const provenance = { model: STORY_MODEL, provider: "test", reasoningEffort: "high", generatedAt: "2026-10-10T00:00:00Z", calls: [] };
async function setup(generate?: StoryProvider["generate"]) {
  const root = await mkdtemp(join(tmpdir(), "aha-story-test-")); roots.push(root);
  let calls = 0;
  const provider: StoryProvider = { name: "test", model: STORY_MODEL, reasoningEffort: "high", generate: async (...args) => { calls++; return generate ? generate(...args) : { value: args[2] === "story_review" ? passingReview : fixtureStory(), model: STORY_MODEL, provider: "test" }; } };
  const service = new StoryService({ root, provider, guidance: "Test guidance" });
  services.push(service);
  return { service, provider, root, calls: () => calls };
}

test("ZIP contains only scene Markdown with brief nonspoken context and exact spoken scripts", () => {
  const story = readStory(fixtureStory());
  expect(validateStory(story, storyRequest)).toEqual([]);
  const pkg = buildStoryPackage(story, storyRequest, "Guidance snapshot", passingReview, provenance);
  const unzipped = unzipSync(pkg.zip);
  expect(Object.keys(unzipped).sort()).toEqual(["scene-01.md", "scene-02.md"]);
  expect(Object.keys(pkg.files).sort()).toEqual(["scene-01.md", "scene-02.md"]);
  for (const file of pkg.manifest.files) { expect(sha256(unzipped[file.path])).toBe(file.sha256); expect(unzipped[file.path].length).toBe(file.bytes); }
  expect(pkg.manifest.sceneOrder.map(s => s.id)).toEqual(["scene-01", "scene-02"]);
  expect(pkg.manifest.timing.pauseSeconds).toBe(5);
  const archive = readStoryArchive(pkg.zip, pkg.zipSha256);
  const narration = parseStoryline(archive.narrationMarkdown);
  expect(narration.beats.map(b => b.id)).toEqual(["scene-01", "scene-02"]);
  expect(narration.beats.every(b => b.context === "")).toBe(true);
  expect(archive.narrationMarkdown).not.toContain(story.goal);
  for (const scene of archive.scenes) {
    expect(scene.contextMarkdown).toContain(story.goal);
    expect(scene.narrationMarkdown).not.toContain("Overall goal:");
    expect(parseStoryline(scene.markdown).beats[0].context).toContain(story.goal);
  }
  expect(archive.scenes[0].contextMarkdown).toContain("Before: Opening scene");
  expect(archive.scenes[0].contextMarkdown).toContain("After: scene-02");
  expect(archive.scenes[1].contextMarkdown).toContain("Before: scene-01");
  expect(archive.scenes[1].contextMarkdown).toContain("After: End of video");
  expect(narration.beats[0].blocks.at(-1)).toMatchObject({ kind: "pause", durationSec: 5 });
  expect(narration.beats[1].blocks[0]).toMatchObject({ kind: "speech", role: "reveal", text: story.scenes[1].blocks[0].text });
  for (const [index, scene] of story.scenes.entries()) {
    expect(narration.beats[index].blocks.filter(b => b.kind === "speech").map(b => b.text).join(" ")).toBe(scene.blocks.filter(b => b.kind === "speech").map(b => b.text).join(" "));
  }
  expect(buildStoryPackage(story, storyRequest, "Guidance snapshot", passingReview, provenance).zipSha256).toBe(pkg.zipSha256);
});

test("rejects invalid ordering, missing speech, false durations, and unannounced silence", () => {
  const broken = fixtureStory();
  broken.scenes[0].blocks[0].id = "wrong-order";
  broken.scenes[0].blocks[1].invitesPause = false;
  broken.scenes[1].blocks[0].text = "";
  broken.scenes[1].id = "../../unsafe";
  const errors = validateStory(broken, { ...storyRequest, durationSec: 600 }).join("\n");
  expect(errors).toContain("ordered cue IDs");
  expect(errors).toContain("explicit spoken invitation");
  expect(errors).toContain("speech requires text");
  expect(errors).toContain("±20%");
  expect(() => readStory(broken)).toThrow();
  const invalid = fixtureStory(); invalid.scenes[0].blocks[0].text = "Narration with [show secret] directions.";
  expect(validateStory(invalid, storyRequest).join("\n")).toContain("Narration compatibility");
  expect(() => buildStoryPackage(fixtureStory(), storyRequest, "", { ...passingReview, verdict: "revise" }, provenance)).toThrow("review");
});

test("visual and production fields are rejected by both generation schema and package builder", () => {
  const story = fixtureStory();
  const candidates = [
    { ...story, objects: [] },
    { ...story, sources: [] },
    { ...story, scenes: [{ ...story.scenes[0], entryState: "Show the classes." }, story.scenes[1]] },
    { ...story, scenes: [{ ...story.scenes[0], blocks: [{ ...story.scenes[0].blocks[0], visual: "Display a chart." }, ...story.scenes[0].blocks.slice(1)] }, story.scenes[1]] },
  ];
  for (const invalid of candidates) {
    expect(() => readStory(invalid)).toThrow("Invalid story");
    expect(() => buildStoryPackage(invalid, storyRequest, "g", passingReview, provenance)).toThrow("Invalid story");
  }
  story.scenes[0].title = "../outside <script>test</script>";
  const pkg = buildStoryPackage(story, storyRequest, "g", passingReview, provenance);
  expect(Object.keys(pkg.files).sort()).toEqual(["scene-01.md", "scene-02.md"]);
  expect(pkg.files["scene-01.md"]).not.toContain("<script>");
});

test("context is required, bounded, and excluded from spoken timing and text", () => {
  const base = fixtureStory();
  const changed = fixtureStory();
  changed.goal = "A different brief statement of the same lesson goal.";
  changed.scenes[0].context.before = "Context only: bookkeeping that must never be spoken.";
  expect(storyTiming(changed)).toEqual(storyTiming(base));
  const pkg = buildStoryPackage(changed, storyRequest, "g", passingReview, provenance);
  const archive = readStoryArchive(pkg.zip, pkg.zipSha256);
  expect(archive.narrationMarkdown).not.toContain("bookkeeping");
  expect(archive.scenes[0].contextMarkdown).toContain("bookkeeping");
  for (const context of [undefined, { ...base.scenes[0].context, before: "" }, { ...base.scenes[0].context, after: "x".repeat(261) }, { ...base.scenes[0].context, visual: "Draw a chart." }]) {
    expect(() => readStory({ ...base, scenes: [{ ...base.scenes[0], context }, base.scenes[1]] })).toThrow("Invalid story");
  }
  for (const [before, after] of [["### Context (not spoken)", "### Notes"], ["- Overall goal: ", "- Different goal: "], ["Before: scene-01", "Before: scene-99"]]) {
    const files = unzipSync(pkg.zip);
    files["scene-02.md"] = strToU8(strFromU8(files["scene-02.md"]).replace(before, after));
    const zip = zipSync(files);
    expect(() => readStoryArchive(zip, sha256(zip))).toThrow("nonspoken context");
  }
});

test("request limits and defaults reject ambiguous client fields", () => {
  expect(readStoryRequest({ prompt: "Explain gravity" })).toMatchObject({ durationSec: 180, language: "English", sourceMaterial: "" });
  for (const request of [{ prompt: "" }, { prompt: "x", durationSec: NaN }, { prompt: "x", durationSec: 601 }, { prompt: "x", model: "other" }, { prompt: "x", guidance: "override" }, { prompt: "x", sourceMaterial: "x".repeat(60001) }]) expect(() => readStoryRequest(request)).toThrow(StoryError);
});

test("generation and separate editorial review finish before the next layer can consume the ZIP", async () => {
  const { service, root, calls } = await setup();
  const [a, b] = await Promise.all([service.submit("alice", storyRequest), service.submit("alice", storyRequest)]);
  expect(a.id).toBe(b.id);
  await service.idle();
  expect(calls()).toBe(2);
  const job = await service.get("alice", a.id);
  expect(job.status).toBe("complete"); expect(job.sceneCount).toBe(2);
  const zip = await service.artifact("alice", a.id, "story.zip"); expect(sha256(zip)).toBe(job.zipSha256!);
  await expect(service.artifact("bob", a.id, "story.zip")).rejects.toThrow("not found");
  await service.close();
  const restarted = new StoryService({ root }); services.push(restarted);
  expect((await restarted.get("alice", a.id)).status).toBe("complete");
  expect(await restarted.artifact("alice", a.id, "story.zip")).toEqual(zip);
  await writeFile(join(root, a.id, "story.zip"), "corrupt");
  await expect(restarted.artifact("alice", a.id, "story.zip")).rejects.toThrow("integrity");
});

test("mechanical and editorial failures trigger bounded revisions, preserving failed drafts", async () => {
  let generation = 0, reviews = 0;
  const { service, root, calls } = await setup(async (messages, _schema, name) => {
    if (name === "story_review") {
      reviews++;
      return { value: reviews === 1 ? { ...passingReview, verdict: "revise", summary: "Clarify the denominator.", issues: [{ severity: "error", sceneId: "scene-02", detail: "Name all students as the denominator." }] } : passingReview, model: STORY_MODEL, provider: "test" };
    }
    generation++;
    const story = fixtureStory();
    if (generation === 1) story.scenes[0].blocks[0].id = "wrong-order";
    if (generation > 1) expect(messages.at(-1)?.content).toContain("resolve these specific issues");
    return { value: story, model: STORY_MODEL, provider: "test" };
  });
  const job = await service.submit("a", storyRequest); await service.idle();
  expect((await service.get("a", job.id)).status).toBe("complete");
  expect(calls()).toBe(5);
  expect(JSON.parse(await readFile(join(root, job.id, "draft-1.json"), "utf8")).scenes[0].blocks[0].id).toBe("wrong-order");
  expect(JSON.parse(await readFile(join(root, job.id, "review-2.json"), "utf8")).verdict).toBe("revise");
});

test("failed quality gate publishes no archive and retries only on an explicit request", async () => {
  const { service, calls } = await setup(async () => ({ value: {}, provider: "test", model: STORY_MODEL }));
  const job = await service.submit("a", storyRequest); await service.idle();
  expect((await service.get("a", job.id)).error?.code).toBe("QUALITY_FAILED");
  await expect(service.artifact("a", job.id, "story.zip")).rejects.toThrow("not ready");
  await service.submit("a", storyRequest); await service.idle(); expect(calls()).toBe(3);
  await service.retry("a", job.id); await service.idle(); expect(calls()).toBe(6);
});

test("restart marks unfinished jobs interrupted; explicit retry recovers", async () => {
  const { service, root, provider } = await setup();
  const job = await service.submit("a", storyRequest); await service.idle();
  const saved = JSON.parse(await readFile(join(root, job.id, "job.json"), "utf8"));
  await service.close();
  await writeFile(join(root, job.id, "job.json"), JSON.stringify({ ...saved, status: "generating" }));
  const restarted = new StoryService({ root, provider }); services.push(restarted);
  expect((await restarted.get("a", job.id)).status).toBe("interrupted");
  await restarted.retry("a", job.id); await restarted.idle();
  expect((await restarted.get("a", job.id)).status).toBe("complete");
});

test("next agent receives separate context and script, rejecting extra files and invalid context", () => {
  const pkg = buildStoryPackage(fixtureStory(), storyRequest, "Guidance", passingReview, provenance);
  const archive = readStoryArchive(pkg.zip, pkg.zipSha256);
  const input = buildStorySceneInput(archive, "scene-02");
  expect(input.previousSceneId).toBe("scene-01");
  expect(input.contextMarkdown).toContain(fixtureStory().scenes[1].context.before);
  expect(input.scriptMarkdown).not.toContain("Context (not spoken)");
  expect(input.nextSceneId).toBeNull();
  expect(input.scriptMarkdown).toContain("Twenty-four out of forty students passed");
  expect(input.fullScriptMarkdown).toBe(archive.narrationMarkdown);
  expect(parseStoryline(input.scriptMarkdown).beats[0].id).toBe("scene-02");
  expect(() => readStoryArchive(pkg.zip, "incorrect hash")).toThrow("hash");
  const tampered = unzipSync(pkg.zip); tampered["scene-02.md"] = strToU8("Narration: Incorrect replacement.");
  expect(() => readStoryArchive(zipSync(tampered), pkg.zipSha256)).toThrow("hash");
  for (const path of ["../outside.md", "README.md", "manifest.json", "narration.md", "scenes/scene-01.md"]) {
    const extra = { ...unzipSync(pkg.zip), [path]: strToU8("extra") };
    const zip = zipSync(extra);
    expect(() => readStoryArchive(zip, sha256(zip))).toThrow("only scene Markdown");
  }
  const notes = unzipSync(pkg.zip);
  notes["scene-01.md"] = strToU8(strFromU8(notes["scene-01.md"]) + "\nOn screen: Show the answer.\n");
  const notesZip = zipSync(notes);
  expect(() => readStoryArchive(notesZip, sha256(notesZip))).toThrow("only its scene heading");
  const missing = unzipSync(pkg.zip); delete missing["scene-01.md"];
  const missingZip = zipSync(missing);
  expect(() => readStoryArchive(missingZip, sha256(missingZip))).toThrow("consecutive");
  expect(() => buildStorySceneInput(archive, "scene-99")).toThrow("not found");
});

test("a second worker cannot mistake live jobs for restart leftovers", async () => {
  const { service, root, provider } = await setup();
  const job = await service.submit("a", storyRequest); await service.idle();
  const second = new StoryService({ root, provider });
  await expect(second.get("a", job.id)).rejects.toThrow("Another story service");
  expect((await service.get("a", job.id)).status).toBe("complete");
  await service.close();
  expect((await second.get("a", job.id)).status).toBe("complete");
  await second.close();
});

test("shutdown aborts the active model request, preserves input, and releases the worker lock", async () => {
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const { service, root } = await setup(async (_messages, _schema, _name, signal) => {
    started();
    return new Promise((_resolve, reject) => {
      signal!.addEventListener("abort", () => reject(new StoryError("MODEL_CONNECTION", "Cancelled", 502, true)), { once: true });
    });
  });
  const job = await service.submit("a", storyRequest);
  await began; await service.close();
  const restarted = new StoryService({ root }); services.push(restarted);
  expect((await restarted.get("a", job.id)).status).toBe("interrupted");
  expect(JSON.parse(await readFile(join(root, job.id, "input.json"), "utf8")).request).toEqual(storyRequest);
  await expect(restarted.artifact("a", job.id, "story.zip")).rejects.toThrow("not ready");
});

test("HTTP create/status/package protects ownership, validates origin and streams actual ZIP bytes", async () => {
  const { service } = await setup();
  const routes = storyRoutes(service);
  const req = (path: string, method = "GET", body?: unknown, owner = "alice", headers = {}) => new Request(`http://localhost${path}`, { method, headers: { "x-user-id": owner, "Content-Type": "application/json", ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  expect((await routes(req("/api/stories", "POST", storyRequest, ""), "/api/stories")).status).toBe(401);
  expect((await routes(req("/api/stories", "POST", storyRequest, "alice", { origin: "https://elsewhere.invalid" }), "/api/stories")).status).toBe(403);
  expect((await routes(req("/api/stories", "POST", { prompt: "x", sourceMaterial: "x".repeat(310000) }), "/api/stories")).status).toBe(413);
  const created = await routes(req("/api/stories", "POST", storyRequest), "/api/stories"); expect(created.status).toBe(202);
  const result = await created.json(); expect(result.owner).toBeUndefined();
  const path = `/api/stories/${result.id}`;
  await service.idle();
  expect((await routes(req(path, "GET", undefined, "bob"), path)).status).toBe(404);
  const status = await (await routes(req(path), path)).json(); expect(status.packageUrl).toBe(`${path}/package`);
  const download = await routes(req(`${path}/package`), `${path}/package`);
  expect(download.headers.get("Content-Type")).toBe("application/zip");
  expect(download.headers.get("X-Story-SHA256")).toMatch(/^[a-f0-9]{64}$/);
  expect(download.headers.get("Cache-Control")).toBe("private, no-store");
  expect(Object.keys(unzipSync(new Uint8Array(await download.arrayBuffer()))).sort()).toEqual(["scene-01.md", "scene-02.md"]);
  expect((await routes(req(`${path}/package`, "HEAD"), `${path}/package`)).body).toBeNull();
  expect((await routes(req(path, "POST", {}), path)).status).toBe(405);
});

test("Responses adapter requests Astra structured output and rejects incomplete/refused/wrong-model responses", async () => {
  const response = (overrides = {}) => ({ id: "resp_1", status: "completed", model: STORY_MODEL, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(fixtureStory()) }] }], ...overrides });
  const provider = createOpenAIStoryProvider({ apiKey: "test-secret", fetch: (async (_url, init) => {
    const sent = JSON.parse(init!.body as string);
    expect(sent.model).toBe(STORY_MODEL); expect(sent.store).toBe(false); expect(sent.text.format.strict).toBe(true); expect(sent.tools).toBeUndefined();
    return Response.json(response());
  }) });
  expect((await provider.generate([{ role: "user", content: "x" }], storySchema, "video_story")).value).toEqual(fixtureStory());
  for (const data of [response({ status: "incomplete" }), response({ model: "other" }), response({ output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] })]) {
    const bad = createOpenAIStoryProvider({ apiKey: "k", fetch: async () => Response.json(data) });
    await expect(bad.generate([], storySchema, "video_story")).rejects.toBeInstanceOf(StoryError);
  }
  const rejected = createOpenAIStoryProvider({ apiKey: "secret", fetch: async () => new Response("sensitive provider data", { status: 429 }) });
  await expect(rejected.generate([], storySchema, "video_story")).rejects.toThrow("HTTP 429");
  expect(storyTiming(fixtureStory()).pauseSeconds).toBe(5);
});
