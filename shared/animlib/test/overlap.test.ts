import { describe, expect, it } from 'vitest';
import { compileSource, detectOverlaps, detectSceneOverlaps } from '../src/core.js';
import type { CameraState, ElementState, Frame, Geometry, Vec3 } from '../src/types.js';

const camera: CameraState = { yaw: 0, pitch: 0, target: [0, 0, 0], height: 8, distance: 10, perspective: 0 };
const options = { width: 800, height: 400 };
const element = (id: string, geometry: Geometry, extra: Partial<ElementState> = {}): ElementState => ({
  id, geometry, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, opacity: 1,
  fill: 'WHITE', stroke: 'none', strokeWidth: 0.1, space: 'world', persistent: false, ...extra,
});
const label = (id: string, extra: Partial<ElementState> = {}) => element(id, { kind: 'text', text: 'H', fontSize: 2 }, extra);
const formula = (id: string, tex: string, fontSize = 2) => element(id, { kind: 'latex', tex, fontSize });
const frame = (...elements: ElementState[]): Frame => ({ elements, camera, cameraAnimated: false });
const detect = (...elements: ElementState[]) => detectOverlaps(frame(...elements), options);

// Generic text relationships: no illustration-specific rules or exclusions.
describe('text overlap detection', () => {
  it.each(['text', 'latex'] as const)('detects %s against both text and LaTeX', kind => {
    const a = kind === 'text' ? label('a') : formula('a', 'H');
    for (const b of [label('b'), formula('b', 'H')]) {
      expect(detect(a, b)).toMatchObject([{ elements: ['a', 'b'], severity: 'unacceptable', kind: 'text-overlap' }]);
      b.position = [3, 0, 0];
      expect(detect(a, b)).toEqual([]);
    }
  });

  it('ignores all non-text shapes, including text crossing filled shapes or borders', () => {
    const geometries: Geometry[] = [
      { kind: 'rectangle', width: 4, height: 4 }, { kind: 'circle', radius: 2 }, { kind: 'sphere', radius: 2 },
      { kind: 'line', points: [[-2, 0], [2, 0]] }, { kind: 'arrow', points: [[-2, 0], [2, 0]] },
      { kind: 'path', points: [[-2, -2], [2, 2], [-2, 2]], closed: true },
      { kind: 'mesh', vertices: [[-2, -2], [2, -2], [0, 2]], triangles: [[0, 1, 2]] },
    ];
    const shapes = geometries.map((g, i) => element(`shape-${i}`, g, { fill: 'BLACK', stroke: 'GREEN' }));
    expect(detect(...shapes, label('a'))).toEqual([]);
    expect(detect(...shapes, formula('a', 'H'))).toEqual([]);
    expect(detect(...shapes, label('a'), label('b')).map(o => o.elements)).toEqual([['a', 'b']]);
  });

  it('does not compare glyphs or named parts inside a single text or formula element', () => {
    expect(detect(label('word', { geometry: { kind: 'text', text: 'Text', fontSize: 2 } }))).toEqual([]);
    expect(detect(formula('equation', String.raw`\frac{\animpart{top}{x}}{\animpart{bottom}{y}}`))).toEqual([]);
    // Even overlapping old/new glyphs during a morph belong to one element.
    const a = label('a', { morph: { from: { kind: 'text', text: 'H', fontSize: 2 }, to: { kind: 'text', text: 'X', fontSize: 2 }, progress: 0.5 } });
    expect(detect(a)).toEqual([]);
  });

  it('checks distinct text elements in the same group, including during crossfades', () => {
    const a = label('a', { opacity: 0.5 }), b = label('b', { opacity: 0.5 });
    const group = element('group', { kind: 'group', children: ['a', 'b'], isolated: true });
    expect(detect(a, b, group)).toMatchObject([{ elements: ['a', 'b'] }]);
  });

  it('returns deterministic pairs, intersection bounds, and a witness inside the overlap', () => {
    const a = label('a'), b = label('b', { position: [0.1, 0, 0] });
    const results = detect(b, a);
    expect(results).toHaveLength(1);
    expect(detect(a, b)).toEqual(results);
    expect(JSON.parse(JSON.stringify(results))).toEqual(results);
    const { bounds, witness: [x, y], elementBounds } = results[0];
    expect(bounds.right).toBeGreaterThan(bounds.left);
    expect(bounds.bottom).toBeGreaterThan(bounds.top);
    for (const box of [bounds, ...elementBounds]) {
      expect(x).toBeGreaterThan(box.left); expect(x).toBeLessThan(box.right);
      expect(y).toBeGreaterThan(box.top); expect(y).toBeLessThan(box.bottom);
    }
    expect(bounds.left).toBeGreaterThanOrEqual(Math.max(...elementBounds.map(b => b.left)));
    expect(bounds.right).toBeLessThanOrEqual(Math.min(...elementBounds.map(b => b.right)));
  });

  it('preserves empty glyph holes and avoids collisions from bounding boxes alone', () => {
    const glyph = label('ring', { geometry: { kind: 'text', text: 'O', fontSize: 2 } });
    const dot = label('dot', { geometry: { kind: 'text', text: '.', fontSize: 0.15 } });
    expect(detect(glyph, dot)).toEqual([]);
    expect(detect(glyph, { ...dot, position: [0.65, 0, 0] })).toHaveLength(1);
    const slash = label('a', { geometry: { kind: 'text', text: '/', fontSize: 2 } });
    expect(detect(slash, { ...slash, id: 'b', position: [0, 0.5, 0] })).toEqual([]);
    expect(detect(slash, { ...slash, id: 'b', position: [0, 0.02, 0] })).toHaveLength(1);
  });

  it('applies nested group transforms and viewport offsets without modifying the frame', () => {
    const child = label('child', { position: [1, 0, 0], viewportOffset: [0.05, 0] });
    const inner = element('inner', { kind: 'group', children: ['child'] }, { scale: 0.5 });
    const outer = element('outer', { kind: 'group', children: ['inner'], isolated: true }, { position: [-2, 0, 0], rotation: [0, 0, Math.PI / 2], viewportOffset: [0.05, 0] });
    const target = label('target', { position: [-0.4, 0.5, 0], scale: 0.5, rotation: [0, 0, Math.PI / 2] });
    const state = frame(child, inner, outer, target), before = structuredClone(state);
    const results = detectOverlaps(state, options);
    expect(results).toHaveLength(1);
    for (const key of ['left', 'right', 'top', 'bottom'] as const) {
      expect(results[0].elementBounds[0][key]).toBeCloseTo(results[0].elementBounds[1][key], 4);
    }
    expect(state).toEqual(before);
    outer.opacity = 0.005;
    expect(detectOverlaps(state, options)).toEqual([]);
    expect(detectOverlaps(state, { ...options, minOpacity: 0 })).toHaveLength(1);
  });

  it('supports explicit intentional text pairs and group exclusions without hiding other pairs', () => {
    const elements = [label('a'), label('b'), label('c'), element('group', { kind: 'group', children: ['a', 'b'] })];
    expect(detect(...elements)).toHaveLength(3);
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['b', 'a']] }).map(o => o.elements)).toEqual([['a', 'c'], ['b', 'c']]);
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['c', 'group']] }).map(o => o.elements)).toEqual([['a', 'b']]);
    expect(detectOverlaps(frame(...elements), { ...options, ignorePairs: [['group', 'group']] }).map(o => o.elements)).toEqual([['a', 'c'], ['b', 'c']]);
  });

  it('skips zero scale, transparent, blank, and off-canvas text', () => {
    for (const extra of [{ opacity: 0 }, { scale: 0 }, { fill: 'none' as const }, { fill: { color: 'WHITE' as const, opacity: 0.001 } }, { geometry: { kind: 'text' as const, text: ' ' } }]) {
      expect(detect(label('a'), label('b', extra))).toEqual([]);
    }
    expect(detect(label('a', { position: [20, 0, 0] }), label('b', { position: [20, 0, 0] }))).toEqual([]);
    const results = detect(label('a', { position: [8, 0, 0] }), label('b', { position: [8, 0, 0] }));
    expect(results).toHaveLength(1);
    expect(results[0].bounds.right).toBe(options.width);
    expect(results[0].bounds.left).toBeLessThan(options.width);
  });

  it('projects perspective, camera targets, screen labels, and billboard offsets', () => {
    const view = { ...camera, perspective: 1, target: [1, 0, 0] as Vec3 };
    const a = label('world', { position: [1, 0, 5] });
    const b = label('screen', { space: 'screen', geometry: { kind: 'text', text: 'H', fontSize: 200 } });
    const results = detectOverlaps({ ...frame(a, b), camera: view }, options);
    expect(results).toHaveLength(1);
    for (const key of ['left', 'right', 'top', 'bottom'] as const) {
      expect(results[0].elementBounds[0][key]).toBeCloseTo(results[0].elementBounds[1][key], 4);
    }
    const billboard = label('billboard', { billboard: true, position: [1, 0, 0] });
    b.geometry.fontSize = 100;
    const orbited = { ...view, yaw: Math.PI / 2 };
    expect(detectOverlaps({ ...frame(billboard, b), camera: orbited }, options)).toHaveLength(1);
    billboard.billboardOffset = [3, 0, 0];
    expect(detectOverlaps({ ...frame(billboard, b), camera: orbited }, options)).toEqual([]);
  });

  it('rejects text behind the camera while retaining glyphs that cross the near plane', () => {
    const a = label('a', { position: [0, 0, 11] }), b = label('b', { position: [0, 0, 11] });
    const view = { ...camera, perspective: 1 };
    expect(detectOverlaps({ ...frame(a, b), camera: view }, options)).toEqual([]);
    for (const e of [a, b]) { e.position = [0, 0, 9.99]; e.rotation = [0, Math.PI / 3, 0]; e.geometry.fontSize = 0.1; }
    expect(detectOverlaps({ ...frame(a, b), camera: view }, options)).toHaveLength(1);
  });

  it('clips regional views and compares text in common canvas coordinates', () => {
    const a = label('a', { view: 'left' }), b = label('b', { view: 'right' });
    const state: Frame = { ...frame(a, b), views: [
      { id: 'left', rect: [0, 0, 0.5, 1], camera, orbit: false, cameraAnimated: false },
      { id: 'right', rect: [0.5, 0, 0.5, 1], camera, orbit: false, cameraAnimated: false },
    ] };
    expect(detectOverlaps(state, options)).toEqual([]);
    const overlay = label('overlay', { space: 'screen', position: [-200, 0, 0], geometry: { kind: 'text', text: 'H', fontSize: 100 } });
    state.elements.push(overlay);
    expect(detectOverlaps(state, options).map(o => o.elements)).toEqual([['a', 'overlay']]);
    a.position = [6, 0, 0]; // Outside its view, even though globally inside the canvas.
    overlay.position = [100, 0, 0];
    expect(detectOverlaps(state, options)).toEqual([]);
  });

  it('uses current text and mapped LaTeX morph geometry and fade opacity', () => {
    const a = label('a'), b = label('b');
    a.morph = { from: a.geometry, to: { kind: 'text', text: ' ' }, progress: 0.999 };
    expect(detect(a, b)).toEqual([]);
    a.morph = { from: { kind: 'latex', tex: '\\animpart{x}{x}', fontSize: 2 }, to: { kind: 'latex', tex: '\\animpart{x}{x}', fontSize: 2 }, progress: 0.5, map: { x: 'x' } };
    b.geometry = { kind: 'latex', tex: 'x', fontSize: 2 };
    expect(detect(a, b)).toMatchObject([{ elements: ['a', 'b'], kind: 'text-overlap' }]);
    a.fill = { color: 'WHITE', opacity: 0.001 };
    expect(detect(a, b)).toEqual([]);
  });

  it('checks only the text portion of shape/text morphs in either direction', () => {
    const text: Geometry = { kind: 'text', text: 'O', fontSize: 2 }, shape: Geometry = { kind: 'rectangle', width: 4, height: 4 };
    const dot = label('dot', { geometry: { kind: 'text', text: '.', fontSize: 0.15 } });
    for (const [from, to] of [[shape, text], [text, shape]]) {
      const a = element('a', from, { morph: { from, to, progress: 0.5 } });
      expect(detect(a, dot)).toEqual([]); // The filled shape covers the dot; the letter's hole does not.
      expect(detect(a, element('b', text))).toHaveLength(1);
      a.morph!.progress = from.kind === 'text' ? 1 : 0;
      expect(detect(a, element('b', text))).toEqual([]);
    }
  });

  it('validates projection and opacity options', () => {
    for (const width of [0, -1, Infinity, NaN]) expect(() => detectOverlaps(frame(), { ...options, width })).toThrow('width and height');
    for (const minOpacity of [-1, 2, NaN]) expect(() => detectOverlaps(frame(), { ...options, minOpacity })).toThrow('minOpacity');
  });
});

