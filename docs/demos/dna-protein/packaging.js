// Illustrative cell-to-DNA scale tour. Condensed chromosome is packaging context,
// not a claim that a mitotic chromosome is being transcribed. No atomic data.
export default scene({mode:'3d',orbit:false,end:'advance',background:Color.PURPLE_D},s=>{
 const PI=Math.PI, TAU=2*PI;
 const sample=(f,a,b,n)=>Array.from({length:n+1},(_,i)=>f(a+(b-a)*i/n));
 const satin={roughness:.73,specular:.28,metalness:.04};
 const pink={fill:Color.LIGHT_PINK,texture:{pattern:'noise',color:Color.LIGHT_PINK,scale:12,seed:13,bumpStrength:.004},material:satin};
 const violet={fill:Color.PURPLE_C,texture:{pattern:'noise',color:Color.PURPLE_D,scale:5,seed:27,bumpStrength:.003},material:satin};
 const back={fill:Color.GREY_C,texture:{pattern:'noise',color:Color.GREY_D,scale:.16,seed:12,bumpStrength:.001},material:{roughness:.62,specular:.32,emissive:Color.PURE_BLUE,emissiveIntensity:.07}};
 const colors={A:Color.GREEN,T:Color.RED,C:Color.BLUE_A,G:Color.YELLOW_D};
 const camera=(height,distance,target,yaw=.12,pitch=.06)=>s.camera.to3D({height,distance,target,yaw,pitch});
 const threads=s.previous.get('nuclear-chromatin');
 // The exact same background is reconstructed without becoming durable.
 for(let i=0;i<80;i++){const y=-24+i*.6;const alpha=.12+.55/(1+Math.exp((y+1)/4));s.rectangle('cell-atmosphere-gradient-'+i,{position:[0,y+.3,-12],width:80,height:.6,fill:{color:Color.BLUE_A,opacity:alpha},stroke:Color.NONE});}
 function localLabel(id,text,p,to,size=.4){const t=s.text(id,{text,position:p,billboard:true,fontSize:size,fill:Color.WHITE});const l=s.line(id+'-leader',{points:[[p[0],p[1]-.24,p[2]],to],stroke:{color:Color.WHITE,opacity:.7},strokeWidth:.018});return s.group(id+'-annotation',[t,l]);}
 // Local0–6 / global24–30: illustrative condensed packaging. Each chromatid is a continuous
 // curved lobular surface with narrowed waist; two chromatids meet centrally.
 const chromatid=[];
 for(let side=0;side<2;side++)chromatid.push(s.parametricSurface('chromatid-'+side,{uRange:[0,TAU],vRange:[0,PI],closedU:true,uSegments:22,vSegments:22,fn:(u,v)=>{u=-u;const y=2.6*Math.cos(v),waist=.35+.30*Math.pow(Math.abs(Math.cos(v)),.6);const r=waist*Math.sin(v)*(1+.06*Math.sin(7*u+10*v));const x=(side?1:-1)*(.20+.67*Math.pow(Math.abs(y/2.6),1.25));return[x+r*Math.cos(u),y+.045*Math.sin(5*u)*Math.sin(v),r*.90*Math.sin(u)];},...violet}));
 const chromosome=s.group('condensed-chromosome',chromatid);
 s.play([chromosome.fadeIn(),threads.fadeOut(),camera(7.2,21,[0,0,0],.20,.11)],{duration:2,ease:'smooth'});s.remove(threads);
 const chromosomeLabel=localLabel('chromosome-label','Chromosome',[2.3,1.8,.5],[.9,1.1,.45],.34);
 s.wait(3);s.play(chromosomeLabel.fadeOut(),{duration:1});s.remove(chromosomeLabel);
 // 30–38: scale follows the emerging connected fibre into nucleosomes.
 s.play([chromosome.scaleTo(.47),chromosome.moveTo([-5.7,.25,-1.8]),camera(8.5,27,[-.7,0,0],.15,.07)],{duration:2,ease:'smooth'});
 const packaging=[];
 packaging.push(s.tube('unpacked-chromatin-connection',{points:sample(t=>[-5.5+2.8*t,.3+.50*Math.sin(TAU*t),-1.6+1.6*t],0,1,56),radius:.095,radialSegments:6,...violet}));
 const histoneCenters=[[-2.2,.65,0],[.2,-.65,.2],[2.6,.65,.1]];
 let last=[-2.7,.3,0];
 for(let k=0;k<histoneCenters.length;k++){
  const p=histoneCenters[k];
  packaging.push(s.cylinder('histone-core-'+k,{position:p,radius:.65,height:.86,radialSegments:28,fill:Color.GOLD_D,texture:{pattern:'noise',color:Color.GOLD_C,scale:3,seed:41,bumpStrength:.002},material:satin}));
  // DNA wraps twice around the Y axis of each flattened gold core.
  const wrap=sample(t=>[p[0]+.76*Math.cos(t),p[1]-.37+.74*t/(4*PI),p[2]+.76*Math.sin(t)],0,4*PI,64);
  packaging.push(s.tube('histone-link-'+k,{points:sample(t=>[last[0]+(wrap[0][0]-last[0])*t,last[1]+(wrap[0][1]-last[1])*t+.18*Math.sin(PI*t),last[2]+(wrap[0][2]-last[2])*t],0,1,15),radius:.075,radialSegments:6,...back}));
  packaging.push(s.tube('histone-wrapped-DNA-'+k,{points:wrap,radius:.075,radialSegments:6,...back}));last=wrap[wrap.length-1];
 }
 packaging.push(s.tube('histone-to-helix-link',{points:sample(t=>[last[0]+1.2*t,last[1]+.5*t,last[2]+.3*Math.sin(PI*t)],0,1,30),radius:.075,radialSegments:6,...back}));
 const packageGroup=s.group('histone-packaging',packaging);
 s.play(packageGroup.fadeIn(),{duration:1});
 const histoneLabel=localLabel('histone-label','Histone',[.15,1.7,1.0],[.2,-.25,.5],.36);
 s.play(camera(7.2,24,[.6,.2,0],.16,.1),{duration:3,ease:'smooth'});
 s.play(histoneLabel.fadeOut(),{duration:.6});s.remove(histoneLabel);

 // 38–44: generous oblique double helix, exact endpoint documented for handoff.
 const dna=[];const strand=(x,phase)=>[x,.30*x+1.1*Math.cos(1.3*x+phase),1.1*Math.sin(1.3*x+phase)];
 for(let j=0;j<2;j++)dna.push(s.tube('overview-DNA-backbone-'+j,{points:sample(x=>strand(x,j*PI),-12,12,145),radius:.13,radialSegments:6,...back}));
 const seq=['G','A','C','T','G','A','C','T','G','A','C','A','G','T','C','G','A','T','C','G','A','T','C'];
 // Batch static slender rods by base identity. This retains paired colors while
 // avoiding a hundred separately tessellated cylinder calls in the QuickJS VM.
 const baseMeshes={};for(const base of ['A','T','C','G'])baseMeshes[base]={vertices:[],triangles:[]};
 function baseRod(a,b,base){const m=baseMeshes[base],start=m.vertices.length,dy=b[1]-a[1],dz=b[2]-a[2],len=Math.sqrt(dy*dy+dz*dz),ny=-dz/len,nz=dy/len;
  for(const p of [a,b])for(let k=0;k<6;k++){const q=TAU*k/6;m.vertices.push([p[0]+.075*Math.cos(q),p[1]+.075*ny*Math.sin(q),p[2]+.075*nz*Math.sin(q)]);}
  for(let k=0;k<6;k++){const j=(k+1)%6;m.triangles.push([start+k,start+6+k,start+j],[start+j,start+6+k,start+6+j]);}
 }
 for(let i=0;i<31;i++){const x=-11.4+i*.76,a=strand(x,0),b=strand(x,PI),m=a.map((v,j)=>(v+b[j])/2),base=seq[i%seq.length],comp={A:'T',T:'A',G:'C',C:'G'}[base];baseRod(a,m,base);baseRod(m,b,comp);}
 for(const base of ['A','T','C','G'])dna.push(s.mesh('overview-DNA-bases-'+base,{...baseMeshes[base],shading:'smooth',fill:colors[base],material:satin}));
 const helix=s.group('overview-DNA',dna);
 // First the small outgoing helix remains attached to the packaging context;
 // a continuous enlargement brings this same helix into the final close view.
 s.play([helix.scaleTo(.28),helix.moveTo([7.92,2.84,.133])],{duration:0});
 s.play(helix.fadeIn(),{duration:.4});
 s.play([helix.scaleTo(1),helix.moveTo([0,0,0]),chromosome.fadeOut(),packageGroup.fadeOut(),camera(11.5,32,[0,0,0],.12,.06)],{duration:3,ease:'smooth'});s.remove(chromosome);s.remove(packageGroup);
 const dnaLabel=localLabel('dna-label','DNA',[.4,2.6,1.1],[0,1.1,0],.44);s.wait(2.8);s.play(dnaLabel.fadeOut(),{duration:.7});s.remove(dnaLabel);s.wait(.5);
});





