const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-rosenbrock\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'3d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const T = __narration.durationSec;
  let cursor = 0;
  function play(actions, duration) { s.play(actions, {duration, ease:'linear'}); cursor += duration; }
  function holdTo(t) { if (t > cursor) { s.wait(t-cursor); cursor=t; } }
  // Analytic two-variable Rosenbrock function, uniformly scaled, not a projection.
  const F = (x,y) => ((1-x)*(1-x)+100*(y-x*x)*(y-x*x))/100;
  const grad = (x,y) => [0.02*(x-1)-4*x*(y-x*x), 2*(y-x*x)];
  const P = (x,y,lift=0) => [2.25*x, 6*F(x,y)-0.9+lift, -1.8*(y-0.8)];
  const N = 480;
  const iterates = [[-1,1.5]];
  // Steepest descent with Armijo backtracking, restarted from alpha=1.
  for (let k=0;k<N;k++) {
    const [x,y] = iterates[k];
    const g = grad(x,y), norm2=g[0]*g[0]+g[1]*g[1];
    let alpha=1;
    for (let j=0;j<40;j++) {
      if (F(x-alpha*g[0],y-alpha*g[1]) <= F(x,y)-1e-4*alpha*norm2) break;
      alpha *= 0.5;
    }
    iterates.push([x-alpha*g[0],y-alpha*g[1]]);
  }
  play(s.camera.to2D({height:8}),0);
  s.latex('loss-definition', {
    tex:String.raw`F(x,y)=\frac{(1-x)^2+100(y-x^2)^2}{100}`,
    position:[0,2.94], fontSize:0.34, fill:Color.WHITE
  });
  s.text('method', {text:'Gradient descent / Armijo line search', position:[0,-2.24], fontSize:0.26, fill:Color.WHITE});
  const readout = s.latex('iterate-readout', {
    tex:String.raw`k=\animnum{k}`, numbers:{k:0},
    numberFormat:{digits:3,decimals:0},
    position:[-1,-2.64], fontSize:0.29, fill:Color.YELLOW
  });
  const lossReadout=s.latex('loss-readout', {
    tex:String.raw`F=\animnum{f}`, numbers:{f:F(...iterates[0])},
    numberFormat:{digits:1,decimals:4},
    position:[1,-2.64], fontSize:0.29, fill:Color.YELLOW
  });
  s.text('scope', {text:'Analytic two-parameter example, not a full network', position:[0,-3.04], fontSize:0.23, fill:Color.GREY_B});
  let v, marker;
  s.view('landscape', {
    rect:[0.04,0.19,0.92,0.57], orbit:true, orbitHitTest:'geometry',
    camera:{yaw:0.35,pitch:0.92,distance:14,height:7.1,target:[0,0.1,0]}
  }, view => {
    v=view;
    // Curved bounded patch of the actual graph: y=x^2+r.
    // World Y is height; world Z is the second parameter axis.
    v.parametricSurface('rosenbrock-surface', {
      uRange:[-1.25,1.25],vRange:[-0.6,0.6],uSegments:100,vSegments:44,
      fn:(x,r)=>P(x,x*x+r), fill:Color.BLUE_E, stroke:Color.NONE,
      shading:'smooth', material:{roughness:0.9,specular:0.12}
    });
    for (let j=0;j<=8;j++) {
      const r=-0.6+0.15*j;
      const points=Array.from({length:101},(_,i)=>{const x=-1.25+2.5*i/100;return P(x,x*x+r,0.007);});
      v.path('longitudinal-'+j,{points,stroke:j===4?Color.GREY_B:Color.BLUE_D,strokeWidth:j===4?0.012:0.007,fill:Color.NONE,strokeProfile:'round'});
    }
    for (let j=0;j<=10;j++) {
      const x=-1.25+0.25*j;
      const points=Array.from({length:45},(_,i)=>P(x,x*x-0.6+1.2*i/44,0.007));
      v.path('cross-section-'+j,{points,stroke:Color.BLUE_D,strokeWidth:0.007,fill:Color.NONE,strokeProfile:'round'});
    }
    v.arrow3D('x-axis',{points:[[-3.05,-1.05,2.6],[3.05,-1.05,2.6]],stroke:Color.GREY_B,strokeWidth:0.016});
    v.arrow3D('y-axis',{points:[[-3.05,-1.05,2.6],[-3.05,-1.05,-2.65]],stroke:Color.GREY_B,strokeWidth:0.016});
    v.arrow3D('height-axis',{points:[[-3.05,-1.05,-2.65],[-3.05,2.0,-2.65]],stroke:Color.GREY_B,strokeWidth:0.016});
    v.latex('x-label',{tex:'x',position:[3.23,-1.05,2.6],fontSize:0.25,billboard:true});
    v.latex('y-label',{tex:'y',position:[-3.05,-1.05,-2.9],fontSize:0.25,billboard:true});
    v.latex('height-label',{tex:'F',position:[-3.05,2.23,-2.65],fontSize:0.25,billboard:true});
    const minimum=v.sphere('minimum',{position:P(1,1,0.045),radius:0.055,fill:Color.GREEN});
    const minimumLabel=v.text('minimum-label',{text:'minimum (1, 1)',fontSize:0.22,billboard:true,billboardOffset:[0.32,0.34,0],fill:Color.GREEN});
    v.attach(minimumLabel,minimum);
    const start=v.sphere('initial-iterate',{position:P(...iterates[0],0.035),radius:0.045,fill:Color.WHITE});
    const startLabel=v.text('start-label',{text:'start',fontSize:0.23,billboard:true,billboardOffset:[-0.25,0.28,0],fill:Color.WHITE});
    v.attach(startLabel,start);
    marker=v.sphere('current-iterate',{position:P(...iterates[0],0.065),radius:0.065,fill:Color.YELLOW});
  });
  holdTo(T*0.1);
  // Twelve readable steps, then a faster iteration clock for the same algorithm.
  for (let k=0;k<N;k++) {
    const a=iterates[k], b=iterates[k+1];
    const duration=k<12 ? T*0.16/12 : T*0.62/(N-12);
    const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const samples=Math.max(2,Math.min(64,Math.ceil(distance/0.012)));
    const points=[];
    for (let j=0;j<=samples;j++) {
      const t=j/samples;
      points.push(P(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),0.027));
    }
    for (let j=1;j<=samples;j++) {
      const t=j/samples;
      const x=a[0]+t*(b[0]-a[0]), y=a[1]+t*(b[1]-a[1]);
      // Re-evaluate height along every parameter-space line-search step.
      play(marker.moveTo(P(x,y,0.065)),duration/samples);
    }
    v.path('trajectory-'+k,{points,fill:Color.NONE,stroke:Color.YELLOW,strokeWidth:0.017,strokeProfile:'round'});
    v.sphere('iterate-'+(k+1),{position:P(...b,0.03),radius:k<12?0.024:0.013,fill:Color.YELLOW});
    play([readout.countTo({k:k+1}),lossReadout.countTo({f:F(...b)})],0);
  }
  holdTo(T);
});