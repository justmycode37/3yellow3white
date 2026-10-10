// Compile a list of animlib scene sources in order (so handoffs are real) and
// report diagnostics and durations as JSON. Usage: node check.mjs <scenes.json>
import { readFile } from 'node:fs/promises';
import { SceneSequence } from '../../shared/animlib/dist/core.js';

const scenes = JSON.parse(await readFile(process.argv[2], 'utf8'));
// The app's player builds each scene within animlib's default 200 ms budget, so the
// check uses the same budget. A busy machine can exceed it by chance: retry once
// before reporting the scene as too heavy.
const sequence = new SceneSequence();
try {
  let result = await sequence.submit({ type: 'load', scenes });
  const interrupted = r => !r.ok && r.diagnostics.some(d => /interrupted/i.test(d.message));
  if (interrupted(result)) result = await sequence.submit({ type: 'load', scenes });
  if (interrupted(result)) {
    for (const d of result.diagnostics) {
      d.message = 'Building this scene took longer than the 200 ms the player allows.';
      d.hint = 'Make the builder cheaper: fewer elements, fewer loop iterations and sample points, no heavy maths per element.';
    }
  }
  const out = { ok: result.ok, diagnostics: result.diagnostics, scenes: [] };
  if (result.ok) {
    out.scenes = sequence.compiled.map((c, i) => {
      const last = sequence.frame(i, c.duration);
      return { id: scenes[i].id, duration: c.duration, end: c.options.end, mode: c.options.mode,
               controls: c.controls.map(k => k.id),
               finalElements: (last.elements ?? []).filter(e => (e.opacity ?? 1) > 0.01).map(e => e.id) };
    });
  }
  console.log(JSON.stringify(out));
} finally {
  sequence.dispose();
}
