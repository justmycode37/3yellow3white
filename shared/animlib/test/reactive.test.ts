import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileSource, createSceneProgram } from '../src/compiler.js';
import { SourceCompiler } from '../src/compiler-client.js';
import { SceneSequence } from '../src/sequence.js';
import { evaluateScene } from '../src/timeline.js';

export const reactiveSource = `export default scene({end:'hold'}, s => {
  const size=s.slider('size',{reactive:true,default:1,min:0.5,max:3});
  const ball=s.sphere('ball',{radius:0.45});
  s.bind(ball,[size], value=>({radius:0.45*value}));
  s.play(ball.moveTo([4,0]),{duration:4,ease:'linear'});
  s.keep(ball);
});`;
const sequences: SceneSequence[] = [];
function sequence() { const s = new SceneSequence(); sequences.push(s); return s; }
afterEach(() => { sequences.splice(0).forEach(s => s.dispose()); vi.restoreAllMocks(); });

describe('sandboxed reactive bindings', () => {
  it('retains a scene program, updates only the declared dependencies, and evaluates serializable snapshots', async () => {
    const compiler = new SourceCompiler();
    try {
      const scene = await compiler.compile(reactiveSource);
      expect(compiler.canUpdate(scene)).toBe(true);
      expect(scene.reactiveBindings).toEqual([{ target: 'ball', controls: ['size'], properties: { radius: 0.45 } }]);
      expect(await compiler.update(scene, { size: 2 }, ['unrelated'])).toEqual([]);
      expect(await compiler.update(scene, { size: 2 }, ['size'])).toEqual([{ target: 'ball', properties: { radius: 0.9 } }]);
      const snapshot = JSON.parse(JSON.stringify(scene));
      expect(evaluateScene(snapshot, 2).elements[0]).toMatchObject({ geometry: { radius: 0.45 }, position: [2,0,0] });
      compiler.retain([]);
      expect(compiler.canUpdate(scene)).toBe(false);
      await expect(compiler.update(scene, { size: 2 }, ['size'])).rejects.toThrow('unavailable');
    } finally { compiler.dispose(); }
  });

  it('runs slider callbacks without rebuilding the changed scene or its prefix, preserving seek results', async () => {
    const s = sequence();
    expect((await s.submit({ type: 'load', scenes: [{ id: 'before', source: 'export default scene({},s=>s.wait(1));' }, { id: 'live', source: reactiveSource }] })).ok).toBe(true);
    const [prefix, scene] = s.compiled, tracks = scene.tracks;
    const compile = vi.spyOn(SourceCompiler.prototype, 'compile');
    await s.setControl('live', 'size', 2);
    expect(compile).not.toHaveBeenCalled();
    expect(s.compiled[0]).toBe(prefix);
    expect(s.compiled[1]).toBe(scene);
    expect(scene.tracks).toBe(tracks);
    expect(s.frame(1, 2).elements[0]).toMatchObject({ geometry: { radius: 0.9 }, position: [2,0,0] });
    expect(s.frame(1, 0).elements[0]).toMatchObject({ geometry: { radius: 0.9 }, position: [0,0,0] });
    const frame = s.frame(1, 2);
    await s.setControl('live', 'size', 1);
    await s.setControl('live', 'size', 2);
    expect(s.frame(1, 2)).toEqual(frame);
    await s.setControl('live', 'size', 99);
    expect(scene.controls[0].value).toBe(3);
  });

  it('uses the current values of multiple dependencies without running unrelated callbacks', async () => {
    const s = sequence();
    const source = `export default scene({},s=>{
      const x=s.slider('x',{reactive:true,default:1,min:0,max:5});
      const y=s.slider('y',{reactive:true,default:1,min:0,max:5});
      const a=s.sphere('a'), b=s.sphere('b');
      s.bind(a,[x,y],(x,y)=>({position:[x,y]}));
      s.bind(b,[y],y=>({radius:y}));s.wait(1);
    });`;
    expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
    await s.setControl('a','x',3);
    await s.setControl('a','y',2);
    expect(s.frame(0,0).elements[0].position).toEqual([3,2,0]);
    expect(s.frame(0,0).elements[1].geometry.radius).toBe(2);
  });

  it('updates downstream handoffs atomically and retains the previous valid values on failure', async () => {
    const s = sequence();
    const next = `export default scene({},s=>{const ball=s.previous.get('ball');s.play(ball.moveTo([8,0]),{duration:4,ease:'linear'});});`;
    expect((await s.submit({type:'load',scenes:[{id:'a',source:reactiveSource},{id:'b',source:next}]})).ok).toBe(true);
    const compile = vi.spyOn(SourceCompiler.prototype,'compile');
    await s.setControl('a','size',2);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(compile.mock.calls[0][0]).toBe(next);
    expect(s.frame(1,2).elements[0]).toMatchObject({geometry:{radius:0.9},position:[6,0,0]});
    const before = s.frame(0,2), compiled = s.compiled.slice();
    compile.mockRejectedValueOnce(new Error('downstream failed'));
    await expect(s.setControl('a','size',3)).rejects.toThrow('downstream failed');
    expect(s.frame(0,2)).toEqual(before);
    expect(s.compiled).toEqual(compiled);
    expect(s.compiled[0].controls[0].value).toBe(2);
    await s.setControl('a','size',1);
    expect(s.frame(1,2).elements[0].geometry.radius).toBe(0.45);
  });

  it('validates updates, recovers from a bad callback value, and enforces sandbox limits on each invocation', async () => {
    const s = sequence();
    const source = reactiveSource.replace('radius:0.45*value', 'radius:value===2?-1:0.45*value');
    expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
    await expect(s.setControl('a','size',2)).rejects.toThrow('radius');
    expect(s.compiled[0].controls[0].value).toBe(1);
    await s.setControl('a','size',3);
    expect(s.frame(0,0).elements[0].geometry.radius).toBeCloseTo(1.35);
    const program = await createSceneProgram(reactiveSource.replace('value=>({radius:0.45*value})', 'value=>{if(value===2)while(true){};return {radius:value};}'), {}, {executionLimitMs:20});
    try {
      expect(() => program.update({size:2},['size'])).toThrow();
      expect(program.update({size:1},['size'])).toEqual([{target:'ball',properties:{radius:1}}]);
    } finally { program.dispose(); }
  });

  it.each([
    ["value=>({radius:0.45*value})", "value=>({radius:fetch('/escape')})"],
    ["value=>({radius:0.45*value})", "value=>{s.sphere('extra');return {radius:value};}"],
    ["value=>({radius:0.45*value})", "value=>{s.previous.exiting();return {radius:value};}"],
    ["value=>({radius:0.45*value})", "value=>({radius:Infinity})"],
    ["value=>({radius:0.45*value})", "value=>({text:'unsupported'})"],
    ["radius:0.45", "radius:size*0.45"],
    ["value=>({radius:0.45*value})", "value=>({position:[value,0]})"],
  ])('rejects unsafe, conflicting, or unsupported bindings (%s -> %s)', async (from,to) => {
    await expect(compileSource(reactiveSource.replace(from,to))).rejects.toThrow();
  });

  it('rejects conditional property ownership and leaves the last valid update intact', async () => {
    const s = sequence();
    const source = reactiveSource.replace('value=>({radius:0.45*value})','value=>value===2?{scale:value}:{radius:value}');
    expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
    await expect(s.setControl('a','size',2)).rejects.toThrow('same property keys');
    expect(s.frame(0,1).elements[0].geometry.radius).toBe(1);
  });

  it('applies reactive geometry before surface connectors, without resurrecting removed objects', async () => {
    const source = `export default scene({},s=>{
      const r=s.slider('r',{reactive:true,default:1,min:0.1,max:2});
      const a=s.sphere('a',{position:[0,0,0]}), b=s.sphere('b',{position:[4,0,0]});
      const line=s.line3D('line');s.bind(a,[r],r=>({radius:r}));
      s.connect(line,a,b,{endpoints:'surface'});s.wait(1);s.remove(a);s.wait(1);
    });`;
    const s = sequence();
    expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
    await s.setControl('a','r',2);
    expect(s.frame(0,0).elements.find(e=>e.id==='line')?.geometry.points?.[0]).toEqual([2,0,0]);
    expect(s.frame(0,2).elements.some(e=>e.id==='a')).toBe(false);
  });

  it('releases superseded programs on replacement and failed staged submissions', async () => {
    const s = sequence();
    await s.submit({type:'load',scenes:[{id:'a',source:reactiveSource}]});
    const dispose = vi.spyOn(SourceCompiler.prototype,'retain');
    const original = s.compiled[0];
    expect((await s.submit({type:'load',scenes:[{id:'b',source:reactiveSource},{id:'bad',source:'broken'}]})).ok).toBe(false);
    expect(dispose).toHaveBeenLastCalledWith([original]);
    await s.setControl('a','size',2);
    expect((await s.submit({type:'replace',scene:'a',source:reactiveSource.replace('0.45*value','0.25*value')})).ok).toBe(true);
    expect(s.frame(0,0).elements[0].geometry.radius).toBe(0.5);
  });
});
