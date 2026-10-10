// Translation: native conceptual envelopes and a schematic cloverleaf, not atomistic dynamics.
// Time 0..59 is global 102..161. Amino-acid chain joints retain fixed .52-unit spacing.
export default scene({mode:'3d',orbit:false,end:'hold',background:Color.PURPLE_E},s=>{
  const PI=Math.PI,L=.52;
  const colors={A:Color.GREEN,U:Color.ORANGE,C:Color.BLUE_A,G:Color.YELLOW_D};
  const complement={A:'U',U:'A',C:'G',G:'C'};
  const satin={roughness:.68,specular:.28,metalness:.08};
  const slate={fill:Color.GREY_C,texture:{pattern:'noise',color:Color.GREY_D,scale:.16,seed:12,bumpStrength:.001},material:{roughness:.62,specular:.32,emissive:Color.PURE_BLUE,emissiveIntensity:.07}};
  const blue={fill:Color.BLUE_D,material:{roughness:.60,specular:.32,emissive:Color.PURE_BLUE,emissiveIntensity:.07}};
  const violet={fill:Color.PURPLE_C,material:{roughness:.65,specular:.31},texture:{pattern:'noise',color:Color.PURPLE_C,scale:2.8,seed:23,bumpStrength:.001}};
  const sample=(fn,n)=>Array.from({length:n+1},(_,i)=>fn(i/n));
  s.play(s.camera.to3D({yaw:.17,pitch:.12,height:10.8,distance:27,target:[0,.2,0]}),{duration:0});
  s.mesh('translation-violet-depth',{vertices:[[-60,-40,-12],[60,-40,-12],[60,40,-12],[-60,40,-12]],triangles:[[0,1,2],[0,2,3]],fill:Color.PURPLE_D,shading:'unlit',texture:{pattern:'noise',color:Color.PURPLE_E,scale:.08,seed:29}});
  s.mesh('translation-blue-wash',{vertices:[[-60,-40,-11.9],[60,-40,-11.9],[60,40,-11.9],[-60,40,-11.9]],triangles:[[0,1,2],[0,2,3]],fill:{color:Color.PURE_BLUE,opacity:.14},shading:'unlit'});
  for(let i=0;i<20;i++)s.circle('translation-cyan-pool-'+i,{position:[1,-9,-11.8+i*.002],radius:5+i*.52,fill:{color:Color.BLUE_A,opacity:.028},stroke:Color.NONE});
  function domain(id,p,r,phase,twist=0){return s.parametricSurface(id,{
    uRange:[0,2*PI],vRange:[0,PI],closedU:true,uSegments:32,vSegments:20,
    fn:(u,v)=>{u=-u;const sv=Math.sin(v),cv=Math.cos(v),q=1+.14*Math.sin(3*u+phase)*sv*sv+.065*Math.cos(5*u-2*v+phase)*sv;
      const x=r[0]*sv*Math.cos(u)*q,y=r[1]*sv*Math.sin(u)*q;
      return[p[0]+x*Math.cos(twist)-y*Math.sin(twist),p[1]+x*Math.sin(twist)+y*Math.cos(twist),p[2]+r[2]*cv*(1+.09*Math.sin(3*u+v+phase)*sv*sv*sv)];},
    fill:Color.GOLD_D,texture:{pattern:'noise',color:Color.GOLD_D,scale:3.2,seed:51,bumpStrength:.002},material:{roughness:.68,specular:.38,metalness:.06}});}
  const ribosome=s.group('translation-ribosome',[
    domain('translation-large-subunit',[0,1.75,-3],[5,3.15,2],.4,-.06),
    domain('translation-small-subunit',[-.35,-3.15,-1.65],[4.1,1.15,1.5],2.1,.10),
    domain('translation-large-left-domain',[-2.9,2.7,-1.5],[2,1.5,1.25],1.1),
    domain('translation-large-right-domain',[1.6,3,-1.55],[1.9,1.6,1.3],2.2),
  ]);
  function rod(id,a,b,base,r=.105){return s.tube(id,{points:[a,b],radius:r,radialSegments:10,capped:true,fill:colors[base],material:satin});}
  const seq=['A','C','U','G','U','C','A','G','C','U','A','C','G','A','G','C','U','U'];
  const dx=.76,codon=3*dx,P=-3.04,A=-.76,yRNA=-2.65,yCarrier=-1.40,z=0;
  const rnaParts=[s.tube('translation-mRNA-backbone',{points:sample(t=>[-8.48+22*t,yRNA,0],70),radius:.145,radialSegments:10,...slate})];
  seq.forEach((b,i)=>rnaParts.push(rod('translation-mRNA-base-'+i,[-3.8+i*dx,yRNA,0],[-3.8+i*dx,yRNA+1.15,0],b)));
  const rna=s.group('translation-mRNA',rnaParts);
  // One continuous closed blue tube carries cloverleaf loops; stem bars are structural pairs.
  const outline=[[-.2,3.02],[-.2,2.35],[-.42,2.15],[-.91,2.29],[-1.28,2.08],[-1.33,1.72],[-1.06,1.45],[-.53,1.55],[-.36,1.2],[-.50,.90],[-.83,.69],[-.86,.36],[-.58,.14],[0,.10],[.58,.14],[.86,.36],[.83,.69],[.5,.9],[.36,1.20],[.57,1.56],[1.08,1.45],[1.35,1.72],[1.28,2.08],[.92,2.30],[.42,2.15],[.20,2.35],[.20,3.02]];
  function rounded(points){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];for(let j=0;j<4;j++){const t=j/4,t2=t*t,t3=t2*t;out.push([0,1,2].map(k=>.5*((2*(p1[k]||0))+(-(p0[k]||0)+(p2[k]||0))*t+(2*(p0[k]||0)-5*(p1[k]||0)+4*(p2[k]||0)-(p3[k]||0))*t2+(-(p0[k]||0)+3*(p1[k]||0)-3*(p2[k]||0)+(p3[k]||0))*t3)));}}out.push(points[points.length-1]);return out;}
  function carrier(id,codonIndex,at){
    const pts=outline.map((p,i)=>[p[0],p[1],.12*Math.sin(i*.5)]);
    const parts=[s.tube(id+'-cloverleaf',{points:rounded(pts),radius:.112,radialSegments:10,...blue})];
    for(let j=0;j<4;j++)parts.push(s.tube(id+'-acceptor-pair-'+j,{points:[[-.2,2.4+j*.16,0],[.2,2.4+j*.16,0]],radius:.056,radialSegments:8,fill:Color.BLUE_B,material:satin}));
    for(let j=0;j<3;j++){
      const b=complement[seq[codonIndex*3+j]],x=(j-1)*dx;
      parts.push(rod(id+'-anticodon-'+j,[x,.24,0],[x,-.1,0],b,.105));
    }
    const handle=s.group(id,parts);s.play(handle.moveTo(at),{duration:0});
    return handle;
  }
  const p=carrier('translation-P-carrier',0,[P,yCarrier,z]);
  // P-site remains within the cleft while the viewer visits the next carrier.
  const a=carrier('translation-A-carrier',1,[6.2,.05,1.25]);
  const b=carrier('translation-next-carrier',2,[11.5,1.7,1.0]);
  const c=carrier('translation-third-carrier',3,[15,1.5,1.0]);
  s.play([a.animate({opacity:0}),b.animate({opacity:0}),c.animate({opacity:0})],{duration:0});
  // Hierarchy is built from new C-terminal residues toward the old N terminus.
  // Every downstream joint has the same fixed local displacement. Free amino acids
  // live on their future residue handle; their offset is zeroed on incorporation.
  const beads=[],joints=[],bonds=[];
  for(let i=0;i<9;i++)beads.push(s.sphere('translation-amino-acid-'+i,{radius:.27,...violet}));
  let child=null;
  for(let i=8;i>=0;i--){
    const parts=[beads[i]];
    if(child){parts.push(child);const link=s.tube('translation-peptide-link-'+i,{points:[[0,0,0],[0,L,0]],radius:.112,radialSegments:8,fill:Color.PURPLE_D,material:satin});parts.push(link);bonds[i]=link;}
    const g=s.group('translation-peptide-joint-'+i,parts);joints[i]=g;
    if(i<8)s.play(child.moveTo([0,L,0]),{duration:0});
    child=g;
  }
  const peptide=joints[0],aaY=yCarrier+3.14;
  let root=[P,aaY-3*L,0];
  s.play(peptide.moveTo(root),{duration:0});
  const free=(index,world)=>beads[index].moveTo([world[0]-root[0],world[1]-root[1]-index*L,world[2]-root[2]]);
  s.play([free(2,[6.2,.05+3.14,1.25]),free(1,[11.5,4.84,1]),free(0,[15,4.64,1]),beads[2].animate({opacity:0}),beads[1].animate({opacity:0}),beads[0].animate({opacity:0}),...bonds.slice(0,3).map(q=>q.animate({opacity:0}))],{duration:0});
  s.wait(1);
  s.play([a.fadeIn(),beads[2].fadeIn(),s.camera.to3D({yaw:.12,pitch:.09,height:5.25,distance:27,target:[6.2,1.65,1]})],{duration:3,ease:'smooth'});
  const aminoLabel=s.text('translation-amino-label',{text:'Amino acid',position:[8.13,3.62,1.5],fontSize:.30,fill:Color.WHITE,billboard:true});
  const aminoLead=s.line('translation-amino-leader',{points:[[7.45,3.50,1.5],[6.53,3.24,1.5]],stroke:Color.WHITE,strokeWidth:.013});
  const trnaLabel=s.text('translation-tRNA-label',{text:'tRNA',position:[8.1,1.29,1.5],fontSize:.30,fill:Color.WHITE,billboard:true});
  const trnaLead=s.line('translation-tRNA-leader',{points:[[7.6,1.32,1.5],[6.95,1.55,1.5]],stroke:Color.WHITE,strokeWidth:.013});
  s.play([aminoLabel.fadeIn(),aminoLead.fadeIn(),trnaLabel.fadeIn(),trnaLead.fadeIn()],{duration:1});
  s.wait(4.5);
  s.play([aminoLabel.fadeOut(),aminoLead.fadeOut(),trnaLabel.fadeOut(),trnaLead.fadeOut()],{duration:1.5}); // 11
  s.play([a.moveTo([2.7,yCarrier+.7,.8]),free(2,[2.7,aaY+.7,.8]),s.camera.to3D({yaw:.12,pitch:.10,height:8.25,distance:27,target:[-.8,.40,0]})],{duration:5,ease:'smooth'});
  s.play([a.moveTo([A,yCarrier+.28,.2]),free(2,[A,aaY+.28,.2])],{duration:2.8,ease:'smooth'});
  s.play([a.moveTo([A,yCarrier,0]),free(2,[A,aaY,0])],{duration:1.2,ease:'smooth'});
  s.wait(1); // 21; anticodon bottoms align with mRNA uprights, same seq/complement arrays.
  // Existing six-residue peptide transfers to the amino-acid end of the A carrier.
  root=[A,aaY-2*L,0];
  s.play([peptide.moveTo(root),beads[2].moveTo([0,0,0]),beads[1].moveTo([11.5-root[0],4.84-root[1]-L,1]),beads[0].moveTo([15-root[0],4.64-root[1],1])],{duration:3.2,ease:'smooth'});
  s.play(bonds[2].fadeIn(),{duration:.6});
  s.wait(1.2);
  s.play(s.camera.to3D({yaw:.18,pitch:.11,height:8.65,distance:27,target:[-1,.5,0]}),{duration:3}); //29
  // The assembly advances exactly three bases. Empty carrier departs after transfer.
  function step(oldCarrier,newCarrier,nextCarrier,nextIndex,nextCodon,offset,duration){
    root=[P,aaY-nextIndex*L-L,0];
    const preRoot=[P,aaY-(nextIndex+1)*L,0];
    s.play([rna.moveTo([-offset*codon,0,0]),newCarrier.moveTo([P,yCarrier,0]),oldCarrier.moveTo([P-codon,yCarrier+.10,.25]),peptide.moveTo(preRoot)],{duration:1.2,ease:'smooth'});
    root=preRoot;
    s.play([oldCarrier.moveTo([P-4,yCarrier+1,1.5]),oldCarrier.fadeOut(),nextCarrier.fadeIn(),nextCarrier.moveTo([A+2,yCarrier+.65,.7]),beads[nextIndex].fadeIn(),free(nextIndex,[A+2,aaY+.65,.7])],{duration:.8,ease:'smooth'});
    s.play([nextCarrier.moveTo([A,yCarrier,0]),free(nextIndex,[A,aaY,0])],{duration:1.3,ease:'smooth'});
    s.wait(.3);
    root=[A,aaY-nextIndex*L,0];
    const moves=[peptide.moveTo(root),beads[nextIndex].moveTo([0,0,0])];
    s.play(moves,{duration:1.1,ease:'smooth'});
    s.play(bonds[nextIndex].fadeIn(),{duration:.3});
  }
  step(p,a,b,1,2,1,5); //34
  step(a,b,c,0,3,2,5); //39
  // Mature chain rises through the visible top of the large subunit.
  s.play([s.camera.to3D({yaw:.22,pitch:.10,height:12.0,distance:29,target:[-.4,2.7,0]}),peptide.moveTo([-.8,4.45,.35]),c.fadeOut(),b.fadeOut()],{duration:6,ease:'smooth'}); //45
  root=[-.8,4.45,.35];
  s.play([peptide.moveTo([0,6.1,.5]),ribosome.moveTo([0,-4.2,-2]),rna.moveTo([-2*codon,-4.2,-2]),s.camera.to3D({yaw:.10,pitch:.10,height:8.2,distance:28,target:[0,7.0,0]})],{duration:2,ease:'smooth'}); //47
  // Fixed-length articulated schematic folding; each residue and bond survives.
  const first=[.9,-1.0,1.1,-.85,1.0,-1.05,.8,0];
  s.play([...joints.slice(1).map((g,i)=>g.rotateTo([.35*Math.sin(i*1.2),.50*Math.cos(i*.85),first[i]])),s.camera.to3D({yaw:.30,pitch:.18,height:6.8,distance:27,target:[.05,6.75,0]})],{duration:2.5,ease:'smooth'}); //49.5
  const folded=[[.55,.8,1.38],[-.8,.65,1.42],[.75,-.7,1.30],[-.6,.8,1.42],[.85,.6,1.35],[-.75,-.8,1.45],[.65,.75,1.38],[-.6,-.7,1.3]];
  s.play([...joints.slice(1).map((g,i)=>g.rotateTo(folded[i])),peptide.rotateTo([-.15,.4,.1]),s.camera.to3D({yaw:.32,pitch:.14,height:4.9,distance:26,target:[-.25,6.65,.1]})],{duration:3.5,ease:'smooth'}); //53
  // Warm gold highlights retain lilac sides and all existing residue identities.
  s.play(beads.filter((q,i)=>i%3!==0).map(q=>q.animate({fill:Color.GOLD_B})),{duration:1});
  const protein=s.text('translation-protein-label',{text:'Protein',position:[1.65,6.48,.8],billboard:true,fontSize:.31,fill:Color.WHITE});
  s.play(protein.fadeIn(),{duration:.8});
  s.play(s.camera.to3D({yaw:.42,pitch:.16,height:4.9,distance:26,target:[-.25,6.65,.1]}),{duration:3.2,ease:'smooth'});
  s.wait(1.0000000000000142); //59, compensation for binary addition
});

