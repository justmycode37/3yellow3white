const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'2d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const start = n => __narration.start('beat-2.u1.w' + n);
  const end = n => __narration.end('beat-2.u1.w' + n);
  let cursor = 0;
  const until = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, {duration:t-cursor, ease:'smooth'}); cursor=t; };
  const template = s.previous.get('template');
  const rna = s.previous.get('rna');
  const polymerase = s.previous.get('polymerase');
  const polymeraseName = s.previous.get('polymerase-name');
  const templateName = s.previous.get('template-name');
  const rnaName = s.previous.get('rna-name');
  const tb=[], rb=[], letters=[], pairs=[], backbones=[];
  for(let i=0;i<6;i++) {
    tb.push(s.previous.get('template-base-'+i));
    rb.push(s.previous.get('rna-base-'+i));
    const tl=s.previous.get('template-letter-'+i);
    letters.push(s.previous.get('rna-letter-'+i));
    s.attach(tl,tb[i],{offset:[0,0,0]});
    s.attach(letters[i],rb[i],{offset:[0,0,0]});
    pairs.push(s.previous.get('rna-template-pair-'+i));
    s.connect(pairs[i],tb[i],rb[i],{endpoints:'surface'});
    if(i>0) {
      const t=s.previous.get('template-backbone-'+(i-1));
      const r=s.previous.get('rna-backbone-'+(i-1));
      s.connect(t,tb[i-1],tb[i],{endpoints:'surface'});
      s.connect(r,rb[i-1],rb[i],{endpoints:'surface'});
      backbones.push(r);
    }
  }
  s.attach(polymeraseName,polymerase,{offset:[0,-2.12,0]});
  s.attach(s.previous.get('template-3prime'),tb[0],{offset:[-1.1,0,0]});
  s.attach(s.previous.get('template-5prime'),tb[5],{offset:[1.1,0,0]});
  let tip, five, three, readArrow, growthArrow;
  // Preserve the inherited flat close-up: polarity reads most clearly in this plane.
  s.view('transcription-view',{
    rect:[0.04,0.12,0.92,0.76], orbit:true, orbitHitTest:'geometry',
    camera:{yaw:0,pitch:0,target:[0,0,0],height:7.4,distance:15,perspective:0}
  },v=>{
    tip=v.sphere('rna-tip-anchor',{radius:0.01,position:[0.6,-0.8,0],opacity:0,fill:Color.GREEN});
    five=v.text('rna-5prime',{text:'5′',fontSize:0.4,fill:Color.GREEN,position:[-3.7,-0.8,0],billboard:true,opacity:0});
    three=v.text('rna-3prime',{text:'3′',fontSize:0.4,fill:Color.GREEN,position:[1.4,-0.8,0],billboard:true,opacity:0});
    v.attach(five,rb[0],{offset:[-0.7,0,0]});
    v.attach(three,tip,{offset:[0.8,0,0]});
    readArrow=v.arrow('template-reading-direction',{points:[[-3,1.8,0],[3,1.8,0]],stroke:Color.PURPLE,strokeWidth:0.045,opacity:0});
    growthArrow=v.arrow('rna-growth-direction',{points:[[-3,-1.9,0],[1.8,-1.9,0]],stroke:Color.GREEN,strokeWidth:0.045,opacity:0});
  });
  // Clear the introductory enzyme label before its travel crosses annotations.
  playTo(end(5),[polymeraseName.fadeOut(),templateName.moveTo([0,2.5,0]),rnaName.moveTo([-4.35,-1.7,0])]);
  until(start(7));
  playTo(end(9),readArrow.fadeIn());
  until(start(10));
  playTo(end(17),polymerase.moveTo([1.8,0,0]));
  // The existing AUGC is extended only at its right-hand, three-prime end.
  until(start(20));
  playTo(end(23),[rb[4].fadeIn(),letters[4].fadeIn(),backbones[3].fadeIn(),pairs[4].fadeIn(),tip.moveTo([1.8,-0.8,0])]);
  until(start(25));
  playTo(end(26),three.fadeIn());
  until(start(28));
  playTo(end(28),[five.fadeIn(),growthArrow.fadeIn()]);
  until(start(29));
  playTo(end(32),[
    polymerase.moveTo([3,0,0]), tip.moveTo([3,-0.8,0]),
    rb[5].fadeIn(),letters[5].fadeIn(),backbones[4].fadeIn(),pairs[5].fadeIn(),
    growthArrow.morphTo({kind:'arrow',points:[[-3,-1.9,0],[3,-1.9,0]]})
  ]);
  // Hold the full, paired AUGCUA throughout the spoken sequence.
  until(start(42));
  playTo(start(44),[readArrow.fadeOut(),growthArrow.fadeOut()]);
  s.remove(readArrow); s.remove(growthArrow);
  // Dissociation removes only temporary pairing contacts, never either backbone.
  playTo(start(45),[...pairs.map(p=>p.fadeOut()),polymerase.fadeOut()]);
  pairs.forEach(p=>s.remove(p));
  s.remove(polymerase); s.remove(polymeraseName);
  playTo(end(46),[
    rna.moveTo([0,-0.9,0]),tip.moveTo([3,-1.7,0])
  ]);
  // Intact template above, intact RNA product below. A rigid translation preserves
  // every backbone distance; attached letters and end labels follow their strand.
  until(__narration.durationSec);
});