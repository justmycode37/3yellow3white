/** A real 25-weight neural network restricted to an explicit affine weight slice.
 * Numerical sampling happens once in this module; the standalone source contains
 * immutable samples. This keeps the normal 200 ms sandbox budget unchanged.
 */
const N = 25;
const weights = Array.from({length:N},(_,i)=>i===24?0:i%3===0?0.65+0.39*Math.floor(i/3):i%3===1?0.6*Math.sin(i*1.7):0.55*Math.cos(i*0.7));
const norm = (a: number[]) => Math.sqrt(a.reduce((sum,x)=>sum+x*x,0));
let u = Array.from({length:N},(_,i)=>Math.sin(i*1.73+0.2));
let v = Array.from({length:N},(_,i)=>Math.cos(i*2.17+0.6));
const un=norm(u);u=u.map(x=>x/un);
const uv=u.reduce((sum,x,i)=>sum+x*v[i],0);v=v.map((x,i)=>x-uv*u[i]);
const vn=norm(v);v=v.map(x=>x/vn);
const training=Array.from({length:21},(_,i)=>{
  const x=-Math.PI+2*Math.PI*i/20;
  return [x,Math.sin(1.3*x)+0.35*Math.cos(2.7*x)];
});
function objective(a: number,b: number): [number,number,number] {
  const w=weights.map((x,i)=>x+a*u[i]+b*v[i]);
  let loss=0,ga=0,gb=0;
  for(const [x,y] of training){
    let out=w[24],da=u[24],db=v[24];
    for(let j=0;j<8;j++){
      const k=3*j,t=w[k]*x+w[k+1],sn=Math.sin(t),cs=Math.cos(t);
      out+=w[k+2]*sn;
      da+=u[k+2]*sn+w[k+2]*cs*(u[k]*x+u[k+1]);
      db+=v[k+2]*sn+w[k+2]*cs*(v[k]*x+v[k+1]);
    }
    const r=out-y;loss+=r*r;ga+=2*r*da;gb+=2*r*db;
  }
  return [loss/training.length,ga/training.length,gb/training.length];
}
const height=(a: number,b: number)=>1.5*Math.log(1+objective(a,b)[0])-1.8;
const position=(a: number,b: number,lift: number)=>[0.65*a,height(a,b)+lift,-0.65*b];
let a=4,b=4;
const iterates=[[a,b,objective(a,b)[0]]];
for(let i=0;i<70;i++){
  const [f,ga,gb]=objective(a,b);
  if(Math.hypot(ga,gb)<0.008)break;
  let step=0.26,na=a,nb=b,accepted=false;
  for(let j=0;j<18;j++){
    na=a-step*ga;nb=b-step*gb;
    if(Math.abs(na)<=6&&Math.abs(nb)<=6&&objective(na,nb)[0]<=f-0.15*step*(ga*ga+gb*gb)){accepted=true;break;}
    step*=0.5;
  }
  if(!accepted)break;
  a=na;b=nb;iterates.push([a,b,objective(a,b)[0]]);
}
const heights=Array.from({length:81},(_,i)=>Array.from({length:81},(_,j)=>height(-6+12*i/80,-6+12*j/80)));
const sections=[];
for(let i=-4;i<=4;i+=2){
  const ap=[],bp=[];
  for(let j=0;j<=100;j++){
    const t=-6+12*j/100;ap.push(position(i,t,0.055));bp.push(position(t,i,0.055));
  }
  sections.push(ap,bp);
}
const segments=[];
let totalLength=0;
for(let i=1;i<iterates.length;i++){
  const p=iterates[i-1],q=iterates[i];
  const count=Math.max(2,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/0.022));
  for(let j=1;j<=count;j++){
    const t0=(j-1)/count,t1=j/count;
    const aa=p[0]+(q[0]-p[0])*t0,bb=p[1]+(q[1]-p[1])*t0;
    const ab=p[0]+(q[0]-p[0])*t1,bc=p[1]+(q[1]-p[1])*t1;
    const from=position(aa,bb,0.062),to=position(ab,bc,0.062);
    const length=Math.hypot(to[0]-from[0],to[1]-from[1],to[2]-from[2]);
    segments.push({from,to,marker:position(ab,bc,0.13),length});totalLength+=length;
  }
}
const payload={heights,sections,segments,totalLength,start:position(4,4,0.13),end:position(a,b,0.16)};

