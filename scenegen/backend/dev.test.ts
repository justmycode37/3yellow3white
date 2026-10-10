import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { VisualizationPromptRunner } from "./dev.ts";

test("scene tasks get the scenegen visualization prompt; other tasks pass through", async () => {
  const craft = await readFile(new URL("../../backend/prompts/scene-craft.md", import.meta.url), "utf8");
  const visualization = await readFile(new URL("../prompts/visualization.md", import.meta.url), "utf8");
  const seen: string[] = [];
  const runner = new VisualizationPromptRunner({ run: async task => { seen.push(task.systemPrompt); return "ok"; } });
  await runner.run({ systemPrompt: `handoff\n\n${craft}\n\nreference`, prompt: "scene" });
  await runner.run({ systemPrompt: "write the lesson plan", prompt: "plan" });
  expect(seen[0]).toBe(`handoff\n\n${visualization}\n\nreference`);
  expect(seen[1]).toBe("write the lesson plan");
});