describe('animation text overlap sampling', () => {
  it('finds a text collision during motion with clear endpoints without modifying the scene', async () => {
    const scene = await compileSource(`export default scene({}, s => {
      s.text('fixed', {text:'H',fontSize:2});
      const moving = s.text('moving', {text:'H',fontSize:2,position:[-3,0]});
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
      s.text('a', {text:'H'}); s.wait(0.123);
      const b = s.text('b', {text:'H'});
      s.play(b.fadeOut(), {duration:0.234}); s.remove(b); s.wait(0.5);
    });`);
    const results = detectSceneOverlaps(scene, { ...options, sampleRate: 1 });
    expect(results.map(r => r.time)).toEqual([0.123]);
    expect(detectSceneOverlaps(scene, { ...options, times: [scene.duration] })).toEqual([]);
  });

  it('ignores animated shapes and text crossing a shape throughout a scene', async () => {
    const scene = await compileSource(`export default scene({}, s => {
      s.text('label', {text:'H'});
      s.rectangle('a', {width:4,height:4,fill:Color.BLUE});
      const b = s.circle('b', {radius:1,fill:Color.RED});
      s.play(b.moveTo([2,0]), {duration:1});
    });`);
    expect(detectSceneOverlaps(scene, options)).toEqual([]);
  });

  it('handles zero-duration scenes and rejects invalid sample times and rates', async () => {
    const scene = await compileSource(`export default scene({}, s => { s.text('a',{text:'H'}); s.text('b',{text:'H'}); });`);
    expect(detectSceneOverlaps(scene, options).map(r => r.time)).toEqual([0]);
    expect(detectSceneOverlaps(scene, { ...options, times: [] })).toEqual([]);
    for (const sampleRate of [0, -1, NaN, Infinity]) expect(() => detectSceneOverlaps(scene, { ...options, sampleRate })).toThrow('sampleRate');
    for (const time of [-1, 1, NaN, Infinity]) expect(() => detectSceneOverlaps(scene, { ...options, times: [time] })).toThrow('sample times');
    expect(() => detectSceneOverlaps({ ...scene, duration: 1 }, { ...options, sampleRate: 1e308 })).toThrow('at most 100000');
    expect(() => detectSceneOverlaps({ ...scene, duration: NaN }, options)).toThrow('Scene duration');
  });
});
