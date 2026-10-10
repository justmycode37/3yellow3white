import { expect, test } from 'bun:test';
import { compileSource, evaluateScene } from 'animlib/core';
import { parsePlannedLesson } from '../src/agents/planning.js';
import type { PlannedLesson } from '../src/agents/planning.js';
import { validateScenePlan } from '../src/agents/scene-plan.js';

const request = { title: 'Counting', topic: 'Dots', documents: [{ name: 'notes.pdf', text: '[Page 1]\nTwo dots.' }] };
function lesson(): PlannedLesson {
  return { schemaVersion: 1, markdown: '# Counting\n\n## Beat 1 — Count\n\nContent needed: Two dots.\n\nNarration: Two dots.', plan: {
    audience: 'Newcomer', prerequisites: [], learningGoal: 'Count two objects', centralQuestion: 'How many?',
    keyInsight: 'Count each object once', runningExample: 'Two dots', misconceptions: [],
    entities: [{ id: 'dot', meaning: 'The original object', color: 'BLUE' }, { id: 'helper', meaning: 'Temporary hint', color: 'GREY' }],
    scenes: [{ id: 'beat-1', purpose: 'Count', whyNow: 'Establish the example', keyPoints: ['Two objects'],
      visualDescription: 'Two dots', endsWith: 'One core dot remains', carry: ['dot'], cleanup: ['helper'],
      sourceRefs: [{ document: 'notes.pdf', location: 'Page 1', supports: 'Two dots' }], interactions: [] }],
  } };
}

test('planning validates source names and ordered scene identity before accepting speech', () => {
  expect(parsePlannedLesson(JSON.stringify(lesson()), request)).toEqual(lesson());
  const wrongSource = lesson(); wrongSource.plan.scenes[0].sourceRefs[0].document = 'invented.pdf';
  expect(() => parsePlannedLesson(JSON.stringify(wrongSource), request)).toThrow('unavailable source invented.pdf');
  const wrongScene = lesson(); wrongScene.plan.scenes[0].id = 'beat-2';
  expect(() => parsePlannedLesson(JSON.stringify(wrongScene), request)).toThrow('expected beat-1');
  const absent = lesson(); absent.plan.scenes = [];
  expect(() => parsePlannedLesson(JSON.stringify(absent), request)).toThrow('exactly one scene plan');
  const noSpeech = lesson(); noSpeech.markdown = '# Counting\n\n## Beat 1\n\nContent needed: Two dots.';
  expect(() => parsePlannedLesson(JSON.stringify(noSpeech), request)).toThrow();
});

test('planning rejects contradictory ownership and unsupported palette/control declarations', () => {
  const overlap = lesson(); overlap.plan.scenes[0].cleanup.push('dot');
  expect(() => parsePlannedLesson(JSON.stringify(overlap), request)).toThrow('disjoint');
  const missing = lesson(); missing.plan.scenes[0].carry.push('unknown');
  expect(() => parsePlannedLesson(JSON.stringify(missing), request)).toThrow('unknown entity');
  const duplicate = lesson(); duplicate.plan.entities.push({ ...duplicate.plan.entities[0] });
  expect(() => parsePlannedLesson(JSON.stringify(duplicate), request)).toThrow('unique');
  const color = lesson(); color.plan.entities[0].color = '#123456';
  expect(() => parsePlannedLesson(JSON.stringify(color), request)).toThrow('palette token');
  const controls = lesson(); controls.plan.scenes[0].interactions = Array.from({ length: 3 }, (_, i) => ({ id: `slider-${i}`, type: 'slider', label: 'Count', drives: 'Count', discover: 'Count' }));
  expect(() => parsePlannedLesson(JSON.stringify(controls), request)).toThrow('at most 2');
});

test('compiled scene plan checks enforce real persistence and cleanup', async () => {
  const plan = lesson().plan.scenes[0];
  const valid = await compileSource(`export default scene({},s=>{const dot=s.circle('dot');const helper=s.circle('helper');s.play(helper.fadeOut(),{duration:1});s.keep(dot);});`);
  expect(() => validateScenePlan(valid, evaluateScene(valid, valid.duration), plan)).not.toThrow();
  const invalid = await compileSource(`export default scene({},s=>{s.circle('dot');s.circle('helper');s.wait(1);});`);
  expect(() => validateScenePlan(invalid, evaluateScene(invalid, invalid.duration), plan)).toThrow('s.keep()');
  expect(() => validateScenePlan(invalid, evaluateScene(invalid, invalid.duration), plan)).toThrow('Cleanup entity "helper"');
});

