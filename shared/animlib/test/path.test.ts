import { describe, expect, it } from 'vitest';
import { compileSource } from '../src/compiler.js';
import { outline, morphOutline } from '../src/geometry.js';
import { pathContours, morphPathContours } from '../src/path.js';
import { buildDrawItems, triangulateContours } from '../src/render-geometry.js';
import { paletteResolver } from '../src/palette.js';
import { evaluateScene } from '../src/timeline.js';
import { SceneSequence } from '../src/sequence.js';
import { plantSource } from '../demo/plant.js';
import type { Geometry, Vec3 } from '../src/types.js';

const path = (d: string): Geometry => ({ kind: 'path', d });
const area = (triangles: Vec3[]) => {
  let sum = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = triangles.slice(i, i + 3);
    sum += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  }
  return sum;
};

describe('curved paths', () => {
  it('flattens cubic curves to geometric tolerance while preserving endpoints', () => {
    const geometry = path('M0 0 C0 1 1 1 1 0');
    const coarse = outline(geometry, 0.1)!, fine = outline(geometry, 0.001)!;
    expect(fine.closed).toBe(false);
    expect(fine.points.length).toBeGreaterThan(coarse.points.length);
    expect(fine.points[0]).toEqual([0, 0, 0]);
    expect(fine.points.at(-1)).toEqual([1, 0, 0]);
    expect(fine.points).toContainEqual([0.5, 0.75, 0]);
    // Compare an independently evaluated analytic curve to the flattened outline.
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, x = 3 * (1 - t) * t * t + t ** 3, y = 3 * (1 - t) * t;
      let distance = Infinity;
      for (let j = 1; j < fine.points.length; j++) {
        const a = fine.points[j - 1], b = fine.points[j], dx = b[0] - a[0], dy = b[1] - a[1];
        const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
        distance = Math.min(distance, Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy));
      }
      expect(distance).toBeLessThan(0.001);
    }
  });

  it('normalizes relative commands, quadratic curves, smooth controls and elliptical arcs', () => {
    const contours = pathContours(path('m0 0 q1 2 2 0 t2 0 h1 v1 a1 1 0 0 1 2 0 z'));
    expect(contours).toHaveLength(1);
    expect(contours[0].closed).toBe(true);
    for (const point of [[2, 0, 0], [4, 0, 0], [5, 0, 0], [5, 1, 0], [7, 1, 0]]) {
      expect(contours[0].points).toContainEqual(point);
    }
    expect(contours[0].points.every(p => p.every(Number.isFinite))).toBe(true);
    expect(contours[0].points.at(-1)).toEqual([0, 0, 0]);
  });

  it('preserves independent closed contours and holes, with open subpaths left unfilled', () => {
    const contours = pathContours(path('M-2 -2H2V2H-2Z M-1 -1H1V1H-1Z M3 0C3 2 4 2 4 0'));
    expect(contours.map(c => c.closed)).toEqual([true, true, false]);
    expect(area(triangulateContours(contours.filter(c => c.closed).map(c => c.points)))).toBeCloseTo(12);
    expect(outline(path('M0 0L1 0 M2 0L3 0'))).toBeNull();
  });

  it('handles zero-radius and coincident-endpoint arcs without invalid geometry', () => {
    expect(outline(path('M0 0A0 1 0 0 0 2 1'))!.points).toEqual([[0, 0, 0], [2, 1, 0]]);
    const shape = outline(path('M0 0A1 1 0 0 0 0 0L2 0'))!;
    expect(shape.points.every(p => p.every(Number.isFinite))).toBe(true);
    expect(shape.points.at(-1)).toEqual([2, 0, 0]);
  });

  it('bends a straight cubic using its authored controls rather than outline matching', () => {
    const from = path('M0 0C0 0 2 0 2 0');
    const to = path('M0 0C0 2 2 2 2 0');
    const middle = morphPathContours(from, to, 0.5);
    expect(middle).toEqual(pathContours(path('M0 0C0 1 2 1 2 0')));
  });

  it('smooths through every authored point and closes with a continuous tangent', () => {
    const points: Vec3[] = [[-1, 0, 0], [0, 1, 0], [1, 0, 0], [0, -1, 0]];
    const geometry: Geometry = { kind: 'path', points, curve: 'smooth', closed: true };
    const shape = outline(geometry, 0.00001)!;
    for (const point of points) expect(shape.points).toContainEqual(point);
    expect(shape.points.at(-1)).toEqual(points[0]);
    const incoming = shape.points.at(-2)!, outgoing = shape.points[1];
    const before = points[0].map((v, i) => v - incoming[i]), after = outgoing.map((v, i) => v - points[0][i]);
    expect(before.reduce((s, v, i) => s + v * after[i], 0) / Math.hypot(...before) / Math.hypot(...after)).toBeGreaterThan(0.999);
    expect(outline({ ...geometry, points: [...points, points[0]] })).toEqual(outline(geometry));
    const open = outline({ ...geometry, closed: false })!;
    expect(open.points[0]).toEqual(points[0]); expect(open.points.at(-1)).toEqual(points.at(-1));
  });

  it('retains legacy straight paths and bounds tessellation at extreme zoom', () => {
    expect(outline({ kind: 'path', points: [[0, 0], [1, 1], [2, 0]] })).toEqual({ points: [[0, 0, 0], [1, 1, 0], [2, 0, 0]], closed: false });
    const points = pathContours(path('M0 0C0 100 100 100 100 0'), 1e-20)[0].points;
    expect(points.length).toBeLessThanOrEqual(4097);
    expect(points.at(-1)).toEqual([100, 0, 0]);
  });

  it('interpolates compatible Bézier control points, including compound paths', () => {
    const from = path('M0 0C0 1 1 1 1 0Z M.4 .1L.6 .1L.5 .2Z');
    const to = path('M0 0C0 3 1 3 1 0Z M.4 .3L.6 .3L.5 .6Z');
    const middle = path('M0 0C0 2 1 2 1 0Z M.4 .2L.6 .2L.5 .4Z');
    const actual = morphPathContours(from, to, 0.5)!;
    const expected = pathContours(middle);
    expect(actual.map(c => c.closed)).toEqual([true, true]);
    actual.forEach((c, i) => {
      expect(c.points).toHaveLength(expected[i].points.length);
      c.points.forEach((p, j) => p.forEach((v, k) => expect(v).toBeCloseTo(expected[i].points[j][k], 12)));
    });
    expect(morphPathContours(from, to, 0)).toEqual(pathContours(from));
    expect(morphPathContours(from, to, 1)).toEqual(pathContours(to));
    expect(morphPathContours(from, from, 0.3)).toEqual(pathContours(from));
    expect(morphPathContours(from, path('M0 0L1 1'), 0.5)).toBeNull();
  });

  it('morphs smooth point paths by their authored point correspondence', () => {
    const from: Geometry = { kind: 'path', curve: 'smooth', points: [[0, 0], [1, 1], [2, 0]] };
    const to: Geometry = { ...from, points: [[0, 0], [1, 3], [2, 0]] };
    const expected = outline({ ...from, points: [[0, 0], [1, 2], [2, 0]] });
    const actual = morphOutline(from, to, 0.5)!;
    expect(actual.closed).toBe(expected!.closed);
    expect(actual.points).toHaveLength(expected!.points.length);
    actual.points.forEach((p, i) => p.forEach((v, k) => expect(v).toBeCloseTo(expected!.points[i][k], 12)));
    expect(morphOutline(path('M0 0C0 1 1 1 1 0Z'), { kind: 'circle', radius: 1 }, 0.5)?.closed).toBe(true);
  });
});

