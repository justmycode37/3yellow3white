import type { CameraState, Geometry, Position, Vec3 } from './types.js';

export const vec3 = (p: Position): Vec3 => [p[0], p[1], p[2] ?? 0];
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export function rotate(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  let c = Math.cos(rotation[0]), s = Math.sin(rotation[0]);
  [y, z] = [y*c-z*s, y*s+z*c];
  c = Math.cos(rotation[1]); s = Math.sin(rotation[1]);
  [x, z] = [x*c+z*s, -x*s+z*c];
  c = Math.cos(rotation[2]); s = Math.sin(rotation[2]);
  return [x*c-y*s, x*s+y*c, z];
}
export interface Projection { x: number; y: number; depth: number; visible: boolean; scale: number }
export function project(point: Vec3, camera: CameraState, width: number, height: number): Projection {
  const delta: Vec3 = point.map((v, i) => v-camera.target[i]) as Vec3;
  const [x,y,z] = rotate(delta, [-camera.pitch, -camera.yaw, 0]);
  const depth = camera.distance-z;
  const perspective = Math.min(1, Math.max(0, camera.perspective));
  const divisor = (1-perspective) + perspective * depth / camera.distance;
  const scale = height/camera.height / Math.max(0.01, divisor);
  return { x: width/2+x*scale, y: height/2-y*scale, depth, visible: depth > 0.01 && depth < camera.distance*100 && divisor > 0, scale };
}
export function outline(geometry: Geometry): { points: Vec3[]; closed: boolean } | null {
  switch (geometry.kind) {
    case 'circle': return { points: Array.from({ length: 96 }, (_, i) => { const a=i*Math.PI/48; return [Math.cos(a)*(geometry.radius ?? 1),Math.sin(a)*(geometry.radius ?? 1),0]; }), closed: true };
    case 'rectangle': { const w=(geometry.width ?? 2)/2,h=(geometry.height ?? 1)/2; return { points: [[-w,-h,0],[w,-h,0],[w,h,0],[-w,h,0]], closed: true }; }
    case 'path': case 'line': case 'arrow': return { points: (geometry.points ?? []).map(vec3), closed: geometry.kind === 'path' && !!geometry.closed };
    default: return null;
  }
}
export function resample(points: Vec3[], count: number, closed: boolean): Vec3[] {
  if (!points.length) return [];
  if (points.length === 1) return Array.from({length: count}, () => [...points[0]] as Vec3);
  const path = closed ? [...points, points[0]] : points;
  const lengths=[0];
  for (let i=1;i<path.length;i++) lengths.push(lengths[i-1]+Math.hypot(...path[i].map((v,j)=>v-path[i-1][j])));
  const total=lengths.at(-1)!;
  if (!total) return Array.from({length: count},()=>[...points[0]] as Vec3);
  let segment=1;
  return Array.from({length: count},(_,i)=> {
    const distance=total*i/(closed ? count : Math.max(1,count-1));
    while(segment<lengths.length-1 && lengths[segment]<distance) segment++;
    const t=(distance-lengths[segment-1])/(lengths[segment]-lengths[segment-1] || 1);
    return path[segment-1].map((v,j)=>lerp(v,path[segment][j],t)) as Vec3;
  });
}
function error(a: Vec3[], b: Vec3[], offset=0): number { return a.reduce((sum,p,i)=>sum+p.reduce((v,x,j)=>v+(x-b[(i+offset)%b.length][j])**2,0),0); }
export function matchPoints(from: Vec3[], to: Vec3[], closed: boolean, count=96): [Vec3[],Vec3[]] {
  const a=resample(from,count,closed), b=resample(to,count,closed);
  if (!a.length || !b.length) return [a,b];
  let best=b, score=error(a,b);
  for (const candidate of [b,[...b].reverse()]) {
    for(let offset=0;offset<(closed ? count : 1);offset++) {
      const candidateScore=error(a,candidate,offset);
      if(candidateScore<score) { score=candidateScore; best=candidate.map((_,i)=>candidate[(i+offset)%count]); }
    }
  }
  return [a,best];
}
export function morphOutline(from: Geometry,to: Geometry,progress:number): { points: Vec3[]; closed:boolean } | null {
  const a=outline(from),b=outline(to);
  if(!a||!b||a.closed!==b.closed||!a.points.length||!b.points.length) return null;
  const [start,end]=matchPoints(a.points,b.points,a.closed);
  return {points:start.map((p,i)=>p.map((v,j)=>lerp(v,end[i][j],progress)) as Vec3),closed:a.closed};
}
