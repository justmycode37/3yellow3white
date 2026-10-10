import { describe, expect, it, vi } from "vitest";
import { createSurfaceBuilders } from "../src/surfaces.js";
import type { ParametricSurfaceProps, SurfaceProps } from "../src/surface-types.js";
import type { Geometry, Vec3 } from "../src/types.js";

const { surface, parametricSurface } = createSurfaceBuilders();

function normal(mesh: Geometry, triangle: [number, number, number]): Vec3 {
  const [a, b, c] = triangle.map(i => mesh.vertices![i] as Vec3);
  const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

describe("function surfaces", () => {
  it("samples a graph with exact boundary coordinates and upward winding", () => {
    const mesh = surface({ fn: (x, y) => 2 * x - 3 * y, xRange: [-1, 2], yRange: [-2, 1], xSegments: 2, ySegments: 3 });
    expect(mesh).toMatchObject({ kind: "mesh", shading: "smooth" });
    expect(mesh.vertices).toHaveLength(12);
    expect(mesh.triangles).toHaveLength(12);
    expect(mesh.vertices![0]).toEqual([-1, -2, 4]);
    expect(mesh.vertices!.at(-1)).toEqual([2, 1, 1]);
    for (const triangle of mesh.triangles!) {
      const n = normal(mesh, triangle);
      expect(n[2]).toBeGreaterThan(0);
      expect(n[0] / n[2]).toBeCloseTo(-2);
      expect(n[1] / n[2]).toBeCloseTo(3);
    }
  });

  it("uses a modest default resolution and supports explicit shading", () => {
    const mesh = surface({ fn: (x, y) => x * x + y * y, shading: "flat" });
    expect(mesh.vertices).toHaveLength(33 * 33);
    expect(mesh.triangles).toHaveLength(2 * 32 * 32);
    expect(mesh.vertices![0]).toEqual([-2, -2, 8]);
    expect(mesh.vertices!.at(-1)).toEqual([2, 2, 8]);
    expect(mesh.shading).toBe("flat");
  });

  it("leaves holes around nonfinite samples rather than bridging singularities", () => {
    const mesh = surface({ fn: x => 1 / x, xRange: [-1, 1], yRange: [0, 1], xSegments: 4, ySegments: 1 });
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.triangles).toHaveLength(4);
    for (const triangle of mesh.triangles!) {
      const xs = triangle.map(i => mesh.vertices![i][0]);
      expect(xs.every(x => x < 0) || xs.every(x => x > 0)).toBe(true);
    }
    expect(surface({ fn: () => NaN, xSegments: 1, ySegments: 1 })).toMatchObject({ vertices: [], triangles: [] });
  });

  it("preserves tiny but well-conditioned triangles", () => {
    const mesh = surface({ fn: () => 0, xRange: [0, 1e-10], yRange: [0, 1e-10], xSegments: 1, ySegments: 1 });
    expect(mesh.triangles).toHaveLength(2);
  });
});

