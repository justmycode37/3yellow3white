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

test("lesson planning tasks get the scenegen planning additions appended", async () => {
  const { PLANNING_CONTRACT } = await import("../../backend/src/agents/planning.js");
  const planning = await readFile(new URL("../prompts/planning.md", import.meta.url), "utf8");
  const seen: string[] = [];
  const runner = new VisualizationPromptRunner({ run: async task => { seen.push(task.systemPrompt); return "ok"; } });
  await runner.run({ systemPrompt: `guidance\n\n${PLANNING_CONTRACT}`, prompt: "lesson" });
  expect(seen[0]).toBe(`guidance\n\n${PLANNING_CONTRACT}\n\n${planning}`);
});

test("a scene planned as 3D is rejected when its source is flat", async () => {
  const craft = await readFile(new URL("../../backend/prompts/scene-craft.md", import.meta.url), "utf8");
  const packet = JSON.stringify({ planning: { current: { visualDescription: "3D: a methane molecule the viewer can rotate" } } });
  const outputs = ['export default scene({ mode: "2d" }, s => {});', 'export default scene({ mode: "3d", orbit: true }, s => {});'];
  const results: string[] = [];
  const runner = new VisualizationPromptRunner({ run: async task => {
    for (const output of outputs) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return outputs[1];
  } });
  await runner.run({ systemPrompt: craft, prompt: `Generate this scene:\n${packet}`, validate: async () => {} });
  expect(results[0]).toContain("planned in 3D");
  expect(results[1]).toBe("ok");
});

test("a lesson plan must mark every scene as 3D or 2D with a reason", async () => {
  const { PLANNING_CONTRACT } = await import("../../backend/src/agents/planning.js");
  const plan = (description: string) => JSON.stringify({ plan: { scenes: [{ id: "beat-1", visualDescription: description }] } });
  const results: string[] = [];
  const runner = new VisualizationPromptRunner({ run: async task => {
    for (const output of [plan("Show the molecule"), plan("3D: show the molecule"), plan("2D (because it is a graph): plot energy")]) {
      results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    }
    return "";
  } });
  await runner.run({ systemPrompt: PLANNING_CONTRACT, prompt: "lesson", validate: async () => {} });
  expect(results[0]).toContain("beat-1");
  expect(results.slice(1)).toEqual(["ok", "ok"]);
});
