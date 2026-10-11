import { expect, test } from 'bun:test';
import { compileSource } from 'animlib/core';
import { validateSceneQuality } from '../src/agents/scene-quality.js';

test('source-dependent rendering errors reach author repair before GPU review', async () => {
  const compiled = await compileSource(`export default scene({}, s => {
    const x=s.latex('formula',{tex:'x'});
    s.play(x.morphTo({kind:'latex',tex:'y'},{map:{missing:'alsoMissing'}}),{duration:1});
  });`);
  expect(() => validateSceneQuality(compiled)).toThrow(/Unknown source LaTeX part/);
});

test('new orbitable views require geometry-only interaction', async () => {
  const make = (targeted: boolean) => compileSource(`export default scene({}, s => {
    s.view('model',{rect:[0,0,1,1],orbit:true${targeted ? ',orbitHitTest:"geometry"' : ''}},v=>v.sphere('ball'));
    s.wait(1);
  });`);
  const bad = await make(false), good = await make(true);
  expect(() => validateSceneQuality(bad)).toThrow(/orbitHitTest/);
  expect(() => validateSceneQuality(good)).not.toThrow();
  const wholeCanvas = await compileSource(`export default scene({mode:'3d'},s=>{s.sphere('ball');s.text('label',{text:'DNA'});s.wait(1);});`);
  expect(() => validateSceneQuality(wholeCanvas)).toThrow(/whole-scene orbit/);
  expect(() => validateSceneQuality(wholeCanvas, { legacyOrbit: true })).not.toThrow();
  expect(() => validateSceneQuality(bad, { legacyOrbit: true })).not.toThrow();
});

test('settled glyph collisions return bounded, actionable library diagnostics', async () => {
  const compiled = await compileSource(`export default scene({}, s => {
    s.text('template-label', {text:'HH',fontSize:1});
    s.text('rna-label', {text:'HH',fontSize:1}); s.wait(2);
  });`);
  expect(() => validateSceneQuality(compiled)).toThrow(/template-label/);
  expect(() => validateSceneQuality(compiled)).toThrow(/rna-label/);
  expect(() => validateSceneQuality(compiled)).toThrow(/seconds/);
  expect(() => validateSceneQuality(compiled, { legacyOrbit: true })).toThrow(/Text overlap/);
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
