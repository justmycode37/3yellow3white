// Regenerate ONE scene of an existing video with the current
// scenegen/prompts/visualization.md, keeping its narration, audio, captions and plan.
// For iterating on the visualization prompt without waiting for a whole new video.
//
// Run from backend/:
//   bun ../scenegen/backend/rescene.ts <videoId> <sceneIndex>           # write a candidate only
//   bun ../scenegen/backend/rescene.ts <videoId> <sceneIndex> --apply   # also show it in the app
//
// --apply replaces that scene's source in the video's saved manifest after checking
// that every later scene still compiles on top of it. The previous source is kept
// next to the candidate so it can be restored with --restore <file>.
import { Database } from "bun:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSource, evaluateScene, SceneSequence } from "animlib/core";
import { agentConfig } from "../../backend/src/agents/config.js";
import { PiAgentRunner, validationMessage } from "../../backend/src/agents/runtime.js";
import { sceneSource } from "../../backend/src/agents/generator.js";
import { validateScenePlan } from "../../backend/src/agents/scene-plan.js";
import { SCENE_AGENT_INSTRUCTIONS } from "../../backend/src/narration/handoff.js";

const [videoId, indexArg, ...flags] = process.argv.slice(2);
const index = Number(indexArg);
if (!/^[a-f0-9-]{36}$/.test(videoId ?? "") || !Number.isInteger(index) || index < 0) {
  console.error("Usage: bun ../scenegen/backend/rescene.ts <videoId> <sceneIndex> [--apply | --restore <file>]");
  process.exit(2);
}
const config = agentConfig();
const directory = join(config.dataDir, videoId);
const outDir = new URL(`../../out/visualization-tests/${videoId}/`, import.meta.url);
await mkdir(outDir, { recursive: true });

const input = JSON.parse(await readFile(join(directory, `scene-${index}.input.json`), "utf8"));
const lesson = JSON.parse(await readFile(join(directory, "lesson.json"), "utf8").catch(() => "{}"));
const planned = lesson.plan?.scenes?.[index];

async function validate(output: string) {
  const compiled = await compileSource(sceneSource(output), { previous: input.previousFrame });
  if (compiled.options.audio !== input.audioAssetId || compiled.options.end !== input.endMode) {
    throw new Error(`Scene must use audio "${input.audioAssetId}" and end mode "${input.endMode}".`);
  }
  const duration = input.scene.durationSec;
  if (Math.abs(compiled.duration - duration) > 1e-6) {
    throw new Error(`The scene must last ${duration} seconds; it currently lasts ${compiled.duration}. Add the remaining time with a final s.wait().`);
  }
  if (planned) validateScenePlan(compiled, evaluateScene(compiled, duration), planned);
}

/** Swap the scene into the saved manifest once all later scenes still build on it. */
async function apply(source: string) {
  const db = new Database(process.env.VIDEO_DB_PATH ?? "data/videos.sqlite");
  try {
    const row = db.query("SELECT manifest FROM videos WHERE id = ?").get(videoId) as { manifest: string } | null;
    if (!row) throw new Error("Video not found in the local database.");
    const manifest = JSON.parse(row.manifest);
    if (!manifest.scenes[index]) throw new Error(`The video has no published scene ${index} yet.`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(new URL(`scene-${index}.before-${stamp}.js`, outDir), manifest.scenes[index].source);
    manifest.scenes[index].source = source;
    const sequence = new SceneSequence();
    try {
      const result = await sequence.submit({ type: "load", scenes: manifest.scenes.map((s: { id: string; source: string }) => ({ id: s.id, source: s.source })) });
      if (!result.ok) throw new Error(`Not applied: a later scene no longer compiles on top of this one.\n${result.diagnostics.map(d => `${d.scene ?? ""}: ${d.message}`).join("\n")}`);
    } finally { sequence.dispose(); }
    manifest.revision++;
    db.query("UPDATE videos SET manifest = ? WHERE id = ?").run(JSON.stringify(manifest), videoId);
    console.log(`Applied to video ${videoId}, scene ${index}. Reload http://localhost:${process.env.PORT ?? 8080}/watch/${videoId}`);
  } finally { db.close(); }
}

const restore = flags.indexOf("--restore");
if (restore >= 0) {
  await apply(await readFile(flags[restore + 1], "utf8"));
} else {
  const reference = await readFile(new URL("../../shared/animlib/docs/reference.md", import.meta.url), "utf8");
  const visualization = await readFile(new URL("../prompts/visualization.md", import.meta.url), "utf8");
  const systemPrompt = `${SCENE_AGENT_INSTRUCTIONS.replace("Return animlib SceneSource { id, source }.", "Return only JavaScript with one default-exported scene, without a JSON wrapper.")}\nFor video delivery, end your timeline at exactly durationSec using a final s.wait() as needed. Use validate_output before finishing.\n\n${visualization}\n\n${reference}`;
  const prompt = `Generate this scene using the authoritative narration packet and lesson plan:\n${JSON.stringify(input)}`;
  console.log(`Regenerating scene ${index} of ${videoId} with scenegen/prompts/visualization.md ...`);
  let source: string;
  try {
    source = sceneSource(await new PiAgentRunner(config).run({ systemPrompt, prompt, validate }));
    await validate(source);
  } catch (error) {
    console.error(`Failed: ${validationMessage(error)}`);
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new URL(`scene-${index}.${stamp}.js`, outDir);
  await writeFile(file, source);
  console.log(`Candidate written: out/visualization-tests/${videoId}/scene-${index}.${stamp}.js`);
  if (flags.includes("--apply")) await apply(source);
  else console.log("Not applied. Add --apply to show it in the app.");
}
