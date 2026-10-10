import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorPalette, CompiledScene, Frame } from "../src/types.js";

const rendering = vi.hoisted(() => ({ frame: undefined as Frame | undefined, options: undefined as CompiledScene['options'] | undefined, palette: undefined as ColorPalette | undefined, orbit: { yaw: 0, pitch: 0 }, disposed: false }));
vi.mock("../src/renderer.js", () => ({
  CanvasRenderer: class {
    onOrbitChange?: () => void;
    get orbit() { return rendering.orbit; }
    setOrbit(value: { yaw: number; pitch: number }) { rendering.orbit = value; }
    setOrbitEnabled() {}
    setPalette(palette: ColorPalette) { rendering.palette = palette; }
    syncInteraction() {}
    interactionSnapshot() { const frame=rendering.frame;return frame?{frame,camera:frame.camera,width:800,height:600,rect:[0,0,1,1]}:undefined; }
    resetInteraction() { rendering.orbit = { yaw: 0, pitch: 0 }; }
    async prepare(_scenes: CompiledScene[]) {}
    render(frame: Frame, options: CompiledScene['options']) { rendering.frame = structuredClone(frame); rendering.options = structuredClone(options); }
    dispose() { rendering.disposed = true; }
  },
}));
import { CanvasRenderer } from "../src/renderer.js";
import { Canvas } from "./canvas-stub.js";
import { createPlayer } from "../src/player.js";
import { ControlOverlay } from "../src/controls.js";
import { SceneSequence } from "../src/sequence.js";
import { SourceCompiler } from '../src/compiler-client.js';
import { AudioClock } from '../src/audio.js';
import { THREE_BLUE_ONE_BROWN_PALETTE } from "../src/palette.js";

let now: number;
let frameId: number;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  now = 0; frameId = 0; frames = new Map();
  rendering.frame = undefined; rendering.options = undefined; rendering.palette = undefined; rendering.orbit = { yaw: 0, pitch: 0 }; rendering.disposed = false;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
});

class NativeWidgetStub {
  children: NativeWidgetStub[] = [];
  parent?: NativeWidgetStub;
  tagName: string;
  className = "";
  style = { setProperty(name: string, value: string) { (this as unknown as Record<string,string>)[name] = value; } } as { setProperty(name: string, value: string): void } & Record<string,string>;
  textContent = "";
  value = "";
  type = "";
  checked = false;
  dataset: Record<string, string> = {};
  private events = new Map<string, () => void>();
  constructor(tag: string, readonly ownerDocument: { createElement: (tag: string) => NativeWidgetStub }) { this.tagName = tag.toUpperCase(); }
  append(...nodes: NativeWidgetStub[]) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  setAttribute() {}
  replaceChildren() { this.children = []; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); }
  closest(tag: string): NativeWidgetStub | null { return this.tagName === tag.toUpperCase() ? this : this.parent?.closest(tag) ?? null; }
  addEventListener(event: string, callback: () => void) { this.events.set(event, callback); }
  trigger(event: string) { this.events.get(event)?.(); }
}

