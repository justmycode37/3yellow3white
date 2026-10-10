import { expect, test } from 'bun:test';
import { compileSource } from 'animlib/core';
import { validateSceneQuality } from '../src/agents/scene-quality.js';

test('settled glyph collisions return bounded, actionable library diagnostics', async () => {
  const compiled = await compileSource(`export default scene({}, s => {
    s.text('template-label', {text:'HH',fontSize:1});
    s.text('rna-label', {text:'HH',fontSize:1}); s.wait(2);
  });`);
  expect(() => validateSceneQuality(compiled)).toThrow(/template-label/);
  expect(() => validateSceneQuality(compiled)).toThrow(/rna-label/);
  expect(() => validateSceneQuality(compiled)).toThrow(/seconds/);
});

test('separated text and intentionally overlapping geometry pass', async () => {
  const compiled = await compileSource(`export default scene({}, s => {
    s.circle('model'); s.circle('other');
    s.text('a', {text:'HH',position:[-2,0],fontSize:0.4});
    s.text('b', {text:'HH',position:[2,0],fontSize:0.4}); s.wait(2);
  });`);
  expect(() => validateSceneQuality(compiled)).not.toThrow();
});

test('transient text crossings pass but colliding settled endpoints fail', async () => {
  const source = (end: number) => `export default scene({}, s => {
    s.text('a', {text:'H',fontSize:0.5});
    const b=s.text('b', {text:'H',fontSize:0.5,position:[-2,0]});
    s.play(b.moveTo([${end},0]),{duration:2}); s.wait(1);
  });`;
  const good = await compileSource(source(2));
  expect(() => validateSceneQuality(good)).not.toThrow();
  const bad = await compileSource(source(0));
  expect(() => validateSceneQuality(bad)).toThrow(/Text overlap/);
});
