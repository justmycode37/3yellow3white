import { describe, expect, it } from 'vitest';
import { compileSource } from '../src/compiler.js';
import { rotate } from '../src/geometry.js';
import { meshTriangles } from '../src/mesh-shading.js';
import { paletteResolver } from '../src/palette.js';
import { buildDrawItems } from '../src/render-geometry.js';
import type { ElementState, Geometry, Vec3 } from '../src/types.js';

const camera = { yaw: 0, pitch: 0, target: [0, 0, 0] as Vec3, height: 8, distance: 10, perspective: 0 };
const triangle = (): Geometry => ({ kind: 'mesh', vertices: [[0, 0, 0], [2, 0, 0], [0, 2, 0]], triangles: [[0, 1, 2]] });
const state = (geometry: Geometry, extra: Partial<ElementState> = {}): ElementState => ({
  id: 'mesh', geometry, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1,
  fill: 'WHITE', stroke: 'none', strokeWidth: 0, opacity: 1, persistent: false, space: 'world', ...extra,
});
const render = (elements: ElementState[], view = camera) => buildDrawItems({ elements, camera: view, cameraAnimated: false }, view, 800, 600, paletteResolver());
const normalAt = (vertices: Float32Array, index = 0): Vec3 => Array.from(vertices.subarray(index * 15 + 8, index * 15 + 11)) as Vec3;
const expectVector = (actual: Vec3, expected: Vec3) => expected.forEach((value, axis) => expect(actual[axis]).toBeCloseTo(value, 6));

