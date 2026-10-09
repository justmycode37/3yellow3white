import type { SceneSource } from "../src/types";

const linear = String.raw`export default scene({ mode: "2d", end: "advance", audio: "scene-tone", background: "#000000" }, s => {
  const stretch = s.slider("stretch", { label: "Stretch", default: 1.5, min: 0.4, max: 2, step: 0.1 });
  const showGrid = s.toggle("grid", { label: "Show grid", default: true });
  if (showGrid) {
    for (let i = -4; i <= 4; i++) {
      s.line("grid-v-" + i, { points: [[i, -3], [i, 3]], stroke: "#252525", strokeWidth: 0.012 });
      s.line("grid-h-" + i, { points: [[-5, i], [5, i]], stroke: "#252525", strokeWidth: 0.012 });
    }
  }
  s.arrow("axis-x", { points: [[-4, 0], [4, 0]], stroke: "#ffffff", strokeWidth: 0.025 });
  s.arrow("axis-y", { points: [[0, -2.6], [0, 2.6]], stroke: "#ffffff", strokeWidth: 0.025 });
  const vector = s.arrow("vector", { points: [[0, 0], [1.5, 1]], stroke: "#58c4dd", strokeWidth: 0.065, opacity: 0 });
  const equation = s.latex("equation", {
    tex: "\\animpart{v}{v} \\animpart{equals}{=} \\animpart{rhs}{\\begin{bmatrix}\\animnum{x}\\\\1\\end{bmatrix}}",
    numbers: { x: 1.5 }, numberFormat: { decimals: 2, digits: 1 }, anchor: "v",
    position: [-3.4, 2], fontSize: 0.4, fill: "#ffffff", opacity: 0,
  });
  s.play([vector.fadeIn(), equation.fadeIn()], { duration: 0.6 });
  s.wait(0.8);
  s.play(equation.morphTo({
    kind: "latex",
    tex: "\\animpart{A}{A}\\animpart{v}{v} \\animpart{equals}{=} \\animpart{rhs}{\\begin{bmatrix}\\animnum{x}\\\\1\\end{bmatrix}}",
    numbers: { x: 1.5 }, numberFormat: { decimals: 2, digits: 1 }, anchor: "v", fontSize: 0.4,
  }, { map: { v: "v", equals: "equals", rhs: "rhs" } }), { duration: 0.35 });
  s.play([
    vector.morphTo({ kind: "arrow", points: [[0, 0], [1.5 * stretch, 1]], closed: false }),
    equation.countTo({ x: 1.5 * stretch }),
  ], { duration: 2, ease: "smooth" });
  s.wait(1);
});`;

// Chemical geometry is an application helper; animlib only needs spheres, meshes and text.
const chemistry = String.raw`export default scene({ mode: "2d", end: "advance", orbit: true, background: "#000000" }, s => {
  const spread = s.slider("bond-length", { label: "Bond length", default: 1.6, min: 1.1, max: 2.1, step: 0.1 });
  const labels = s.toggle("atom-labels", { label: "Atom labels", default: true });
  const outgoing = s.previous.exiting();
  s.play(outgoing.animate({ viewportOffset: [-1.5, 0] }), { duration: 0.55, ease: "smooth" });
  s.remove(outgoing);
  s.play(s.camera.to2D({ height: 7 }), { duration: 0 });
  s.wait(0.1);

  const carbonRadius = 0.42;
  const hydrogenRadius = 0.25;
  const carbon = s.sphere("carbon", { radius: carbonRadius, fill: "#58c4dd", stroke: "none", scale: 0 });
  s.play(carbon.scaleTo(1), { duration: 0.45, ease: "smooth" });

  // These four unit directions have pairwise dot product -1/3: the tetrahedral angle is 109.47 degrees.
  const corners = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  const atoms = [];
  const bonds = [];
  const atomLabels = [];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  function cylinder(id, start, end) {
    const direction = end.map((v, i) => v - start[i]);
    const length = Math.hypot(...direction);
    const unit = direction.map(v => v / length);
    const side = cross(unit, Math.abs(unit[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
    const sideLength = Math.hypot(...side);
    const u = side.map(v => v / sideLength);
    const v = cross(unit, u);
    const vertices = [];
    const triangles = [];
    const segments = 16;
    for (const center of [start, end]) {
      for (let j = 0; j < segments; j++) {
        const angle = j * Math.PI * 2 / segments;
        vertices.push(center.map((value, k) => value + 0.035 * (u[k] * Math.cos(angle) + v[k] * Math.sin(angle))));
      }
    }
    for (let j = 0; j < segments; j++) {
      const next = (j + 1) % segments;
      triangles.push([j, next, segments+j], [next, segments+next, segments+j]);
    }
    return s.mesh(id, { vertices, triangles, fill: "#ffffff", stroke: "none", scale: 0 });
  }
  for (let i = 0; i < corners.length; i++) {
    const unit = corners[i].map(v => v / Math.sqrt(3));
    const p = unit.map(v => v * spread);
    const start = unit.map(v => v * carbonRadius);
    const end = unit.map(v => v * (spread - hydrogenRadius));
    bonds.push(cylinder("bond-" + i, start, end));
    atoms.push(s.sphere("hydrogen-" + i, { radius: hydrogenRadius, position: p, fill: "#ffffff", stroke: "none", scale: 0 }));
    if (labels) atomLabels.push(s.text("hydrogen-label-" + i, { text: "H", position: p, fontSize: 0.25, fill: "#ffffff", billboard: true, billboardOffset: [0, 0.43, 0.3], scale: 0 }));
  }
  if (labels) atomLabels.push(s.text("carbon-label", { text: "C", position: [0, 0, 0], fontSize: 0.28, fill: "#ffffff", billboard: true, billboardOffset: [0, 0, 0.46], scale: 0 }));
  s.play(bonds.concat(atoms).map(e => e.scaleTo(1)), { duration: 0.6, ease: "smooth" });
  s.play(atomLabels.map(e => e.scaleTo(1)), { duration: 0.25 });
  s.play(s.camera.to3D({ yaw: 0.4, pitch: 0.2, distance: 9, height: 7 }), { duration: 2, ease: "smooth" });
  s.wait(1.6);
});`;

