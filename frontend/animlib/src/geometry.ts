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

/** Shared miter vertices keep neighboring stroke segments watertight without alpha overlap. */
export function strokeTriangles(points:Vec3[],width:number,closed:boolean):Vec3[] {
  points=points.filter((p,i)=>!i||Math.hypot(...p.map((v,j)=>v-points[i-1][j]))>1e-10);
  if(closed&&points.length>1&&Math.hypot(...points[0].map((v,i)=>v-points.at(-1)![i]))<1e-10)points=points.slice(0,-1);
  if(points.length<2||width<=0)return [];
  const half=width/2;
  const side=(a:Vec3,b:Vec3):Vec3=>{const x=b[0]-a[0],y=b[1]-a[1],length=Math.hypot(x,y);return length>1e-10?[-y/length,x/length,0]:[1,0,0];};
  const edges=points.map((point,i)=> {
    const before=side(points[(i+points.length-1)%points.length],point),after=side(point,points[(i+1)%points.length]);
    let normal=after,magnitude=half;
    if(!closed&&i===0)normal=after;
    else if(!closed&&i===points.length-1)normal=before;
    else {
      const sum:Vec3=[before[0]+after[0],before[1]+after[1],0],length=Math.hypot(sum[0],sum[1]);
      if(length>1e-8){normal=[sum[0]/length,sum[1]/length,0];magnitude=Math.min(half*4,half/Math.max(1e-6,normal[0]*after[0]+normal[1]*after[1]));}
    }
    return [-1,1].map(sign=>point.map((v,j)=>v+normal[j]*magnitude*sign) as Vec3);
  });
  const triangles:Vec3[]=[];
  for(let i=0;i<(closed?points.length:points.length-1);i++){const a=edges[i],b=edges[(i+1)%points.length];triangles.push(a[0],a[1],b[0],b[0],a[1],b[1]);}
  return triangles;
}

const sphereCache=new Map<string,{points:Vec3[];normals:Vec3[]}>();
/** Latitude/longitude surface mesh with continuous normals for GPU-lit spheres. */
export function sphereTriangles(radius:number,segments=32,rings=20):{points:Vec3[];normals:Vec3[]} {
  const key=radius+':'+segments+':'+rings,cached=sphereCache.get(key);if(cached)return cached;
  const point=(ring:number,segment:number):Vec3=>{const latitude=Math.PI*ring/rings,longitude=Math.PI*2*segment/segments;return [Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)];};
  const normals:Vec3[]=[];
  for(let r=0;r<rings;r++)for(let s=0;s<segments;s++) {
    const a=point(r,s),b=point(r+1,s),c=point(r+1,s+1),d=point(r,s+1);
    if(r>0)normals.push(a,b,d);if(r<rings-1)normals.push(d,b,c);
  }
  const result={normals,points:normals.map(p=>p.map(v=>v*radius) as Vec3)};
  if(sphereCache.size>=16)sphereCache.delete(sphereCache.keys().next().value!);sphereCache.set(key,result);return result;
}
