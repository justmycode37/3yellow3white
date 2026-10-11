const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "2d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-2.u1.w${n}`);
  const end = n => __narration.end(`beat-2.u1.w${n}`);
  let cursor = 0;
  function until(t) { if (t > cursor) s.wait(t - cursor); cursor = t; }
  function playTo(t, actions) { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; }

  // The inherited close-up is already flat; retain its camera and molecular IDs.
  const template = s.previous.get("template");
  const rna = s.previous.get("rna");
  const polymerase = s.previous.get("polymerase");
  const enzymeName = s.previous.get("polymerase-name");
  const rnaName = s.previous.get("rna-name");
  const tb = [], rb = [], rl = [], pairs = [], rlinks = [];
  for (let i = 0; i < 6; i++) {
    tb.push(s.previous.get(`template-base-${i}`));
    rb.push(s.previous.get(`rna-base-${i}`));
    rl.push(s.previous.get(`rna-letter-${i}`));
    s.attach(s.previous.get(`template-letter-${i}`), tb[i]);
    s.attach(rl[i], rb[i]);
    pairs.push(s.previous.get(`template-rna-pair-${i}`));
    s.connect(pairs[i], tb[i], rb[i], { endpoints: "surface" });
    if (i > 0) {
      s.connect(s.previous.get(`template-link-${i-1}-${i}`), tb[i-1], tb[i], { endpoints: "surface" });
      rlinks[i] = s.previous.get(`rna-link-${i-1}-${i}`);
      s.connect(rlinks[i], rb[i-1], rb[i], { endpoints: "surface" });
    }
  }
  s.attach(enzymeName, polymerase, { offset: [0, 1.8, 0] });
  s.attach(s.previous.get("template-3prime"), tb[0], { offset: [-0.85, 0, 0] });
  s.attach(s.previous.get("template-5prime"), tb[5], { offset: [0.85, 0, 0] });

  let readArrow, growArrow, five, three, tip;
  s.view("transcription-view", {
    rect: [0.06, 0.14, 0.88, 0.72], orbit: true, orbitHitTest: "geometry",
    camera: { yaw: 0, pitch: 0, target: [0, 0, 0], height: 6.4, distance: 16, perspective: 0 }
  }, v => {
    readArrow = v.arrow("template-reading-arrow", {
      points: [[-2.75, 1.65, 0], [-1.65, 1.65, 0]],
      stroke: Color.TEAL, strokeWidth: 0.055, opacity: 0
    });
    growArrow = v.arrow("rna-growth-arrow", {
      points: [[-2.75, -2.55, 0], [1.65, -2.55, 0]],
      stroke: Color.GREEN, strokeWidth: 0.055, opacity: 0
    });
    five = v.latex("rna-5prime", { tex: "5^{\\prime}", fontSize: 0.42, fill: Color.GREEN, billboard: true, position: [-3.6, -0.95, 0], opacity: 0 });
    tip = v.sphere("rna-terminal-anchor", { radius: 0.001, position: [0.55, -0.95, 0], opacity: 0 });
    three = v.latex("rna-3prime", { tex: "3^{\\prime}", fontSize: 0.42, fill: Color.GREEN, billboard: true, billboardOffset: [0, -1.05, 0], position: [0.55, -0.95, 0], opacity: 0 });
    v.attach(five, rb[0], { offset: [-0.85, 0, 0] });
    v.attach(three, tip);
  });

  // Make room for the reading arrow before moving the active region.
  until(start(2));
  playTo(end(5), [enzymeName.fadeOut(), rnaName.fadeOut(), five.fadeIn(), three.fadeIn()]);
  until(start(7));
  playTo(end(9), [readArrow.fadeIn()]);
  until(start(12));
  playTo(end(17), [
    readArrow.morphTo({ kind: "arrow", points: [[-2.75, 1.65, 0], [2.75, 1.65, 0]] }),
    polymerase.moveTo([1.65, -0.15, 0])
  ]);

  // U is appended at the existing 3-prime terminus, never at the 5-prime end.
  until(start(20));
  playTo(end(26), [rb[4].fadeIn(), rl[4].fadeIn(), pairs[4].fadeIn(), rlinks[4].fadeIn(), tip.moveTo([1.65, -0.95, 0])]);
  until(start(29));
  playTo(end(30), [polymerase.moveTo([2.75, -0.15, 0]), growArrow.fadeIn()]);
  until(start(31));
  playTo(end(32), [
    rb[5].fadeIn(), rl[5].fadeIn(), pairs[5].fadeIn(), rlinks[5].fadeIn(), tip.moveTo([2.75, -0.95, 0]),
    growArrow.morphTo({ kind: "arrow", points: [[-2.75, -2.55, 0], [2.75, -2.55, 0]] })
  ]);

  // Read the six existing letters in order, without a duplicate sequence.
  for (let i = 0; i < 6; i++) {
    const n = 36 + i;
    until(start(n));
    const middle = (start(n) + end(n)) / 2;
    playTo(middle, [rl[i].scaleTo(1.18)]);
    playTo(end(n), [rl[i].scaleTo(1)]);
  }

  // Release breaks temporary template/RNA pairing, not either backbone.
  until(start(42));
  playTo(start(45), [readArrow.fadeOut(), growArrow.fadeOut(), polymerase.fadeOut(), ...pairs.map(p => p.fadeOut())]);
  pairs.forEach(p => s.remove(p));
  s.remove(readArrow); s.remove(growArrow); s.remove(polymerase);
  s.remove(enzymeName); s.remove(rnaName);
  playTo(end(46), [rna.moveTo([0, -0.45, 0]), tip.moveTo([2.75, -1.4, 0])]);

  // Both complete backbones remain visible through the closing statement and pause.
  s.keep(template); s.keep(rna); s.keep(five); s.keep(three); s.keep(tip);
  until(__narration.durationSec);
});