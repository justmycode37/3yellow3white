import { fileURLToPath } from 'node:url';

const result = await Bun.build({
  entrypoints: [fileURLToPath(new URL('../src/agents/scene-preview-browser.ts', import.meta.url))],
  outdir: fileURLToPath(new URL('../dist/', import.meta.url)),
  naming: 'scene-preview.js', target: 'browser', format: 'iife', minify: true,
});
if (!result.success) throw new AggregateError(result.logs, 'Could not build scene preview renderer.');
