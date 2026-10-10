import { unzipSync } from "fflate";
import { sha256 } from "./package.js";
import { StoryError } from "./types.js";
import { parseStoryline } from "../narration/markdown.js";

export interface SceneScript { id: string; title: string; markdown: string; contextMarkdown: string; narrationMarkdown: string }
export interface StoryArchive {
  scenes: SceneScript[];
  narrationMarkdown: string;
  zipSha256: string;
}

/** Scene Markdown is the whole archive. The trusted job hash stays outside it. */
export function readStoryArchive(zip: Uint8Array, expectedSha256: string): StoryArchive {
  const digest = sha256(zip);
  if (!expectedSha256 || digest !== expectedSha256) throw new StoryError("ZIP_INTEGRITY", "Story ZIP does not match the orchestration job's hash.");
  if (zip.byteLength > 4_000_000) throw new StoryError("ZIP_SIZE", "Story ZIP exceeds the handoff limit.");
  let files: Record<string, Uint8Array>;
  const seen = new Set<string>(); let total = 0;
  try {
    files = unzipSync(zip, { filter(file) {
      if (!/^scene-\d{2}\.md$/.test(file.name) || seen.has(file.name)) throw new Error("Only unique scene Markdown files are allowed.");
      seen.add(file.name); total += file.originalSize;
      if (seen.size > 24 || total > 8_000_000 || file.originalSize > 2_000_000) throw new Error("Archive expands beyond limits.");
      return true;
    } });
  } catch { throw new StoryError("ZIP_INVALID", "Invalid, oversized, or unsafe archive: only scene Markdown files are allowed."); }
  const paths = Object.keys(files).sort();
  if (!paths.length) throw new StoryError("ZIP_MISSING", "Story archive must contain at least one scene Markdown file.");
  let overallGoal: string | undefined;
  const scenes = paths.map((path, index): SceneScript => {
    const id = `scene-${String(index + 1).padStart(2, "0")}`;
    if (path !== `${id}.md`) throw new StoryError("ZIP_ORDER", "Scene files must be consecutive, starting at scene-01.md.");
    try {
      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(files[path]);
      const paragraphs = markdown.trimEnd().split("\n\n");
      const heading = paragraphs.shift() ?? "";
      if (!new RegExp(`^## Scene ${id.slice(6)} — [^\\r\\n]+$`).test(heading)) throw new Error("Missing scene heading.");
      if (paragraphs.shift() !== "### Context (not spoken)") throw new Error("Missing nonspoken context.");
      const context = paragraphs.shift() ?? "";
      const contextLines = context.split("\n");
      const labels = ["Overall goal", "Before", "This scene", "After"];
      if (contextLines.length !== labels.length || contextLines.some((line, i) => !line.startsWith(`- ${labels[i]}: `) || !line.slice(labels[i].length + 4).trim())) throw new Error("Context needs all four short entries.");
      const goal = contextLines[0];
      if (overallGoal !== undefined && goal !== overallGoal) throw new Error("Overall goals must agree.");
      overallGoal = goal;
      const before = index === 0 ? "Opening scene" : `scene-${String(index).padStart(2, "0")}`;
      const after = index === paths.length - 1 ? "End of video" : `scene-${String(index + 2).padStart(2, "0")}`;
      if (!contextLines[1].startsWith(`- Before: ${before} — `) || !contextLines[3].startsWith(`- After: ${after} — `)) throw new Error("Context must reference actual neighboring scenes.");
      if (paragraphs.shift() !== "### Script" || !paragraphs.length) throw new Error("Missing separate script section.");
      for (const paragraph of paragraphs) {
        if (!/^(?:(?:Narration|Invitation \(spoken\)|Hint \(spoken\)|Reveal \(spoken\)|Credit \(spoken\)): [^\r\n]+|Pause: \d+(?:\.\d+)?s)$/.test(paragraph)) throw new Error("Only speech and pause markers are allowed.");
      }
      const narrationMarkdown = [heading, ...paragraphs].join("\n\n") + "\n";
      const parsed = parseStoryline(narrationMarkdown);
      const scene = parsed.beats[0];
      if (parsed.beats.length !== 1 || scene.id !== id || scene.context || !scene.blocks.some(b => b.kind === "speech")) throw new Error("Each file must contain exactly its one spoken scene.");
      const withContext = parseStoryline(markdown).beats;
      const signature = (blocks: typeof scene.blocks) => blocks.map(block => block.kind === "speech" ? [block.kind, block.role, block.text] : [block.kind, block.durationSec]);
      if (withContext.length !== 1 || withContext[0].id !== id || JSON.stringify(signature(withContext[0].blocks)) !== JSON.stringify(signature(scene.blocks))) throw new Error("Context must not alter speech or pauses.");
      scene.blocks.forEach((block, i) => {
        if (block.kind === "pause" && (block.durationSec > 30 || scene.blocks[i - 1]?.kind !== "speech")) throw new Error("Invalid pause sequence.");
      });
      if (index === paths.length - 1 && scene.blocks.at(-1)?.kind !== "speech") throw new Error("End with spoken resolution.");
      return { id, title: scene.title, markdown, contextMarkdown: `### Context (not spoken)\n\n${context}\n`, narrationMarkdown };
    } catch { throw new StoryError("ZIP_SCRIPT", `${path} must contain only its scene heading, consistent nonspoken context, and a separate script with valid pause markers.`); }
  });
  const narrationMarkdown = scenes.map(scene => scene.narrationMarkdown.trimEnd()).join("\n\n") + "\n";
  // Also enforce the narration stage's total limits before handing it the joined script.
  try { parseStoryline(narrationMarkdown); }
  catch { throw new StoryError("ZIP_SCRIPT", "Combined scene scripts exceed narration limits or are invalid."); }
  return { scenes, narrationMarkdown, zipSha256: digest };
}

/** Context and spoken script stay separate; the next agent decides its own visuals. */
export function buildStorySceneInput(archive: StoryArchive, sceneId: string) {
  const index = archive.scenes.findIndex(scene => scene.id === sceneId);
  if (index < 0) throw new StoryError("SCENE_NOT_FOUND", "Scene not found in story package.", 404);
  return {
    sceneId,
    contextMarkdown: archive.scenes[index].contextMarkdown,
    scriptMarkdown: archive.scenes[index].narrationMarkdown,
    fullScriptMarkdown: archive.narrationMarkdown,
    previousSceneId: archive.scenes[index - 1]?.id ?? null,
    nextSceneId: archive.scenes[index + 1]?.id ?? null,
  };
}
