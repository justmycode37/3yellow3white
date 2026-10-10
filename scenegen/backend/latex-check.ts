// animlib lays out LaTeX in the renderer, not when a scene is compiled, so a scene
// with an unsupported command passes validation and then stops the player
// ("Invalid LaTeX: ..."). This runs the renderer's own layout on every formula.
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