describe("native control reconciliation", () => {
  it("moves controls between authored positions and the automatic panel without recreating inputs", () => {
    const document = { createElement(tag: string): NativeWidgetStub { return new NativeWidgetStub(tag, document); } };
    const root = document.createElement("div");
    const overlay = new ControlOverlay(root as unknown as HTMLElement, () => {});
    const control = { id: "scale", label: "Scale", kind: "slider" as const, default: 1, value: 1, min: 0, max: 4 };
    overlay.update("a", [control]);
    const row = root.children[0].children[0], input = row.children.find(child => child.tagName === "INPUT");
    expect(row.style.position).toBe("relative");
    overlay.update("a", [{ ...control, position: [0.1, 0.2], width: 180 }]);
    expect(row.style).toMatchObject({ position: "absolute", left: "10%", top: "20%", width: "180px" });
    expect(row.children.find(child => child.tagName === "INPUT")).toBe(input);
    overlay.update("a", [control]);
    expect(row.style).toMatchObject({ position: "relative", left: "", top: "", width: "220px" });
    overlay.update("b", []);
    expect(root.children[0].children).toEqual([]);
    overlay.dispose();expect(root.children).toEqual([]);
  });

  it("keeps the viewer's pending slider value while scenes recompile, then applies authoritative state", async () => {
    const document = { createElement(tag: string): NativeWidgetStub { return new NativeWidgetStub(tag, document); } };
    const root = document.createElement("div");
    let finish!: () => void;
    const overlay = new ControlOverlay(root as unknown as HTMLElement, () => new Promise<void>(resolve => { finish = resolve; }));
    const control = { id: "scale", label: "Scale", kind: "slider" as const, default: 1, value: 1, min: 0, max: 4 };
    overlay.update("a", [control]);
    const input = root.children[0].children[0].children.find(child => child.tagName === "INPUT")!;
    input.value = "3";
    input.trigger("input");
    overlay.update("a", [{ ...control, value: 1 }]);
    expect(input.value).toBe("3");
    overlay.update("a", [{ ...control, value: 2.5 }]);
    expect(input.value).toBe("3");
    finish();
    await Promise.resolve();
    expect(input.value).toBe("2.5");
    expect(root.children[0].children[0].children).toContain(input);
    overlay.dispose();
    expect(root.children).toHaveLength(0);
  });

  it("ignores completion of obsolete slider changes and restores rejected latest input", async () => {
    const document = { createElement(tag: string): NativeWidgetStub { return new NativeWidgetStub(tag, document); } };
    const root = document.createElement("div");
    const requests: { resolve: () => void; reject: (reason: Error) => void }[] = [];
    const overlay = new ControlOverlay(root as unknown as HTMLElement, () => new Promise<void>((resolve, reject) => { requests.push({ resolve, reject }); }));
    const control = { id: "scale", label: "Scale", kind: "slider" as const, default: 1, value: 1, min: 0, max: 4 };
    overlay.update("a", [control]);
    const input = root.children[0].children[0].children.find(child => child.tagName === "INPUT")!;
    input.value = "2"; input.trigger("input");
    input.value = "3"; input.trigger("input");
    overlay.update("a", [{ ...control, value: 2 }]);
    requests[0].resolve();
    await Promise.resolve();
    expect(input.value).toBe("3");
    requests[1].reject(new Error("invalid control"));
    await Promise.resolve();
    expect(input.value).toBe("2");
    overlay.dispose();
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function advance(seconds: number) {
  now += seconds * 1000;
  const pending = [...frames.entries()];
  frames.clear();
  for (const [, callback] of pending) callback(now);
}
const first = `export default scene({ end: "hold" }, s => {
  const scale = s.slider("scale", {default:1,min:0.5,max:3});
  const dot = s.circle("dot", {radius:scale,position:[0,0]});
  s.play(dot.moveTo([3,0]), {duration:3});
  s.keep(dot);
});`;
const second = `export default scene({ end: "hold" }, s => {
  const dot = s.previous.get("dot");
  s.play(dot.moveTo([7,0]), {duration:2});
});`;
const reactive = `export default scene({},s=>{
  const size=s.slider('size',{reactive:true,default:1,min:0.5,max:3});
  const ball=s.sphere('ball',{radius:0.45});
  s.bind(ball,[size],value=>({radius:0.45*value}));
  s.play(ball.moveTo([4,0]),{duration:4,ease:'linear'});
});`;

describe('reactive player controls', () => {
  it('keeps input ordering when an ordinary control changes reactive slider bounds',async()=>{
    const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement});
    try {
      const source=`export default scene({},s=>{
        const wide=s.toggle('wide',{default:false});
        const x=s.slider('x',{reactive:true,default:1,min:0,max:wide?10:3});
        const a=s.circle('a');s.bind(a,[x],x=>({radius:x}));s.wait(2);
      });`;
      expect((await player.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
      const first=player.setControl({scene:'a',id:'x',value:2});
      const bounds=player.setControl({scene:'a',id:'wide',value:true});
      const last=player.setControl({scene:'a',id:'x',value:8});
      await Promise.all([first,bounds,last]);
      expect(player.getState().controls.find(c=>c.id==='x')?.value).toBe(8);
      expect(rendering.frame?.elements[0].geometry.radius).toBe(8);
    }finally{player.dispose();}
  });
  it('keeps seek barriers and independent controls ordered through a 500-input burst',async()=>{
    const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement});
    try {
      const source=`export default scene({},s=>{
        const x=s.slider('x',{reactive:true,default:1,min:0,max:500});
        const y=s.slider('y',{reactive:true,default:1,min:0,max:500});
        const a=s.circle('a');s.bind(a,[x,y],(x,y)=>({position:[x,y]}));s.wait(2);
      });`;
      expect((await player.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
      const requests:Promise<unknown>[]=[];
      const update=vi.spyOn(SourceCompiler.prototype,'update');
      for(let i=0;i<500;i++) {
        if(i===250)requests.push(player.seek({scene:'a',time:1}));
        requests.push(player.setControl({scene:'a',id:i%2?'y':'x',value:i}));
      }
      await Promise.all(requests);
      expect(update).toHaveBeenCalledTimes(4);
      expect(rendering.frame?.elements[0].position).toEqual([498,499,0]);
      expect(player.getState()).toMatchObject({status:'paused',time:1});
    }finally{player.dispose();}
  });
  it('keeps playing without resetting the audio clock or live behaviors', async () => {
    const factory=vi.fn(()=>({update:()=>false,dispose:vi.fn()}));
    const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement,behaviors:{tracker:factory}});
    try {
      expect((await player.submit({type:'load',scenes:[{id:'a',source:reactive.replace("s.bind(ball", "s.behavior(ball,{type:'custom',name:'tracker'});s.bind(ball")}]})).ok).toBe(true);
      await player.seek({scene:'a',time:1});
      await player.play();
      const instances=factory.mock.calls.length;
      const stop=vi.spyOn(AudioClock.prototype,'stop');
      const compile=vi.spyOn(SourceCompiler.prototype,'compile');
      now+=500;
      await player.setControl({scene:'a',id:'size',value:2});
      expect(player.getState()).toMatchObject({time:1.5,status:'playing',duration:4});
      expect(rendering.frame?.elements[0]).toMatchObject({position:[1.5,0,0],geometry:{radius:0.9}});
      expect(stop).not.toHaveBeenCalled();
      expect(compile).not.toHaveBeenCalled();
      expect(factory.mock.calls).toHaveLength(instances);
      expect(frames.size).toBe(1);
      await player.seek({scene:'a',time:0.5});
      expect(rendering.frame?.elements[0]).toMatchObject({position:[0.5,0,0],geometry:{radius:0.9}});
    } finally { player.dispose(); }
  });

  it('coalesces queued input to the latest value while one callback request is in flight', async () => {
    const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement});
    try {
      await player.submit({type:'load',scenes:[{id:'a',source:reactive}]});
      const original=SourceCompiler.prototype.update;
      let release!:()=>void;
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const update=vi.spyOn(SourceCompiler.prototype,'update').mockImplementationOnce(async function(this: SourceCompiler,...args){await gate;return original.apply(this,args);});
      const first=player.setControl({scene:'a',id:'size',value:1.5});
      await vi.waitFor(()=>expect(update).toHaveBeenCalledTimes(1));
      const second=player.setControl({scene:'a',id:'size',value:2});
      const last=player.setControl({scene:'a',id:'size',value:3});
      expect(second).toBe(last);
      release();await Promise.all([first,second,last]);
      expect(update).toHaveBeenCalledTimes(2);
      expect(update.mock.calls.map(call=>call[1].size)).toEqual([1.5,3]);
      expect(player.getState().controls[0].value).toBe(3);
      expect(rendering.frame?.elements[0].geometry.radius).toBeCloseTo(1.35);
    } finally { player.dispose(); }
  });

  it('preserves ordering across source edits and reports a coalesced failure to every caller', async () => {
    const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement});
    try {
      await player.submit({type:'load',scenes:[{id:'a',source:reactive}]});
      const update=vi.spyOn(SourceCompiler.prototype,'update');
      const first=player.setControl({scene:'a',id:'size',value:1.5});
      const edit=player.submit({type:'replace',scene:'a',source:reactive.replace('0.45*value','value===3?-1:0.5*value')});
      const last=player.setControl({scene:'a',id:'size',value:2});
      await Promise.all([first,edit,last]);
      expect(update.mock.calls.map(call=>call[1].size)).toEqual([1.5,2]);
      expect(rendering.frame?.elements[0].geometry.radius).toBe(1);
      const a=player.setControl({scene:'a',id:'size',value:1});
      const b=player.setControl({scene:'a',id:'size',value:3});
      await Promise.all([expect(a).rejects.toThrow('radius'),expect(b).rejects.toThrow('radius')]);
      expect(player.getState().controls[0].value).toBe(2);
    } finally { player.dispose(); }
  });
});
const wait = (seconds: number, end = "hold") => `export default scene({end:"${end}"},s=>s.wait(${seconds}));`;

