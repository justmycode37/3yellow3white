import { detectSceneOverlaps } from 'animlib/core';
import type { CompiledScene } from 'animlib/core';

/** Reuse the renderer's projected glyph geometry; repairs remain authored source. */
export function validateSceneQuality(compiled: CompiledScene): void {
  const samples = detectSceneOverlaps(compiled, { width: 1280, height: 720, sampleRate: 2 });
  const pairs = new Map<string, string>();
  for (const sample of samples) {
    for (const overlap of sample.overlaps) {
      const key = JSON.stringify(overlap.elements);
      if (pairs.has(key)) continue;
      const { left, top, right, bottom } = overlap.bounds;
      pairs.set(key, `${overlap.elements.map(id => JSON.stringify(id)).join(' and ')} at ${sample.time.toFixed(3)} seconds; intersection pixels [${[left, top, right, bottom].map(n => n.toFixed(1)).join(', ')}]`);
      if (pairs.size === 8) break;
    }
    if (pairs.size === 8) break;
  }
  if (pairs.size) throw new Error(`Text overlap in settled scene state (1280x720):\n${[...pairs.values()].join('\n')}\nSeparate these labels, remove obsolete text, or use a single text/LaTeX element for one expression. Preserve semantic IDs, inherited state, narration and exact duration. Repair the source and call validate_output again. Checks sample settled text; moving text and shape collisions still need visual review.`);
}
