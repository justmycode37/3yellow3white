import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { createThumbnailGenerator, parseThumbnailSVG, thumbnailAgentConfig, thumbnailTask } from '../src/agents/thumbnail.js';

const svg = (body: string, attrs = '') => `<svg viewBox="0 0 420 270" ${attrs}>${body}</svg>`;
const path = '<path d="M120 120Q200 60 280 150"/>';

test('all existing app examples normalize without losing inherited paint or transforms', async () => {
  const examples = JSON.parse(await readFile(new URL('../prompts/thumbnail-examples.json', import.meta.url), 'utf8'));
  for (const example of examples) expect(parseThumbnailSVG(example.svg).paths.length).toBeGreaterThan(0);
  const molecule = parseThumbnailSVG(examples[0].svg);
  expect(molecule.paths.at(-1)).toMatchObject({ fill: 'currentColor', stroke: 'none' });
  const eigen = parseThumbnailSVG(examples[5].svg);
  expect(eigen.paths[0]).toMatchObject({ transform: 'translate(30 65) scale(.66)', strokeWidth: 18 });
  const nested = parseThumbnailSVG(svg(`<g transform="translate(10 20)"><g transform="scale(.5)">${path}</g></g>`));
  expect(nested.paths[0].transform).toBe('translate(10 20) scale(.5)');
});

test('rejects active content, markup escapes, invalid XML and unsupported paint', () => {
  for (const source of [
    svg('<script>alert(1)</script>'), svg(path, 'onload="alert(1)"'),
    svg('<foreignObject/>'), svg('<image href="https://example.com/image.png"/>'),
    svg(path, 'style="filter:url(https://example.com)"'), svg(path, 'fill="url(#x)"'),
    svg(path, 'xmlns="https://example.com"'), svg(path, 'stroke-linecap="square"'),
    '<!DOCTYPE svg [<!ENTITY x "oops">]>' + svg(path),
    svg('<path d="M1 2L3 4">text</path>'), svg(path) + svg(path),
    svg('<g>' + path), svg(path, 'stroke-width="NaN"'),
    svg('<path d="M1 2 garbage"/>'), svg(path, 'transform="url(https://example.com)"'),
    svg(path, 'transform="scale(10000)"'), svg(path, 'fill="none" stroke="none"'),
  ]) expect(() => parseThumbnailSVG(source)).toThrow();
});

test('rejects oversized, empty, non-finite and excessively nested drawings', () => {
  for (const source of [svg(''), svg(path.repeat(33)), svg(' '.repeat(24_000) + path),
    svg('<g>'.repeat(7) + path + '</g>'.repeat(7)), svg('<path d="M1 2 L1e999 5"/>'),
    svg('<path d="M1 2"/>'), svg(`<path d="M1 2${'L3 4'.repeat(501)}"/>`),
  ]) expect(() => parseThumbnailSVG(source)).toThrow();
});

test('thumbnail runner uses a separate Sol setting, bounded sources, examples and validation', async () => {
  const config = thumbnailAgentConfig({ AGENT_MODEL: 'gpt-6-astra', AGENT_PROVIDER: 'openai-codex', PI_CODING_AGENT_DIR: '/tmp/pi' });
  expect(config).toMatchObject({ model: 'gpt-6.1-sol', thinking: 'low', provider: 'openai-codex', agentDir: '/tmp/pi' });
  const signal = new AbortController().signal;
  const input = { title: 'Entropy', topic: 't'.repeat(20_000), documents: [{ name: 'notes', text: 's'.repeat(10_000) }] };
  const images = [{ type: 'image' as const, mimeType: 'image/png', data: 'example' }];
  const task = await thumbnailTask(input, signal, images);
  expect(task.prompt.length).toBeLessThan(17_000);
  expect(task.systemPrompt).toContain('Carbon, the great connector');
  expect(task.systemPrompt).toContain('stroke-width');
  expect(task.images).toEqual(images);
  expect(task.signal).toBe(signal);
  await expect(task.validate!(svg('<script/>'))).rejects.toThrow();
  const generate = createThumbnailGenerator({ async run() { return svg(path); } });
  expect(await generate(input, { signal })).toEqual(parseThumbnailSVG(svg(path)));
  await expect(createThumbnailGenerator({ async run() { return svg('<script/>'); } })(input, { signal })).rejects.toThrow();
});

test('thumbnail context includes documents after the tenth source', async () => {
  const documents = Array.from({ length: 12 }, (_, i) => ({ name: `source-${i}.md`, text: `Source ${i}` }));
  const task = await thumbnailTask({ title: 'Vectors', topic: '', documents }, new AbortController().signal);
  const context = JSON.parse(task.prompt.slice(task.prompt.indexOf('\n') + 1));
  expect(context.documents).toEqual(documents.map(document => ({ name: document.name, excerpt: document.text })));
});
