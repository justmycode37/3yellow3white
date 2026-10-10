import type { CameraState, Frame, Vec3 } from './types.js';
import type { DrawItem } from './composition.js';
import type { GeometryDrawItem } from './render-geometry.js';
import { VERTEX_FLOATS } from './texture-shader.js';
import { paletteResolver, parseColor } from './palette.js';
import { sceneLighting, worldLightDirection } from './lighting.js';

/** Sutherland–Hodgman clipping; works for the convex polygons produced here. */
function clip(points: Vec3[], axis: number, edge: number, sign: number): Vec3[] {
  const output: Vec3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = (a[axis] - edge) * sign, db = (b[axis] - edge) * sign;
    if (da >= 0) output.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      output.push(a.map((v, k) => v + (b[k] - v) * t) as Vec3);
    }
  }
  return output;
}
function triangles(points: Vec3[], output: number[], color: number[], lit: number): void {
  for (let i = 1; i + 1 < points.length; i++) for (const p of [points[0], points[i], points[i + 1]]) {
    // Same 31-float layout as regular geometry; no material/texture/emission.
    output.push(...p, ...color, 0, 0, 1, 0, lit, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}

/**
 * Shadow actual world-space draw triangles, after morphs/clipping/transforms.
 * Each direction is an opaque silhouette union inside an isolated opacity layer:
 * overlapping casters never multiply darkness. Samples are deterministic.
 * No temporal state, depth-map allocation, geometry cache, or backend-specific path.
 */
export function addPlanarShadows(items: GeometryDrawItem[], value: Frame['lighting'], camera: CameraState,
  palette: ReturnType<typeof paletteResolver>): DrawItem[] {
  const settings = sceneLighting(value), plane = settings.receiver;
  if (!plane) return items;
  const [x, y, z] = plane.position ?? [0, -1, 0], [w, d] = plane.size;
  const bounds = [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
  const depth = camera.distance - (x - camera.target[0]) * Math.sin(camera.yaw) * Math.cos(camera.pitch)
    + (y - camera.target[1]) * Math.sin(camera.pitch) - (z - camera.target[2]) * Math.cos(camera.yaw) * Math.cos(camera.pitch);
  const receiver: number[] = [];
  triangles([[bounds[0], y, bounds[2]], [bounds[0], y, bounds[3]], [bounds[1], y, bounds[3]], [bounds[1], y, bounds[2]]], receiver,
    parseColor(palette.resolve(plane.fill ?? 'GREY_D')), 1);
  const result: DrawItem[] = [...items, { depth, vertices: new Float32Array(receiver), transparent: false, screen: false, cameraDependentGeometry: true }];
  const shadow = settings.directional?.shadow, direction = worldLightDirection(value, camera);
  if (!shadow || direction[1] <= 0.001) return result; // Light below/parallel to top of plane.
  const direct = 0.68 * (settings.directional?.intensity ?? 1) * direction[1];
  const ambient = 0.32 * (settings.ambient ?? 1);
  const opacity = (shadow.opacity ?? 0.35) * direct / Math.max(1e-6, ambient + direct);
  if (opacity <= 0) return result;
  const casters = items.filter(item => item.castShadow && !item.screen && !item.transparent && !item.groups?.some(g => g.opacity < 0.999999));
  const softness = shadow.softness ?? 0.04, bias = shadow.bias ?? 0.002;
  const count = softness === 0 ? 1 : ({ low: 1, medium: 7, high: 13 }[shadow.quality ?? 'medium']);
  // Orthonormal disk around L, so softness is independent of source orientation.
  const axis: Vec3 = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const tangent = cross(direction, axis), length = Math.hypot(...tangent);
  const u = tangent.map(v => v / length) as Vec3, v = cross(direction, u);
  for (let sample = 0; sample < count; sample++) {
    const radius = sample === 0 ? 0 : Math.tan(softness) * Math.sqrt(sample / (count - 1));
    const angle = sample * 2.399963229728653;
    const light = direction.map((n, k) => n + radius * (Math.cos(angle)*u[k] + Math.sin(angle)*v[k])) as Vec3;
    if (light[1] <= 0.001) continue;
    const data: number[] = [];
    for (const item of casters) for (let offset = 0; offset < item.vertices.length; offset += VERTEX_FLOATS * 3) {
      const points = [0, 1, 2].map(i => Array.from(item.vertices.subarray(offset + i*VERTEX_FLOATS, offset + i*VERTEX_FLOATS + 3)) as Vec3);
      let projected = clip(points, 1, y, 1).map(p => [p[0] - (p[1]-y)*light[0]/light[1], y+bias, p[2] - (p[1]-y)*light[2]/light[1]] as Vec3);
      for (const [axis, edge, sign] of [[0,bounds[0],1], [0,bounds[1],-1], [2,bounds[2],1], [2,bounds[3],-1]]) projected = clip(projected, axis, edge, sign);
      triangles(projected, data, [0, 0, 0, 1], 0);
    }
    if (data.length) result.push({ depth, vertices: new Float32Array(data), transparent: false, screen: false,
      cameraDependentGeometry: true, groups: [{ id: `@shadow:${sample}`, opacity: 1 - (1-opacity)**(1/count) }] });
  }
  return result;
}
