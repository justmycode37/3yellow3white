import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StoryService } from "./service.js";
import { safeStoryError, StoryError } from "./types.js";

// Run from the repository root: npm run story -- --request brief.json --out story.zip
const args = process.argv.slice(2);
const flags = new Map<string, string>();
let service: StoryService | undefined;
try {
  for (let i = 0; i < args.length; i += 2) {
    if (!["--request", "--out", "--retry"].includes(args[i]) || !args[i + 1] || flags.has(args[i])) throw new StoryError("USAGE", "Usage: npm run story -- --request brief.json --out story.zip | --retry JOB_ID --out story.zip", 400);
    flags.set(args[i], args[i + 1]);
  }
  if (!flags.has("--out") || flags.has("--request") === flags.has("--retry")) throw new StoryError("USAGE", "Provide --out and exactly one of --request or --retry.", 400);
  let last = "";
  service = new StoryService({ onProgress(job) { const state = `${job.status}:${job.attempt}`; if (state !== last) { console.log(`${job.id.slice(0, 12)} · ${job.status} · attempt ${job.attempt}`); last = state; } } });
  const job = flags.has("--retry") ? await service.retry("local-developer", flags.get("--retry")!) : await service.submit("local-developer", JSON.parse(await readFile(resolve(flags.get("--request")!), "utf8")));
  console.log(`Story ID: ${job.id}`);
  await service.idle();
  const result = await service.get("local-developer", job.id);
  if (result.status !== "complete") throw new StoryError(result.error?.code ?? "FAILED", result.error?.message ?? result.status);
  const output = resolve(flags.get("--out")!);
  // Explicit output paths never silently overwrite an existing deliverable.
  await writeFile(output, await service.artifact("local-developer", job.id, "story.zip"), { flag: "wx" });
  console.log(`Saved ${output}\n${result.sceneCount} scenes · ${result.estimatedDurationSec}s estimated · SHA-256 ${result.zipSha256}`);
} catch (error) { console.error(safeStoryError(error).message); process.exitCode = 1; }
finally { await service?.close(); }