test('cleanup recognizes hidden ancestor groups and controls must match planned types', async () => {
  const plan = lesson().plan.scenes[0];
  const compiled = await compileSource(`export default scene({},s=>{const dot=s.circle('dot');const helper=s.circle('helper');const g=s.group('helpers',[helper]);s.play(g.fadeOut(),{duration:1});s.keep(dot);s.toggle('explore',{default:false});});`);
  expect(() => validateScenePlan(compiled, evaluateScene(compiled, compiled.duration), plan)).toThrow('planned controls');
  plan.interactions = [{ id: 'explore', type: 'toggle', label: 'Explore', drives: 'Hint', discover: 'Count' }];
  expect(() => validateScenePlan(compiled, evaluateScene(compiled, compiled.duration), plan)).not.toThrow();
  plan.interactions[0].type = 'slider';
  expect(() => validateScenePlan(compiled, evaluateScene(compiled, compiled.duration), plan)).toThrow('explore:slider');
});


test('planning round-trips explicit view choices and rejects malformed choices', () => {
  for (const mode of ['2d', '3d'] as const) {
    const planned = lesson();
    planned.plan.scenes[0].view = { mode, rationale: 'Show the relevant geometry clearly.' };
    expect(parsePlannedLesson(JSON.stringify(planned), request)).toEqual(planned);
  }
  for (const view of [{ mode: '4d', rationale: 'Depth' }, { mode: '3d', rationale: '' }, '3d', null]) {
    const planned = lesson();
    Object.assign(planned.plan.scenes[0], { view });
    expect(() => parsePlannedLesson(JSON.stringify(planned), request)).toThrow('view');
  }
});

test('3d plans inspect compiled cameras, including subviews, transitions, and inherited state', async () => {
  const plan = { ...lesson().plan.scenes[0], carry: [], cleanup: [], view: { mode: '3d' as const, rationale: 'Compare spatial orientations.' } };
  for (const source of [
    `export default scene({mode:'3d'},s=>{s.sphere('model');s.wait(1);});`,
    `export default scene({},s=>{s.view('model',{rect:[0,0,1,1]},v=>v.sphere('ball'));s.wait(1);});`,
    `export default scene({},s=>{s.sphere('model');s.play(s.camera.to3D(),{duration:1});s.play(s.camera.to2D(),{duration:1});});`,
    `export default scene({},s=>{s.sphere('model');s.play(s.camera.animate({yaw:0.4}),{duration:1});});`,
  ]) {
    const compiled = await compileSource(source);
    expect(() => validateScenePlan(compiled, evaluateScene(compiled, compiled.duration), plan)).not.toThrow();
  }
  const flat = await compileSource(`export default scene({},s=>{s.text('claim',{text:'mode: 3d, s.camera.to3D()'});s.sphere('model');s.wait(1);});`);
  expect(() => validateScenePlan(flat, evaluateScene(flat, 1), plan)).toThrow('planned 3d view');
  const inheritedFlat = await compileSource(`export default scene({mode:'3d'},s=>{s.sphere('model');s.wait(1);});`, { previous: evaluateScene(flat, 1) });
  expect(() => validateScenePlan(inheritedFlat, evaluateScene(inheritedFlat, 1), plan)).toThrow('planned 3d view');
  const spatial = await compileSource(`export default scene({mode:'3d'},s=>{s.wait(1);});`);
  const inheritedSpatial = await compileSource(`export default scene({},s=>{s.sphere('model');s.wait(1);});`, { previous: evaluateScene(spatial, 1) });
  expect(() => validateScenePlan(inheritedSpatial, evaluateScene(inheritedSpatial, 1), plan)).not.toThrow();
  // Legacy plans remain valid; 2d intentions do not prohibit transitional 3d views.
  expect(() => validateScenePlan(flat, evaluateScene(flat, 1), { ...plan, view: undefined })).not.toThrow();
  expect(() => validateScenePlan(spatial, evaluateScene(spatial, 1), { ...plan, view: { mode: '2d', rationale: 'Return to a flat diagram.' } })).not.toThrow();
});
