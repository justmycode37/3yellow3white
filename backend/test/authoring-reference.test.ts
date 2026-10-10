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
  expect(output).toContain(between('### Procedural textures and materials', '### Function and parametric surfaces'));
  expect(output).toContain('### Retained reactive bindings');
  expect(output).toContain('Do not simplify a planned explanation to fit the fast path.');
  expect(output).toContain(between('## Object bounds', '## Overlap inspection'));
});

test('normalizes line endings deterministically without changing authoring prose', () => {
  expect(buildAuthoringReference(reference.replaceAll('\n', '\r\n'))).toBe(buildAuthoringReference(reference));
});

test.each([
  ['unknown heading', reference.replace('### Local timing', '### New timing API')],
  ['new nested heading', reference.replace('### Local timing', '#### New API\n\n### Local timing')],
  ['new lighting subsection', reference.replace('### Scene lighting and planar shadows', '### Scene lighting and planar shadows\n\n#### New light API')],
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

test('retains curved-path authoring rules and the Bézier example', () => {
  const output = buildAuthoringReference(reference);
  expect(output).toContain(between('### Curved paths and organic shapes', '### Choosing how objects relate and move'));
  expect(output).toContain("d: 'M0 0 C0.5 0.6 1.3 0.7 2 0 C1.3 -0.5 0.5 -0.4 0 0 Z'");
});

test('retains the complete lighting API, example, casting policy and limits verbatim', () => {
  const output = buildAuthoringReference(reference);
  const lighting = between('### Scene lighting and planar shadows', '### Procedural textures and materials');
  expect(lighting).toStartWith('### Scene lighting and planar shadows');
  expect(output).toContain(lighting);
  for (const prose of [
    "direction: [-0.7, 1, 0.5], space: 'world', intensity: 1",
    "lighting: 'studio'",
    "space: 'camera'",
    "`castShadow: false`",
    'translucent fills/textures and members of translucent isolated groups do not cast',
    'no self-shadowing',
    'arbitrary mesh receivers',
    'Use medium quality and modest caster counts for interactive scenes.',
  ]) expect(lighting).toContain(prose);
});

test('retains deformation topology, sandbox, and snapshot authoring rules verbatim', () => {
  const output = buildAuthoringReference(reference);
  expect(output).toContain(between('### Fixed-topology deformation and scene time', '### Control appearance'));
  expect(output).toContain('s.deform(wave, [s.time, amplitude]');
  expect(output).toContain('triangle indices, order, and winding never change');
  expect(output).toContain('Callbacks remain synchronous and sandboxed');
  expect(output).toContain('await sequence.evaluate(index, time)');
});
test('retains explanatory geometry APIs, topology limits, palette ramps and label semantics', () => {
  const output = buildAuthoringReference(reference);
  expect(output).toContain(between('## Sections, feature edges, scalar fields, and label depth'));
  for (const text of ['dot(normal, localPosition) <= offset', 'nested holes', 'creaseAngle',
    'scalarColors', 'uniformly spaced palette', "'hide'", "'fade'", 'same view']) {
    expect(output).toContain(text);
  }
});
