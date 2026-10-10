const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'2d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const start = n => __narration.start('beat-1.u1.w'+n);
  const end = n => __narration.end('beat-1.u1.w'+n);
  let cursor = 0;
  const until = t => { if(t > cursor) s.wait(t-cursor); cursor=t; };
  const playTo = (t, actions) => { s.play(actions,{duration:t-cursor,ease:'smooth'}); cursor=t; };
  const xs = [-3,-1.8,-0.6,0.6,1.8,3];
  const dna = [], dnaLetters = [], other = [], duplexPairs = [], rna = [], rnaLetters = [], rnaBonds = [], pairs = [];
  let template, transcript, polymerase, context, camera, dnaName, rnaName, enzymeName, ends, scan;
  s.view('transcription-view', {rect:[0.04,0.12,0.92,0.76], orbit:true, orbitHitTest:'geometry', camera:{yaw:0.22,pitch:0.28,height:7.4,distance:15,target:[0,0,0]}}, v => {
    camera=v.camera;
    const dt=[], rt=[], ct=[];
    // A short spatial ladder, not an atomistic molecular model.
    // Straight rails retain their backbone lengths as the region opens.
    for(let i=0;i<6;i++) {
      const a=0.62;
      const p=[xs[i],0.75*Math.cos(a),0.75*Math.sin(a)];
      const q=[xs[i],-p[1],-p[2]];
      dna[i]=v.sphere('template-base-'+i,{position:p,radius:0.13,fill:Color.TEAL});
      dnaLetters[i]=v.text('template-letter-'+i,{text:'TACGAT'[i],position:p,fontSize:0.46,fill:Color.TEAL,billboard:true,billboardOffset:[0,0.43,0]});
      v.attach(dnaLetters[i],dna[i]);
      dt.push(dna[i],dnaLetters[i]);
      other[i]=v.sphere('other-dna-base-'+i,{position:q,radius:0.12,fill:Color.GREY_B});
      ct.push(other[i]);
      const rung=v.line3D('duplex-pair-'+i,{stroke:Color.GREY_B,strokeWidth:0.025});
      v.connect(rung,dna[i],other[i],{endpoints:'surface'}); ct.push(rung);duplexPairs.push(rung);
      rna[i]=v.sphere('rna-base-'+i,{position:[xs[i],i===0?-1.65:-0.8,0],radius:0.13,fill:Color.GREEN,opacity:0});
      rnaLetters[i]=v.text('rna-letter-'+i,{text:'AUGCUA'[i],fontSize:0.46,fill:Color.GREEN,billboard:true,billboardOffset:[0,-0.43,0],opacity:0});
      v.attach(rnaLetters[i],rna[i]); rt.push(rna[i],rnaLetters[i]);
      pairs[i]=v.line3D('rna-template-pair-'+i,{stroke:Color.WHITE,strokeWidth:0.025,opacity:0});
      v.connect(pairs[i],dna[i],rna[i],{endpoints:'surface'});
      if(i>0) {
        const db=v.line3D('template-backbone-'+(i-1),{stroke:Color.TEAL,strokeWidth:0.055});
        v.connect(db,dna[i-1],dna[i],{endpoints:'surface'});dt.push(db);
        const ob=v.line3D('other-dna-backbone-'+(i-1),{stroke:Color.GREY_B,strokeWidth:0.045});
        v.connect(ob,other[i-1],other[i],{endpoints:'surface'});ct.push(ob);
        const rb=v.line3D('rna-backbone-'+(i-1),{stroke:Color.GREEN,strokeWidth:0.055,opacity:0});
        v.connect(rb,rna[i-1],rna[i],{endpoints:'surface'});rnaBonds.push(rb);rt.push(rb);
      }
    }
    dnaName=v.text('template-name',{text:'DNA template',position:[0,2.15,0],fontSize:0.4,fill:Color.TEAL,billboard:true,opacity:0});dt.push(dnaName);
    ends=[v.text('template-3prime',{text:'3′',position:[-4.1,0.8,0],fontSize:0.4,fill:Color.TEAL,billboard:true,opacity:0}),v.text('template-5prime',{text:'5′',position:[3.7,0.8,0],fontSize:0.4,fill:Color.TEAL,billboard:true,opacity:0})];dt.push(...ends);
    rnaName=v.text('rna-name',{text:'RNA',position:[-4.4,-0.8,0],fontSize:0.38,fill:Color.GREEN,billboard:true,opacity:0});rt.push(rnaName);
    template=v.group('template',dt,{isolated:true});
    transcript=v.group('rna',rt);
    context=v.group('duplex-context',ct,{isolated:true});
    const ringPoints=[];
    for(let j=0;j<=64;j++){const a=j*Math.PI/32;ringPoints.push([0.65*Math.cos(a),1.55*Math.sin(a),-0.18]);}
    const ring=v.line3D('polymerase-rim',{points:ringPoints,stroke:Color.PURPLE,strokeWidth:0.065});
    const lobes=[-1,1].map((d,i)=>v.sphere('polymerase-lobe-'+i,{position:[d*0.65,0,-0.18],radius:0.2,fill:Color.PURPLE}));
    polymerase=v.group('polymerase',[ring,...lobes],{position:[-3,0,0],opacity:0});
    enzymeName=v.text('polymerase-name',{text:'polymerase',fontSize:0.36,fill:Color.PURPLE,billboard:true,opacity:0});
    v.attach(enzymeName,polymerase,{offset:[0,-2.12,0]});
    scan=v.line('sequence-marker',{points:[[-0.22,0],[0.22,0]],position:[-3,1.65,0],stroke:Color.WHITE,strokeWidth:0.035,opacity:0});
  });
  // Spatial duplex first; the same teal strand becomes the flat close-up.
  playTo(end(4),[template.fadeIn(),context.fadeIn()]);
  until(start(9));playTo(end(10),[polymerase.fadeIn(),enzymeName.fadeIn()]);
  until(start(11));playTo(end(11),duplexPairs.map(p=>p.fadeOut()));
  playTo(end(14),other.map((o,i)=>o.moveTo([xs[i],-1.45,-0.7])));
  until(start(16));
  playTo(end(21),[context.fadeOut(),camera.to2D({height:7.4}),...dna.map((o,i)=>o.moveTo([xs[i],0.8,0])),dnaName.fadeIn(),...ends.map(o=>o.fadeIn())]);
  s.remove(context);
  until(start(26));playTo(end(26),scan.fadeIn());
  for(let i=1;i<6;i++){until(start(26+i));playTo(end(26+i),scan.moveTo([xs[i],1.65,0]));}
  until(start(32));playTo(start(33),scan.fadeOut());s.remove(scan);
  playTo(end(34),[rna[0].fadeIn(),rnaName.fadeIn()]);
  until(start(35));playTo(end(40),[rna[0].moveTo([-3,-0.8,0]),pairs[0].fadeIn()]);
  until(start(41));playTo(end(44),rnaLetters[0].fadeIn());
  // Only AUGC is made here; final U and A remain addressable for the next scene.
  const cues=[[45,47],[48,50],[52,54]];
  for(let i=1;i<4;i++){
    const [a,b]=cues[i-1];
    playTo(start(a),polymerase.moveTo([xs[i],0,0]));
    playTo(end(b),[rna[i].fadeIn(),rnaLetters[i].fadeIn(),rnaBonds[i-1].fadeIn(),pairs[i].fadeIn()]);
  }
  until(start(55));
  const uRule=s.latex('uracil-cue',{tex:String.raw`\mathrm{U}\ne\mathrm{T}`,position:[1.8,-2.85],fontSize:0.45,fill:Color.GREEN});
  playTo(end(59),uRule.fadeIn());
  playTo(__narration.durationSec-2,uRule.fadeOut());s.remove(uRule);
  s.keep(template);s.keep(transcript);s.keep(polymerase);s.keep(enzymeName);
  pairs.forEach(p=>s.keep(p));
  until(__narration.durationSec);
});