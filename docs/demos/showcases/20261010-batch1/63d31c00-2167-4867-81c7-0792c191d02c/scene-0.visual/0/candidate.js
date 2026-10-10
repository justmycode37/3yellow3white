const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-rosenbrock\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'3d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const T=__narration.durationSec;
  let cursor=0;
  const play=(actions,duration,ease='linear')=>{s.play(actions,{duration,ease});cursor+=duration;};
  const waitTo=t=>{if(t>cursor){s.wait(t-cursor);cursor=t;}};
  // Analytic example, not measured network data. World Y is loss height;
  // world X and Z encode the two optimization parameters.
  const loss=(x,y)=>((1-x)*(1-x)+100*(y-x*x)*(y-x*x))/20;
  const gradient=(x,y)=>[(2*(x-1)-400*x*(y-x*x))/20,10*(y-x*x)];
  const world=(x,y,lift=0)=>[2*x,2.4*loss(x,y)-1+lift,1.7*(y-1.25)];
  const N=550,c=0.0001,states=[[-1.2,1.75]];
  for(let k=0;k<N;k++){
    const [x,y]=states[k],g=gradient(x,y),f=loss(x,y);
    let a=1;
    for(let j=0;j<40;j++){
      if(loss(x-a*g[0],y-a*g[1])<=f-c*a*(g[0]*g[0]+g[1]*g[1]))break;
      a*=0.5;
    }
    states.push([x-a*g[0],y-a*g[1]]);
  }
  play(s.camera.to2D({height:8}),0);
  s.latex('loss-definition',{
    tex:String.raw`F(x,y)=\frac{(1-x)^2+100(y-x^2)^2}{20}`,
    position:[0,2.98],fontSize:0.36,fill:Color.WHITE
  });
  s.text('method',{text:'Gradient descent with Armijo backtracking',position:[0,2.36],fontSize:0.25,fill:Color.WHITE});
  s.text('scope',{text:'Two-parameter example, not a full network',position:[0,-2.83],fontSize:0.25,fill:Color.GREY_A});
  const iteration=s.latex('iteration-readout',{
    tex:String.raw`k=\animnum{k}`,numbers:{k:0},numberFormat:{decimals:0,digits:3},
    position:[-1.05,-2.25],fontSize:0.29,fill:Color.YELLOW
  });
  const value=s.latex('loss-readout',{
    tex:String.raw`F=\animnum{f}`,numbers:{f:loss(...states[0])},numberFormat:{decimals:3,digits:1},
    position:[1.05,-2.25],fontSize:0.29,fill:Color.YELLOW
  });
  let v,marker;
  s.view('valley-view',{
    rect:[0,0.225,1,0.535],orbit:true,orbitHitTest:'geometry',
    camera:{yaw:0.28,pitch:0.91,distance:14,height:7.6,perspective:0.35,target:[-0.1,0.6,0.5]}
  },builder=>{
    v=builder;
    v.parametricSurface('rosenbrock-window',{
      uRange:[-1.55,1.35],vRange:[-0.18,0.45],uSegments:96,vSegments:40,
      fn:(x,d)=>world(x,x*x+d),fill:Color.BLUE_E,shading:'smooth',
      material:{roughness:0.85,specular:0.12}
    });
    // Sparse coordinate curves expose the trough without triangle clutter.
    for(let j=0;j<=7;j++){
      const d=-0.18+j*0.09,points=[];
      for(let i=0;i<=140;i++){const x=-1.55+2.9*i/140;points.push(world(x,x*x+d,0.009));}
      v.path('longitudinal-'+j,{points,stroke:{color:Color.BLUE_B,opacity:0.4},strokeWidth:0.012,fill:Color.NONE});
    }
    for(let j=0;j<=14;j++){
      const x=-1.55+2.9*j/14,points=[];
      for(let i=0;i<=48;i++){const d=-0.18+0.63*i/48;points.push(world(x,x*x+d,0.009));}
      v.path('cross-section-'+j,{points,stroke:{color:Color.BLUE_A,opacity:0.32},strokeWidth:0.012,fill:Color.NONE});
    }
    const floor=[];
    for(let i=0;i<=180;i++){const x=-1.55+2.9*i/180;floor.push(world(x,x*x,0.014));}
    v.path('valley-bottom',{points:floor,stroke:{color:Color.TEAL,opacity:0.65},strokeWidth:0.018,fill:Color.NONE});
    const scaffold={stroke:Color.GREY_B,strokeWidth:0.018};
    v.arrow3D('parameter-x',{points:[[-3.3,-1,-2.6],[3.15,-1,-2.6]],...scaffold});
    v.arrow3D('parameter-y',{points:[[-3.3,-1,-2.6],[-3.3,-1,2.6]],...scaffold});
    v.arrow3D('loss-height',{points:[[-3.3,-1,-2.6],[-3.3,2.4,-2.6]],...scaffold});
    v.latex('axis-x',{tex:'x',position:[3.35,-1,-2.6],fontSize:0.25,billboard:true});
    v.latex('axis-y',{tex:'y',position:[-3.3,-1,2.85],fontSize:0.25,billboard:true});
    v.latex('axis-f',{tex:'F',position:[-3.3,2.66,-2.6],fontSize:0.25,billboard:true});
    const minimum=v.sphere('minimum',{radius:0.055,position:world(1,1,0.035),fill:Color.TEAL});
    const minLabel=v.latex('minimum-label',{tex:String.raw`(1,1),\ F=0`,fontSize:0.22,billboard:true,fill:Color.TEAL_A});
    v.attach(minLabel,minimum,{offset:[0.6,-0.23,-0.15]});
    v.text('window-label',{text:'Valley window',position:[0,3.1,0],fontSize:0.22,billboard:true,fill:Color.GREY_A});
    marker=v.sphere('current-iterate',{radius:0.065,position:world(...states[0],0.04),fill:Color.YELLOW});
    v.circle('iterate-0',{radius:0.022,position:world(...states[0],0.031),fill:Color.YELLOW,billboard:true,stroke:Color.NONE});
  });
  waitTo(0.08*T);
  // Inspect the initial accepted step slowly, then use a fixed iteration clock.
  // Sample each straight parameter-space update back onto the nonlinear surface.
  const firstDuration=0.055*T,regularDuration=(0.82*T-firstDuration)/N;
  for(let k=0;k<N;k++){
    const a=states[k],b=states[k+1];
    const steps=Math.max(3,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.009));
    const points=[];
    for(let j=0;j<=steps;j++){
      const t=j/steps;points.push(world(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),0.031));
    }
    const trail=v.path('accepted-step-'+k,{points,stroke:Color.YELLOW,strokeWidth:0.021,strokeProfile:'round',fill:Color.NONE});
    const duration=regularDuration+(k===0?firstDuration:0);
    for(let j=1;j<=steps;j++){
      const t=j/steps,x=a[0]+t*(b[0]-a[0]),y=a[1]+t*(b[1]-a[1]);
      const actions=[marker.moveTo(world(x,y,0.04))];
      if(j===1)actions.push(trail.fadeIn());
      if(j===steps)actions.push(iteration.countTo({k:k+1}),value.countTo({f:loss(...b)}));
      play(actions,duration/steps);
    }
    v.circle('iterate-'+(k+1),{radius:0.016,position:world(...b,0.033),fill:Color.YELLOW,billboard:true,stroke:Color.NONE});
  }
  // The unvisited minimum stays distinct: do not fabricate convergence.
  waitTo(T);
});