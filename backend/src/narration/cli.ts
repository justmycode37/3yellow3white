import { readFile } from "node:fs/promises";
import { NarrationService } from "./service.js";
import { NarrationError, publicError } from "./errors.js";

try {
  const [argument, id] = process.argv.slice(2);
  if (!argument || (argument === "--retry" && !id)) throw new NarrationError("USAGE", "Usage: bun src/narration/cli.ts SCRIPT.md | --retry JOB_ID", 400);
  const service = new NarrationService();
  const job = argument === "--retry" ? await service.retry("local-developer", id) : await service.submit("local-developer", await readFile(argument, "utf8"));
  console.log(`Narration ${job.id}: ${job.status}`);
  await service.idle();
  const result = await service.get("local-developer", job.id);
  if (result.status !== "complete") { console.error(result.error?.message ?? result.status); process.exitCode = 1; }
  else console.log(`Saved ${service.root}/${job.id}/narration.json\nPreview: http://localhost:5173/?narration=${job.id}`);
} catch (error) { console.error(publicError(error).message); process.exitCode = 1; }
