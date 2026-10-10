// The team's backend, unchanged, plus extra checks on what the agents return.
// The prompts are the backend's own (backend/prompts/scenegen/); this wrapper only adds
// validation: lesson plans must mark every scene 3D or 2D, and scenes must pass the
// render checks in scene-checks.ts. Failures go back to the model like any other
// validation error.
//
// Run from backend/ (so .env.local and data/ resolve as usual):
//   bun ../scenegen/backend/dev.ts
import { createHandler } from "../../backend/src/server.js";
import { VideoService } from "../../backend/src/videos.js";
import { NarrationService } from "../../backend/src/narration/service.js";
import { agentConfig } from "../../backend/src/agents/config.js";
import { PiAgentRunner } from "../../backend/src/agents/runtime.js";
import type { AgentRunner, AgentTask } from "../../backend/src/agents/runtime.js";
import { compileSource } from "animlib/core";
import type { Frame } from "animlib/core";
import { createPiGenerator, sceneSource } from "../../backend/src/agents/generator.js";
import { DEAD_CONTROL_HINT, deadControls, renderProblems } from "./scene-checks.ts";
import { PLANNING_CONTRACT } from "../../backend/src/agents/planning.js";
import { scenegenPrompt } from "../../backend/src/agents/scenegen-prompts.js";
import { createThumbnailGenerator, thumbnailAgentConfig } from "../../backend/src/agents/thumbnail.js";

/** Adds the scenegen checks to the validate hook of planning and scene tasks. */
export class CheckedRunner implements AgentRunner {
  constructor(private inner: AgentRunner) {}
  async run(task: AgentTask): Promise<string> {
    if (!task.validate) return this.inner.run(task);
    if (task.systemPrompt.includes(PLANNING_CONTRACT)) { // lesson authoring: plan + script
      // Every scene must state its view, so "3D by default" is a checked decision.
      return this.inner.run({ ...task, validate: async output => {
        await task.validate!(output);
        const unmarked = planScenes(output).filter(scene => !VIEW_MARK.test(scene.visualDescription ?? "")).map(scene => scene.id);
        if (unmarked.length) throw new Error(`Start each scene's visualDescription with "3D:" or "2D (because <reason>):". Missing in: ${unmarked.join(", ")}. 3D is the default; 2D needs a real reason.`);
      } });
    }
    if (!task.systemPrompt.includes(await scenegenPrompt("visualization"))) return this.inner.run(task); // review, thumbnails, ...
    // Formulas, view membership and layout only show up in the player; check them here so a broken scene cannot be published.
    return this.inner.run({ ...task, validate: async output => {
      await task.validate!(output);
      const previous = previousFrame(task.prompt);
      const compiled = await compileSource(sceneSource(output), { previous });
      const problems = renderProblems(compiled);
      const dead = await deadControls(sceneSource(output), compiled, previous);
      if (dead.length) problems.push(`Controls without effect at the end: ${dead.join(", ")}.\n${DEAD_CONTROL_HINT}`);
      if (problems.length) throw new Error(problems.join("\n\n"));
    } });
  }
}

const VIEW_MARK = /^\s*(3D\s*:|2D\s*\(because\b)/i;

function planScenes(output: string): { id: string; visualDescription?: string }[] {
  try { return JSON.parse(output).plan?.scenes ?? []; } catch { return []; }
}
/** The scene task's prompt ends with the JSON packet that holds the previous scene's final frame. */
function previousFrame(prompt: string): Frame | undefined {
  try { return JSON.parse(prompt.slice(prompt.indexOf("{"))).previousFrame; } catch { return undefined; }
}

if (import.meta.main) {
  const narration = new NarrationService();
  const config = agentConfig();
  const videos = new VideoService(process.env.VIDEO_DB_PATH ?? "data/videos.sqlite",
    createPiGenerator(new CheckedRunner(new PiAgentRunner(config)), narration, config.dataDir,
      { outputMode: config.sceneOutputMode, timingMode: config.sceneTimingMode }), "pi",
    createThumbnailGenerator(new PiAgentRunner(thumbnailAgentConfig())));
  const handler = createHandler(undefined, videos, narration);
  const localNarration = process.env.NODE_ENV !== "production" && process.env.NARRATION_ALLOW_LOCAL === "1";
  const server = Bun.serve({
    hostname: process.env.HOST ?? (localNarration ? "127.0.0.1" : "0.0.0.0"),
    port: Number(process.env.PORT ?? 8080),
    idleTimeout: 30,
    maxRequestBodySize: 101 * 1024 * 1024,
    fetch(request, server) {
      // Planning is a bounded model request and can exceed the default idle timeout.
      if (new URL(request.url).pathname === "/api/study-plans") server.timeout(request, 210);
      return handler(request);
    },
    error(error) { console.error(error); return Response.json({ detail: "Internal Server Error" }, { status: 500 }); },
  });
  console.log(`Aha! backend (scenegen checks) listening on ${server.url}`);
  let stopping = false;
  const shutdown = async () => { if (stopping) return; stopping = true; server.stop(true); await videos.close(); process.exit(0); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
