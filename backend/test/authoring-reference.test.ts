import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { buildAuthoringReference } from '../src/agents/authoring-reference.js';

const reference = readFileSync(new URL('../../shared/animlib/docs/reference.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
function between(start: string, end?: string): string {
  return reference.slice(reference.indexOf(start), end ? reference.indexOf(end) : undefined).trim();
}

test('retains every authoring section verbatim while excluding host and development sections', () => {
  const output = buildAuthoringReference(reference);
  expect(output).toBe([
    '# animlib scene-authoring reference',
    between('### Color palettes', '### Player API'),
    between('## 3. Writing a scene', '## 7. Live source submissions'),
    between('### Execution environment', '## 8. One audio track per scene'),
    between('## 8. One audio track per scene', '## 9. Engine structure and verification'),
    between('## 10. Current boundaries and next steps'),
  ].join('\n\n') + '\n');
  for (const heading of ['### Player API', '### TypeScript surface', '## 7. Live source submissions', '## 9. Engine structure and verification']) {
    expect(output).not.toContain(heading);
  }
  expect(output.length).toBeLessThan(reference.length);
  for (const heading of ['### Shaded meshes', '### Procedural textures and materials', '### Function and parametric surfaces',
    '### Basic solids and swept tubes', '### Curved paths and organic shapes', '### Reactive sliders (prototype)']) {
    expect(output).toContain(heading);
  }
});

test('retains the complete texture/material contract including limits and control semantics', () => {
  const output = buildAuthoringReference(reference);
  expect(output).toContain(between('### Procedural textures and materials', '### Function and parametric surfaces'));
  for (const term of ['bumpStrength', 'metalness', 'roughness', 'emissiveIntensity',
    'localPosition * scale + offset', 'They are not `animate` or reactive `s.bind`',
    'No configurable lights, environment maps, shadows, image/video textures']) {
    expect(output).toContain(term);
  }
});

test('normalizes line endings deterministically without changing authoring prose', () => {
  expect(buildAuthoringReference(reference.replaceAll('\n', '\r\n'))).toBe(buildAuthoringReference(reference));
});

test.each([
  ['unknown heading', reference.replace('### Local timing', '### New timing API')],
  ['new nested heading', reference.replace('### Local timing', '#### New API\n\n### Local timing')],
  ['missing heading', reference.replace('### Local timing\n', '')],
  ['duplicate heading', reference.replace('### Local timing', '### Local timing\n\n### Local timing')],
  ['reordered headings', reference.replace('### Source format', '### TEMP').replace('### Local timing', '### Source format').replace('### TEMP', '### Local timing')],
  ['missing title', reference.replace('# animlib reference\n', '')],
])('rejects %s instead of silently dropping changed reference content', (_name, input) => {
  expect(() => buildAuthoringReference(input)).toThrow('reference structure');
});

test('rejects a retained section whose content has disappeared', () => {
  const input = reference.replace(between('### Color palettes', '### Player API'), '### Color palettes');
  expect(() => buildAuthoringReference(input)).toThrow('empty');
});

test('ignores heading-looking lines inside fenced examples but rejects unclosed fences', () => {
  const input = reference.replace('```js\nexport default scene(', '```js\n# example heading\nexport default scene(');
  expect(buildAuthoringReference(input)).toContain('## 3. Writing a scene');
  expect(() => buildAuthoringReference(reference + '\n```js\n')).toThrow('fence');
});
