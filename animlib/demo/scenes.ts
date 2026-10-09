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
  const vector = s.arrow("hero", { points: [[0, 0], [1.5, 1]], stroke: "#58c4dd", strokeWidth: 0.065, opacity: 0 });
  const label = s.text("vector-label", { text: "v = (1.5, 1)", position: [2.1, 1.1], fontSize: 0.25, fill: "#ffffff", opacity: 0 });
  const equation = s.latex("equation", {
    tex: "\\animpart{lhs}{v} \\animpart{equals}{=} \\animpart{rhs}{\\begin{bmatrix}1.5\\\\1\\end{bmatrix}}",
    position: [-2.3, 2], fontSize: 0.36, fill: "#ffffff", opacity: 0,
  });
  s.play([vector.fadeIn(), label.fadeIn(), equation.fadeIn()], { duration: 0.8 });
  s.wait(0.6);
  s.play([
    vector.morphTo({ kind: "arrow", points: [[0, 0], [1.5 * stretch, 1]], closed: false }),
    label.fadeOut(),
    equation.morphTo({ kind: "latex", tex: "\\animpart{lhs}{Av} \\animpart{equals}{=} \\animpart{rhs}{\\begin{bmatrix}" + (1.5 * stretch).toFixed(2) + "\\\\1\\end{bmatrix}}", fontSize: 0.36 }, { map: { lhs: "lhs", equals: "equals", rhs: "rhs" } }),
  ], { duration: 2, ease: "smooth" });
  s.wait(0.8);
  s.keep(vector);
});`;

// The molecule description belongs to this application, not to animlib's core.
const chemistry = String.raw`export default scene({ mode: "2d", end: "advance", orbit: true, background: "#000000" }, s => {
  const spread = s.slider("bond-length", { label: "Bond length", default: 1.6, min: 1.1, max: 2.1, step: 0.1 });
  const labels = s.toggle("atom-labels", { label: "Atom labels", default: true });
  const outgoing = s.previous.exiting();
  const carbon = s.previous.get("hero");
  s.play([
    outgoing.fadeOut(),
    carbon.morphTo({ kind: "circle", radius: 0.42 }),
    carbon.moveTo([0, 0, 0]),
    carbon.animate({ fill: "#58c4dd", stroke: "#58c4dd", strokeWidth: 0.025 }),
  ], { duration: 1.2, ease: "smooth" });
  s.remove(outgoing);
  const corners = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < corners.length; i++) {
    const p = corners[i].map(v => v * spread / Math.sqrt(3));
    bonds.push(s.line("bond-" + i, { points: [[0, 0, 0], p], stroke: "#ffffff", strokeWidth: 0.075, opacity: 0 }));
    atoms.push(s.circle("hydrogen-" + i, { radius: 0.25, position: p, fill: "#ffffff", stroke: "#ffffff", strokeWidth: 0.025, opacity: 0 }));
    if (labels) atoms.push(s.text("hydrogen-label-" + i, { text: "H", position: [p[0], p[1] + 0.4, p[2]], fontSize: 0.25, fill: "#ffffff", opacity: 0 }));
  }
  if (labels) atoms.push(s.text("carbon-label", { text: "C", position: [0, 0.65, 0], fontSize: 0.32, fill: "#ffffff", opacity: 0 }));
  s.play(bonds.concat(atoms).map(e => e.fadeIn()), { duration: 0.8 });
  s.play(s.camera.to3D({ yaw: 0.65, pitch: 0.38, distance: 9, height: 7 }), { duration: 2, ease: "smooth" });
  s.wait(1);
  s.keep(carbon);
});`;

// An application helper emits ordinary scene code for the algorithm demonstration.
function sortingSource(values: number[]): string {
  return String.raw`export default scene({ mode: "3d", end: "hold", background: "#000000" }, s => {
  const direction = s.select("direction", { label: "Sort order", default: "Ascending", options: ["Ascending", "Descending"] });
  const outgoing = s.previous.exiting();
  const first = s.previous.get("hero");
  const values = ${JSON.stringify(values)};
  const bars = [first];
  const x = i => (i - (values.length - 1) / 2) * 0.8;
  const baseline = -1.8;
  s.play([
    outgoing.fadeOut(),
    first.morphTo({ kind: "rectangle", width: 0.55, height: values[0] * 0.43 }),
    first.moveTo([x(0), baseline + values[0] * 0.43 / 2, 0]),
    first.animate({ fill: "#ffffff", stroke: "#ffffff" }),
    s.camera.to2D({ height: 7 }),
  ], { duration: 1.4, ease: "smooth" });
  s.remove(outgoing);
  for (let i = 1; i < values.length; i++) {
    bars.push(s.rectangle("bar-" + i, { width: 0.55, height: values[i] * 0.43, position: [x(i), baseline + values[i] * 0.43 / 2], fill: "#ffffff", stroke: "#ffffff", opacity: 0 }));
  }
  s.play(bars.slice(1).map(e => e.fadeIn()), { duration: 0.7 });
  s.line("baseline", { points: [[-3, baseline], [3, baseline]], stroke: "#ffffff", strokeWidth: 0.025 });
  const label = s.text("sort-label", { text: "Bubble sort · " + direction.toLowerCase(), position: [0, 2.15], fontSize: 0.35, fill: "#ffffff" });
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

