// Compile a list of animlib scene sources in order (so handoffs are real) and
// report diagnostics and durations as JSON. Usage: node check.mjs <scenes.json>
import { readFile } from 'node:fs/promises';
import { SceneSequence } from '../../shared/animlib/dist/core.js';

const scenes = JSON.parse(await readFile(process.argv[2], 'utf8'));
const sequence = new SceneSequence({ executionLimitMs: 2000 });
try {
  const result = await sequence.submit({ type: 'load', scenes });
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
