import { describe, expect, it } from 'vitest';
import { compileSource, detectOverlaps, detectSceneOverlaps } from '../src/core.js';
import { buildDrawItems } from '../src/render-geometry.js';
import { paletteResolver } from '../src/palette.js';
import type { CameraState, ElementState, Frame, Geometry, OverlapDiagnostic, Vec3 } from '../src/types.js';

const camera: CameraState = { yaw: 0, pitch: 0, target: [0, 0, 0], height: 8, distance: 10, perspective: 0 };
const options = { width: 800, height: 400 };
const element = (id: string, geometry: Geometry, extra: Partial<ElementState> = {}): ElementState => ({
  id, geometry, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, opacity: 1,
  fill: 'none', stroke: 'WHITE', strokeWidth: 0.1, space: 'world', persistent: false, ...extra,
});
const rectangle = (id: string, extra: Partial<ElementState> = {}) => element(id, { kind: 'rectangle', width: 2, height: 2 }, { fill: 'BLUE', stroke: 'none', ...extra });
const frame = (...elements: ElementState[]): Frame => ({ elements, camera, cameraAnimated: false });
const detect = (...elements: ElementState[]) => detectOverlaps(frame(...elements), options);
const pair = (results: OverlapDiagnostic[], a: string, b: string) => results.find(result => result.elements.join(':') === [a, b].sort().join(':'));

