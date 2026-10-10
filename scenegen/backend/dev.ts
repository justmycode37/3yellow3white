// The team's backend, unchanged, with two prompt hooks: scene agents get
// scenegen/prompts/visualization.md instead of backend/prompts/scene-craft.md, and the
// lesson-planning step gets scenegen/prompts/planning.md appended.
// Planning, script review, ElevenLabs narration, word timings, captions, validation
// and delivery all run through the backend's own modules.
//
// Run from backend/ (so .env.local and data/ resolve as usual):
//   bun --watch ../scenegen/backend/dev.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHandler } from "../../backend/src/server.js";
import { VideoService } from "../../backend/src/videos.js";
import { NarrationService } from "../../backend/src/narration/service.js";
import { agentConfig } from "../../backend/src/agents/config.js";
import { PiAgentRunner } from "../../backend/src/agents/runtime.js";
import type { AgentRunner, AgentTask } from "../../backend/src/agents/runtime.js";
import { compileSource } from "animlib/core";
import type { Frame } from "animlib/core";
import { createPiGenerator, sceneSource } from "../../backend/src/agents/generator.js";
import { latexErrors, LATEX_HINT } from "./latex-check.ts";
import { PLANNING_CONTRACT } from "../../backend/src/agents/planning.js";

const CRAFT = new URL("../../backend/prompts/scene-craft.md", import.meta.url);
const VISUALIZATION = new URL("../prompts/visualization.md", import.meta.url);
const PLANNING = new URL("../prompts/planning.md", import.meta.url);
const LOG = new URL("../../out/visualization-prompts/", import.meta.url);

/** Swaps the scene-craft section of scene tasks for the scenegen visualization prompt. */
export class VisualizationPromptRunner implements AgentRunner {
  private count = 0;
  constructor(private inner: AgentRunner) {}
  async run(task: AgentTask): Promise<string> {
    const craft = await readFile(CRAFT, "utf8");
    if (task.systemPrompt.includes(PLANNING_CONTRACT)) { // lesson authoring: plan + script
      const planning = await readFile(PLANNING, "utf8");
      console.log("[scenegen] lesson planning: appending scenegen/prompts/planning.md");
      // Every scene must state its view, so "3D by default" is a checked decision.
      const validate = task.validate && (async (output: string) => {
        await task.validate!(output);
        const unmarked = planScenes(output).filter(scene => !VIEW_MARK.test(scene.visualDescription ?? "")).map(scene => scene.id);
        if (unmarked.length) throw new Error(`Start each scene's visualDescription with "3D:" or "2D (because <reason>):". Missing in: ${unmarked.join(", ")}. 3D is the default; 2D needs a real reason.`);
      });
      return this.inner.run({ ...task, validate, systemPrompt: `${task.systemPrompt}\n\n${planning}` });
    }
    if (!task.systemPrompt.includes(craft)) return this.inner.run(task); // review
    const visualization = await readFile(VISUALIZATION, "utf8"); // re-read: edits apply to the next scene
    const systemPrompt = task.systemPrompt.replace(craft, visualization);
    await mkdir(LOG, { recursive: true });
    const name = `scene-task-${String(++this.count).padStart(3, "0")}.prompt.md`;
    await writeFile(new URL(name, LOG), `${systemPrompt}\n\n${task.prompt}`);
    console.log(`[scenegen] scene task ${this.count}: using scenegen/prompts/visualization.md (saved out/visualization-prompts/${name})`);
    // A scene planned as 3D must really be built in 3D.
    const planned3D = /^\s*3D\b/i.test(currentVisualDescription(task.prompt));
    const validate = task.validate && (async (output: string) => {
      await task.validate!(output);
      if (planned3D && !IS_3D.test(output)) throw new Error('This scene is planned in 3D, but the source is flat. Build it in real 3D: mode: "3d" with orbit: true, or an s.view(...) region, with spheres / line3D / arrow3D / meshes at real z coordinates, so the viewer can rotate it.');
      // Formulas are only laid out in the player; check them here so a bad one cannot be published.
      const compiled = await compileSource(sceneSource(output), { previous: previousFrame(task.prompt) });
      const broken = latexErrors(compiled);
      if (broken.length) throw new Error(`${broken.join("\n")}\n${LATEX_HINT}`);
    });
    return this.inner.run({ ...task, systemPrompt, validate });
  }
}

const VIEW_MARK = /^\s*(3D\s*:|2D\s*\(because\b)/i;
const IS_3D = /mode\s*:\s*["']3d["']|\bs\.view\s*\(|\.to3D\s*\(/;

function planScenes(output: string): { id: string; visualDescription?: string }[] {
  try { return JSON.parse(output).plan?.scenes ?? []; } catch { return []; }
}
/** The scene task's prompt ends with the JSON packet that holds this scene's plan. */
function packet(prompt: string): { previousFrame?: Frame; planning?: { current?: { visualDescription?: string } } } {
  try { return JSON.parse(prompt.slice(prompt.indexOf("{"))); } catch { return {}; }
}
function currentVisualDescription(prompt: string): string { return packet(prompt).planning?.current?.visualDescription ?? ""; }
function previousFrame(prompt: string): Frame | undefined { return packet(prompt).previousFrame; }

if (import.meta.main) {
  const narration = new NarrationService();
  const config = agentConfig();
  const videos = new VideoService(process.env.VIDEO_DB_PATH ?? "data/videos.sqlite",
    createPiGenerator(new VisualizationPromptRunner(new PiAgentRunner(config)), narration, config.dataDir), "pi");
  const localNarration = process.env.NODE_ENV !== "production" && process.env.NARRATION_ALLOW_LOCAL === "1";
  const server = Bun.serve({
    hostname: process.env.HOST ?? (localNarration ? "127.0.0.1" : "0.0.0.0"),
    port: Number(process.env.PORT ?? 8080),
    idleTimeout: 30,
    maxRequestBodySize: 101 * 1024 * 1024,
    fetch: createHandler(undefined, videos, narration),
    error(error) { console.error(error); return Response.json({ detail: "Internal Server Error" }, { status: 500 }); },
  });
  console.log(`Aha! backend (scenegen visualization prompt) listening on ${server.url}`);
  let stopping = false;
  const shutdown = async () => { if (stopping) return; stopping = true; server.stop(true); await videos.close(); process.exit(0); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
