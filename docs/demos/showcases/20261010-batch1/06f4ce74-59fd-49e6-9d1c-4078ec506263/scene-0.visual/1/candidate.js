const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-bezier\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode:'3d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode }, s => {
  const D=__narration.durationSec;
  let cursor=0;
  const play=(actions,duration)=>{s.play(actions,{duration,ease:'linear'});cursor+=duration;};
  const holdTo=time=>{if(time>cursor){s.wait(time-cursor);cursor=time;}};
  s.play(s.camera.to2D({height:8}),{duration:0});
  // Idealized tensor-product patch: X/Z parameter plane, Y up.
  // Only P_11 changes. Boundary curves and mesh connectivity remain fixed.
  const heights=[0,0.6,0.6,0], rise=3.2;
  const control=(i,j,a)=>[-3+2*i,heights[i]+heights[j]+(i===1&&j===1?a:0),-3+2*j];
  // Exact reduction of sum B_i^3(u) B_j^3(v) P_ij.
  const point=(u,v,a)=>[-3+6*u,1.8*u*(1-u)+1.8*v*(1-v)+9*a*u*(1-u)**2*v*(1-v)**2,-3+6*v];
  const N=20, triangles=[];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const q=i*(N+1)+j,b=q+N+1;
    triangles.push([q,q+1,b],[q+1,b+1,b]);
  }
  const vertices=a=>{
    const out=[];
    for(let i=0;i<=N;i++)for(let j=0;j<=N;j++)out.push(point(i/N,j/N,a));
    return out;
  };
  const curve=(axis,t,a)=>{
    const out=[];
    for(let k=0;k<=24;k++){
      const p=axis===0?point(t,k/24,a):point(k/24,t,a);
      out.push([p[0],p[1]+0.012,p[2]]);
    }
    return out;
  };
  let patch,grid,net,moving,controlLabel,normalRoot,normalJoint,normalLabel;
  const curves=[];
  s.view('patch-view',{
    rect:[0.035,0.13,0.93,0.72],orbit:true,orbitHitTest:'geometry',
    camera:{yaw:-0.48,pitch:-0.64,distance:17,height:8.7,target:[0,1,0]}
  },v=>{
    patch=v.mesh('bezier-patch',{vertices:vertices(0),triangles,shading:'smooth',fill:Color.BLUE_D,stroke:Color.NONE});
    const gridParts=[];
    for(let axis=0;axis<2;axis++)for(let k=0;k<=6;k++){
      const boundary=k===0||k===6;
      const h=v.path('parameter-curve-'+axis+'-'+k,{
        points:curve(axis,k/6,0),stroke:boundary?Color.WHITE:Color.BLUE_A,
        strokeWidth:boundary?0.025:0.012,fill:Color.NONE,strokeProfile:'round'
      });
      gridParts.push(h);
      if(!boundary)curves.push({h,axis,t:k/6});
    }
    grid=v.group('surface-grid',gridParts);
    const nodes=[],parts=[];
    for(let i=0;i<4;i++){
      nodes[i]=[];
      for(let j=0;j<4;j++){
        const active=i===1&&j===1;
        const node=v.sphere('control-'+i+'-'+j,{position:control(i,j,0),radius:active?0.09:0.055,fill:active?Color.YELLOW:Color.GREY_A});
        nodes[i][j]=node;parts.push(node);
        if(active)moving=node;
      }
    }
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){
      if(i<3){
        const edge=v.line3D('net-u-'+i+'-'+j,{stroke:Color.GREY_B,strokeWidth:0.015});
        v.connect(edge,nodes[i][j],nodes[i+1][j],{endpoints:'surface'});parts.push(edge);
      }
      if(j<3){
        const edge=v.line3D('net-v-'+i+'-'+j,{stroke:Color.GREY_B,strokeWidth:0.015});
        v.connect(edge,nodes[i][j],nodes[i][j+1],{endpoints:'surface'});parts.push(edge);
      }
    }
    net=v.group('control-lattice',parts);
    controlLabel=v.latex('control-label',{tex:'P_{11}',fontSize:0.29,fill:Color.YELLOW,billboard:true});
    v.attach(controlLabel,moving,{offset:[-0.3,0.28,0]});
    const normal=v.arrow3D('local-normal',{points:[[0,0,0],[0,1.15,0]],stroke:Color.GREEN_A,strokeWidth:0.035});
    const tip=v.sphere('normal-tip-anchor',{position:[0,1.15,0],radius:0.012,fill:Color.GREEN_A});
    normalJoint=v.group('normal-tilt',[normal,tip]);
    normalRoot=v.group('normal-frame',[normalJoint],{position:point(0.5,0.5,0),rotation:[0,Math.PI/4,0]});
    const foot=v.sphere('normal-foot',{radius:0.045,fill:Color.GREEN_A});
    v.attach(foot,normalRoot,{offset:[0,0.015,0]});
    normalLabel=v.latex('normal-label',{tex:'\\hat{n}',fontSize:0.28,fill:Color.GREEN_A,billboard:true});
    v.attach(normalLabel,tip,{offset:[0.23,0.12,0]});
    s.play([net.animate({opacity:0}),controlLabel.animate({opacity:0}),normalRoot.animate({opacity:0}),normalLabel.animate({opacity:0}),foot.animate({opacity:0})],{duration:0});
    play([patch.fadeIn(),grid.fadeIn()],D*0.07);
    play([net.fadeIn(),controlLabel.fadeIn()],D*0.065);
    play([normalRoot.fadeIn(),normalLabel.fadeIn(),foot.fadeIn()],D*0.03);
  });
  s.text('model-note',{text:'Idealized patch',position:[0,-2.85],fontSize:0.24,fill:Color.GREY_B});
  holdTo(D*0.275);
  const steps=8;
  for(let k=1;k<=steps;k++){
    const t=k/steps,a=rise*t*t*(3-2*t);
    // Affine vertex interpolation gives the exact Bernstein deformation.
    // At u=v=1/2, dy/dx=dy/dz=(-0.75*0.375/6)*a.
    // The normal keeps its length; small angular keyframes approximate its
    // analytic direction between samples (exact at each sampled pose).
    const actions=[moving.moveTo(control(1,1,a)),
      patch.morphTo({kind:'mesh',vertices:vertices(a),triangles,shading:'smooth'}),
      normalRoot.moveTo(point(0.5,0.5,a)),
      normalJoint.rotateTo([Math.atan(Math.SQRT2*0.046875*a),0,0])];
    for(const c of curves)actions.push(c.h.morphTo({kind:'path',points:curve(c.axis,c.t,a)}));
    if(k===3){
      const formula=s.latex('bernstein-displacement',{
        tex:'\\Delta S(u,v)=B_1^3(u)B_1^3(v)\\,\\Delta P_{11}',position:[0,2.8],fontSize:0.36,fill:Color.WHITE
      });
      actions.push(formula.fadeIn());
    }
    play(actions,D*0.5/steps);
  }
  holdTo(D);
});