describe('mesh shading', () => {
  it('preserves unlit mesh defaults and batches opaque fills', () => {
    const geometry: Geometry = { ...triangle(), vertices: [[0, 0], [2, 0], [0, 2], [2, 2]], triangles: [[0, 1, 2], [1, 3, 2]] };
    expect(meshTriangles(geometry).normals).toBeUndefined();
    const items = render([state(geometry)]);
    expect(items).toHaveLength(1);
    expect(items[0].vertices).toHaveLength(6 * 15);
    for (let i = 11; i < items[0].vertices.length; i += 15) expect(items[0].vertices[i]).toBe(0);
  });

  it('uses counterclockwise unit face normals for flat lighting', () => {
    const geometry: Geometry = { ...triangle(), shading: 'flat', vertices: [[0, 0, 0], [2, 0, 0], [0, 2, 0], [0, 0, 1]], triangles: [[0, 1, 2], [0, 3, 1]] };
    expect(meshTriangles(geometry).normals).toEqual([[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    const item = render([state(geometry)])[0];
    for (let i = 11; i < item.vertices.length; i += 15) expect(item.vertices[i]).toBe(2);
  });

  it('weights smooth normals by face area, sharing indices rather than coordinates', () => {
    const geometry: Geometry = { ...triangle(), shading: 'smooth', vertices: [[0, 0, 0], [2, 0, 0], [0, 2, 0], [0, 0, 1]], triangles: [[0, 1, 2], [0, 3, 1]] };
    const normals = meshTriangles(geometry).normals!;
    expectVector(normals[0], [0, 1 / Math.sqrt(5), 2 / Math.sqrt(5)]);
    expectVector(normals[1], normals[0]);
    expectVector(normals[2], [0, 0, 1]);
    expectVector(normals[4], [0, 1, 0]);
    const split: Geometry = { ...geometry, vertices: [...geometry.vertices!, [0, 0, 0], [2, 0, 0]], triangles: [[0, 1, 2], [4, 3, 5]] };
    expectVector(meshTriangles(split).normals![0], [0, 0, 1]);
  });

  it('normalizes explicit smooth normals and keeps flat geometry authoritative', () => {
    const geometry: Geometry = { ...triangle(), shading: 'smooth', normals: [[0, 4, 0], [0, 4, 0], [0, 4, 0]] };
    expect(meshTriangles(geometry).normals).toEqual([[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    expect(meshTriangles({ ...geometry, shading: 'flat' }).normals).toEqual([[0, 0, 1], [0, 0, 1], [0, 0, 1]]);
  });

  it('handles tiny, degenerate, and opposing faces without nonfinite normals', () => {
    for (const shading of ['flat', 'smooth'] as const) {
      const tiny = meshTriangles({ ...triangle(), shading, vertices: [[0, 0, 0], [1e-12, 0, 0], [0, 1e-12, 0]] });
      expect(tiny.normals).toEqual([[0, 0, 1], [0, 0, 1], [0, 0, 1]]);
      const mesh = meshTriangles({ ...triangle(), shading, triangles: [[0, 0, 1], [0, 1, 2], [2, 1, 0]] });
      for (const normal of mesh.normals!) {
        expect(normal.every(Number.isFinite)).toBe(true);
        expect(Math.hypot(...normal)).toBeCloseTo(1);
      }
      expectVector(mesh.normals![3], [0, 0, 1]);
      expectVector(mesh.normals![6], [0, 0, -1]);
    }
  });

  it('caches cloned geometry by content and owns cached points', () => {
    const geometry: Geometry = { ...triangle(), shading: 'smooth' };
    const original = meshTriangles(geometry);
    expect(meshTriangles(structuredClone(geometry))).toBe(original);
    geometry.vertices![2] = [0, 2, 2];
    const changed = meshTriangles(geometry);
    expect(changed).not.toBe(original);
    expect(original.points[2]).toEqual([0, 2, 0]);
    expectVector(changed.normals![0], [0, -Math.SQRT1_2, Math.SQRT1_2]);
    geometry.vertices![2] = [0, 2, 0];
    expect(meshTriangles(geometry)).toBe(original);
  });

  it('transforms normals through nested rotations independently of position and uniform scale', () => {
    const mesh = state({ ...triangle(), shading: 'smooth' }, { rotation: [0.3, 0.7, -0.4], position: [1e5, -3, 4], scale: 0.001 });
    const parent = state({ kind: 'group', children: ['mesh'] }, { id: 'parent', rotation: [0.4, -0.1, 0.8], scale: 3, position: [7, 5, -2] });
    const grandparent = state({ kind: 'group', children: ['parent'] }, { id: 'grandparent', rotation: [-0.2, 0.6, 0.5], scale: 2 });
    const item = render([mesh, parent, grandparent])[0];
    const expected = rotate(rotate(rotate([0, 0, 1], mesh.rotation), parent.rotation), grandparent.rotation);
    expectVector(normalAt(item.vertices), expected);
    expect(Math.hypot(...normalAt(item.vertices))).toBeCloseTo(1, 6);
  });

  it('uses the billboard orientation for normals as well as vertices', () => {
    const view = { ...camera, yaw: 0.7, pitch: -0.4 };
    const mesh = state({ ...triangle(), shading: 'flat' }, { billboard: true, rotation: [0.3, 0.4, 0.5] });
    const group = state({ kind: 'group', children: ['mesh'] }, { id: 'group', rotation: [1, 0.3, 0.4], scale: 2 });
    expectVector(normalAt(render([mesh, group], view)[0].vertices), rotate([0, 0, 1], [view.pitch, view.yaw, 0]));
  });

  it('recomputes normals from the intermediate shape during morphs', () => {
    const from: Geometry = { ...triangle(), shading: 'smooth' };
    const to: Geometry = { ...from, vertices: [[0, 0, 0], [2, 0, 0], [0, 0, 4]] };
    const mesh = state(to, { morph: { from, to, progress: 0.5 } });
    expectVector(normalAt(render([mesh])[0].vertices), [0, -2 / Math.sqrt(5), 1 / Math.sqrt(5)]);
    expectVector(normalAt(render([{ ...mesh, morph: { from, to, progress: 0 } }])[0].vertices), [0, 0, 1]);
    expectVector(normalAt(render([{ ...mesh, morph: { from, to, progress: 1 } }])[0].vertices), [0, -1, 0]);
  });

  it('preserves custom normals throughout an identity morph', () => {
    const geometry: Geometry = { ...triangle(), shading: 'smooth', normals: [[0, 1, 1], [0, 1, 1], [0, 1, 1]] };
    for (const progress of [0, 0.000001, 0.25, 0.5, 0.999999, 1]) {
      const mesh = state(geometry, { morph: { from: geometry, to: structuredClone(geometry), progress } });
      expectVector(normalAt(render([mesh])[0].vertices), [0, Math.SQRT1_2, Math.SQRT1_2]);
    }
  });

  it('interpolates normalized endpoint normals and derives a missing endpoint', () => {
    const custom = (normal: Vec3): Geometry => ({ ...triangle(), shading: 'smooth', normals: [normal, normal, normal] });
    const derived: Geometry = { ...triangle(), shading: 'smooth' };
    for (const [from, to, a, b] of [
      [custom([0, 4, 0]), custom([0, 0, 2]), [0, 1, 0], [0, 0, 1]],
      [custom([0, 4, 0]), derived, [0, 1, 0], [0, 0, 1]],
      [derived, custom([0, 4, 0]), [0, 0, 1], [0, 1, 0]],
    ] as [Geometry, Geometry, Vec3, Vec3][]) {
      for (const progress of [0, 0.000001, 0.25, 0.5, 0.75, 0.999999, 1]) {
        const expected = a.map((value, axis) => value + (b[axis] - value) * progress) as Vec3;
        const length = Math.hypot(...expected);
        const mesh = state(to, { morph: { from, to, progress } });
        expectVector(normalAt(render([mesh])[0].vertices), expected.map(value => value / length) as Vec3);
      }
    }
  });

  it('keeps opposing custom normals finite at their canceled midpoint', () => {
    const from: Geometry = { ...triangle(), shading: 'smooth', normals: [[0, 1, 0], [0, 1, 0], [0, 1, 0]] };
    const to: Geometry = { ...from, normals: [[0, -1, 0], [0, -1, 0], [0, -1, 0]] };
    for (const progress of [0.499999, 0.5, 0.500001]) {
      const normal = normalAt(render([state(to, { morph: { from, to, progress } })])[0].vertices);
      expect(normal.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...normal)).toBeCloseTo(1);
    }
  });

  it('preserves per-face fallback normals when a missing morph endpoint has canceled vertex sums', () => {
    const implicit: Geometry = {
      kind: 'mesh', shading: 'smooth', vertices: [[0, 0, 0], [0, 0, 1], [1, 0, 0]],
      triangles: [[0, 1, 2], [2, 1, 0]],
    };
    const explicit: Geometry = { ...implicit, normals: [[0, 0, 1], [0, 0, 1], [0, 0, 1]] };
    for (const [from, to] of [[implicit, explicit], [explicit, implicit]]) {
      for (const progress of [0, 0.000001, 0.25, 0.5, 0.75, 0.999999, 1]) {
        const vertices = render([state(to, { morph: { from, to, progress } })])[0].vertices;
        const explicitWeight = to === explicit ? progress : 1 - progress;
        for (let corner = 0; corner < 6; corner++) {
          const expected: Vec3 = [0, (corner < 3 ? 1 : -1) * (1 - explicitWeight), explicitWeight];
          const length = Math.hypot(...expected);
          expectVector(normalAt(vertices, corner), expected.map(value => value / length) as Vec3);
        }
      }
    }
  });

  it('retains per-triangle sorting for translucent meshes', () => {
    const geometry: Geometry = { ...triangle(), shading: 'smooth', vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], triangles: [[0, 1, 2], [0, 3, 1]] };
    const items = render([state(geometry, { opacity: 0.5 })]);
    expect(items).toHaveLength(2);
    expect(items.every(item => item.transparent && item.vertices.length === 45)).toBe(true);
  });

  it('keeps stroked mesh fills adjacent to their own triangle strokes in depth order', () => {
    const geometry: Geometry = {
      kind: 'mesh', shading: 'flat',
      vertices: [[-2, -1, -1], [-1, -1, -1], [-1.5, 1, -1], [1, -1, 1], [2, -1, 1], [1.5, 1, 1]],
      triangles: [[0, 1, 2], [3, 4, 5]],
    };
    const items = render([state(geometry, { stroke: 'RED', strokeWidth: 0.1 })]);
    expect(items.map(item => item.component)).toEqual(['fill', 'stroke', 'fill', 'stroke']);
    expect(items.map(item => item.depth)).toEqual([11, 11, 9, 9]);
    expect(items.filter(item => item.component === 'fill').every(item => item.vertices.length === 45)).toBe(true);
  });

  it('validates mesh lighting at the compilation boundary', async () => {
    const source = (props: unknown) => `export default scene({},s=>s.mesh('mesh',${JSON.stringify(props)}));`;
    const props = { vertices: triangle().vertices, triangles: triangle().triangles, shading: 'smooth', normals: [[0, 0, 2], [0, 0, 2], [0, 0, 2]] };
    await expect(compileSource(source(props))).resolves.toBeDefined();
    for (const invalid of [
      { ...props, shading: 'glossy' }, { ...props, normals: [[0, 0, 1]] },
      { ...props, normals: [[0, 0, 0], [0, 0, 1], [0, 0, 1]] },
      { ...props, normals: [[0, 0], [0, 0, 1], [0, 0, 1]] },
      { ...props, normals: [[0, 0, null], [0, 0, 1], [0, 0, 1]] },
    ]) await expect(compileSource(source(invalid))).rejects.toThrow(/normal|shading/);
    await expect(compileSource(`export default scene({},s=>s.circle('circle',{shading:'flat'}));`)).rejects.toThrow('shading');
  });
});
