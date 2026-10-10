// Verify the delivered sequence using the same default compiler limits as playback.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileSource, evaluateScene } from '../../../shared/animlib/dist/core.js';

const root = new URL('./', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const runs = [];
for (let run = 0; run < 3; run++) {
  let previous, total = 0;
  const scenes = [];
  for (const entry of manifest.scenes) {
    const source = await readFile(new URL(entry.file, root), 'utf8');
    const started = performance.now();
    const compiled = await compileSource(source, { previous });
    if (Math.abs(compiled.duration - entry.duration) > 0.001) throw new Error(`${entry.id}: duration mismatch`);
    if (compiled.options.audio) throw new Error(`${entry.id}: unexpected audio`);
    const start = evaluateScene(compiled, 0);
    previous = evaluateScene(compiled, compiled.duration);
    const sampleTimes = [0, compiled.duration * .25, compiled.duration * .5, compiled.duration * .75, compiled.duration];
    for (const time of sampleTimes) {
      const frame = evaluateScene(compiled, time);
      if (!frame.elements.length) throw new Error(`${entry.id}: empty frame at ${time}`);
      const ids = frame.elements.map(element => element.id);
      if (new Set(ids).size !== ids.length) throw new Error(`${entry.id}: duplicate element IDs at ${time}`);
    }
    scenes.push({ id: entry.id, duration: compiled.duration, sourceSha256: createHash('sha256').update(source).digest('hex'), compiledSha256: createHash('sha256').update(JSON.stringify(compiled)).digest('hex'), wallMs: Math.round(performance.now() - started), initialElements: start.elements.length, finalElements: previous.elements.length, end: compiled.options.end });
    total += compiled.duration;
  }
  runs.push({ total, scenes });
}
for (const run of runs.slice(1)) for (let i = 0; i < run.scenes.length; i++) {
  if (run.scenes[i].compiledSha256 !== runs[0].scenes[i].compiledSha256) throw new Error(`Nondeterministic scene: ${run.scenes[i].id}`);
}
const report = { executionLimit: 'default 200 ms per scene VM', silent: true, captions: manifest.captions.length, runs };
await writeFile(new URL('film-validation.json', root), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
