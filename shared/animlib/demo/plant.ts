import type { SceneSource } from '../src/types.js';

/** Curves, fills, strokes, growth and bending are all rendered/evaluated by animlib. */
export const plantSource: SceneSource = {
  id: 'plant',
  source: `export default scene({mode:'2d',end:'hold'},s=>{
    s.play(s.camera.animate({height:8.4}),{duration:0});
    s.rectangle('soil',{width:8.4,height:1.49,position:[0,-3.035],fill:Color.DARK_BROWN});
    s.line('soil-surface',{points:[[-4.2,-2.29],[4.2,-2.29]],stroke:Color.GOLD_E,strokeWidth:0.06});

    const roots = [
      [[-0.01,-2.27],[-0.01,-2.63],[-0.02,-2.95],[-0.44,-3.6]],
      [[0,-2.63],[-0.52,-2.84],[-0.87,-2.96],[-1.48,-3.43]],
      [[-0.87,-2.96],[-1.19,-2.98],[-1.56,-3]],
      [[-0.01,-2.67],[0.46,-2.92],[0.88,-3.11],[1.64,-3.2]],
      [[0.88,-3.11],[1.12,-3.33],[1.38,-3.52]],
    ].map((points,i)=>s.path('root-'+i,{points,curve:'smooth',fill:Color.NONE,
      stroke:Color.GREEN_B,strokeWidth:i===2||i===4?0.05:0.07}));
    s.play(s.group('roots',roots).fadeIn(),{duration:0.65});

    const stem=s.path('stem',{d:'M-.01 -2.34 C-.01 -2.2 -.01 -2.1 -.01 -2',
      fill:Color.NONE,stroke:Color.GREEN,strokeWidth:0.19});
    s.play(stem.morphTo({kind:'path',d:'M-.01 -2.34 C-.08 -.6 .04 .7 -.01 2.09'}),{duration:1.4});

    // Local origins are the attachment points. Blade and vein share a bend field.
    function leaf(id,position,edge,vein,fill){
      const tipX=edge[2][0];
      const point=(p,bend)=>[p[0],p[1]+bend*(p[0]/tipX)**2].join(' ');
      const bladeData=bend=>'M0 0 C'+edge.slice(0,3).map(p=>point(p,bend)).join(' ')+
        ' C'+edge.slice(3).map(p=>point(p,bend)).join(' ')+' 0 0 Z';
      const veinData=bend=>'M0 0 C'+vein.map(p=>point(p,bend)).join(' ');
      const blade=s.path(id+'-blade',{d:bladeData(0),fill,stroke:Color.GREEN_B,strokeWidth:0.045});
      const midrib=s.path(id+'-vein',{d:veinData(0),fill:Color.NONE,stroke:Color.GREEN_A,strokeWidth:0.035});
      const group=s.group(id,[blade,midrib],{position,scale:0.01});
      s.play(group.scaleTo(1),{duration:0.8});
      return bend=>[
        blade.morphTo({kind:'path',d:bladeData(bend)}),
        midrib.morphTo({kind:'path',d:veinData(bend)}),
      ];
    }
    const lower=leaf('lower-leaf',[-.01,-.5],
      [[-.84,-.63],[-2.09,-.28],[-2.47,.86],[-1.47,1.10],[-.4,.89]],
      [[-.75,.36],[-1.68,.61],[-2.47,.86]],Color.GREEN_D);
    const right=leaf('right-leaf',[-.01,.9],
      [[.24,.47],[.78,.59],[1.21,.43],[.96,.04],[.49,-.15]],
      [[.40,.20],[.85,.30],[1.21,.43]],Color.GREEN);
    const upper=leaf('upper-leaf',[-.01,2.04],
      [[-.88,-.02],[-1.54,.57],[-1.75,1.42],[-.8,1.16],[-.04,.92]],
      [[-.5,.42],[-1.11,.91],[-1.75,1.42]],Color.GREEN_D);
    s.wait(0.6);
    s.play([...lower(.12),...right(-.08),...upper(.09)],{duration:1.2});
    s.play([...lower(0),...right(0),...upper(0)],{duration:1.2});
    s.wait(1);
  });`,
};