describe("player navigation and live source updates", () => {
  it('schedules stateful behaviors while paused and stops when they settle', async () => {
    let ticks=0;
    const disposed=vi.fn();
    const player=createPlayer({canvas:{} as HTMLCanvasElement,behaviors:{pulse:()=>({
      update:context=>{context.element.opacity=Math.min(1,++ticks/4);return ticks<4;},dispose:disposed,
    })}});
    try {
      expect((await player.submit({type:'load',scenes:[{id:'a',source:`export default scene({},s=>{const a=s.circle('a');s.behavior(a,{type:'custom',name:'pulse'});s.wait(2);});`}]})).ok).toBe(true);
      expect(player.getState().status).toBe('paused');expect(frames.size).toBe(1);
      for(let i=0;i<3;i++)advance(1/60);
      expect(rendering.frame?.elements[0].opacity).toBe(1);expect(player.getState().time).toBe(0);expect(frames.size).toBe(0);
      await player.seek({scene:'a',time:1});expect(disposed).toHaveBeenCalledTimes(1);
    } finally {player.dispose();}
    expect(disposed).toHaveBeenCalledTimes(2);expect(frames.size).toBe(0);
  });

  it('rejects unknown custom behavior factories without replacing the valid scene', async () => {
    const player=createPlayer({canvas:{} as HTMLCanvasElement});
    try {
      await player.submit({type:'load',scenes:[{id:'a',source:wait(2)}]});
      const result=await player.submit({type:'load',scenes:[{id:'b',source:`export default scene({},s=>{const a=s.circle('a');s.behavior(a,{type:'custom',name:'missing'});s.wait(2);});`}]});
      expect(result.ok).toBe(false);expect(player.getState().scene).toBe('a');
    } finally {player.dispose();}
  });

  it("passes the host palette through compilation, playback, and clearing", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement, palette: {
      colors: { BLACK: "#222222", WHITE: "#dddddd" }, background: "WHITE", foreground: "BLACK",
    } });
    try {
      expect((await player.submit({ type: "load", scenes: [{ id: "a", source: "export default scene({},s=>s.circle('dot'));" }] })).ok).toBe(true);
      expect(rendering.frame?.elements[0].fill).toBe("BLACK");
      expect(rendering.options?.background).toBe("WHITE");
      expect((await player.submit({ type: "load", scenes: [] })).ok).toBe(true);
      expect(rendering.frame?.elements).toEqual([]);
      expect(rendering.options?.background).toBe("WHITE");
    } finally { player.dispose(); }
  });

  it("changes display colors while preserving playback position, controls, and authored scenes", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    try {
      await player.submit({ type: 'load', scenes: [{ id: 'a', source: first }, { id: 'b', source: second }] });
      await player.seek({ scene: 'a', time: 0.5 });
      await player.setControl({ scene: 'a', id: 'scale', value: 2 });
      const before = player.getState();
      const frame = structuredClone(rendering.frame);
      const light = { ...THREE_BLUE_ONE_BROWN_PALETTE, colors: { ...THREE_BLUE_ONE_BROWN_PALETTE.colors, BLACK: '#ffffff', WHITE: '#000000' } };
      player.setDisplayPalette(light);
      expect(player.getState()).toEqual(before);
      expect(rendering.frame).toEqual(frame);
      expect(rendering.palette?.colors.BLACK).toBe('#ffffff');
      expect(rendering.palette?.colors.WHITE).toBe('#000000');
      await player.play();
      now += 250;
      player.setDisplayPalette(THREE_BLUE_ONE_BROWN_PALETTE);
      expect(player.getState()).toMatchObject({ scene: 'a', status: 'playing', time: 0.75 });
      expect(player.getState().controls[0].value).toBe(2);
      await player.seek({ scene: 'b', time: 1 });
      expect(rendering.palette?.colors.BLACK).toBe('#000000');
      expect(() => player.setDisplayPalette({ colors: { BLACK: '#fff', WHITE: '#000' }, background: 'BLACK', foreground: 'WHITE' })).toThrow('Display palette is missing');
    } finally { player.dispose(); }
  });

  it("seeks directly using reconstructed final predecessor states, clamps, and pauses", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    expect((await player.submit({ type: "load", scenes: [{ id: "a", source: first }, { id: "b", source: second }] })).ok).toBe(true);
    await player.seek({ scene: "b", time: 1 });
    expect(player.getState()).toMatchObject({ scene: "b", time: 1, duration: 2, status: "paused" });
    expect(rendering.frame?.elements.find(element => element.id === "dot")?.position).toEqual([5, 0, 0]);
    await player.seek({ scene: "b", time: 100 });
    expect(player.getState().time).toBe(2);
    await player.previous();
    expect(player.getState()).toMatchObject({ scene: "a", time: 0, status: "paused" });
    player.dispose();
  });

  it("uses current upstream controls for seeks, preserving time when controls change", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: first }, { id: "b", source: second }] });
    await player.seek({ scene: "b", time: 1 });
    await player.setControl({ scene: "a", id: "scale", value: 2 });
    expect(player.getState().time).toBe(1);
    expect(rendering.frame?.elements.find(element => element.id === "dot")?.geometry.radius).toBe(2);
    await player.seek({ scene: "a", time: 0.5 });
    expect(player.getState().controls[0].value).toBe(2);
    player.dispose();
  });

  it("restarts active replacement while preserving controls and user orbit", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: first }] });
    await player.setControl({ scene: "a", id: "scale", value: 2 });
    rendering.orbit = { yaw: 0.4, pitch: -0.2 };
    await player.seek({ scene: "a", time: 2 });
    await player.play();
    const result = await player.submit({ type: "replace", scene: "a", source: first.replace("[3,0]", "[5,0]") });
    expect(result.ok).toBe(true);
    expect(player.getState()).toMatchObject({ time: 0, status: "playing" });
    expect(player.getState().controls[0].value).toBe(2);
    expect(rendering.orbit).toEqual({ yaw: 0.4, pitch: -0.2 });
    player.dispose();
  });

  it("failed submissions leave valid playback, revision, and scene unchanged", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: first }] });
    await player.seek({ scene: "a", time: 1 });
    await player.play();
    const before = player.getState();
    const result = await player.submit({ type: "replace", scene: "a", source: "export default missing();" });
    expect(result.ok).toBe(false);
    expect(player.getState()).toMatchObject({ scene: before.scene, revision: before.revision, time: before.time, status: "playing" });
    player.dispose();
  });

  it("earlier insert resets the handoff while later insert retains current time", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: first }, { id: "b", source: second }] });
    await player.seek({ scene: "b", time: 1 });
    await player.submit({ type: "insert", after: "b", scenes: [{ id: "later", source: wait(1) }] });
    expect(player.getState()).toMatchObject({ scene: "b", time: 1 });
    await player.submit({ type: "insert", after: null, scenes: [{ id: "earlier", source: wait(1) }] });
    expect(player.getState()).toMatchObject({ scene: "b", time: 0 });
    player.dispose();
  });

  it("advances only during playback and holds at the last scene", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: wait(1, "advance") }, { id: "b", source: wait(2, "advance") }] });
    await player.seek({ scene: "a", time: 1 });
    expect(player.getState()).toMatchObject({ scene: "a", status: "paused" });
    await player.play();
    advance(1);
    expect(player.getState()).toMatchObject({ scene: "b", time: 0, status: "playing" });
    advance(2);
    expect(player.getState()).toMatchObject({ scene: "b", time: 2, status: "ended" });
    player.dispose();
  });

  it('appends without pausing the active clock and preserves interactive predecessor state', async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: 'load', scenes: [{ id: 'a', source: first }] });
    await player.setControl({ scene: 'a', id: 'scale', value: 2 });
    await player.play();
    advance(1);
    const pause = vi.spyOn(player, 'pause');
    const play = vi.spyOn(player, 'play');
    await player.submit({ type: 'insert', after: 'a', scenes: [{ id: 'b', source: second }] });
    expect(player.getState()).toMatchObject({ scene: 'a', time: 1, status: 'playing' });
    expect(player.getState().controls[0].value).toBe(2);
    expect(pause).not.toHaveBeenCalled(); expect(play).not.toHaveBeenCalled();
    advance(0.5);
    expect(player.getState().time).toBe(1.5);
    player.dispose();
  });

  it('prepares only appended scenes, then reconstructs dependent scenes after a control change', async () => {
    const prepare = vi.fn(async (_scenes: CompiledScene[]) => {});
    const sequence = new SceneSequence({ prepare });
    await sequence.submit({ type: 'load', scenes: [{ id: 'a', source: first }] });
    const original = sequence.compiled[0];
    await sequence.setControl('a', 'scale', 2);
    const interactive = sequence.compiled[0];
    await sequence.submit({ type: 'insert', after: 'a', scenes: [{ id: 'b', source: second }] });
    expect(sequence.compiled[0]).toBe(interactive);
    expect(prepare.mock.calls.at(-1)![0]).toHaveLength(1);
    await sequence.setControl('a', 'scale', 3);
    expect(prepare.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(sequence.compiled[0]).not.toBe(original);
    expect(sequence.frame(1, 0).elements.find(element => element.id === 'dot')?.geometry.radius).toBe(3);
    sequence.dispose();
  });

  it("clears rendered output on empty load, and cancels frames/resources on disposal", async () => {
    const disposeSequence = vi.spyOn(SceneSequence.prototype, "dispose");
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: first }] });
    await player.play();
    expect(frames.size).toBe(1);
    await player.submit({ type: "load", scenes: [] });
    expect(player.getState().status).toBe("empty");
    expect(rendering.frame?.elements).toEqual([]);
    expect(frames.size).toBe(0);
    player.dispose();
    expect(rendering.disposed).toBe(true);
    expect(disposeSequence).toHaveBeenCalledOnce();
    expect(() => player.pause()).toThrow("disposed");
  });

  it("locks viewer orbit during camera animations and follows evaluated 2D/3D state", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: `export default scene({mode:"2d",orbit:true},s=>{
      s.play(s.camera.to3D(),{duration:1});s.wait(1);
      s.play(s.camera.to2D(),{duration:1});s.wait(1);
    });` }] });
    for (const [time, enabled] of [[0.5, false], [1.5, true], [2.5, false], [3.5, false]] as const) {
      await player.seek({ scene: "a", time });
      expect(player.getState().orbitEnabled).toBe(enabled);
    }
    player.dispose();
  });

  it("returns successful code submission even when newly requested audio needs a user gesture", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })));
    vi.stubGlobal("AudioContext", class {
      state = "suspended";
      destination = {};
      currentTime = 0;
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      async decodeAudioData() { return { duration: 2 }; }
      async resume() {}
      async close() {}
    });
    const player = createPlayer({ canvas: {} as HTMLCanvasElement, assets: { voice: { kind: "audio", url: "/voice.wav" } } });
    await player.submit({ type: "load", scenes: [{ id: "a", source: wait(3) }] });
    await player.play();
    const result = await player.submit({ type: "replace", scene: "a", source: `export default scene({audio:"voice"},s=>s.wait(3));` });
    expect(result.ok).toBe(true);
    expect(player.getState()).toMatchObject({ scene: "a", time: 0, status: "blocked" });
    expect(player.getState().error).toContain("blocked");
    player.dispose();
  });

  it("isolates subscriber errors so other listeners and playback continue", async () => {
    const player = createPlayer({ canvas: {} as HTMLCanvasElement });
    await player.submit({ type: "load", scenes: [{ id: "a", source: wait(3) }] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    player.subscribe(() => { throw new Error("broken host listener"); });
    const listener = vi.fn();
    player.subscribe(listener);
    await player.play();
    advance(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ time: 1, status: "playing" }));
    expect(player.getState().time).toBe(1);
    player.dispose();
  });

  it("stops on interrupted browser audio and resumes visuals and track at the same offset", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })));
    let context!: { state: string; currentTime: number };
    const offsets: number[] = [];
    vi.stubGlobal("AudioContext", class {
      state = "suspended";
      destination = {};
      currentTime = 0;
      constructor() { context = this; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      async decodeAudioData() { return { duration: 4 }; }
      createBufferSource() { return { connect() {}, disconnect() {}, stop() {}, start(_when: number, offset: number) { offsets.push(offset); } }; }
      async resume() { this.state = "running"; }
      async close() {}
    });
    const player = createPlayer({ canvas: {} as HTMLCanvasElement, assets: { voice: { kind: "audio", url: "/voice.wav" } } });
    await player.submit({ type: "load", scenes: [{ id: "a", source: `export default scene({audio:'voice'},s=>{
      const dot=s.circle('dot');s.play(dot.moveTo([4,0]),{duration:4,ease:'linear'});
    });` }] });
    await player.play();
    context.currentTime = 1.25;
    advance(1.25);
    context.state = "suspended";
    advance(0.25);
    expect(player.getState()).toMatchObject({ time: 1.25, status: "blocked" });
    expect(player.getState().error).toContain("interrupted");
    expect(rendering.frame?.elements[0].position[0]).toBe(1.25);
    expect(frames.size).toBe(0);
    await player.play();
    expect(offsets).toEqual([0, 1.25]);
    expect(player.getState()).toMatchObject({ time: 1.25, status: "playing" });
    expect(player.getState().error).toBeUndefined();
    context.currentTime = 2;
    advance(0.75);
    expect(player.getState().time).toBe(2);
    expect(rendering.frame?.elements[0].position[0]).toBe(2);
    player.dispose();
  });
});

