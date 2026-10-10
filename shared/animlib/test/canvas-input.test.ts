import { expect, it } from 'vitest';
import { CanvasInput } from '../src/canvas-input.js';
import { BehaviorRuntime } from '../src/behaviors.js';
import { compileSource } from '../src/compiler.js';
import { evaluateScene } from '../src/timeline.js';
import type { Frame, InteractionSnapshot } from '../src/types.js';

import { Canvas } from './canvas-stub.js';
import { project } from '../src/geometry.js';
import { SpatialFrame } from '../src/spatial.js';
it('owns capture, cancellation, CSS coordinate conversion, canvas replacement and DOM-free disposal',async()=>{
  const scene=await compileSource(`export default scene({},s=>{const a=s.circle('a');s.behavior(a,{type:'drag'});s.behavior(a,{type:'spring'});s.wait(1);});`);
  const runtime=new BehaviorRuntime();
  let frame:Frame=runtime.evaluate(scene,evaluateScene(scene,0,{bindings:false}),0,0);
  const invalidate=()=>{frame=runtime.evaluate(scene,evaluateScene(scene,0,{bindings:false}),0,1/60);};
  const snapshot=():InteractionSnapshot=>({frame:structuredClone(frame),camera:frame.camera,width:800,height:600,rect:[0,0,1,1]});
  const canvas=new Canvas(),input=new CanvasInput(canvas as unknown as HTMLCanvasElement,runtime,snapshot,invalidate);
  expect(canvas.attributes.get('tabindex')).toBe('0');expect(canvas.style.touchAction).toBe('none');
  expect(canvas.send('pointerdown',300,200,{shiftKey:true}).prevented).toBe(false);
  expect(canvas.send('pointerdown').stopped).toBe(true);expect(canvas.focused).toBe(true);expect(canvas.captures.size).toBe(1);
  canvas.send('pointermove',375,200);expect(frame.elements[0].position[0]).toBeCloseTo(2);
  canvas.send('pointermove',400,200,{pointerId:2});expect(frame.elements[0].position[0]).toBeCloseTo(2);
  canvas.send('lostpointercapture');expect(runtime.heldTarget).toBeUndefined();expect(canvas.captures.size).toBe(0);expect(runtime.active).toBe(true);
  for(let i=0;i<300;i++)invalidate();expect(frame.elements[0].position).toEqual([0,0,0]);
  canvas.send('pointerdown');canvas.send('pointermove',375,200);canvas.send('keydown',300,200,{key:'Escape'});
  expect(canvas.captures.size).toBe(0);
  const replacement=new Canvas();input.setCanvas(replacement as unknown as HTMLCanvasElement);
  expect(canvas.listeners.size).toBe(0);expect(canvas.style.touchAction).toBe('pan-y');expect(canvas.attributes.has('tabindex')).toBe(false);
  expect(replacement.listeners.size).toBe(6);
  input.dispose();runtime.reset();expect(replacement.listeners.size).toBe(0);expect(replacement.style.touchAction).toBe('pan-y');
});

it('delivers custom keyboard input and cancels a captured target removed from the timeline',async()=>{
  let keys=0,cancels=0;
  const scene=await compileSource(`export default scene({},s=>{const a=s.circle('a');s.behavior(a,{type:'custom',name:'select'});s.wait(1);s.remove(a);s.wait(1);});`);
  const runtime=new BehaviorRuntime({select:()=>({input:e=>{if(e.type==='key'){keys++;return true;}if(e.type==='cancel')cancels++;return e.type==='start';}})});
  let frame=runtime.evaluate(scene,evaluateScene(scene,0),0,0);
  const canvas=new Canvas(),input=new CanvasInput(canvas as unknown as HTMLCanvasElement,runtime,()=>({frame,camera:frame.camera,width:800,height:600,rect:[0,0,1,1]}),()=>{});
  canvas.send('pointerdown');expect(canvas.send('keydown',300,200,{key:'Enter'}).prevented).toBe(true);expect(keys).toBe(1);
  input.cancel();expect(cancels).toBe(1);
  canvas.send('pointerdown');frame=runtime.evaluate(scene,evaluateScene(scene,2),2,0);input.sync();expect(canvas.captures.size).toBe(0);
  input.dispose();runtime.reset();
});

it('uses inherited viewport offsets for constrained perspective drag rays',async()=>{
  const scene=await compileSource(`export default scene({mode:'3d'},s=>{
    const a=s.sphere('a');s.group('g',[a],{viewportOffset:[.25,0]});
    s.behavior(a,{type:'drag',axis:'z'});s.wait(1);
  });`);
  const runtime=new BehaviorRuntime();
  const evaluate=()=>{const f=evaluateScene(scene,0,{bindings:false});f.camera={...f.camera,perspective:1,yaw:.7,pitch:0};return runtime.evaluate(scene,f,0,1/60);};
  let frame=evaluate();
  const canvas=new Canvas(),input=new CanvasInput(canvas as unknown as HTMLCanvasElement,runtime,
    ()=>({frame,camera:frame.camera,width:640,height:480,rect:[0,0,1,1]}),()=>{frame=evaluate();});
  try {
    canvas.send('pointerdown',400,200);expect(canvas.captures.size).toBe(1);
    canvas.send('pointermove',437.5,200);
    const position=new SpatialFrame(frame).world('a');
    expect(position[0]).toBe(0);expect(position[1]).toBe(0);
    expect(project(position,frame.camera,640,480).x+160).toBeCloseTo(540,7);
  } finally {input.dispose();runtime.reset();}
});
