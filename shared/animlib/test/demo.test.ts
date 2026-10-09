import { afterEach, describe, expect, it } from "vitest";
import { initialSources } from "../demo/scenes.js";
import { SceneSequence } from "../src/sequence.js";
import { layoutLatexGeometry } from "../src/latex.js";
import type { ElementState, Vec3 } from "../src/types.js";

const sequences: SceneSequence[] = [];
afterEach(() => { for (const sequence of sequences.splice(0)) sequence.dispose(); });
async function examples(): Promise<SceneSequence> {
  const sequence = new SceneSequence();
  sequences.push(sequence);
  const result = await sequence.submit({ type: "load", scenes: initialSources });
  expect(result, JSON.stringify(result.diagnostics)).toMatchObject({ ok: true });
  return sequence;
}
function find(sequence: SceneSequence, scene: number, time: number, id: string): ElementState {
  const element = sequence.frame(scene, time).elements.find(element => element.id === id);
  expect(element, `Missing ${id} at scene ${scene}, time ${time}`).toBeDefined();
  return element!;
}
function average(points: number[][]): Vec3 {
  return [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length) as Vec3;
}

describe("demo choreography through the host source API", () => {
  it("keeps the equation fixed while its first component counts with the vector stretch", async () => {
    const sequence = await examples();
    expect(sequence.compiled.map(scene => scene.options.end)).toEqual(["advance", "advance", "hold"]);
    const original = find(sequence, 0, 1.39, "equation");
    const before = find(sequence, 0, 1.75, "equation");
    const middle = find(sequence, 0, 2.75, "equation");
    const after = find(sequence, 0, 3.75, "equation");
    expect(before.geometry).toMatchObject({ numbers: { x: 1.5 }, anchor: "v" });
    expect(middle.geometry).toMatchObject({ numbers: { x: 1.875 } });
    expect(after.geometry).toMatchObject({ numbers: { x: 2.25 } });
    expect(middle.position).toEqual(before.position);
    expect(after.position).toEqual(before.position);
    expect(middle.geometry.tex).toBe(before.geometry.tex);
    expect(after.geometry.tex).toBe(before.geometry.tex);
    expect(middle.morph).toBeUndefined();
    const stationaryGlyphs = (element: ElementState) => layoutLatexGeometry(element.geometry).paths
      .filter(path => path.part === "v" || path.part === "equals")
      .map(path => ({ ...path, contours: path.contours.map(contour => contour.map(point => point.map(value => Number(value.toFixed(12))))) }));
    expect(before.geometry.tex).toContain("\\animpart{A}{A}");
    expect(stationaryGlyphs(before)).toEqual(stationaryGlyphs(original));
    expect(stationaryGlyphs(middle)).toEqual(stationaryGlyphs(before));
    expect(stationaryGlyphs(after)).toEqual(stationaryGlyphs(before));
    expect(sequence.frame(0, 2.4).elements.some(element => element.id === "vector-label")).toBe(false);
    expect(find(sequence, 0, sequence.compiled[0].duration, "vector").geometry.points?.[1]).toEqual([2.25, 1]);
  });

  it("finishes moving outgoing content before introducing unrelated scenes", async () => {
    const sequence = await examples();
    for (const index of [1, 2]) {
      const compiled = sequence.compiled[index];
      expect(compiled.initial).toEqual([]);
      const entry = sequence.frame(index, 0);
      expect(entry.elements.every(element => element.id.startsWith("@"))).toBe(true);
      expect(entry.camera).toEqual(sequence.frame(index - 1, sequence.compiled[index - 1].duration).camera);
      const exitingMove = compiled.tracks.find(track => track.start === 0 && track.action.ids.includes("@exiting"))!;
      expect(exitingMove.action.type).toBe("animate");
      expect(Object.keys(exitingMove.action.properties!)).toEqual(["viewportOffset"]);
      const oldRemoved = compiled.lifecycle.find(event => event.type === "remove" && event.ids.includes("@exiting"))!;
      const freshBirth = compiled.lifecycle.find(event => event.type === "add" && event.ids.some(id => !id.startsWith("@")))!;
      expect(oldRemoved.time).toBeLessThan(freshBirth.time);
      expect(sequence.frame(index, 0.6).elements).toEqual([]);
      expect(sequence.frame(index, 0.8).elements.every(element => !element.id.startsWith("@"))).toBe(true);
      expect(compiled.tracks.some(track => track.action.type === "morph")).toBe(false);
    }
    for (let index = 0; index < sequence.compiled.length; index++) {
      expect(sequence.frame(index, sequence.compiled[index].duration).elements.some(element => element.persistent)).toBe(false);
    }
  });

  it("builds filled spherical methane atoms and surface-to-surface tetrahedral bonds", async () => {
    const sequence = await examples();
    const carbonGrowing = find(sequence, 1, 0.9, "carbon");
    expect(carbonGrowing).toMatchObject({ geometry: { kind: "sphere", radius: 0.42 }, fill: "#58c4dd", stroke: "none", opacity: 1 });
    expect(carbonGrowing.scale).toBeGreaterThan(0);
    expect(carbonGrowing.scale).toBeLessThan(1);
    expect(carbonGrowing.morph).toBeUndefined();
    const end = sequence.frame(1, sequence.compiled[1].duration);
    const hydrogens = end.elements.filter(element => /^hydrogen-\d$/.test(element.id));
    expect(hydrogens).toHaveLength(4);
    for (const atom of hydrogens) {
      expect(atom.geometry).toMatchObject({ kind: "sphere", radius: 0.25 });
      expect(Math.hypot(...atom.position)).toBeCloseTo(1.6, 12);
    }
    for (let i = 0; i < hydrogens.length; i++) {
      for (let j = i + 1; j < hydrogens.length; j++) {
        const dot = hydrogens[i].position.reduce((sum, value, axis) => sum + value * hydrogens[j].position[axis], 0) / (1.6 * 1.6);
        expect(dot).toBeCloseTo(-1 / 3, 12);
      }
      const bond = end.elements.find(element => element.id === `bond-${i}`)!;
      expect(bond.geometry.kind).toBe("mesh");
      const vertices = bond.geometry.vertices!;
      const start = average(vertices.slice(0, 16));
      const finish = average(vertices.slice(16, 32));
      expect(Math.hypot(...start)).toBeCloseTo(0.42, 12);
      expect(Math.hypot(...finish)).toBeCloseTo(1.6 - 0.25, 12);
    }
    const symbols = end.elements.filter(element => element.geometry.kind === "text");
    expect(symbols).toHaveLength(5);
    for (const symbol of symbols) expect(symbol).toMatchObject({ billboard: true });
    expect(symbols.find(symbol => symbol.id === "carbon-label")).toMatchObject({ position: [0, 0, 0], billboardOffset: [0, 0, 0.46] });
    for (let i = 0; i < hydrogens.length; i++) {
      expect(symbols.find(symbol => symbol.id === `hydrogen-label-${i}`)).toMatchObject({
        position: hydrogens[i].position, billboardOffset: [0, 0.43, 0.3],
      });
    }
    const cameraMiddle = sequence.frame(1, 2.95);
    expect(cameraMiddle.cameraAnimated).toBe(true);
    expect(cameraMiddle.camera.perspective).toBeCloseTo(0.5, 12);
    expect(end.camera.perspective).toBe(1);
  });

  it("starts sorting with six fresh bars, honors current controls, and seeks deterministically", async () => {
    const sequence = await examples();
    const introduced = sequence.frame(2, 1.25);
    expect(introduced.elements.filter(element => element.geometry.kind === "rectangle")).toHaveLength(6);
    expect(introduced.elements.some(element => element.geometry.kind === "sphere")).toBe(false);
    expect(introduced.camera.perspective).toBe(0);
    const sortedValues = () => sequence.frame(2, sequence.compiled[2].duration).elements
      .filter(element => /^bar-\d$/.test(element.id))
      .sort((a, b) => a.position[0] - b.position[0])
      .map(element => Number((element.geometry.height! / 0.43).toFixed(5)));
    expect(sortedValues()).toEqual([1, 2, 3, 4, 5, 6]);
    await sequence.setControl("linear-algebra", "stretch", 2);
    expect(find(sequence, 1, 0, "@exit:vector").geometry.points?.[1]).toEqual([3, 1]);
    await sequence.setControl("sorting", "direction", "Descending");
    expect(sortedValues()).toEqual([6, 5, 4, 3, 2, 1]);
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