describe('projected overlap detection', () => {
  it('detects the equation colliding with a matrix bracket and entry as unacceptable', () => {
    // Screen coordinates reconstruct the arrangement in the first supplied example.
    const bracket = element('price-bracket', { kind: 'path', points: [[-50, 280], [-90, 280], [-90, 20], [-50, 20]] }, { space: 'screen', strokeWidth: 7 });
    const equation = element('equation', { kind: 'latex', tex: 'C=AB', fontSize: 70 }, { space: 'screen', position: [-10, 30, 0], fill: 'GOLD' });
    const entry = element('entry', { kind: 'text', text: '2', fontSize: 68 }, { space: 'screen', position: [30, 70, 0] });
    const results = detectOverlaps(frame(bracket, equation, entry), { width: 870, height: 1100 });
    expect(pair(results, 'equation', 'price-bracket')).toMatchObject({ severity: 'unacceptable', kind: 'text-overlap', contacts: [{ components: ['content', 'stroke'] }] });
    expect(pair(results, 'entry', 'equation')).toMatchObject({ severity: 'unacceptable', kind: 'text-overlap' });
  });

  it('detects the intersecting outline and bracket as undesirable, without flagging contained text', () => {
    const border = element('highlight', { kind: 'rectangle', width: 248, height: 412 }, { space: 'screen', position: [14, 7.5, 0], strokeWidth: 4 });
    const bracket = element('bracket', { kind: 'path', points: [[-74, 79.5], [-118, 79.5], [-118, -210.5], [-74, -210.5]] }, { space: 'screen', strokeWidth: 7 });
    const title = element('shop', { kind: 'text', text: 'Shop 1', fontSize: 50 }, { space: 'screen', position: [14, 160, 0] });
    const results = detectOverlaps(frame(border, bracket, title), { width: 300, height: 459 });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ elements: ['bracket', 'highlight'], severity: 'undesirable', kind: 'shape-overlap', contacts: [{ components: ['stroke', 'stroke'] }] });
  });

  it('returns stable IDs, actual intersection bounds and a point inside the overlap', () => {
    const a = rectangle('a'), b = rectangle('b', { position: [1, 0, 0] });
    const results = detect(b, a);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ elements: ['a', 'b'], bounds: { left: 400, top: 150, right: 450, bottom: 250 },
      elementBounds: [{ left: 350, top: 150, right: 450, bottom: 250 }, { left: 400, top: 150, right: 500, bottom: 250 }] });
    const [x, y] = results[0].contacts[0].witness;
    expect(x).toBeGreaterThan(400); expect(x).toBeLessThan(450);
    expect(y).toBeGreaterThan(150); expect(y).toBeLessThan(250);
    expect(detect(a, b)).toEqual(results);
    expect(JSON.parse(JSON.stringify(results))).toEqual(results);
  });

  it('does not confuse containment, edge contact, or overlapping bounding boxes with ink overlap', () => {
    const border = element('border', { kind: 'rectangle', width: 4, height: 4 });
    expect(detect(border, rectangle('inside'))).toEqual([]);
    expect(detect(rectangle('a'), rectangle('b', { position: [2, 0, 0] }))).toEqual([]);
    const diagonal = element('a', { kind: 'line', points: [[-1, -1], [1, 1]] });
    const parallel = element('b', diagonal.geometry, { position: [0, 0.4, 0] });
    expect(detect(diagonal, parallel)).toEqual([]);
    expect(detect(diagonal, element('crossing', { kind: 'line', points: [[-1, 1], [1, -1]] }))).toHaveLength(1);
  });

  it('preserves glyph holes instead of using text bounding rectangles', () => {
    const glyph = element('glyph', { kind: 'text', text: 'O', fontSize: 2 });
    const dot = element('dot', { kind: 'circle', radius: 0.1 }, { fill: 'RED', stroke: 'none' });
    expect(detect(glyph, dot)).toEqual([]);
    expect(detect(glyph, { ...dot, position: [0.65, 0, 0] })).toHaveLength(1);
  });

  it('applies nested group scale, rotation, translation, offsets, and inherited opacity', () => {
    const child = rectangle('child', { position: [1, 0, 0], viewportOffset: [0.05, 0] });
    const inner = element('inner', { kind: 'group', children: ['child'] }, { scale: 0.5 });
    const outer = element('outer', { kind: 'group', children: ['inner'], isolated: true }, { position: [-2, 0, 0], rotation: [0, 0, Math.PI / 2], viewportOffset: [0.05, 0] });
    const target = rectangle('target', { position: [-0.4, 0.5, 0] });
    const state = frame(child, inner, outer, target), before = structuredClone(state);
    expect(detectOverlaps(state, options)[0].elementBounds[0]).toMatchObject({ left: expect.closeTo(355, 4), right: expect.closeTo(405, 4), top: 150, bottom: 200 });
    expect(state).toEqual(before);
    outer.opacity = 0.005;
    expect(detectOverlaps(state, options)).toEqual([]);
    expect(detectOverlaps(state, { ...options, minOpacity: 0 })).toHaveLength(1);
  });

  it('allows intentional pairs in either order and via group IDs, preserving other collisions', () => {
    const elements = [rectangle('a'), rectangle('b'), rectangle('c'), element('group', { kind: 'group', children: ['a', 'b'] })];
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['b', 'a']] }).map(o => o.elements)).toEqual([['a', 'c'], ['b', 'c']]);
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['c', 'group']] }).map(o => o.elements)).toEqual([['a', 'b']]);
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['group', 'group']] }).map(o => o.elements)).toEqual([['a', 'c'], ['b', 'c']]);
  });

  it('skips zero scales, zero opacity, transparent paint, and off-canvas intersections', () => {
    for (const extra of [{ opacity: 0 }, { scale: 0 }, { fill: 'none' as const }, { fill: { color: 'BLUE' as const, opacity: 0.001 } }]) {
      expect(detect(rectangle('a'), rectangle('b', extra))).toEqual([]);
    }
    expect(detect(rectangle('a', { position: [20, 0, 0] }), rectangle('b', { position: [20, 0, 0] }))).toEqual([]);
    const a = rectangle('a', { position: [8, 0, 0] }), b = rectangle('b', { position: [8, 0, 0] });
    expect(detect(a, b)[0].bounds).toEqual({ left: 750, top: 150, right: 800, bottom: 250 });
  });

  it('projects perspective, camera targets, screen labels, and billboard offsets', () => {
    const view = { ...camera, perspective: 1, target: [1, 0, 0] as Vec3 };
    const a = rectangle('world', { position: [1, 0, 5] });
    const b = rectangle('screen', { space: 'screen', geometry: { kind: 'rectangle', width: 20, height: 20 } });
    expect(detectOverlaps({ ...frame(a, b), camera: view }, options)[0].elementBounds).toEqual([
      { left: 390, top: 190, right: 410, bottom: 210 }, { left: 300, top: 100, right: 500, bottom: 300 },
    ]);
    const billboard = element('billboard', { kind: 'text', text: 'x', fontSize: 1 }, { billboard: true, billboardOffset: [0, 0, 0], position: [1, 0, 0] });
    const orbited = { ...view, yaw: Math.PI / 2 };
    expect(detectOverlaps({ ...frame(billboard, b), camera: orbited }, options)).toHaveLength(1);
    billboard.billboardOffset = [2, 0, 0];
    expect(detectOverlaps({ ...frame(billboard, b), camera: orbited }, options)).toEqual([]);
  });

  it('rejects geometry behind the camera and clips triangles crossing the near plane', () => {
    const a = rectangle('a', { position: [0, 0, 11] }), b = rectangle('b');
    expect(detectOverlaps({ ...frame(a, b), camera: { ...camera, perspective: 1 } }, options)).toEqual([]);
    const crossing = element('crossing', { kind: 'mesh', vertices: [[-1, -1, 9], [1, -1, 9], [0, 2, 11]], triangles: [[0, 1, 2]] }, { fill: 'RED', stroke: 'none' });
    expect(detectOverlaps({ ...frame(crossing, b), camera: { ...camera, perspective: 1 } }, options)).toHaveLength(1);
  });

  it('clips regional views and compares them in common canvas coordinates', () => {
    const a = rectangle('a', { view: 'left' }), b = rectangle('b', { view: 'right' });
    const state: Frame = { ...frame(a, b), views: [
      { id: 'left', rect: [0, 0, 0.5, 1], camera, orbit: false, cameraAnimated: false },
      { id: 'right', rect: [0.5, 0, 0.5, 1], camera, orbit: false, cameraAnimated: false },
    ] };
    expect(detectOverlaps(state, options)).toEqual([]);
    const label = rectangle('overlay', { space: 'screen', position: [-200, 0, 0], geometry: { kind: 'rectangle', width: 20, height: 20 } });
    state.elements.push(label);
    expect(detectOverlaps(state, options).map(o => o.elements)).toEqual([['a', 'overlay']]);
    a.position = [6, 0, 0]; // Entirely outside the left view, even though globally in the right view.
    label.position = [100, 0, 0];
    expect(detectOverlaps(state, options)).toEqual([]);
  });

  it('uses the rendered morph geometry, including arrow heads and round strokes', () => {
    const shape = rectangle('shape', { geometry: { kind: 'rectangle', width: 0.2, height: 0.2 },
      morph: { from: { kind: 'rectangle', width: 0.2, height: 0.2 }, to: { kind: 'rectangle', width: 4, height: 2 }, progress: 0.5 } });
    const target = rectangle('target', { position: [1.5, 0, 0], geometry: { kind: 'rectangle', width: 1, height: 1 } });
    expect(detect(shape, target)).toHaveLength(1);
    shape.morph!.progress = 0;
    expect(detect(shape, target)).toEqual([]);
    for (const strokeProfile of ['flat', 'round'] as const) {
      const arrow = element('arrow', { kind: 'arrow', points: [[-2, 0], [2, 0]] }, { strokeWidth: 0.2, strokeProfile });
      const headTarget = rectangle('target', { position: [1.3, 0.19, 0], geometry: { kind: 'rectangle', width: 0.1, height: 0.1 } });
      expect(detect(arrow, headTarget)).toHaveLength(1);
    }
  });

  it('uses current text and LaTeX morphs and effective paint opacity', () => {
    const a = element('a', { kind: 'text', text: 'A', fontSize: 2 });
    const b = element('b', { kind: 'text', text: 'A', fontSize: 2 });
    expect(detect(a, b)[0].severity).toBe('unacceptable');
    a.morph = { from: a.geometry, to: { kind: 'text', text: ' ' }, progress: 0.999 };
    expect(detect(a, b)).toEqual([]);
    a.morph = { from: { kind: 'latex', tex: '\\animpart{x}{x}', fontSize: 2 }, to: { kind: 'latex', tex: '\\animpart{x}{x}', fontSize: 2 }, progress: 0.5, map: { x: 'x' } };
    b.geometry = { kind: 'latex', tex: 'x', fontSize: 2 };
    expect(detect(a, b)[0].contacts[0].components).toEqual(['content', 'content']);
    a.fill = { color: 'WHITE', opacity: 0.001 };
    expect(detect(a, b)).toEqual([]);
  });

  it('validates projection and opacity options', () => {
    for (const width of [0, -1, Infinity, NaN]) expect(() => detectOverlaps(frame(), { ...options, width })).toThrow('width and height');
    for (const minOpacity of [-1, 2, NaN]) expect(() => detectOverlaps(frame(), { ...options, minOpacity })).toThrow('minOpacity');
  });
});

