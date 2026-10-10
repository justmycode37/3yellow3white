// animlib lays out LaTeX in the renderer, not when a scene is compiled, so a scene
// with an unsupported command passes validation and then stops the player
// ("Invalid LaTeX: ..."). This runs the renderer's own layout on every formula.
import { evaluateScene } from "animlib/core";
import type { CompiledScene } from "animlib/core";
import { layoutLatexGeometry } from "../../shared/animlib/dist/latex.js";

type Json = unknown;

/** Every latex geometry in a compiled scene: initial elements and morph targets. */
function latexGeometries(value: Json, found: { tex: string }[] = [], seen = new Set<object>()): { tex: string }[] {
  if (!value || typeof value !== "object" || seen.has(value as object)) return found;
  seen.add(value as object);
  const record = value as Record<string, Json>;
  if (record.kind === "latex" && typeof record.tex === "string") found.push(record as { tex: string });
  for (const child of Array.isArray(value) ? value : Object.values(record)) latexGeometries(child, found, seen);
  return found;
}

/** Returns one message per formula the player could not render. */
export function latexErrors(compiled: Json): string[] {
  const errors = new Set<string>();
  for (const geometry of latexGeometries(compiled)) {
    try { layoutLatexGeometry(geometry as never); }
    catch (error) { errors.add(error instanceof Error ? error.message : String(error)); }
  }
  return [...errors];
}

export const LATEX_HINT = "The player renders LaTeX with MathJax's base, ams, newcommand and html packages only. " +
  "Not available: \\boldsymbol and \\bm (use \\mathbf or \\vec), \\color and \\textcolor (colour with fill or \\animpart), " +
  "\\ce (write \\mathrm{H_2O}), \\cancel, \\si, \\bra/\\ket, \\degree (use ^\\circ), \\require, \\unicode.";

interface FrameElement {
  id: string; view?: string; opacity: number; strokeProfile?: string; position: number[];
  geometry: { kind: string; points?: number[][]; vertices?: number[][] };
}

/**
 * Parts of a 3D model that are drawn outside its view. animlib only puts an object
 * into a view when it is created inside that view's builder callback; an object made
 * later through a saved view handle lands in the main scene, is drawn with the main
 * camera, and floats beside the model instead of sitting on it.
 */
export function strayModelParts(frames: { elements: FrameElement[] }[]): string[] {
  const stray = new Set<string>();
  for (const frame of frames) {
    if (!frame.elements.some(element => element.view)) continue;
    for (const element of frame.elements) {
      if (element.view || element.opacity <= 0.02) continue;
      const points = [element.position, ...(element.geometry.points ?? []), ...(element.geometry.vertices ?? [])];
      const spatial = element.strokeProfile === "round" || element.geometry.kind === "sphere" || element.geometry.kind === "mesh"
        || points.some(point => Math.abs(point[2] ?? 0) > 1e-6);
      if (spatial) stray.add(element.id);
    }
  }
  return [...stray];
}

export const STRAY_HINT = "These 3D objects are outside the 3D view, so they are drawn with a different camera and do not sit on " +
  "the model or rotate with it. Create every object that belongs to the model INSIDE the s.view(...) builder callback " +
  "(give it opacity: 0 there if it appears later, then fade it in). Never save the view handle and call it after the callback returned.";

/** Sample a compiled scene and report every problem the player would show but validation would miss. */
export function renderProblems(compiled: CompiledScene): string[] {
  const problems: string[] = [];
  const broken = latexErrors(compiled);
  if (broken.length) problems.push(`${broken.join("\n")}\n${LATEX_HINT}`);
  const frames = Array.from({ length: 13 }, (_, i) => evaluateScene(compiled, compiled.duration * i / 12));
  const stray = strayModelParts(frames as never);
  if (stray.length) problems.push(`Outside the 3D view: ${stray.slice(0, 12).join(", ")}${stray.length > 12 ? ", ..." : ""}.\n${STRAY_HINT}`);
  const layout = layoutProblems(frames as never);
  if (layout.length) problems.push(`${layout.join("\n")}\n${LAYOUT_HINT}`);
  const placed = compiled.controls.filter(control => control.position).map(control => control.id);
  if (placed.length) problems.push(`Controls with a position: ${placed.join(", ")}.\n${CONTROLS_HINT}`);
  return problems;
}

