import type { SceneSource } from '../src/types.js';

/** These examples use the same sandboxed source API as the production player. */
export const graphSource: SceneSource = {
  id: 'function-graph',
  source: `export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:8.5,distance:12,yaw:0.55,pitch:-0.55,target:[0,-0.25,0]}),{duration:0});
    const amplitude=s.slider('amplitude',{label:'Amplitude',default:1.1,min:0.2,max:1.8,step:0.05});
    const frequency=s.slider('frequency',{label:'Frequency',default:1.4,min:0.5,max:2.5,step:0.05});
    const shading=s.select('shading',{label:'Surface shading',default:'smooth',options:['smooth','flat','unlit']});
    const f=(x,y)=>amplitude*Math.cos(frequency*x)*Math.sin(frequency*y)*Math.exp(-0.12*(x*x+y*y));
    // The graph is Z=f(X,Y). Rotate its local XY domain into the viewing floor.
    const rotation=[-Math.PI/2,0,0];
    s.surface('wave',{fn:f,xRange:[-2.7,2.7],yRange:[-2.7,2.7],xSegments:28,ySegments:28,
      rotation,fill:'BLUE',shading});
    for(let i=-3;i<=3;i++){
      const p=i*0.9;
      s.line3D('grid-x-'+i,{points:[[-2.9,-1.35,p],[2.9,-1.35,p]],stroke:'GREY_E',strokeWidth:0.012});
      s.line3D('grid-y-'+i,{points:[[p,-1.35,-2.9],[p,-1.35,2.9]],stroke:'GREY_E',strokeWidth:0.012});
    }
    s.line3D('x-axis',{points:[[-3,-1.35,3],[3,-1.35,3]],stroke:'RED_B',strokeWidth:0.025});
    s.line3D('y-axis',{points:[[-3,-1.35,-3],[-3,-1.35,3]],stroke:'TEAL',strokeWidth:0.025});
    s.line3D('z-axis',{points:[[-3,-1.35,-3],[-3,1.5,-3]],stroke:'BLUE_B',strokeWidth:0.025});
    s.wait(1);
  });`,
};

export const flowerSource: SceneSource = {
  id: 'parametric-flower',
  source: `export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:7.6,distance:12,yaw:0.3,pitch:-0.48,target:[0,0.1,0]}),{duration:0});
    const opening=s.slider('opening',{label:'Petal opening',default:0.85,min:0.35,max:1.2,step:0.05});
    const shading=s.select('shading',{label:'Surface shading',default:'smooth',options:['smooth','flat','unlit']});
    function petal(id,angle,length,width,lift,color){
      s.parametricSurface(id,{uSegments:14,vSegments:8,vRange:[-1,1],fill:color,shading,
        fn:(u,v)=>{
          const r=0.12+length*u*opening;
          const w=width*Math.pow(Math.sin(Math.PI*u),0.8)*v;
          const y=1.05+lift*u*u+(1.2-opening)*u+0.24*v*v*Math.sin(Math.PI*u);
          return [r*Math.cos(angle)-w*Math.sin(angle),y,r*Math.sin(angle)+w*Math.cos(angle)];
        }});
    }
    for(let i=0;i<7;i++)petal('outer-petal-'+i,i*Math.PI*2/7,2.05,0.8,0.18,i%2?'MAROON_B':'RED_A');
    for(let i=0;i<5;i++)petal('inner-petal-'+i,(i+0.35)*Math.PI*2/5,1.25,0.58,0.4,'MAROON_A');
    const stem=[];
    for(let i=0;i<=20;i++){
      const t=i/20;
      stem.push([0.18*Math.sin(Math.PI*t),-2.35+3.4*t,0.12*Math.sin(Math.PI*2*t)]);
    }
    s.tube('stem',{points:stem,radius:0.075,radialSegments:8,fill:'GREEN_D'});
    for(let side=-1;side<=1;side+=2){
      s.parametricSurface('leaf-'+side,{uSegments:12,vSegments:6,vRange:[-1,1],fill:'GREEN',shading,
        fn:(u,v)=>[0.15+side*1.35*u,-0.9+side*0.32+0.65*u+0.22*v*v*Math.sin(Math.PI*u),
          0.4*v*Math.sin(Math.PI*u)+0.24*Math.sin(Math.PI*u)]});
    }
    s.sphere('flower-center',{radius:0.3,position:[0,1.2,0],fill:'GOLD',stroke:'none'});
    s.wait(1);
  });`,
};

