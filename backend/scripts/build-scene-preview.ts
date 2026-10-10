const result = await Bun.build({
  entrypoints: [new URL('../src/agents/scene-preview-browser.ts', import.meta.url).pathname],
  outdir: new URL('../dist/', import.meta.url).pathname,
  naming: 'scene-preview.js', target: 'browser', format: 'iife', minify: true,
});
if (!result.success) throw new AggregateError(result.logs, 'Could not build scene preview renderer.');
