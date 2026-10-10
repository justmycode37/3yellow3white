import { expect, test } from "bun:test";
import { scenegenPrompt } from "../../backend/src/agents/scenegen-prompts.js";
import { CheckedRunner } from "./dev.ts";

test("a scene with a formula the player cannot render is rejected", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (tex: string) => `export default scene({ mode: "2d", end: "hold" }, s => { s.latex("f", { tex: ${JSON.stringify(tex)}, position: [0, 0] }); s.wait(1); });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene("\\boldsymbol{\\mu}=1"), scene("\\vec{\\mu}=1")]) {
      results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    }
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({ planning: { current: { visualDescription: "2D (because it is a formula): show it" } } })}`, validate: async () => {} });
  expect(results[0]).toContain("Invalid LaTeX");
  expect(results[0]).toContain("\\mathbf or \\vec");
  expect(results[1]).toBe("ok");
});

test("a 3D part created outside its model's view is rejected", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (late: boolean) => `export default scene({ mode: "2d", end: "hold" }, s => {
    let view;
    s.view("model", { rect: [0, 0, 0.6, 1], orbit: true, camera: { target: [0, 0, 0], height: 6, distance: 10 } }, v => {
      view = v;
      v.sphere("atom", { radius: 0.5, position: [0, 0, 0], fill: Color.RED });
      ${late ? "" : 'v.sphere("corner", { radius: 0.1, position: [1, 1, 1], fill: Color.GREY });'}
    });
    ${late ? 's.sphere("corner", { radius: 0.1, position: [1, 1, 1], fill: Color.GREY });' : ""}
    s.wait(1);
  });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene(true), scene(false)]) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({ planning: { current: { visualDescription: "3D: a model" } } })}`, validate: async () => {} });
  expect(results[0]).toContain("corner");
  expect(results[1]).toBe("ok");
});

test("a control with its own position is rejected, so controls stay top right", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (options: string) => `export default scene({ mode: "2d", end: "hold" }, s => {
    const k = s.slider("factor", { label: "Factor", default: 1, min: 0, max: 2, step: 0.1${options} });
    s.circle("dot", { radius: 0.2 * k + 0.1, position: [0, 0] });
    s.wait(1);
  });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene(", position: [0.05, 0.8]"), scene("")]) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({ planning: { current: { visualDescription: "2D (because it is a plane): a dot" } } })}`, validate: async () => {} });
  expect(results[0]).toContain("top right");
  expect(results[1]).toBe("ok");
});

test("overlapping formulas are rejected", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (gap: number) => `export default scene({ mode: "2d", end: "hold" }, s => {
    s.latex("a", { tex: "A=\\\\begin{bmatrix}1&1\\\\\\\\0&1\\\\end{bmatrix}", fontSize: 0.46, position: [4, 1] });
    s.latex("b", { tex: "B=\\\\begin{bmatrix}2&0\\\\\\\\0&1\\\\end{bmatrix}", fontSize: 0.46, position: [4, ${1 - gap}] });
    s.wait(1);
  });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene(0.9), scene(1.6)]) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({ planning: { current: { visualDescription: "2D (because it is a plane): two matrices" } } })}`, validate: async () => {} });
  expect(results[0]).toContain("Text overlaps: a and b");
  expect(results[1]).toBe("ok");
});

test("a control that does nothing on the final frame is rejected", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (radius: string) => `export default scene({ mode: "2d", end: "hold" }, s => {
    const k = s.slider("size", { label: "Size", default: 1, min: 0, max: 2, step: 0.1 });
    s.circle("dot", { radius: ${radius}, position: [0, 0] });
    s.wait(1);
  });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene("0.3"), scene("0.2 * k + 0.1")]) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({ planning: { current: { visualDescription: "2D (because it is a plane): a dot" } } })}`, validate: async () => {} });
  expect(results[0]).toContain("without effect at the end: size");
  expect(results[1]).toBe("ok");
});

test("a dot drawn behind the line it sits on is rejected", async () => {
  const visualization = await scenegenPrompt("visualization");
  const scene = (z: number) => `export default scene({ mode: "2d", end: "hold" }, s => {
    s.circle("dot", { radius: 0.12, position: [0, 0, ${z}], fill: Color.GOLD });
    s.line("curve", { points: [[0, -2], [0, 2]], stroke: Color.GREEN, strokeWidth: 0.06 });
    s.wait(1);
  });`;
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [scene(0), scene(0.05)]) results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    return "";
  } });
  await runner.run({ systemPrompt: visualization, prompt: `Generate this scene:\n${JSON.stringify({})}`, validate: async () => {} });
  expect(results[0]).toContain("dot (under curve)");
  expect(results[1]).toBe("ok");
});

test("a lesson plan must mark every scene as 3D or 2D with a reason", async () => {
  const { PLANNING_CONTRACT } = await import("../../backend/src/agents/planning.js");
  const plan = (description: string) => JSON.stringify({ plan: { scenes: [{ id: "beat-1", visualDescription: description }] } });
  const results: string[] = [];
  const runner = new CheckedRunner({ run: async task => {
    for (const output of [plan("Show the molecule"), plan("3D: show the molecule"), plan("2D (because it is a graph): plot energy")]) {
      results.push(await task.validate!(output).then(() => "ok", error => (error as Error).message));
    }
    return "";
  } });
  await runner.run({ systemPrompt: PLANNING_CONTRACT, prompt: "lesson", validate: async () => {} });
  expect(results[0]).toContain("beat-1");
  expect(results.slice(1)).toEqual(["ok", "ok"]);
});

test("tasks without validation, such as reviews, pass through untouched", async () => {
  const seen: unknown[] = [];
  const task = { systemPrompt: "review this lesson", prompt: "lesson" };
  await new CheckedRunner({ run: async received => { seen.push(received); return "ok"; } }).run(task);
  expect(seen[0]).toBe(task);
});
