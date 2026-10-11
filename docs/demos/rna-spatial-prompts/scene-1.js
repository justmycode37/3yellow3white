const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'2d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const start = n => __narration.start('beat-2.u1.w'+n);
  const end = n => __narration.end('beat-2.u1.w'+n);
  let cursor = 0;
  const until = t => { if(t > cursor) { s.wait(t-cursor); cursor=t; } };
  const playTo = (t, actions) => { s.play(actions,{duration:t-cursor,ease:'smooth'}); cursor=t; };
  // The incoming close-up is already flat. Retain its actual molecular objects.
  const template=s.previous.get('template');
  const rna=s.previous.get('rna');
  const polymerase=s.previous.get('polymerase');
  const polymeraseLabel=s.previous.get('polymerase-label');
  const rnaLabel=s.previous.get('rna-label');
  const pairs=s.previous.get('pairing-links');
  const bases=[], letters=[], links=[], dna=[];
  for(let i=0;i<6;i++) {
    dna.push(s.previous.get('template-base-'+i));
    s.attach(s.previous.get('template-letter-'+i),dna[i],{offset:[0,0,0.32]});
    bases.push(s.previous.get('rna-base-'+i));
    letters.push(s.previous.get('rna-letter-'+i));
    s.attach(letters[i],bases[i],{offset:[0,0,0.32]});
    s.connect(s.previous.get('rna-template-pair-'+i),dna[i],bases[i],{endpoints:'surface'});
    if(i>0) {
      links[i]=s.previous.get('rna-backbone-'+(i-1)+'-'+i);
      s.connect(links[i],bases[i-1],bases[i],{endpoints:'surface'});
    }
  }
  s.attach(polymeraseLabel,polymerase,{offset:[0,-2.55,0]});
  const active=s.circle('active-site-focus',{radius:0.36,position:[0.55,-0.85,0.35],fill:Color.NONE,stroke:Color.PURPLE,strokeWidth:0.045,opacity:0});
  s.attach(active,polymerase,{offset:[0,-0.75,0.35]});
  const five=s.latex('rna-5prime',{tex:'5^{\\prime}',fontSize:0.34,position:[-3.45,-0.85,0],opacity:0});
  s.attach(five,bases[0],{offset:[-0.7,0,0]});
  // This invisible terminal anchor tracks only the currently incorporated 3-prime end.
  const tip=s.circle('rna-terminal-anchor',{radius:0.01,position:[0.55,-0.85,0],opacity:0});
  const three=s.latex('rna-3prime',{tex:'3^{\\prime}',fontSize:0.34,position:[0.55,-1.4,0],opacity:0});
  s.attach(three,tip,{offset:[0,-0.55,0]});
  until(start(4));
  playTo(end(5),[active.fadeIn(),five.fadeIn(),three.fadeIn()]);
  until(start(7));
  const readArrow=s.arrow('template-read-arrow',{points:[[-2.75,1.17],[2.75,1.17]],stroke:Color.TEAL,strokeWidth:0.035});
  const readRule=s.latex('reading-direction',{tex:'\\mathrm{reads}\\quad 3^{\\prime}\\longrightarrow5^{\\prime}',fontSize:0.36,position:[0,2.25],fill:Color.TEAL});
  playTo(end(17),[polymerase.moveTo([1.65,-0.1,0]),readArrow.fadeIn(),readRule.fadeIn()]);
  playTo(start(18),[polymeraseLabel.fadeOut(),rnaLabel.fadeOut()]);
  playTo(end(19),[bases[4].fadeIn(),letters[4].fadeIn()]);
  until(start(20));
  playTo(end(24),[bases[4].moveTo([1.65,-0.85,0]),tip.moveTo([1.65,-0.85,0])]);
  // A covalent backbone segment appears only once the nucleotide has arrived.
  s.play([links[4].fadeIn(),s.previous.get('rna-template-pair-4').fadeIn()],{duration:0});
  until(start(25));
  playTo(end(26),[three.animate({fill:Color.GREEN})]);
  until(start(27));
  playTo(end(28),[polymerase.moveTo([2.75,-0.1,0]),bases[5].fadeIn(),letters[5].fadeIn()]);
  until(start(29));
  const growArrow=s.arrow('rna-growth-arrow',{points:[[-2.75,-1.75],[2.75,-1.75]],stroke:Color.GREEN,strokeWidth:0.035});
  playTo(end(29),[growArrow.fadeIn()]);
  until(start(30));
  const growRule=s.latex('growth-direction',{tex:'\\mathrm{grows}\\quad 5^{\\prime}\\longrightarrow3^{\\prime}',position:[0,-2.25],fontSize:0.36,fill:Color.GREEN});
  playTo(end(32),[bases[5].moveTo([2.75,-0.85,0]),tip.moveTo([2.75,-0.85,0]),growRule.fadeIn()]);
  s.play([links[5].fadeIn(),s.previous.get('rna-template-pair-5').fadeIn()],{duration:0});
  until(start(33));
  playTo(end(35),[active.fadeOut()]);
  // Read the actual strand rather than a duplicate sequence in a text panel.
  for(let i=0;i<6;i++) {
    until(start(36+i));
    playTo(end(36+i),[bases[i].animate({fill:Color.GREEN_A})]);
  }
  until(start(42));
  playTo(end(44),[readArrow.fadeOut(),readRule.fadeOut(),growArrow.fadeOut(),growRule.fadeOut(),pairs.fadeOut(),polymerase.fadeOut()]);
  s.remove(pairs);
  s.remove(polymerase);
  s.remove(polymeraseLabel);
  s.remove(active);
  until(start(45));
  // Release the intact RNA assembly: every backbone distance stays fixed.
  playTo(end(46),[rna.moveTo([0,-0.85,0]),tip.moveTo([2.75,-1.7,0])]);
  until(start(48));
  const remains=s.text('dna-remains',{text:'DNA template remains',fontSize:0.34,position:[0,2.35],fill:Color.TEAL});
  playTo(end(50),[remains.fadeIn()]);
  until(start(52));
  const copy=s.text('released-rna-label',{text:'RNA copy',fontSize:0.34,position:[0,-2.55],fill:Color.GREEN});
  playTo(end(53),[copy.fadeIn()]);
  // Both complete sequences stay visible through the final narration and pause.
  until(__narration.durationSec);
});