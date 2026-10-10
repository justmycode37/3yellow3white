import { project } from './geometry.js';
import { add, mul, cameraRay, cross, dot, sub } from './spatial.js';
import { VERTEX_FLOATS as stride } from './texture-shader.js';
import type { CameraState, Vec3 } from './types.js';
import type { GeometryDrawItem } from './render-geometry.js';
export interface LabelAnchor { point: Vec3; offset: number[]; mode: 'overlay'|'hide'|'fade'; }

/** Whole-label visibility at its anchor against opaque fill triangles in this view. */
export function applyLabelOcclusion(items: GeometryDrawItem[], labels: Map<string,LabelAnchor>, camera: CameraState, width: number,height:number): GeometryDrawItem[] {
  if(!labels.size)return items;
  const factors=new Map<string,number>();
  for(const [id,label] of labels) {
    const anchor=project(label.point,camera,width,height);
    if(!anchor.visible){factors.set(id,0);continue;}
    let hidden=false;
    if(label.mode!=='overlay')for(const item of items) {
      if(item.elementId===id||item.screen||item.transparent||item.component!=='fill'||item.groups?.some(g=>g.opacity<0.999999))continue;
      const data=item.vertices;
      const ray=cameraRay(anchor.x+(label.offset[0]-data[13])*width,anchor.y-(label.offset[1]-data[14])*height,camera,width,height);
      for(let i=0;i<data.length;i+=3*stride) {
        const p=(j:number):Vec3=>[data[j],data[j+1],data[j+2]];
        const a=p(i),b=p(i+stride),c=p(i+2*stride),e1=sub(b,a),e2=sub(c,a),h=cross(ray.direction,e2),det=dot(e1,h);
        if(Math.abs(det)<1e-12)continue;
        const s=sub(ray.origin,a),u=dot(s,h)/det,q=cross(s,e1),v=dot(ray.direction,q)/det,t=dot(e2,q)/det;
        if(u>=0&&v>=0&&u+v<=1&&t>=0&&project(add(ray.origin,mul(ray.direction,t)),camera,width,height).depth<anchor.depth-1e-4){hidden=true;break;}
      }
      if(hidden)break;
    }
    factors.set(id,hidden?(label.mode==='fade'?0.2:0):1);
  }
  return items.flatMap(item=> {
    if(item.component!=='content')return [item];
    const factor=factors.get(item.elementId);if(factor===undefined)return [item];if(!factor)return [];
    const vertices=item.vertices.slice();
    for(let i=0;i<vertices.length;i+=stride) {
      const p=project([vertices[i],vertices[i+1],vertices[i+2]],camera,width,height);
      vertices[i]=p.x-width/2;vertices[i+1]=height/2-p.y;vertices[i+2]=0;
      vertices[i+6]*=factor;vertices[i+7]=1;
    }
    return [{...item,vertices,depth:-1e9,transparent:item.transparent||factor<1,cameraDependentGeometry:true}];
  });
}
