import { createHash } from "node:crypto";
import { strToU8, zipSync, unzipSync } from "fflate";
import type { Story, StoryRequest, StoryReview } from "./types.js";
import { STORY_VERSION, StoryError } from "./types.js";
import { storyTiming, validateStory } from "./validate.js";
import { sceneMarkdown, scenePath } from "./writing.js";
import { readStory } from "./schema.js";

export const sha256 = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
export interface PackageProvenance { model: string; provider: string; reasoningEffort: string; generatedAt: string; calls: { stage: string; model: string; responseId?: string; usage?: unknown }[] }

export function buildStoryPackage(story: Story, request: StoryRequest, guidance: string, review: StoryReview, provenance: PackageProvenance) {
  // Reject production/visual fields rather than quietly dropping them at export.
  readStory(story);
  const errors = validateStory(story, request);
  if (errors.length) throw new StoryError("PACKAGE_INVALID", errors.join("\n"));
  if (review.verdict !== "pass" || review.issues.some(i => i.severity === "error")) throw new StoryError("QUALITY_FAILED", "An approved editorial review is required before packaging.");
  const timing = storyTiming(story);
  // One root-level Markdown per scene: brief nonspoken context + spoken script.
  // Job metadata, reviews, source material and guidance must NEVER enter the ZIP.
  const files = Object.fromEntries(story.scenes.map((scene, index) => [scenePath(scene), sceneMarkdown(story, index)]));
  const manifest = {
    schemaVersion: STORY_VERSION, packageType: "aha-scene-scripts", title: story.title, ...provenance,
    requestSha256: sha256(json(request)), guidanceSha256: sha256(guidance), timing,
    sceneOrder: story.scenes.map(s => ({ id: s.id, path: scenePath(s), cueIds: s.blocks.map(b => b.id) })),
    files: Object.entries(files).map(([path, content]) => ({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) })),
  };
  const encoded = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)]));
  const zip = zipSync(encoded, { level: 6, mtime: new Date(2000, 0, 1) });
  const extracted = unzipSync(zip);
  if (Object.keys(extracted).length !== Object.keys(encoded).length || Object.keys(encoded).some(path => sha256(extracted[path]) !== sha256(encoded[path]))) throw new StoryError("ZIP_VERIFY", "ZIP integrity verification failed.", 500);
  // manifest is private service metadata, deliberately separate from files and zip.
  return { zip, files, manifest, timing, zipSha256: sha256(zip) };
}
