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
 s.play(camera(16,34,[0,0,0],.15,.1),{duration:0});
 // Layered palette geometry approximates a soft atmospheric gradient.
 // Separate horizontal bands blend the palette into a pale lower atmosphere.
 // Adjacent edges coincide: overlapping translucent quads can show sorting seams.
 const atmosphere=[];
 for(let i=0;i<80;i++){const y=-24+i*.6;const alpha=.12+.55/(1+Math.exp((y+1)/4));atmosphere.push(s.rectangle('cell-atmosphere-gradient-'+i,{position:[0,y+.3,-12],width:80,height:.6,fill:{color:Color.BLUE_A,opacity:alpha},stroke:Color.NONE}));}
 const atmosphereGroup=s.group('cell-atmosphere',atmosphere);
 function localLabel(id,text,p,to,size=.4){const t=s.text(id,{text,position:p,billboard:true,fontSize:size,fill:Color.WHITE});const l=s.line(id+'-leader',{points:[[p[0],p[1]-.24,p[2]],to],stroke:{color:Color.WHITE,opacity:.7},strokeWidth:.018});return s.group(id+'-annotation',[t,l]);}
 // du cross dv points outward by reversing the azimuth.
 function cellPoint(u,v,r){u=-u;const sv=Math.sin(v),bulge=1+.035*Math.sin(3*u+.6)*sv*sv+.024*Math.cos(5*u-2*v)*sv*sv*sv;return[r*sv*Math.cos(u)*bulge,r*.94*sv*Math.sin(u)*bulge,r*.83*Math.cos(v)*bulge];}
 const shell=s.parametricSurface('cell-posterior-membrane',{uRange:[0,TAU],vRange:[PI/2,PI],closedU:true,uSegments:36,vSegments:16,fn:(u,v)=>cellPoint(u,v,6),...pink});
 const cap=s.parametricSurface('cell-anterior-membrane',{uRange:[0,TAU],vRange:[0,PI/2],closedU:true,uSegments:36,vSegments:18,fn:(u,v)=>cellPoint(u,v,6),...pink});
 const cut=s.tube('cell-cut-edge',{points:sample(u=>cellPoint(u,PI/2,6),0,TAU,110),radius:.095,radialSegments:6,closed:true,fill:Color.LIGHT_PINK,material:satin});
 const nucleus=s.sphere('nucleus-envelope',{position:[-.65,.1,-.45],radius:2.45,...violet});
 const organelles=[shell,cut,nucleus];
 // Broad nested folded endoplasmic-reticulum sheets wrap around the nucleus.
 for(let k=0;k<4;k++){
  const r=2.92+.60*k,from=-.2+.10*Math.sin(k),to=4.55+.12*Math.cos(k);
  const erPoint=(u,v,offset)=>{u=-u;const rr=r+v+.20*Math.sin(4*u+k*.85);return[-.65+rr*Math.cos(u),.1+rr*.76*Math.sin(u),-.35+.60*Math.sin(3*u+k*.75)+1.15*v+offset];};
  organelles.push(s.parametricSurface('er-fold-'+k,{uRange:[from,to],vRange:[-.47,.47],uSegments:32,vSegments:4,fn:(u,v)=>erPoint(u,v,0),fill:Color.PINK,material:satin}));
  organelles.push(s.parametricSurface('er-fold-underside-'+k,{uRange:[from,to],vRange:[-.47,.47],uSegments:32,vSegments:4,fn:(u,v)=>erPoint(u,-v,-.07),fill:Color.PURPLE_A,material:satin}));
  for(let side=0;side<2;side++)organelles.push(s.tube('er-rim-'+k+'-'+side,{points:sample(u=>erPoint(u,side?.47:-.47,-.025),from,to,38),radius:.048,radialSegments:5,fill:Color.LIGHT_PINK,material:satin}));
 }
 // Sectioned elongated mitochondria: an occupied back body and visible cristae.
 function mitochondrion(id,p,angle){const kids=[];function point(x,y,z){return[p[0]+x*Math.cos(angle)-y*Math.sin(angle),p[1]+x*Math.sin(angle)+y*Math.cos(angle),p[2]+z];}
  kids.push(s.parametricSurface(id+'-body',{uRange:[0,TAU],vRange:[PI/2,PI],closedU:true,uSegments:22,vSegments:10,fn:(u,v)=>point(1.1*Math.sin(v)*Math.cos(-u),.47*Math.sin(v)*Math.sin(-u),.40*Math.cos(v)),fill:Color.TEAL_D,texture:{pattern:'noise',color:Color.TEAL_C,scale:3,seed:35,bumpStrength:.002},material:satin}));
  kids.push(s.tube(id+'-lip',{points:sample(u=>point(1.1*Math.cos(u),.47*Math.sin(u),0),0,TAU,50),closed:true,radius:.052,radialSegments:6,fill:Color.BLUE_A,material:satin}));
  for(let j=0;j<6;j++)kids.push(s.tube(id+'-crista-'+j,{points:sample(q=>point(-.8+j*.30+.075*Math.sin(q*PI),q*.36,-.13+.10*Math.cos(q*PI)), -1,1,12),radius:.058,radialSegments:6,fill:Color.GOLD_A,material:satin}));return s.group(id,kids);
 }
 organelles.push(mitochondrion('mitochondrion-left',[-3.7,-2.7,.6],-.45));
 organelles.push(mitochondrion('mitochondrion-right',[3.8,1.55,.4],.8));
 organelles.push(mitochondrion('mitochondrion-low',[2.8,-3.2,.3],.35));
 const cellLabel=localLabel('cell-label','Cell',[3.65,3.85,4],[2.9,2.7,4.7],.5);
 // 0–8: substantial forward approach, without decorative spinning.
 s.play(camera(14,28,[0,0,0],.16,.09),{duration:7,ease:'smooth'});
 s.play(cellLabel.fadeOut(),{duration:1});s.remove(cellLabel);
 // 8–10: remove the forward hemisphere, exposing rather than occluding anatomy.
 s.play([cap.fadeOut(),camera(12.8,25,[-.2,0,0],.15,.08)],{duration:2,ease:'smooth'});s.remove(cap);
 const nucleusLabel=localLabel('nucleus-label','Nucleus',[.65,2.9,2.2],[-.1,1.5,1.9],.4);
 s.wait(2);
 s.play(camera(9.1,20,[-.6,.1,0],.13,.06),{duration:4,ease:'smooth'});
 s.play(nucleusLabel.fadeOut(),{duration:1});s.remove(nucleusLabel);s.wait(1);
 // 18–24: an explicit nuclear cutaway reveals chromatin before the camera enters.
 const chromatin=[];
 for(let j=0;j<5;j++)chromatin.push(s.tube('nuclear-chromatin-'+j,{points:sample(t=>[-.65+1.65*Math.sin(2.1*t+j*.64)*Math.cos(.42*t),.1+1.68*Math.sin(1.37*t+j*.8),-.2+.84*Math.cos(1.7*t+j*.65)],0,5.1,40),radius:.045,radialSegments:6,...violet}));
 const threads=s.group('nuclear-chromatin',chromatin);
 const rearNucleus=s.parametricSurface('nucleus-rear-cutaway',{uRange:[0,TAU],vRange:[PI/2,PI],closedU:true,uSegments:32,vSegments:14,fn:(u,v)=>[-.65+2.45*Math.sin(v)*Math.cos(-u),.1+2.45*Math.sin(v)*Math.sin(-u),-.45+2.45*Math.cos(v)],...violet});
 s.play([nucleus.fadeOut(),camera(6.4,16,[-.65,.1,0],.10,.05)],{duration:2,ease:'smooth'});s.remove(nucleus);
 s.play(camera(4.8,13,[-.65,.1,.1],.06,.03),{duration:3,ease:'smooth'});
 s.play([...organelles.filter(x=>x!==nucleus).map(x=>x.fadeOut()),rearNucleus.fadeOut()],{duration:1});for(const x of organelles.filter(x=>x!==nucleus))s.remove(x);s.remove(rearNucleus);
 s.keep(threads);
});