/** Numerical evidence for the data-driven scene; never used to bypass compilation. */
export const gradientEvidence={weights,u,v,training,iterates,heights,segments,objective};
export const gradientProof = {
  id: 'gradient',
  title: 'A neural loss landscape',
  kicker: '25 weights · one honest two-dimensional slice',
  description: 'A gold iterate descends through the folded loss surface of a small sine-activation neural network. Its trail follows computed gradients, bends through a valley, and settles near a local minimum.',
  notes: [
    'Network: one scalar input, eight sine hidden units, one scalar output; 25 weights and biases. The 21 fixed training samples follow sin(1.3x) + 0.35 cos(2.7x), x ∈ [−π, π].',
    'Shown parameter family is w = w₀ + αu + βv, where u and v are deterministic orthonormal vectors in ℝ²⁵. Optimization is restricted to this plane; this is not a picture of all 25 dimensions.',
    'Height is 1.5 ln(1 + MSE) − 1.8, a stated monotone display transform. Gradients and Armijo line search optimize the original mean squared error, not this height transform.',
    'Gold trajectory: 33 accepted gradient steps, MSE 6.251854 → 0.359909. Surface, derivative, line search and every trail sample use the same network. Marker centers have a small clearance for visibility.',
    'Teal curves are coordinate sections of the same surface. The low white rectangle is the parameter domain. Orbit the model to inspect ridges, valleys and the path; the camera does not drift.',
    'Numerical samples are deterministically computed once from the visible model code, then embedded in the standalone sandbox scene. No network calls, physics callbacks or extended execution limits are needed.',
    'The subtle checker texture marks equal intervals in the displayed parameter plane. It is not additional loss data; the surface heights and optimization path are unchanged. No bump displacement is applied to the mathematical surface.',
  ],
  sampleTimes: [0.5, 2.5, 5, 8, 11.5, 15],
  source: `export default scene({mode:'3d',orbit:false,end:'hold',background:'BLACK'},s=>{
    // Exact deterministic samples of the network and Armijo run above.
    const data=${JSON.stringify(payload)};
    let model,marker;
    s.view('loss-model',{rect:[0,0,1,1],orbit:true,orbitHitTest:'geometry',
      camera:{height:13.4,distance:18,yaw:-0.6,pitch:-0.95,target:[0,0.5,0]}},v=>{
      model=v;
      v.surface('loss-surface',{fn:(x,y)=>data.heights[Math.round((x+3.9)/7.8*80)][Math.round((y+3.9)/7.8*80)],
        xRange:[-3.9,3.9],yRange:[-3.9,3.9],xSegments:80,ySegments:80,
        rotation:[-Math.PI/2,0,0],fill:'BLUE_D',shading:'smooth',stroke:'none',
        texture:{pattern:'checker',color:'BLUE_C',scale:[1/0.65,1/0.65,0.001],offset:[0,0,.25]},
        material:{roughness:.82,specular:.18}});
      for(let i=0;i<data.sections.length;i++){
        v.path('coordinate-section-'+i,{points:data.sections[i],stroke:'TEAL_D',strokeWidth:0.016,strokeProfile:'round',fill:'none'});
      }
      const base=-1.8;
      v.path('domain',{points:[[-3.9,base,-3.9],[3.9,base,-3.9],[3.9,base,3.9],[-3.9,base,3.9],[-3.9,base,-3.9]],stroke:'GREY_C',strokeWidth:0.018,strokeProfile:'round',fill:'none'});
      v.arrow3D('alpha-axis',{points:[[-3.9,base,3.9],[4.4,base,3.9]],stroke:'BLUE_B',strokeWidth:0.032});
      v.arrow3D('beta-axis',{points:[[-3.9,base,3.9],[-3.9,base,-4.4]],stroke:'TEAL_B',strokeWidth:0.032});
      v.line3D('loss-axis',{points:[[-3.9,base,-3.9],[-3.9,3.6,-3.9]],stroke:'GREY_B',strokeWidth:0.021});
      v.sphere('start',{radius:0.075,position:data.start,fill:'WHITE',stroke:'none'});
      marker=v.sphere('iterate',{radius:0.105,position:data.start,fill:'YELLOW',stroke:'none'});
    });
    // Geometric subdivision follows the accepted line-search segment in α/β.
    // Height is reevaluated, never linearly tweened over a whole descent step.
    s.wait(1.2);
    // Equal arc speed prevents the many final small numerical steps from stalling.
    for(let i=0;i<data.segments.length;i++){
      const segment=data.segments[i];
      s.play(marker.moveTo(segment.marker),{duration:10.8*segment.length/data.totalLength,ease:'linear'});
      model.line3D('trace-'+i,{points:[segment.from,segment.to],stroke:'YELLOW',strokeWidth:0.045});
    }
    model.torus('minimum-ring',{radius:0.21,tubeRadius:0.025,radialSegments:28,tubularSegments:8,
      position:data.end,fill:'GOLD',stroke:'none'});
    s.wait(4);
  });`,
};
