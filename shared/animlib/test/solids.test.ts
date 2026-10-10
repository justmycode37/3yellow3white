import { describe, expect, it } from 'vitest';
import { createSolidBuilders } from '../src/solids.js';
import { compileSource } from '../src/compiler.js';
import type { Geometry, Vec3 } from '../src/types.js';

const solids = createSolidBuilders();
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, value, i) => sum + value * b[i], 0);
function faces(geometry: Geometry) {
  const vertices = geometry.vertices! as Vec3[];
  expect(vertices.every(point => point.every(Number.isFinite))).toBe(true);
  return geometry.triangles!.map(indices => {
    expect(indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices.length)).toBe(true);
    const [a, b, c] = indices.map(index => vertices[index]);
    const normal = cross(sub(b, a), sub(c, a));
    expect(Math.hypot(...normal)).toBeGreaterThan(1e-10);
    const center = a.map((value, i) => (value + b[i] + c[i]) / 3) as Vec3;
    return { center, normal };
  });
}
function expectWatertight(geometry: Geometry) {
  // Cap boundaries intentionally duplicate vertices; compare their coordinates.
  const keys = geometry.vertices!.map(point => point.map(value => value.toFixed(8)).join(','));
  const edges = new Map<string, number>();
  for (const [a,b,c] of geometry.triangles!) for (const [u,v] of [[a,b],[b,c],[c,a]]) {
    const key = [keys[u], keys[v]].sort().join('|');
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  expect([...edges.values()].every(count => count === 2)).toBe(true);
}

describe('solid geometry', () => {
  it('builds a centered box with separate face vertices and outward winding', () => {
    const geometry = solids.box({ width: 2, height: 4, depth: 6 });
    expect(geometry.vertices).toHaveLength(24);
    expect(geometry.triangles).toHaveLength(12);
    for (const [axis, extent] of [1,2,3].entries()) {
      expect(Math.min(...geometry.vertices!.map(point => point[axis]))).toBe(-extent);
      expect(Math.max(...geometry.vertices!.map(point => point[axis]))).toBe(extent);
    }
    for (const { center, normal } of faces(geometry)) expect(dot(center, normal)).toBeGreaterThan(0);
    expectWatertight(geometry);
    expect(geometry).toMatchObject({ shading: 'flat' });
  });
  it.each(['cylinder', 'cone'] as const)('builds a watertight %s with outward walls and hard cap boundaries', kind => {
    const geometry = solids[kind]({ radius: 2, height: 6, radialSegments: 8 });
    expect(Math.min(...geometry.vertices!.map(point => point[1]))).toBe(-3);
    expect(Math.max(...geometry.vertices!.map(point => point[1]))).toBe(3);
    for (const { center, normal } of faces(geometry)) expect(dot(center, normal)).toBeGreaterThan(0);
    expectWatertight(geometry);
    const open = solids[kind]({ radialSegments: 8, capped: false });
    expect(open.triangles).toHaveLength(kind === 'cone' ? 8 : 16);
    expect(open.vertices).toHaveLength(kind === 'cone' ? 9 : 16);
    expect(geometry).toMatchObject({ shading: 'smooth' });
  });
  it('makes a closed torus with consistent outward winding and exact ring extents', () => {
    const geometry = solids.torus({ radius: 2, tubeRadius: 0.5, radialSegments: 16, tubularSegments: 8 });
    expect(geometry.vertices).toHaveLength(128);
    expect(geometry.triangles).toHaveLength(256);
    expect(Math.max(...geometry.vertices!.map(point => point[0]))).toBe(2.5);
    expect(Math.max(...geometry.vertices!.map(point => point[1]))).toBe(0.5);
    for (const { center, normal } of faces(geometry)) {
      const r = Math.hypot(center[0], center[2]);
      const outward: Vec3 = [center[0]*(1-2/r), center[1], center[2]*(1-2/r)];
      expect(dot(outward, normal)).toBeGreaterThan(0);
    }
    expectWatertight(geometry);
  });
  it('rejects invalid dimensions, segment counts, flags, and excessive allocations', () => {
    for (const value of [0, -1, NaN, Infinity, 1e7]) expect(() => solids.box({ width: value })).toThrow();
    for (const value of [2, 3.5, NaN, 1e9]) expect(() => solids.cylinder({ radialSegments: value })).toThrow();
    expect(() => solids.torus({ radialSegments: 101, tubularSegments: 100 })).toThrow('limited');
    expect(() => solids.cylinder({ radialSegments: 5001 })).toThrow('limited');
    expect(() => solids.torus({ tubeRadius: 1 })).toThrow('smaller');
    expect(() => solids.torus({ radius: 1e6, tubeRadius: 1 })).toThrow('vertices');
    expect(() => solids.cone({ capped: 1 as unknown as boolean })).toThrow('boolean');
  });
  it('can be installed using its source alone without host dependencies', () => {
    const detached = new Function(`return (${createSolidBuilders.toString()})();`)() as ReturnType<typeof createSolidBuilders>;
    expect(detached.torus()).toEqual(solids.torus());
    expect(detached.tube({ points: [[0,0,0],[1,1,0],[1,2,1]] })).toEqual(solids.tube({ points: [[0,0,0],[1,1,0],[1,2,1]] }));
  });
});

describe('swept tubes', () => {
  it('rejects sparse coordinates before deduplicating and rejects missing points', () => {
    for (let axis = 0; axis < 3; axis++) {
      const sparse: Vec3 = [0,0,0];
      delete sparse[axis];
      expect(() => solids.tube({ points: [[0,0,0], sparse, [0,2,0]] })).toThrow('finite 3D coordinates');
    }
    const missingPoint: Vec3[] = [[0,0,0], [0,1,0], [0,2,0]];
    delete missingPoint[1];
    expect(() => solids.tube({ points: missingPoint })).toThrow('finite 3D coordinates');
  });
  it.each(['[[0,0,0],[0,,0],[0,2,0]]', '[[0,0,0],,[0,2,0]]'])('rejects sparse authored tube points in the sandbox: %s', async points => {
    await expect(compileSource(`export default scene({mode:'3d'},s=>{s.tube('tube',{points:${points}});});`)).rejects.toThrow('finite 3D coordinates');
  });
  it.each([[[0,0,0],[0,0,2]], [[0,0,0],[1,2,3]]] as Vec3[][])('builds straight capped tubes with outward winding', (...points) => {
    const geometry = solids.tube({ points, radius: 0.25, radialSegments: 8 });
    expect(geometry.vertices).toHaveLength(34);
    expect(geometry.triangles).toHaveLength(32);
    const direction = sub(points[1], points[0]), length = Math.hypot(...direction), axis = direction.map(value => value / length) as Vec3;
    for (const [i, { center, normal }] of faces(geometry).entries()) {
      if (i < 16) {
        const fromStart = sub(center, points[0]), along = dot(fromStart, axis);
        const outward = fromStart.map((value, j) => value - along*axis[j]) as Vec3;
        expect(dot(outward, normal)).toBeGreaterThan(0);
      } else expect(dot(normal, axis) * (i < 24 ? -1 : 1)).toBeGreaterThan(0);
    }
    expectWatertight(geometry);
  });
  it('preserves circular cross-sections at bends and ignores repeated points', () => {
    const points: Vec3[] = [[0,0,0],[0,0,1],[1,0,2],[1,1,3]];
    const geometry = solids.tube({ points, radius: 0.1, radialSegments: 8, capped: false });
    expect(geometry.vertices).toHaveLength(32);
    for (let i=0;i<points.length;i++) for (const vertex of geometry.vertices!.slice(i*8, (i+1)*8)) expect(Math.hypot(...sub(vertex as Vec3, points[i]))).toBeCloseTo(0.1, 12);
    faces(geometry);
    expect(solids.tube({ points: [points[0], points[0], ...points.slice(1)], radius: 0.1, radialSegments: 8, capped: false })).toEqual(geometry);
  });
  it('shares the closing ring of spatial loops and accepts a repeated closing endpoint', () => {
    const points: Vec3[] = Array.from({ length: 40 }, (_, i) => { const t = i*Math.PI/20; return [2*Math.cos(t), 0.3*Math.sin(3*t), 2*Math.sin(t)]; });
    const options = { points, radius: 0.1, radialSegments: 8, closed: true };
    const geometry = solids.tube(options);
    expect(geometry.vertices).toHaveLength(320);
    expect(geometry.triangles).toHaveLength(640);
    faces(geometry); expectWatertight(geometry);
    expect(solids.tube({ ...options, points: [...points, points[0]] })).toEqual(geometry);
    expect(solids.tube({ ...options, capped: false })).toEqual(geometry);
    // Adjacent rings remain aligned across the closing seam too.
    for (let i=0;i<points.length;i++) {
      const a = sub(geometry.vertices![i*8] as Vec3, points[i]);
      const next = (i+1)%points.length, b = sub(geometry.vertices![next*8] as Vec3, points[next]);
      expect(dot(a,b)/(0.1*0.1)).toBeGreaterThan(0.9);
    }
  });
  it('rejects reversals, insufficient paths, invalid points, and excessive meshes', () => {
    expect(() => solids.tube({ points: [[0,0,0],[1,0,0],[0,0,0]] })).toThrow('reverse');
    expect(() => solids.tube({ points: [[0,0,0],[0,0,0]] })).toThrow('distinct');
    expect(() => solids.tube({ points: [[0,0,0],[1,0,0]], closed: true })).toThrow('distinct');
    expect(() => solids.tube({ points: [[0,0,0],[NaN,1,0]] })).toThrow('finite');
    expect(() => solids.tube({ points: [[0,0,0],[1e6,1,0]], radius: 1e6 })).toThrow('vertices');
    expect(() => solids.tube({ points: Array.from({ length: 1000 }, (_, i) => [i,0,0]) })).toThrow('limited');
  });
});