export const solidsSource: SceneSource = {
  id: 'solids-and-tubes',
  source: `export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:7.8,distance:14,yaw:0.32,pitch:-0.3,target:[0,0,0]}),{duration:0});
    const turns=s.slider('turns',{label:'Helix turns',default:2.5,min:1,max:4,step:0.25});
    const radius=s.slider('tube-radius',{label:'Tube radius',default:0.11,min:0.05,max:0.22,step:0.01});
    s.box('box',{width:1.15,height:1.15,depth:1.15,position:[-2.1,1,0],rotation:[0,0.35,0],fill:'BLUE'});
    s.cone('cone',{radius:0.62,height:1.4,radialSegments:24,position:[0,1,0],fill:'GOLD'});
    s.cylinder('cylinder',{radius:0.55,height:1.3,radialSegments:24,position:[2.1,1,0],fill:'TEAL'});
    s.torus('torus',{radius:0.69,tubeRadius:0.23,radialSegments:32,tubularSegments:12,
      position:[-1.8,-1.2,0],rotation:[0.85,0,0],fill:'MAROON_B'});
    const points=[];
    for(let i=0;i<=80;i++){
      const t=i/80,angle=t*Math.PI*2*turns;
      points.push([0.68*Math.cos(angle),-1.1+2.2*t,0.68*Math.sin(angle)]);
    }
    s.tube('helix',{points,radius,radialSegments:10,capped:true,position:[1.15,-1.25,0],fill:'PURPLE_A'});
    s.wait(1);
  });`,
};

export const texturesSource: SceneSource = {
  id: 'procedural-textures',
  source: `export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:7.8,distance:14,yaw:0.25,pitch:-0.25}),{duration:0});
    const pattern=s.select('pattern',{label:'Pattern',default:'marble',options:['none','checker','stripes','noise','marble','wood']});
    const scale=s.slider('scale',{label:'Pattern frequency',default:2,min:0.5,max:6,step:0.1});
    const seed=s.slider('seed',{label:'Noise seed',default:17,min:0,max:100,step:1});
    const bumpStrength=s.slider('bump',{label:'Bump strength',default:0,min:-0.3,max:0.3,step:0.01});
    const metalness=s.slider('metalness',{label:'Metalness',default:0,min:0,max:1,step:0.05});
    const roughness=s.slider('roughness',{label:'Roughness',default:0.35,min:0.05,max:1,step:0.05});
    const specular=s.slider('specular',{label:'Highlight strength',default:0.5,min:0,max:1,step:0.05});
    const emission=s.slider('emission',{label:'Emission',default:0,min:0,max:2,step:0.1});
    const tone=s.select('tone',{label:'Color',default:'blue',options:['blue','gold','copper','silver']});
    const colors={blue:['BLUE_A','BLUE_E'],gold:['GOLD_A','GOLD_E'],copper:['LIGHT_BROWN','DARK_BROWN'],silver:['GREY_A','GREY_D']};
    const fill=colors[tone][0];
    const texture=pattern==='none'?undefined:{pattern,color:colors[tone][1],scale,seed,bumpStrength,offset:[0.25,0.25,0.25]};
    const material={metalness,roughness,specular,emissive:fill,emissiveIntensity:emission};
    s.sphere('sphere',{radius:1.05,position:[-2,0.9,0],fill,texture,material});
    s.box('box',{width:1.7,height:1.7,depth:1.7,position:[1.8,0.9,0],rotation:[0,0.4,0],fill,texture,material});
    s.torus('torus',{radius:0.8,tubeRadius:0.32,position:[-1.8,-1.65,0],rotation:[0.9,0,0],fill,texture,material});
    s.cylinder('cylinder',{radius:0.7,height:1.6,position:[1.8,-1.65,0],fill,texture,material});
    s.wait(1);
  });`,
};

export const spatialSources = [graphSource, flowerSource, solidsSource, texturesSource];

export const spatialScenes = [
  { id: graphSource.id, number: '01', title: 'A function, in space.', category: 'Function surface',
    description: 'A damped wave becomes a continuous landscape. Change its amplitude and frequency, then orbit to explore the peaks and valleys.',
    formula: 'z = A cos(kx) sin(ky) e⁻⁰·¹²⁽ˣ²⁺ʸ²⁾',
    detail: 'The blue surface is sampled from z = f(x, y). The red, green and blue guides mark its X, Y and Z directions.' },
  { id: flowerSource.id, number: '02', title: 'Curves become petals.', category: 'Parametric surfaces',
    description: 'Twelve cupped petals surround a golden center. Each petal and leaf is a curved surface; a swept tube forms the bending stem.',
    formula: '(u, v) → (x, y, z)',
    detail: 'Open the bloom to see the petals spread. Orbit beneath the flower to explore the curved leaves and stem.' },
  { id: solidsSource.id, number: '03', title: 'Shape, then sweep.', category: 'Solids & swept tubes',
    description: 'A box, cone, cylinder and torus share the stage with a helix. Adjust the sweep to turn a slender spring into a sculptural coil.',
    formula: 'path(t) + circular cross-section',
    detail: 'The box has crisp, flat faces. The other solids use smooth shading, revealing their curvature as you orbit.' },
  { id: texturesSource.id, number: '04', title: 'Pattern follows form.', category: 'Textures & materials',
    description: 'Explore patterns, polished metal, matte surfaces and luminous color. Adjust the finish, then orbit to see it catch the light.',
    formula: 'checker · stripes · noise · marble · wood',
    detail: 'Try no pattern, gold color and full metalness for polished gold. Raise roughness for a softer finish. Emission brightens the surface without lighting its neighbors.' },
] as const;