describe("parametric surfaces", () => {
  it("uses dU cross dV winding and copies reused callback result arrays", () => {
    const point: Vec3 = [0, 0, 0];
    const mesh = parametricSurface({ fn: (u, v) => { point[0] = u; point[2] = v; return point; }, uSegments: 1, vSegments: 1 });
    expect(mesh.vertices).toEqual([[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]]);
    expect(mesh.triangles!.map(t => normal(mesh, t))).toEqual([[0, -1, 0], [0, -1, 0]]);
  });

  it("shares indices across a periodic cylinder seam and excludes its endpoint", () => {
    const fn = vi.fn((u: number, v: number): Vec3 => [Math.cos(u), Math.sin(u), v]);
    const mesh = parametricSurface({ fn, uRange: [0, Math.PI * 2], uSegments: 8, vSegments: 2, closedU: true });
    expect(mesh.vertices).toHaveLength(24);
    expect(mesh.triangles).toHaveLength(32);
    expect(fn).toHaveBeenCalledTimes(24);
    expect(fn.mock.calls.every(([u]) => u < Math.PI * 2)).toBe(true);
    expect(mesh.triangles).toContainEqual([7, 0, 8]);
    expect(mesh.triangles).toContainEqual([7, 8, 15]);
    for (const triangle of mesh.triangles!) {
      const n = normal(mesh, triangle), p = mesh.vertices![triangle[0]];
      expect(n[0] * p[0] + n[1] * p[1]).toBeGreaterThan(0);
    }
  });

  it("forms a watertight torus when both axes are periodic", () => {
    const mesh = parametricSurface({
      fn: (u, v) => [(2 + Math.cos(v)) * Math.cos(u), (2 + Math.cos(v)) * Math.sin(u), Math.sin(v)],
      uRange: [0, Math.PI * 2], vRange: [0, Math.PI * 2], uSegments: 8, vSegments: 6, closedU: true, closedV: true,
    });
    expect(mesh.vertices).toHaveLength(48);
    expect(mesh.triangles).toHaveLength(96);
    const edges = new Map<string, number>();
    for (const [a, b, c] of mesh.triangles!) for (const [x, y] of [[a, b], [b, c], [c, a]]) {
      const key = `${Math.min(x, y)},${Math.max(x, y)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    expect(mesh.vertices!.length - edges.size + mesh.triangles!.length).toBe(0);
  });

  it("drops degenerate triangles at collapsed poles", () => {
    const mesh = parametricSurface({
      fn: (u, v) => [v * Math.cos(u), v * Math.sin(u), v],
      uRange: [0, Math.PI * 2], uSegments: 8, vSegments: 2, closedU: true,
    });
    expect(mesh.triangles).toHaveLength(24);
    expect(mesh.triangles!.every(t => Math.hypot(...normal(mesh, t)) > 0)).toBe(true);
  });

  it("omits all four cells touching an invalid interior sample", () => {
    const mesh = parametricSurface({ fn: (u, v) => [u, v, u === 0.5 && v === 0.5 ? NaN : 0], uSegments: 2, vSegments: 2 });
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.triangles).toEqual([]);
  });
});

describe("surface validation and sandbox portability", () => {
  it("rejects oversized grids before invoking callbacks", () => {
    const fn = vi.fn((): Vec3 => [0, 0, 0]);
    expect(() => parametricSurface({ fn, uSegments: 101, vSegments: 100 })).toThrow("budget");
    expect(() => parametricSurface({ fn, uSegments: 10_000, vSegments: 1 })).toThrow("budget");
    expect(fn).not.toHaveBeenCalled();
    expect(surface({ fn: () => 0, xSegments: 100, ySegments: 100 }).triangles).toHaveLength(20_000);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 20_001])("rejects invalid resolution %s", xSegments => {
    expect(() => surface({ fn: () => 0, xSegments })).toThrow("xSegments");
  });

  it("validates range endpoints, periodic resolutions, shading and output shape", () => {
    expect(() => surface({ fn: () => 0, xRange: [1, 1] })).toThrow("xRange");
    expect(() => surface({ fn: () => 0, yRange: [-Infinity, 1] })).toThrow("yRange");
    expect(() => surface({ fn: () => 0, xRange: [-1e7, 1] })).toThrow("xRange");
    expect(() => parametricSurface({ fn: () => [0, 0, 0], closedU: true, uSegments: 2 })).toThrow("uSegments");
    expect(() => parametricSurface({ fn: () => [0, 0, 0], closedV: true, vSegments: 2 })).toThrow("vSegments");
    expect(() => surface({ fn: () => 0, shading: "invalid" } as unknown as SurfaceProps)).toThrow("shading");
    expect(() => parametricSurface({ fn: () => [0, 0] } as unknown as ParametricSurfaceProps)).toThrow("Vec3");
    expect(() => parametricSurface({ fn: () => [0, 0, 0], closedU: 1 } as unknown as ParametricSurfaceProps)).toThrow("closedU");
    expect(() => surface({ fn: () => "oops" } as unknown as SurfaceProps)).toThrow("must return a number");
    expect(() => surface({} as SurfaceProps)).toThrow("requires an fn");
  });

  it("rejects excessive finite coordinates and reports callback failures with sample locations", () => {
    expect(() => surface({ fn: () => 1e7 })).toThrow("coordinate exceeds");
    expect(() => parametricSurface({ fn: () => [1e7, 0, 0] })).toThrow("coordinate exceeds");
    expect(() => surface({ fn: () => { throw new Error("bad formula"); } })).toThrow("Surface callback failed at (-2, -2): bad formula");
  });

  it("rejects sparse range endpoints before sampling", () => {
    const graph = vi.fn(() => 0), parametric = vi.fn((): Vec3 => [0, 0, 0]);
    for (const omitted of [0, 1]) {
      const range: [number, number] = [0, 1];
      delete (range as number[])[omitted];
      for (const key of ["xRange", "yRange"] as const) {
        expect(() => surface({ fn: graph, [key]: range })).toThrow(key);
      }
      for (const key of ["uRange", "vRange"] as const) {
        expect(() => parametricSurface({ fn: parametric, [key]: range })).toThrow(key);
      }
    }
    expect(graph).not.toHaveBeenCalled();
    expect(parametric).not.toHaveBeenCalled();
  });

  it("rejects sparse or undefined callback coordinates instead of treating them as domain holes", () => {
    for (const omitted of [0, 1, 2]) {
      const point: Vec3 = [0, 0, 0];
      delete (point as number[])[omitted];
      expect(() => parametricSurface({ fn: () => point })).toThrow("Vec3");
    }
    expect(() => parametricSurface({ fn: () => new Array(3) as Vec3 })).toThrow("Vec3");
    expect(() => parametricSurface({ fn: () => [0, undefined, 0] } as unknown as ParametricSurfaceProps)).toThrow("Vec3");
    expect(() => surface({ fn: () => undefined } as unknown as SurfaceProps)).toThrow("must return a number");
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(parametricSurface({ fn: () => [0, value, 0], uSegments: 1, vSegments: 1 })).toMatchObject({ vertices: [], triangles: [] });
    }
  });

  it("rejects array and null segment counts", () => {
    for (const value of [new Array(1), [1], null]) {
      expect(() => surface({ fn: () => 0, xSegments: value } as unknown as SurfaceProps)).toThrow("xSegments");
      expect(() => parametricSurface({ fn: () => [0, 0, 0], vSegments: value } as unknown as ParametricSurfaceProps)).toThrow("vSegments");
    }
  });

  it("can be installed from its source without external runtime dependencies", () => {
    const restored = new Function(`return (${createSurfaceBuilders.toString()})()`)() as ReturnType<typeof createSurfaceBuilders>;
    const props = { fn: (x: number, y: number) => x * y, xSegments: 2, ySegments: 2 };
    expect(restored.surface(props)).toEqual(surface(props));
  });
});
