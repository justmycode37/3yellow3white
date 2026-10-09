import { describe, expect, it } from "vitest";
import { initialSources } from "../demo/scenes.js";
import { SceneSequence } from "../src/sequence.js";

async function examples(): Promise<SceneSequence> {
  const sequence = new SceneSequence();
  const result = await sequence.submit({ type: "load", scenes: initialSources });
  expect(result, JSON.stringify(result.diagnostics)).toMatchObject({ ok: true });
  return sequence;
}

describe("playground scenes submitted through the host API", () => {
  it("reconstructs the vector-to-molecule-to-bar handoff without replay", async () => {
    const sequence = await examples();
    expect(sequence.sources.map(scene => scene.id)).toEqual(["linear-algebra", "organic-chemistry", "sorting"]);
    expect(sequence.compiled.map(scene => scene.options.end)).toEqual(["advance", "advance", "hold"]);
    const algebra = sequence.frame(0, sequence.compiled[0].duration);
    expect(algebra.elements.find(element => element.id === "hero")).toMatchObject({ persistent: true, geometry: { kind: "arrow" } });
    const chemistryEntry = sequence.frame(1, 0);
    expect(chemistryEntry.elements.find(element => element.id === "hero")?.geometry.kind).toBe("arrow");
    const chemistryEnd = sequence.frame(1, sequence.compiled[1].duration);
    expect(chemistryEnd.elements.find(element => element.id === "hero")?.geometry.kind).toBe("circle");
    expect(chemistryEnd.camera.perspective).toBe(1);
    expect(chemistryEnd.elements.filter(element => element.id.startsWith("hydrogen-")).length).toBe(8);
    const sortEntry = sequence.frame(2, 0);
    expect(sortEntry.elements.find(element => element.id === "hero")?.geometry.kind).toBe("circle");
    const sortEnd = sequence.frame(2, sequence.compiled[2].duration);
    expect(sortEnd.camera.perspective).toBe(0);
    const bars = sortEnd.elements.filter(element => element.id === "hero" || element.id.startsWith("bar-"));
    expect(bars).toHaveLength(6);
    expect(bars.sort((a, b) => a.position[0] - b.position[0]).map(element => Number((element.geometry.height! / 0.43).toFixed(5)))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sortEnd.elements.some(element => element.transient)).toBe(false);
  });

  it("uses current settings to reconstruct preceding scene states and sort order", async () => {
    const sequence = await examples();
    await sequence.setControl("linear-algebra", "stretch", 2);
    const chemistryEntry = sequence.frame(1, 0);
    const vector = chemistryEntry.elements.find(element => element.id === "hero")!;
    expect(vector.geometry.points?.[1]).toEqual([3, 1]);
    await sequence.setControl("sorting", "direction", "Descending");
    const end = sequence.frame(2, sequence.compiled[2].duration);
    const bars = end.elements.filter(element => element.id === "hero" || element.id.startsWith("bar-"));
    expect(bars.sort((a, b) => a.position[0] - b.position[0]).map(element => Number((element.geometry.height! / 0.43).toFixed(5)))).toEqual([6, 5, 4, 3, 2, 1]);
    const snapshot = sequence.frame(2, 2.2);
    sequence.frame(2, sequence.compiled[2].duration);
    expect(sequence.frame(2, 2.2)).toEqual(snapshot);
  });

  it("retains the valid demo after an invalid replacement", async () => {
    const sequence = await examples();
    const frame = sequence.frame(1, 2.3);
    const result = await sequence.submit({ type: "replace", scene: "organic-chemistry", source: "export default scene({}, s => { fetch('/oops'); });" });
    expect(result.ok).toBe(false);
    expect(sequence.frame(1, 2.3)).toEqual(frame);
    expect(sequence.sources[1].source).toBe(initialSources[1].source);
  });
});