// An application helper emits ordinary sequential scene code for bubble sort.
function sortingSource(values: number[]): string {
  return String.raw`export default scene({ mode: "3d", end: "hold", orbit: true, background: "#000000" }, s => {
  const direction = s.select("direction", { label: "Sort order", default: "Ascending", options: ["Ascending", "Descending"] });
  const outgoing = s.previous.exiting();
  // Exit in viewport coordinates, retaining the preceding camera and any viewer orbit.
  s.play(outgoing.animate({ viewportOffset: [-1.5, 0] }), { duration: 0.55, ease: "smooth" });
  s.remove(outgoing);
  s.play(s.camera.to2D({ height: 7 }), { duration: 0 });
  s.wait(0.1);

  const values = ${JSON.stringify(values)};
  const bars = [];
  const x = i => (i - (values.length - 1) / 2) * 0.8;
  const baseline = -1.8;
  for (let i = 0; i < values.length; i++) {
    bars.push(s.rectangle("bar-" + i, { width: 0.55, height: values[i] * 0.43, position: [x(i), baseline + values[i] * 0.43 / 2], fill: "#ffffff", stroke: "none", scale: 0 }));
  }
  const baselineLine = s.line("baseline", { points: [[-3, baseline], [3, baseline]], stroke: "#ffffff", strokeWidth: 0.025, scale: 0 });
  const title = s.text("sort-title", { text: "Bubble sort", position: [0, 2.15], fontSize: 0.35, fill: "#ffffff", scale: 0 });
  s.play(bars.concat([baselineLine, title]).map(e => e.scaleTo(1)), { duration: 0.6, ease: "smooth" });
  s.wait(0.4);
  for (let pass = 0; pass < values.length - 1; pass++) {
    let swapped = false;
    for (let i = 0; i < values.length - 1 - pass; i++) {
      s.play([bars[i].animate({ fill: "#ffff00" }), bars[i + 1].animate({ fill: "#ffff00" })], { duration: 0.12 });
      const shouldSwap = direction === "Ascending" ? values[i] > values[i + 1] : values[i] < values[i + 1];
      if (shouldSwap) {
        s.play([
          bars[i].moveTo([x(i + 1), baseline + values[i] * 0.43 / 2]),
          bars[i + 1].moveTo([x(i), baseline + values[i + 1] * 0.43 / 2]),
        ], { duration: 0.45, ease: "smooth" });
        const value = values[i]; values[i] = values[i + 1]; values[i + 1] = value;
        const bar = bars[i]; bars[i] = bars[i + 1]; bars[i + 1] = bar;
        swapped = true;
      } else s.wait(0.1);
      s.play([bars[i].animate({ fill: "#ffffff" }), bars[i + 1].animate({ fill: "#ffffff" })], { duration: 0.12 });
    }
    if (!swapped) break;
  }
  s.play(bars.map(e => e.animate({ fill: "#83c167" })), { duration: 0.4 });
  s.wait(0.8);
});`;
}

export const initialSources: SceneSource[] = [
  { id: "linear-algebra", source: linear },
  { id: "organic-chemistry", source: chemistry },
  { id: "sorting", source: sortingSource([5, 2, 6, 3, 1, 4]) },
];