describe('animation overlap sampling', () => {
  it('finds a collision during motion with clear start and end frames, without modifying the scene', async () => {
    const scene = await compileSource(`export default scene({}, s => {
      s.rectangle('fixed', {width:1,height:1,fill:Color.BLUE,stroke:Color.NONE});
      const moving = s.rectangle('moving', {width:1,height:1,position:[-3,0],fill:Color.RED,stroke:Color.NONE});
      s.play(moving.moveTo([3,0]), {duration:2,ease:'linear'});
    });`);
    const before = structuredClone(scene);
    const results = detectSceneOverlaps(scene, { ...options, sampleRate: 4 });
    expect(results.map(r => r.time)).toEqual([0.75, 1, 1.25]);
    expect(results[1].overlaps[0].elements).toEqual(['fixed', 'moving']);
    expect(scene).toEqual(before);
    expect(detectSceneOverlaps(scene, { ...options, times: [2, 1, 0, 1] })).toEqual([results[1]]);
  });

  it('includes nonuniform lifecycle and track boundaries and respects removal', async () => {
    const scene = await compileSource(`export default scene({}, s => {
      s.rectangle('a', {fill:Color.BLUE}); s.wait(0.123);
      const b = s.rectangle('b', {fill:Color.RED});
      s.play(b.fadeOut(), {duration:0.234}); s.remove(b); s.wait(0.5);
    });`);
    const results = detectSceneOverlaps(scene, { ...options, sampleRate: 1 });
    expect(results.map(r => r.time)).toEqual([0.123]);
    expect(detectSceneOverlaps(scene, { ...options, times: [scene.duration] })).toEqual([]);
  });

  it('handles zero-duration scenes and rejects invalid sample times and rates', async () => {
    const scene = await compileSource(`export default scene({}, s => { s.rectangle('a'); s.rectangle('b'); });`);
    expect(detectSceneOverlaps(scene, options).map(r => r.time)).toEqual([0]);
    expect(detectSceneOverlaps(scene, { ...options, times: [] })).toEqual([]);
    for (const sampleRate of [0, -1, NaN, Infinity]) expect(() => detectSceneOverlaps(scene, { ...options, sampleRate })).toThrow('sampleRate');
    for (const time of [-1, 1, NaN, Infinity]) expect(() => detectSceneOverlaps(scene, { ...options, times: [time] })).toThrow('sample times');
    expect(() => detectSceneOverlaps({ ...scene, duration: 1 }, { ...options, sampleRate: 1e308 })).toThrow('at most 100000');
    expect(() => detectSceneOverlaps({ ...scene, duration: NaN }, options)).toThrow('Scene duration');
  });
});

it('exposes the same transformed triangles used for rendering, without browser globals', () => {
  const a = rectangle('a', { position: [1, 2, 0] });
  const items = buildDrawItems(frame(a), camera, options.width, options.height, paletteResolver());
  expect(items[0]).toMatchObject({ elementId: 'a', component: 'fill' });
  expect(Array.from(items[0].vertices.slice(0, 3))).toEqual([2, 3, 0]);
});
