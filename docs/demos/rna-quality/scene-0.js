const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:"2d",background:Color.BLACK,audio:__narration.audioAssetId,end:__narration.endMode},s=>{
  const start=n=>__narration.start(`beat-1.u1.w${n}`);
  const end=n=>__narration.end(`beat-1.u1.w${n}`);
  let cursor=0;
  const until=t=>{if(t>cursor){s.wait(t-cursor);cursor=t;}};
  const play=(actions,t)=>{s.play(actions,{duration:t-cursor,ease:"smooth"});cursor=t;};
  let template,rna,polymerase,polLabel,other,cam,ends,templateName,rnaName;
  const dna=[],opposite=[],upperLabels=[],rnaBases=[],rnaNodes=[],rnaBonds=[],pairs=[],oldPairs=[];
  const xs=Array.from({length:6},(_,i)=>-3+1.2*i);
  s.view("transcription-view",{rect:[0.06,0.12,0.88,0.76],camera:{yaw:0.3,pitch:0.35,distance:17,height:7.4},orbit:true,orbitHitTest:"geometry"},v=>{
    cam=v.camera;
    const templateParts=[],otherParts=[],rnaParts=[];
    const templateSequence="TACGAT",otherSequence="ATGCTA",rnaSequence="AUGCUA";
    for(let i=0;i<6;i++){
      const a=-1.7+i*0.68;
      const p=[xs[i],-0.8*Math.cos(a),-0.8*Math.sin(a)];
      const q=[xs[i],-p[1],-p[2]];
      const base=v.sphere(`template-base-${i}`,{position:p,radius:0.27,fill:Color.TEAL});
      const label=v.latex(`template-letter-${i}`,{tex:templateSequence[i],fontSize:0.4,position:p,fill:Color.WHITE,billboard:true,billboardOffset:[0,0,0.32]});
      v.attach(label,base,{offset:[0,0,0]});
      dna.push(base);templateParts.push(base,label);
      const upper=v.sphere(`other-base-${i}`,{position:q,radius:0.27,fill:Color.GREY_D});
      const upperLabel=v.latex(`other-letter-${i}`,{tex:otherSequence[i],fontSize:0.4,position:q,billboard:true,billboardOffset:[0,0,0.32]});
      v.attach(upperLabel,upper,{offset:[0,0,0]});
      upperLabels.push(upperLabel);opposite.push(upper);otherParts.push(upper,upperLabel);
      const oldPair=v.line3D(`original-pair-${i}`,{stroke:Color.GREY_B,strokeWidth:0.025});
      v.connect(oldPair,base,upper,{endpoints:"surface"});oldPairs.push(oldPair);otherParts.push(oldPair);
      if(i){
        const bond=v.line3D(`template-bond-${i-1}-${i}`,{stroke:Color.TEAL,strokeWidth:0.065});
        v.connect(bond,dna[i-1],base,{endpoints:"surface"});templateParts.push(bond);
        const otherBond=v.line3D(`other-bond-${i-1}-${i}`,{stroke:Color.GREY_B,strokeWidth:0.055});
        v.connect(otherBond,opposite[i-1],upper,{endpoints:"surface"});otherParts.push(otherBond);
      }
      const rb=v.sphere(`rna-base-${i}`,{radius:0.27,fill:Color.GREEN});
      const rl=v.latex(`rna-letter-${i}`,{tex:rnaSequence[i],fontSize:0.4,billboard:true,billboardOffset:[0,0,0.32]});
      v.attach(rl,rb,{offset:[0,0,0]});
      const node=v.group(`rna-nucleotide-${i}`,[rb,rl],{position:[xs[i],1.55,0],opacity:0});
      rnaBases.push(rb);rnaNodes.push(node);rnaParts.push(node);
      const pair=v.line3D(`rna-template-pair-${i}`,{stroke:Color.WHITE,strokeWidth:0.025,opacity:0});
      v.connect(pair,base,rb,{endpoints:"surface"});pairs.push(pair);
      if(i){
        const bond=v.line3D(`rna-bond-${i-1}-${i}`,{stroke:Color.GREEN,strokeWidth:0.065,opacity:0});
        v.connect(bond,rnaBases[i-1],rb,{endpoints:"surface"});rnaBonds.push(bond);rnaParts.push(bond);
      }
    }
    const left=v.latex("template-3prime",{tex:"3'",position:[-4.15,-0.8,0],fontSize:0.4,fill:Color.TEAL,billboard:true});
    const right=v.latex("template-5prime",{tex:"5'",position:[4.15,-0.8,0],fontSize:0.4,fill:Color.TEAL,billboard:true});
    ends=v.group("template-ends",[left,right],{opacity:0});
    templateName=v.latex("template-label",{tex:"\\mathrm{DNA\\ template}",position:[0,-1.65,0],fontSize:0.4,fill:Color.TEAL,billboard:true,opacity:0});
    templateParts.push(ends,templateName);
    template=v.group("template",templateParts,{opacity:0});
    other=v.group("other-dna",otherParts,{opacity:0});
    rnaName=v.latex("rna-label",{tex:"\\mathrm{RNA}",position:[-3,1.65,0],fontSize:0.42,fill:Color.GREEN,billboard:true,opacity:0});
    rnaParts.push(rnaName);
    rna=v.group("rna",rnaParts);
    const ring=v.circle("polymerase-active-region",{radius:1.13,fill:Color.NONE,stroke:Color.PURPLE,strokeWidth:0.065});
    const label=polLabel=v.latex("polymerase-label",{tex:"\\mathrm{RNA\\ pol.}",position:[0,2.95,0],fontSize:0.38,fill:Color.PURPLE,billboard:true});
    polymerase=v.group("polymerase",[ring,label],{position:[-3,0,0],opacity:0});
  });
  play([template.fadeIn(),other.fadeIn()],end(1));
  until(start(9));
  play(polymerase.fadeIn(),end(10));
  until(start(11));
  play([polLabel.fadeOut(),...opposite.map((b,i)=>b.moveTo([xs[i],2.25,0.45])),...oldPairs.map(p=>p.fadeOut()),...upperLabels.map(l=>l.fadeOut())],end(14));
  until(start(15));
  play([other.fadeOut(),...dna.map((b,i)=>b.moveTo([xs[i],-0.8,0])),cam.to2D({height:7.4}),ends.fadeIn(),templateName.fadeIn()],end(21));
  s.remove(other);
  until(start(33));
  play(rnaName.fadeIn(),end(34));
  until(start(35));
  play([rnaNodes[0].fadeIn(),rnaNodes[0].moveTo([xs[0],0.8,0]),pairs[0].fadeIn()],end(40));
  until(start(45));
  play([polymerase.moveTo([xs[1],0,0]),rnaNodes[1].fadeIn(),rnaNodes[1].moveTo([xs[1],0.8,0]),pairs[1].fadeIn(),rnaBonds[0].fadeIn()],end(47));
  until(start(48));
  play([polymerase.moveTo([xs[2],0,0]),rnaNodes[2].fadeIn(),rnaNodes[2].moveTo([xs[2],0.8,0]),pairs[2].fadeIn(),rnaBonds[1].fadeIn()],end(50));
  until(start(52));
  play([polymerase.moveTo([xs[3],0,0]),rnaNodes[3].fadeIn(),rnaNodes[3].moveTo([xs[3],0.8,0]),pairs[3].fadeIn(),rnaBonds[2].fadeIn()],end(54));
  until(start(55));
  const uracil=s.latex("uracil-cue",{tex:"\\mathrm{RNA}:\\quad U",position:[-0.5,-2.65],fontSize:0.48,fill:Color.GREEN});
  play(uracil.fadeIn(),end(57));
  until(start(58));
  const notT=s.latex("not-thymine",{tex:"\\ne T",position:[1.5,-2.65],fontSize:0.48,fill:Color.WHITE});
  play(notT.fadeIn(),end(59));
  // The four-base prefix remains; the next scene incorporates U and A.
  s.keep(template);s.keep(rna);s.keep(polymerase);
  pairs.forEach(p=>s.keep(p));
  until(__narration.durationSec);
});