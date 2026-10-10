import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { applyVisualEdits, parseVisualVerification } from '../src/agents/visual-edits.js';

const finding = { timeSec: 1, objectIds: ['label'], problem: 'Label overlaps strand', fix: 'Move label above strand' };
const source = String.raw`const label=s.latex('label',{tex:'\\mathrm{DNA}',position:[0,0]});`;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const patch = (edits: unknown[], sourceSha256 = hash(source)) => JSON.stringify({ sourceSha256, edits });
const edit = { finding: 0, before: 'position:[0,0]', after: 'position:[0,2]' };

test('verification reports findings without permission to rewrite source', () => {
  expect(parseVisualVerification(JSON.stringify({ approved: false, findings: [finding] }), 4).findings).toEqual([finding]);
  expect(parseVisualVerification('{"approved":true,"findings":[]}', 4).approved).toBe(true);
  for (const result of [
    { approved: false, findings: [finding], source },
    { approved: false, findings: [] },
    { approved: true, findings: [finding] },
    { approved: false, findings: [{ ...finding, timeSec: 5 }] },
    { approved: false, findings: [{ ...finding, objectIds: [7] }] },
  ]) expect(() => parseVisualVerification(JSON.stringify(result), 4)).toThrow();
});

test('targeted edits preserve every untouched byte, including doubled TeX backslashes', () => {
  expect(applyVisualEdits(patch([edit]), source, 1)).toBe(source.replace(edit.before, edit.after));
  expect(applyVisualEdits(patch([edit]), source, 1)).toContain(String.raw`tex:'\\mathrm{DNA}'`);
});

test('multiple edits use original positions and preserve literal replacement characters', () => {
  const text = 'start ABC middle XYZ finish';
  const result = applyVisualEdits(patch([
    { finding: 0, before: 'ABC', after: '$&long' },
    { finding: 1, before: 'XYZ', after: '' },
  ], hash(text)), text, 2);
  expect(result).toBe('start $&long middle  finish');
});

test('reject stale, ambiguous, overlapping, no-op, missing-finding and full-source outputs', () => {
  const invalid = [
    patch([edit], '0'.repeat(64)), patch([{ ...edit, before: 'absent' }]),
    patch([{ ...edit, before: '0' }]), patch([edit, { ...edit, before: '[0,0]', after: '[1,1]' }]),
    patch([{ ...edit, after: edit.before }]), patch([{ ...edit, finding: 1 }]),
    JSON.stringify({ sourceSha256: hash(source), edits: [edit], source: 'replacement' }),
  ];
  for (const value of invalid) expect(() => applyVisualEdits(value, source, 1)).toThrow();
  expect(() => applyVisualEdits(patch([edit]), source, 2)).toThrow('Every finding');
});

test('reject wholesale rewrites hidden inside one or several exact edits', () => {
  expect(() => applyVisualEdits(patch([{ finding: 0, before: source, after: 'export default scene({},s=>s.wait(4));' }]), source, 1)).toThrow('25%');
  const first = source.slice(0, 30), second = source.slice(30);
  expect(() => applyVisualEdits(patch([
    { finding: 0, before: first, after: 'new code' },
    { finding: 0, before: second, after: 'more new code' },
  ]), source, 1)).toThrow('25%');
  // Large unique context is allowed when the actual changed region is small.
  expect(applyVisualEdits(patch([{ finding: 0, before: source, after: source.replace('[0,0]', '[0,2]') }]), source, 1)).toBe(source.replace('[0,0]', '[0,2]'));
});
