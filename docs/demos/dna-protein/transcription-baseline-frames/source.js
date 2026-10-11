// 58-second schematic chapter: engagement, transcription, nuclear export,
// ribosome assembly. All geometry is native animlib; no reference assets.
export default scene({mode:'3d',orbit:false,end:'advance',background:Color.PURPLE_E},s=>{
  const PI=Math.PI, dx=.76;
  const C={A:Color.GREEN,T:Color.RED,C:Color.BLUE_A,G:Color.YELLOW_D,U:Color.ORANGE};
  const comp={A:'U',T:'A',C:'G',G:'C'},dnaComp={A:'T',T:'A',C:'G',G:'C'};
  const bases=['G','A','C','T','G','A','C','T','G','A','C','A','G','T','C','G','A','T','C','G','A','T','C'];
  const satin={roughness:.68,specular:.28,metalness:.08};
  const finish={fill:Color.GREY_C,texture:{pattern:'noise',color:Color.GREY_D,scale:.16,seed:12,bumpStrength:.001},material:{roughness:.62,specular:.32,emissive:Color.PURE_BLUE,emissiveIntensity:.07}};
  const gold={fill:Color.GOLD_D,texture:{pattern:'noise',color:Color.GOLD_D,scale:3.2,seed:51,bumpStrength:.002},material:{roughness:.68,specular:.38,metalness:.06}};
  const sample=(f,a,b,n)=>Array.from({length:n+1},(_,i)=>f(a+(b-a)*i/n));
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const unit=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  // Explicit shared-topology tubes make strand opening/closing and RNA release
  // deterministic. Each rod endpoint comes from the same strand function.
  function tubeData(points,radius,n=8){
    const vertices=[],triangles=[];
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
      const t=unit(b.map((v,j)=>v-a[j])),ref=Math.abs(t[2])<.9?[0,0,1]:[0,1,0];
      const u=unit(cross(t,ref)),v=cross(t,u);
      for(let j=0;j<n;j++){const q=2*PI*j/n;vertices.push(points[i].map((p,k)=>p+radius*(u[k]*Math.cos(q)+v[k]*Math.sin(q))));}
    }
    for(let i=0;i<points.length-1;i++)for(let j=0;j<n;j++){
      const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+(j+1)%n,d=(i+1)*n+j;
      triangles.push([a,b,c],[a,c,d]);
    }
    const first=vertices.length;vertices.push(points[0]);const last=vertices.length;vertices.push(points[points.length-1]);
    for(let j=0;j<n;j++){triangles.push([first,(j+1)%n,j]);const a=(points.length-1)*n;triangles.push([last,a+j,a+(j+1)%n]);}
    return {kind:'mesh',vertices,triangles,shading:'smooth'};
  }
  const backbone=(id,points,r=.145)=>s.mesh(id,{...tubeData(points,r),...finish});
  const rod=(id,a,b,base,r=.105)=>s.mesh(id,{...tubeData([a,b],r,8),fill:C[base],material:satin});
  function domain(id,p,r,phase,twist=0,style=gold,nu=24,nv=16){
    return s.parametricSurface(id,{uRange:[0,2*PI],vRange:[0,PI],closedU:true,uSegments:nu,vSegments:nv,fn:(u,v)=>{
      u=-u;const sv=Math.sin(v),cv=Math.cos(v),swell=1+.14*Math.sin(3*u+phase)*sv*sv+.065*Math.cos(5*u-2*v+phase)*sv;
      const x=r[0]*sv*Math.cos(u)*swell,y=r[1]*sv*Math.sin(u)*swell;
      return [p[0]+x*Math.cos(twist)-y*Math.sin(twist),p[1]+x*Math.sin(twist)+y*Math.cos(twist),p[2]+r[2]*cv*(1+.09*Math.sin(3*u+v+phase)*sv*sv*sv)];
    },...style});
  }
  // Blue-violet atmosphere with a soft pale-cyan lower pool; palette geometry.
  s.mesh('transcription-atmosphere',{vertices:[[-100,-70,-25],[100,-70,-25],[100,70,-25],[-100,70,-25]],triangles:[[0,1,2],[0,2,3]],fill:Color.PURPLE_D,shading:'unlit'});
  s.mesh('blue-atmosphere-wash',{vertices:[[-100,-70,-24.9],[100,-70,-24.9],[100,70,-24.9],[-100,70,-24.9]],triangles:[[0,1,2],[0,2,3]],fill:{color:Color.PURE_BLUE,opacity:.14},shading:'unlit'});
  for(let i=0;i<16;i++)s.circle('cyan-depth-'+i,{position:[8,-14,-24.7+i*.002],radius:9+i*1.25,fill:{color:Color.BLUE_A,opacity:.023},stroke:Color.NONE});
  s.play(s.camera.to3D({yaw:.12,pitch:.06,height:11.5,distance:32,target:[0,0,0]}),{duration:0});

  // Exact opening-chapter DNA convention, opening into the reviewed v4 cleft.
  const helix=(x,phase)=>[x,.30*x+1.1*Math.cos(1.3*x+phase),1.1*Math.sin(1.3*x+phase)];
  const limitX=x=>x<=4.7?x:4.7+.9*(1-Math.exp(-(x-4.7)/.9));
  const templateRaw=x=>{const q=limitX(x);return [x,-2.15+.022*(q+6)*(q+6),.45+.22*Math.sin(.40*x)];};
  const displacedRaw=x=>{const q=limitX(x);return [x,3.15-.017*(q+6)*(q+6),-.70-.28*Math.sin(.40*x)];};
  function openPoint(x,side){
    const ax=Math.abs(x),t=ax<=6.5?1:ax>=9?0:(1+Math.cos(PI*(ax-6.5)/2.5))/2;
    return mix(helix(x,side?PI:0),side?displacedRaw(x):templateRaw(x),t);
  }
  const dnaA=backbone('template-backbone',sample(x=>helix(x,0),-12,12,80),.13);
  const dnaB=backbone('displaced-backbone',sample(x=>helix(x,PI),-12,12,80),.13);
  const dnaParts=[dnaA,dnaB],openActions=[],closeActions=[];
  openActions.push(dnaA.morphTo({...tubeData(sample(x=>openPoint(x,0),-12,12,80),.165),...finish}),dnaB.morphTo({...tubeData(sample(x=>openPoint(x,1),-12,12,80),.165),...finish}));
  closeActions.push(dnaA.morphTo({...tubeData(sample(x=>helix(x,0),-12,12,80),.13),...finish}),dnaB.morphTo({...tubeData(sample(x=>helix(x,PI),-12,12,80),.13),...finish}));
  for(let i=0;i<31;i++){
    const x=-11.4+i*dx,b=bases[i%bases.length],a0=helix(x,0),b0=helix(x,PI),m=mix(a0,b0,.5);
    const ra=rod('template-base-'+i,a0,mix(a0,m,.94),b,.075),rb=rod('displaced-base-'+i,b0,mix(b0,m,.94),dnaComp[b],.075);
    dnaParts.push(ra,rb);
    const a=openPoint(x,0),z=openPoint(x,1),len=Math.min(1.15,Math.max(.12,.46*(z[1]-a[1])));
    const outside=Math.abs(x)>6.5;
    const ae=outside?mix(a,z,.47):[a[0],a[1]+len,a[2]],be=outside?mix(z,a,.47):[z[0],z[1]-len,z[2]];
    openActions.push(ra.morphTo({...tubeData([a,ae],.105),material:satin}),rb.morphTo({...tubeData([z,be],.105),material:satin}));
    closeActions.push(ra.morphTo({...tubeData([a0,mix(a0,m,.94)],.075),material:satin}),rb.morphTo({...tubeData([b0,mix(b0,m,.94)],.075),material:satin}));
  }
  const dna=s.group('transcribing-DNA',dnaParts);
  // Occupied volume and seven medium domains copied from the approved vocabulary.
  const proteinParts=[domain('polymerase-rear-body',[0,0,-5.5],[10.5,5,2.2],.8,0,gold,30,18)];
  const domains=[
    [[-5.3,1.65,-3],[2.35,1.70,1.72],.4,-.35],
    [[-1.6,1.8,-3.4],[2.30,1.50,1.82],1.7,.28],
    [[2.25,2.1,-3.35],[2.10,1.68,1.72],2.2,-.22],
    [[5.25,.5,-3.2],[1.90,2,1.83],1.1,.4],
    [[-5.55,-1.5,-2.75],[2.25,1.5,1.57],2.6,.24],
    [[-2.3,-1.45,-2.9],[2.15,1.65,1.55],3.4,-.3],
    [[1.35,-.6,-3],[2.10,1.55,1.64],4.1,.55],
  ];
  domains.forEach((d,i)=>proteinParts.push(domain('polymerase-domain-'+i,...d)));
  const protein=s.group('polymerase',proteinParts);
  s.play([protein.scaleTo(.22),protein.moveTo([-11,-2,1])],{duration:0});
  s.play(protein.moveTo([-3,-.7,1]),{duration:3,ease:'smooth'});
  s.play([...openActions,protein.moveTo([-.5,0,0]),protein.scaleTo(.48)],{duration:4,ease:'smooth'});
  s.play([protein.moveTo([0,0,0]),protein.scaleTo(1),s.camera.animate({yaw:.23,pitch:.18,height:6.25,distance:26,target:[-1.2,.15,0]})],{duration:7,ease:'smooth'});

  // 14–30: template is read left-to-right (3′→5′); RNA extends its right 3′ end.
  // Active base indices use the SAME underlying sequence as the DNA rods above.
  const bx=i=>-11.4+i*dx;
  const rnaPoint=x=>{const p=templateRaw(x);return [x,p[1]+2.40,p[2]];};
  const RNA=[],rnaLabels=[],flatActions=[];
  const firstI=7,lastExisting=10,firstNew=11,lastNew=16;
  const exitX=bx(firstI)-.38,joinX=bx(lastExisting)+dx/2+.01;
  const ep=rnaPoint(exitX),pa=rnaPoint(exitX-.001),pb=rnaPoint(exitX+.001);
  const sy=(pb[1]-pa[1])/.002,sz=(pb[2]-pa[2])/.002;
  const exitPts=sample(t=>[exitX-4.3*t,ep[1]-4.3*sy*t+1.25*t*t,ep[2]-4.3*sz*t-1.3*t*t],1,0,32);
  const rnaPts=exitPts.concat(sample(rnaPoint,exitX,joinX,28).slice(1));
  const rnaBone=backbone('existing-RNA-backbone',rnaPts);RNA.push(rnaBone);
  // Final x shift gives the translation author's exact -3.8..3.04 rod array.
  const flatShift=-3.8-bx(firstI);
  flatActions.push(rnaBone.morphTo({...tubeData(rnaPts.map(p=>[p[0]+flatShift,2.65,0]),.145),...finish}));
  for(let i=firstI;i<=lastExisting;i++){
    const x=bx(i),p=rnaPoint(x),base=comp[bases[i%bases.length]];
    const stem=rod('existing-RNA-base-'+i,p,[p[0],p[1]-1.15,p[2]],base);RNA.push(stem);
    flatActions.push(stem.morphTo({...tubeData([[x+flatShift,2.65,0],[x+flatShift,1.5,0]],.105),material:satin}));
  }
  const polarity=[];
  const text=(id,t,p,size=.26)=>s.text(id,{text:t,position:p,fontSize:size,fill:Color.WHITE,billboard:true,billboardOffset:[0,0,.28]});
  polarity.push(text('template-3prime','3′',add(templateRaw(-5.4),[0,-.38,0])));
  polarity.push(text('template-5prime','5′',add(templateRaw(3.8),[0,-.38,0])));
  const five=text('RNA-5prime','5′',add(rnaPoint(-5.5),[-.3,.35,0]));RNA.push(five);rnaLabels.push(five);
  const endLabel=text('RNA-growing-3prime','3′',add(rnaPoint(bx(lastExisting)),[.42,.42,0]));RNA.push(endLabel);rnaLabels.push(endLabel);
  s.wait(.5);
  for(let i=firstNew;i<=lastNew;i++){
    const x=bx(i),target=rnaPoint(x),base=comp[bases[i%bases.length]];
    const localPts=sample(q=>{const p=rnaPoint(x+q);return[q,p[1]-target[1],p[2]-target[2]];},-dx/2-.01,dx/2+.01,8);
    const stem=rod('incoming-base-'+i,[0,0,0],[0,-1.15,0],base);
    const stub=backbone('incoming-backbone-'+i,localPts);
    const label=text('incoming-letter-'+i,base,[.22,-.46,0],.28);rnaLabels.push(label);
    const n=s.group('incoming-nucleotide-'+i,[stem,stub,label]);RNA.push(n);
    const templateLetter=text('selected-template-letter-'+i,bases[i%bases.length],add(templateRaw(x),[.22,.46,0]),.28);polarity.push(templateLetter);
    s.play([n.moveTo([x+1.35,2.8,2.6]),n.rotateTo([.16,.13,(i%2?.35:-.35)])],{duration:0});
    s.play(n.fadeIn(),{duration:.2});
    s.play([n.moveTo([x+.22,target[1]+.55,target[2]+.85]),n.rotateTo([0,0,-.09])],{duration:1.2,ease:'smooth'});
    s.play([n.moveTo(target),n.rotateTo([0,0,0])],{duration:.6,ease:'smooth'});
    s.play(endLabel.moveTo(add(target,[.42,.42,0])),{duration:0});
    s.wait(.5);
    flatActions.push(n.moveTo([x+flatShift,2.65,0]),stub.morphTo({...tubeData(localPts.map(p=>[p[0],0,0]),.145),...finish}));
  }
  s.wait(.5);
  const transcript=s.group('exported-mRNA',RNA);
  // 30–38: release and reannealing; the same RNA pieces move as one connected chain.
  s.play([transcript.moveTo([-1,0,3]),protein.moveTo([4,1,-1]),protein.scaleTo(.40),...closeActions,...rnaLabels.map(h=>h.fadeOut()),...polarity.map(h=>h.fadeOut()),s.camera.animate({yaw:.28,pitch:.16,height:13,distance:29,target:[0,0,0]})],{duration:4,ease:'smooth'});
  s.play([...flatActions,transcript.moveTo([3,0,0]),transcript.rotateTo([PI,0,0]),protein.moveTo([10,3,-3]),protein.fadeOut(),dna.fadeOut(),s.camera.animate({yaw:.65,pitch:.10,height:12.8,target:[6,0,0]})],{duration:4,ease:'smooth'});
  // 38–49: an actual opening in an envelope at x=10. The mRNA traverses x=10;
  // it remains inside the radius-4.2 aperture, not in front of a painted circle.
  const membrane=[];
  membrane.push(s.parametricSurface('nuclear-envelope-shell',{uRange:[0,2*PI],vRange:[4.7,24],closedU:true,uSegments:40,vSegments:8,fn:(u,r)=>[10+.008*(r*r-22),r*Math.cos(u),r*Math.sin(u)],fill:Color.PURPLE_B,texture:{pattern:'noise',color:Color.PINK,scale:1.1,seed:9,bumpStrength:.001},material:{roughness:.8,specular:.18}}));
  membrane.push(s.parametricSurface('nuclear-pore-rounded-rim',{uRange:[0,2*PI],vRange:[0,2*PI],closedU:true,closedV:true,uSegments:40,vSegments:12,fn:(u,v)=>[10+1.05*Math.sin(v),(5.0+.80*Math.cos(v))*Math.cos(u),(5.0+.80*Math.cos(v))*Math.sin(u)],fill:Color.PURPLE_A,texture:{pattern:'noise',color:Color.PURPLE_B,scale:2,seed:11,bumpStrength:.001},material:{roughness:.72,specular:.25}}));
  for(let i=0;i<8;i++){
    const a=i*PI/4;
    membrane.push(domain('pore-domain-'+i,[10.45,5.05*Math.cos(a),5.05*Math.sin(a)],[.9,.95,.95],i*.7,0,{fill:Color.PURPLE_B,material:{roughness:.72,specular:.23}},16,12));
  }
  const envelope=s.group('nuclear-envelope',membrane);
  s.play([envelope.fadeIn(),transcript.moveTo([4.5,0,0]),s.camera.animate({yaw:1.0,pitch:.1,height:13,target:[9,0,0]})],{duration:.8,ease:'smooth'});
  s.play(transcript.moveTo([7,0,0]),{duration:2.2,ease:'smooth'});
  s.play([transcript.moveTo([20,0,0]),s.camera.animate({yaw:.45,pitch:.12,height:12,target:[17,0,0]})],{duration:8,ease:'smooth'});
  // 49–58: unequal ribosomal subunits approach the exported RNA and close.
  const largeParts=[domain('ribosome-large',[20,1.75,-3],[5,3.15,2],.4,-.06),domain('ribosome-large-left',[17.1,2.7,-1.5],[2,1.5,1.25],1.1),domain('ribosome-large-right',[21.6,3,-1.55],[1.9,1.6,1.3],2.2)];
  const large=s.group('ribosome-large-subunit',largeParts);
  const small=s.group('ribosome-small-subunit',[domain('ribosome-small',[19.65,-3.15,-1.65],[4.1,1.15,1.5],2.1,.10)]);
  s.play([large.moveTo([0,7,0]),small.moveTo([0,-5,0])],{duration:0});
  s.play([large.moveTo([0,2,0]),small.moveTo([0,-1.5,0]),envelope.fadeOut(),s.camera.animate({yaw:.17,pitch:.12,height:10.8,distance:27,target:[20,.2,0]})],{duration:4,ease:'smooth'});
  s.play([large.moveTo([0,0,0]),small.moveTo([0,0,0])],{duration:5,ease:'smooth'});
});
