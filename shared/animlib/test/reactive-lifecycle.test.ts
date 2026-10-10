import { describe, expect, it } from 'vitest';
import { SceneSequence } from '../src/sequence.js';
import { SourceCompiler } from '../src/compiler-client.js';

const source=`export default scene({},s=>{
  const x=s.slider('x',{reactive:true,default:1,min:0.1,max:3});
  const factor=s.toggle('factor',{default:false})?2:1;
  const a=s.sphere('a');s.bind(a,[x],x=>({radius:x*factor}));s.keep(a);s.wait(2);
});`;
const compilerOf=(s:SceneSequence)=>(s as unknown as {compiler:SourceCompiler}).compiler;
const sessions=(compiler:SourceCompiler)=>compiler as unknown as {sessions:Map<unknown,number>;programs:Map<number,unknown>;failWorker(error:Error):void};

describe('reactive transactions and resource lifecycle',()=>{
  it('rebuilds captured ordinary values and keeps reactive inputs through edits and inserts',async()=>{
    const s=new SceneSequence();
    try {
      expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
      await s.setControl('a','x',2);
      await s.setControl('a','factor',true);
      expect(s.frame(0,1).elements[0].geometry.radius).toBe(4);
      await s.setControl('a','x',1.5);
      expect(s.frame(0,1).elements[0].geometry.radius).toBe(3);
      expect((await s.submit({type:'replace',scene:'a',source:source.replace('x*factor','x*factor+1')})).ok).toBe(true);
      expect(s.frame(0,1).elements[0].geometry.radius).toBe(4);
      expect((await s.submit({type:'insert',after:null,scenes:[{id:'prefix',source:'export default scene({},s=>s.wait(1));'}]})).ok).toBe(true);
      await s.setControl('a','x',2);
      expect(s.frame(1,1).elements[0].geometry.radius).toBe(5);
    }finally{s.dispose();}
  });
  it('preserves downstream reactive values when replacing their incoming frame',async()=>{
    const s=new SceneSequence();
    const suffix=`export default scene({},s=>{
      const y=s.slider('y',{reactive:true,default:1,min:0.1,max:3});const a=s.previous.get('a');
      s.bind(a,[y],y=>({scale:y}));s.wait(2);
    });`;
    try {
      expect((await s.submit({type:'load',scenes:[{id:'a',source},{id:'b',source:suffix}]})).ok).toBe(true);
      await s.setControl('b','y',2.5);await s.setControl('a','x',2);
      expect(s.frame(1,1).elements[0]).toMatchObject({scale:2.5,geometry:{radius:2}});
      await s.setControl('b','y',1.5);
      expect(s.frame(1,1).elements[0]).toMatchObject({scale:1.5,geometry:{radius:2}});
      expect(sessions(compilerOf(s)).programs.size).toBe(2);
    }finally{s.dispose();}
  });
  it('rolls back all patches if a later callback or preparation fails',async()=>{
    let fail=false;
    const s=new SceneSequence({prepare:async()=>{if(fail)throw Error('prepare failed');}});
    try {
      const multiple=source.replace('s.keep(a);',`const b=s.circle('b');s.bind(b,[x],x=>{if(x===2)throw Error('second callback');return {radius:x};});s.keep(a);`);
      await s.submit({type:'load',scenes:[{id:'a',source:multiple},{id:'b',source:'export default scene({},s=>s.wait(1));'}]});
      const frame=s.frame(0,1);
      await expect(s.setControl('a','x',2)).rejects.toThrow('second callback');
      expect(s.frame(0,1)).toEqual(frame);
      fail=true;await expect(s.setControl('a','x',3)).rejects.toThrow('prepare failed');
      expect(s.frame(0,1)).toEqual(frame);
      fail=false;await s.setControl('a','x',1.5);
      expect(s.frame(0,1).elements.map(e=>e.geometry.radius)).toEqual([1.5,1.5]);
    }finally{s.dispose();}
  });
  it('bounds retained programs across repeated successful and failed replacements',async()=>{
    const s=new SceneSequence(),runtime=sessions(compilerOf(s));
    try {
      for(let i=0;i<40;i++) {
        expect((await s.submit({type:'load',scenes:[{id:'a',source}]})).ok).toBe(true);
        expect(runtime.programs.size).toBe(1);
        expect((await s.submit({type:'load',scenes:[{id:'candidate',source},{id:'bad',source:'invalid source'}]})).ok).toBe(false);
        expect(runtime.sessions.size).toBe(1);expect(runtime.programs.size).toBe(1);
        await s.setControl('a','x',1.5);
      }
    }finally{s.dispose();}
    expect(runtime.programs.size).toBe(0);expect(runtime.sessions.size).toBe(0);
    await expect(s.setControl('a','x',2)).rejects.toThrow('disposed');
  });
  it('recovers lost callback programs from committed inputs and releases the old generation',async()=>{
    const s=new SceneSequence(),compiler=compilerOf(s);
    try {
      await s.submit({type:'load',scenes:[{id:'a',source}]});
      await s.setControl('a','factor',true);await s.setControl('a','x',1.5);
      sessions(compiler).failWorker(Error('simulated worker loss'));
      await s.setControl('a','x',2);
      expect(s.frame(0,1).elements[0].geometry.radius).toBe(4);
      const recovered=s.compiled[0];await s.setControl('a','x',2.5);
      expect(s.compiled[0]).toBe(recovered);
      expect(s.frame(0,1).elements[0].geometry.radius).toBe(5);
    }finally{s.dispose();}
  });
});