describe('compiled curved scenes', () => {
  it.each([
    { d: '' }, { d: 'M0 0' }, { d: 'L1 2' }, { d: 'M0 0C1 2' },
    { d: 'M0 0L1e999 1' }, { d: 'M1000000 0l1 0' }, { d: 'M0 0L1 1', points: [[0, 0], [1, 1]] },
    { d: 'M0 0L1 1', closed: true }, { d: 'M0 0L1 1', curve: 'smooth' },
    { points: [[0, 0], [1, 1]], curve: 'banana' }, { points: [[0, 0], [1, 1]], closed: 'yes' },
    { points: [[0, 0], [1, 1]], curve: 'smooth', closed: true },
  ])('rejects malformed or ambiguous paths: %j', async props => {
    await expect(compileSource(`export default scene({},s=>s.path('bad',${JSON.stringify(props)}));`)).rejects.toThrow();
  });

  it('validates morph destinations and prevents curved fields on other geometry', async () => {
    await expect(compileSource(`export default scene({},s=>{
      const p=s.path('p',{d:'M0 0L1 1'});s.play(p.morphTo({kind:'path',d:'M0 0Q1'}),{duration:1});
    });`)).rejects.toThrow();
    await expect(compileSource(`export default scene({},s=>s.rectangle('p',{d:'M0 0L1 1'}));`)).rejects.toThrow('Only paths');
  });

  it('renders holes and strokes through production geometry preparation', async () => {
    const scene = await compileSource(`export default scene({},s=>{
      s.path('ring',{d:'M-2 -2H2V2H-2Z M-1 -1H1V1H-1Z',fill:Color.GREEN,stroke:Color.WHITE});
      s.path('open',{d:'M3 0C3 2 4 2 4 0',fill:Color.RED,stroke:Color.WHITE});
    });`);
    const frame = evaluateScene(scene, 0);
    const items = buildDrawItems(frame, frame.camera, 800, 800, paletteResolver());
    const fill = items.filter(i => i.elementId === 'ring' && i.component === 'fill');
    const triangles: Vec3[] = fill.flatMap(item => Array.from({ length: item.vertices.length / 15 }, (_, i) => Array.from(item.vertices.subarray(i * 15, i * 15 + 3)) as Vec3));
    expect(area(triangles)).toBeCloseTo(12);
    expect(items.filter(i => i.elementId === 'ring' && i.component === 'stroke')).toHaveLength(2);
    expect(items.some(i => i.elementId === 'open' && i.component === 'fill')).toBe(false);
    expect(items.some(i => i.elementId === 'open' && i.component === 'stroke')).toBe(true);
  });

  it('seeks Bézier morphs deterministically and carries path data across scenes', async () => {
    const sequence = new SceneSequence();
    const result = await sequence.submit({ type: 'load', scenes: [
      { id: 'a', source: `export default scene({},s=>{
        const p=s.path('p',{d:'M0 0C0 1 1 1 1 0Z'});
        s.play(p.morphTo({kind:'path',d:'M0 0C0 3 1 3 1 0Z'}),{duration:2,ease:'linear'});s.keep(p);
      });` },
      { id: 'b', source: `export default scene({},s=>s.wait(1));` },
    ] });
    expect(result.ok).toBe(true);
    const middle = sequence.frame(0, 1);
    const draw = () => buildDrawItems(sequence.frame(0, 1), middle.camera, 800, 800, paletteResolver());
    const vertices = draw();
    expect(sequence.frame(1, 0).elements[0].geometry.d).toBe('M0 0C0 3 1 3 1 0Z');
    sequence.frame(0, 2);
    expect(sequence.frame(0, 1)).toEqual(middle);
    expect(draw()).toEqual(vertices);
  });

  it('compiles and renders the plant growth and bend demo at arbitrary times', async () => {
    const scene = await compileSource(plantSource.source);
    for (const time of [0, 1.2, 3.1, 5.5, 6.8, scene.duration]) {
      const frame = evaluateScene(scene, time);
      const items = buildDrawItems(frame, frame.camera, 920, 840, paletteResolver());
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.vertices.every(Number.isFinite))).toBe(true);
    }
    const end = evaluateScene(scene, scene.duration);
    expect(end.elements.filter(e => e.id.endsWith('-blade'))).toHaveLength(3);
    expect(end.elements.find(e => e.id === 'lower-leaf')?.scale).toBe(1);
  });
});
