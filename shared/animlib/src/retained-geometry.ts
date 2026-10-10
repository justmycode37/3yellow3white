import { vec3 } from './geometry.js';
import type { ElementState, Frame, Geometry, Vec3 } from './types.js';
import type { GeometryDrawItem } from './render-geometry.js';
import { VERTEX_FLOATS } from './texture-shader.js';

/** Geometry is immutable once submitted; backends key resources by this identity. */
export interface RetainedMesh {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  centers: Vec3[];
  component: GeometryDrawItem['component'];
}
export const INSTANCE_FLOATS = 20;
export const MAX_INSTANCES = 32;
// Column-major affine transform; layer, signed uniform scale, viewport offset.
export const IDENTITY_INSTANCE = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1, 0,1,0,0]);

/** Central opt-out for tessellation that depends on projected scale or camera.
 * New camera/scene-dependent geometry features must join this predicate (or pass
 * no retention cache to buildDrawItems), rather than caching their derived state.
 */
export function cameraDependentGeometry(geometry: Geometry): boolean {
  return ['clipPlanes','outline','scalarColors','labelOcclusion'].some(key => key in geometry)
    || geometry.kind === 'path' && (geometry.d !== undefined || geometry.curve === 'smooth');
}
export function retainableElement(element: ElementState): boolean {
  return !element.morph && !cameraDependentGeometry(element.geometry)
    && !(element.geometry.kind === 'mesh' && element.stroke !== 'none' && element.strokeWidth > 0);
}

/** Deduplicate complete vertices, including normals/UVs: hard edges remain split. */
export function indexGeometry(items: GeometryDrawItem[]): RetainedMesh {
  const values: number[] = [], indices: number[] = [], unique = new Map<string, number>();
  const centers: Vec3[] = [];
  for (const item of items) {
    const center: Vec3 = [0,0,0];
    let count = 0;
    for (let i = 0; i < item.vertices.length; i += VERTEX_FLOATS) {
      const vertex = item.vertices.subarray(i, i + VERTEX_FLOATS);
      const key = vertex.join(',');
      let index = unique.get(key);
      if (index === undefined) { index = values.length / VERTEX_FLOATS; unique.set(key, index); values.push(...vertex); }
      indices.push(index);
      for (let axis = 0; axis < 3; axis++) center[axis] += vertex[axis];
      count++;
    }
    if (count) for (let axis = 0; axis < 3; axis++) center[axis] /= count;
    centers.push(center);
  }
  return { vertices: new Float32Array(values), indices: new Uint32Array(indices), centers, component: items[0]?.component ?? 'fill' };
}

/** Content keys survive fresh evaluated frames and catch in-place author edits.
 * Only the active frame's working set survives endFrame; changes release GPU
 * handles on the same frame through each backend's resource sweep.
 */
export class RetainedGeometry {
  private meshes = new Map<string, RetainedMesh[] | null>();
  private used = new Set<string>();
  private previous = new Map<string,string>();
  private current = new Map<string,string>();
  beginFrame(): void { this.used.clear(); this.current.clear(); }
  endFrame(): void {
    for (const key of this.meshes.keys()) if (!this.used.has(key)) this.meshes.delete(key);
    this.previous = this.current; this.current = new Map();
  }
  clear(): void { this.meshes.clear(); this.used.clear(); this.previous.clear(); this.current.clear(); }
  get(key: string, build: () => GeometryDrawItem[], combine = false, slot?: string): RetainedMesh[] | undefined {
    if (slot !== undefined) {
      const previous = this.previous.get(slot); this.current.set(slot,key);
      // A changing geometry/style stream must not pay indexing + allocation on
      // every frame. A stable subsequent sample promotes it back to retention.
      if (previous !== undefined && previous !== key && !this.meshes.has(key)) return;
    }
    this.used.add(key);
    if (!this.meshes.has(key)) {
      const items = build();
      this.meshes.set(key, items.some(item => item.transparent || item.cameraDependentGeometry) ? null : combine && items.length ? [indexGeometry(items)] : items.map(item => indexGeometry([item])));
    }
    return this.meshes.get(key) ?? undefined;
  }
}

/** Shadows and occlusion inspection consume final world-space triangles. */
export function retentionForFrame(frame: Frame): boolean {
  const lighting = (frame as Frame & { lighting?: { receiver?: unknown } }).lighting;
  if (lighting?.receiver) return false;
  const dependentLabel = (geometry: Geometry): boolean => {
    if (geometry.kind !== 'text' && geometry.kind !== 'latex') return false;
    const mode = (geometry as Geometry & { labelOcclusion?: string }).labelOcclusion;
    return mode !== undefined && mode !== 'depth';
  };
  return !frame.elements.some(element => element.space === 'world' &&
    (dependentLabel(element.geometry) || Boolean(element.morph &&
      (dependentLabel(element.morph.from) || dependentLabel(element.morph.to)))));
}

/** Canonical round two-point bonds/arrows share geometry across translations and
 * orientations. Match geometry.ts's radial seam exactly, including vertical axes.
 * Sphere radius is a GPU scale when there are no object-coordinate textures.
 */
export function canonicalPrimitive(element: ElementState): { geometry: Geometry; origin: Vec3; axes: Vec3[]; scale: number } {
  const identity = { geometry: element.geometry, origin: [0,0,0] as Vec3, axes: [[1,0,0],[0,1,0],[0,0,1]] as Vec3[], scale: 1 };
  const g = element.geometry;
  if (g.kind === 'sphere' && !g.texture && (g.radius ?? 1) > 0) {
    const radius = g.radius ?? 1;
    return { ...identity, geometry: { ...g, radius: 1 }, axes: identity.axes.map(p => p.map(v => v*radius) as Vec3), scale: radius };
  }
  if (element.strokeProfile !== 'round' || !['line','arrow'].includes(g.kind) || g.points?.length !== 2) return identity;
  const a = vec3(g.points[0]), b = vec3(g.points[1]);
  const delta = b.map((v,i) => v-a[i]) as Vec3, length = Math.hypot(...delta);
  if (length < 1e-10) return identity;
  const axis = delta.map(v => v/length) as Vec3, reference: Vec3 = [0,0,0];
  reference[axis.map(Math.abs).indexOf(Math.min(...axis.map(Math.abs)))] = 1;
  const cross = (a: Vec3,b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const radial = cross(axis,reference), magnitude = Math.hypot(...radial), u = radial.map(v => v/magnitude) as Vec3, v = cross(axis,u);
  return { geometry: { ...g, points: [[0,0,0],[0,0,length]] }, origin: a, axes: [v.map(n => -n) as Vec3,u,axis], scale: 1 };
}