it('cancels capture before replacing the active compilation, even when a later scene changes',async()=>{
  const canvas=new Canvas(),events:string[]=[];
  const player=createPlayer({canvas:canvas as unknown as HTMLCanvasElement,behaviors:{observe:()=>({input:e=>{events.push(e.type);},dispose:()=>{events.push('dispose');}})}});
  const source=`export default scene({},s=>{const a=s.circle('a');s.behavior(a,{type:'drag'});s.behavior(a,{type:'custom',name:'observe'});s.wait(2);});`;
  try {
    expect((await player.submit({type:'load',scenes:[{id:'a',source},{id:'b',source:wait(2)}]})).ok).toBe(true);
    await player.seek({scene:'a',time:1});events.length=0;
    canvas.send('pointerdown');expect(canvas.captures.size).toBe(1);
    // Appends retain the compiled instance and must preserve the gesture.
    await player.submit({type:'insert',after:'b',scenes:[{id:'c',source:wait(1)}]});
    expect(canvas.captures.size).toBe(1);
    expect((await player.submit({type:'replace',scene:'b',source:wait(3)})).ok).toBe(true);
    expect(canvas.captures.size).toBe(0);expect(events).toEqual(['start','cancel','dispose']);
    expect(player.getState()).toMatchObject({scene:'a',time:1,status:'paused'});
    expect(canvas.send('pointermove',375,200).prevented).toBe(false);
    canvas.send('pointerdown');canvas.send('pointermove',375,200);
    expect(rendering.frame?.elements[0].position[0]).toBeCloseTo(2);
  } finally {player.dispose();}
});

it('keeps backend errors blocking even if another scene is submitted',async()=>{
  const player=createPlayer({canvas:new Canvas() as unknown as HTMLCanvasElement});
  const failure=new Error('Device failed and fallback unavailable');
  vi.spyOn(CanvasRenderer.prototype,'render').mockImplementationOnce(function(this:CanvasRenderer){this.onError?.(failure);});
  const scenes=[{id:'small',source:"export default scene({},s=>{s.rectangle('r');s.wait(1)});"}];
  try{
    expect((await player.submit({type:'load',scenes})).ok).toBe(true);
    expect(player.getState()).toMatchObject({status:'blocked',error:failure.message});
    expect((await player.submit({type:'load',scenes})).ok).toBe(true);
    expect(player.getState()).toMatchObject({status:'blocked',error:failure.message});
    await expect(player.play()).rejects.toBe(failure);
    expect(frames.size).toBe(0);
  }finally{player.dispose();}
});