// Without a position the player stacks controls in the top right corner, right-aligned,
// in declaration order: the same place in every scene.
export const CONTROLS_HINT = "Controls must sit in the top right corner in every scene. Remove `position` from s.slider / s.toggle / " +
  "s.select: the player then stacks them top right by itself. Keep formulas below them on the right.";

// The narrowest window the layout must survive: width = 1.5 x height.
const SAFE_ASPECT = 1.5;
const MAX_FORMULAS = 7;

interface Box { id: string; left: number; right: number; bottom: number; top: number }
interface LayoutFrame {
  camera: { yaw: number; pitch: number; target: number[]; height: number };
  elements: (FrameElement & { scale: number; space?: string; billboard?: boolean; rotation?: number[];
    geometry: { kind: string; tex?: string; fontSize?: number } })[];
}

/** Boxes of the flat formulas drawn by the main camera, in scene units. */
function formulaBoxes(frame: LayoutFrame): Box[] {
  if (Math.abs(frame.camera.yaw) > 1e-3 || Math.abs(frame.camera.pitch) > 1e-3) return [];
  const boxes: Box[] = [];
  for (const element of frame.elements) {
    if (element.geometry.kind !== "latex" || element.view || element.billboard || element.space === "screen" || element.opacity <= 0.05) continue;
    if ((element.rotation ?? []).some(angle => Math.abs(angle) > 1e-3)) continue;
    let points: number[][];
    try { points = layoutLatexGeometry(element.geometry as never).paths.flatMap(path => path.contours.flat()); } catch { continue; }
    if (!points.length) continue;
    const size = (element.geometry.fontSize ?? 0.6) * element.scale;
    const xs = points.map(point => point[0] * size + element.position[0]), ys = points.map(point => point[1] * size + element.position[1]);
    boxes.push({ id: element.id, left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) });
  }
  return boxes;
}

/** Formulas that overlap each other, leave the frame, or pile up, as the viewer would see them. */
export function layoutProblems(frames: LayoutFrame[]): string[] {
  const overlaps = new Map<string, number>(), outside = new Set<string>();
  let most = 0;
  frames.forEach((frame, index) => {
    const boxes = formulaBoxes(frame), last = index === frames.length - 1;
    most = Math.max(most, boxes.length);
    const halfHeight = frame.camera.height / 2, halfWidth = halfHeight * SAFE_ASPECT, [cx, cy] = frame.camera.target;
    for (const box of boxes) {
      if (box.left < cx - halfWidth || box.right > cx + halfWidth || box.bottom < cy - halfHeight || box.top > cy + halfHeight) outside.add(box.id);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom);
      if (w <= 0.02 || h <= 0.02) continue;
      const key = `${a.id} and ${b.id}`;
      overlaps.set(key, (overlaps.get(key) ?? 0) + (last ? 2 : 1)); // passing through each other once mid-motion is fine
    }
  });
  const problems: string[] = [];
  const overlapping = [...overlaps].filter(([, count]) => count >= 2).map(([pair]) => pair);
  if (overlapping.length) problems.push(`Formulas overlap: ${overlapping.slice(0, 8).join("; ")}.`);
  if (outside.size) problems.push(`Formulas leave the frame (it can be as narrow as ${SAFE_ASPECT} x its height): ${[...outside].slice(0, 8).join(", ")}.`);
  if (most > MAX_FORMULAS) problems.push(`Too much text: ${most} formulas and labels are visible at once (at most ${MAX_FORMULAS}).`);
  return problems;
}

export const LAYOUT_HINT = "Show less at once: fade out formulas that are no longer needed before adding the next, keep at most three " +
  "formulas in the right-hand column, leave a clear gap (at least half a line) between neighbours, and make each fit inside the frame " +
  "(smaller fontSize or a shorter formula). A 2x2 matrix at fontSize 0.46 is about 1.1 units tall, so stack matrices at least 1.5 units apart.";
