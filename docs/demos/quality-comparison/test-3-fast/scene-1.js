const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-2.u1.w${n}`);
  const end = n => __narration.end(`beat-2.u1.w${n}`);
  let cursor = 0;
  const until = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  const template = s.previous.get('template');
  const rna = s.previous.get('rna');
  const polymerase = s.previous.get('polymerase');
  const templateLabel = s.previous.get('template-label');
  const rnaLabel = s.previous.get('rna-label');
  const tb = [], rb = [], rl = [], pairs = [], links = [];
  for (let i = 0; i < 6; i++) {
    tb.push(s.previous.get(`template-base-${i}`));
    rb.push(s.previous.get(`rna-base-${i}`));
    rl.push(s.previous.get(`rna-letter-${i}`));
    s.attach(s.previous.get(`template-letter-${i}`), tb[i], { offset: [0, 0, 0.04] });
    s.attach(rl[i], rb[i], { offset: [0, 0, 0.04] });
    pairs.push(s.previous.get(`rna-pair-${i}`));
    s.connect(pairs[i], tb[i], rb[i], { endpoints: 'surface' });
    if (i > 0) {
      s.connect(s.previous.get(`template-link-${i - 1}`), tb[i - 1], tb[i], { endpoints: 'surface' });
      links.push(s.previous.get(`rna-link-${i - 1}`));
      s.connect(links[i - 1], rb[i - 1], rb[i], { endpoints: 'surface' });
    }
  }
  s.attach(s.previous.get('template-3prime'), tb[0], { offset: [-0.68, 0, 0] });
  s.attach(s.previous.get('template-5prime'), tb[5], { offset: [0.68, 0, 0] });
  let five, three, endAnchor, endLeader, active, reading, growth, scan;
  s.view('transcription-view', {
    rect: [0.04, 0.13, 0.92, 0.73], orbit: false,
    camera: { yaw: 0, pitch: 0, target: [0, 0.25, 0], height: 6.5, distance: 15, perspective: 0 }
  }, v => {
    five = v.latex('rna-5prime', { tex: "5'", fontSize: 0.4, fill: Color.GREEN, position: [-3.555, -1, 0], opacity: 0 });
    endAnchor = v.circle('rna-end-anchor', { radius: 0.01, position: [1.255, -1, 0], opacity: 0 });
    three = v.latex('rna-3prime', { tex: "3'", fontSize: 0.4, fill: Color.GREEN, position: [1.025, -2.08, 0], opacity: 0 });
    v.attach(five, rb[0], { offset: [-0.68, 0, 0] });
    v.attach(three, endAnchor, { offset: [-0.23, -1.08, 0] });
    endLeader = v.line('rna-end-leader', { points: [[-0.36, -0.32, 0], [-0.23, -0.81, 0]], stroke: Color.GREEN, strokeWidth: 0.022, opacity: 0 });
    v.attach(endLeader, endAnchor, { offset: [0, 0, 0] });
    active = v.circle('active-site-focus', { radius: 0.36, fill: Color.NONE, stroke: Color.PURPLE, strokeWidth: 0.035, position: [0.575, -1, 0.1], opacity: 0 });
    v.attach(active, polymerase, { offset: [0, -0.725, 0.1] });
    reading = v.arrow('reading-direction', { points: [[-2.875, 1.04, 0], [-2.55, 1.04, 0]], stroke: Color.TEAL, strokeWidth: 0.045, opacity: 0 });
    growth = v.arrow('growth-direction', { points: [[-2.875, -1.64, 0], [-2.55, -1.64, 0]], stroke: Color.GREEN, strokeWidth: 0.045, opacity: 0 });
    scan = v.circle('copy-reading-focus', { radius: 0.35, position: [-2.875, -1, 0.08], fill: Color.NONE, stroke: Color.GREEN, strokeWidth: 0.035, opacity: 0 });
  });
  // The inherited four-base chain is not reset. Its next two bases are
  // positioned off the strand while invisible, then incorporated at its 3' end.
  s.play([rb[4].moveTo([1.725, -2.15, 0]), rb[5].moveTo([2.875, -2.15, 0])], { duration: 0 });
  playTo(end(5), [active.fadeIn(), five.fadeIn(), three.fadeIn(), endLeader.fadeIn(), templateLabel.moveTo([0, 1.95, 0]), rnaLabel.moveTo([-0.6, -2.35, 0])]);
  until(start(7));
  playTo(end(9), [reading.fadeIn()]);
  until(start(12));
  playTo(end(17), [
    reading.morphTo({ kind: 'arrow', points: [[-2.875, 1.04, 0], [2.875, 1.04, 0]] }),
    polymerase.moveTo([1.725, -0.275, 0])
  ]);
  until(start(18));
  playTo(end(19), [rb[4].fadeIn(), rl[4].fadeIn()]);
  until(start(20));
  playTo(end(23), [rb[4].moveTo([1.725, -1, 0]), endAnchor.moveTo([2.405, -1, 0])]);
  playTo(end(26), [links[3].fadeIn(), pairs[4].fadeIn()]);
  until(start(27));
  playTo(end(28), [polymerase.moveTo([2.875, -0.275, 0]), rb[5].fadeIn(), rl[5].fadeIn(), growth.fadeIn()]);
  until(start(29));
  playTo(end(30), [rb[5].moveTo([2.875, -1, 0]), endAnchor.moveTo([3.555, -1, 0]), growth.morphTo({ kind: 'arrow', points: [[-2.875, -1.64, 0], [2.875, -1.64, 0]] })]);
  playTo(end(32), [links[4].fadeIn(), pairs[5].fadeIn(), active.fadeOut()]);
  until(start(33));
  playTo(end(35), [polymerase.fadeOut()]);
  until(start(36));
  playTo(end(36), [scan.fadeIn()]);
  for (let i = 1; i < 6; i++) {
    until(start(36 + i));
    playTo(end(36 + i), [scan.moveTo([-2.875 + 1.15 * i, -1, 0.08])]);
  }
  until(start(42));
  playTo(end(44), [scan.fadeOut(), reading.fadeOut(), growth.fadeOut(), rnaLabel.moveTo([-0.6, -1.95, 0])]);
  until(start(45));
  playTo(end(46), pairs.map(p => p.fadeOut()));
  // The rigid RNA chain moves as one: backbone distances never change.
  // Pairing contacts have ended, but the DNA backbone and every base remain.
  playTo(end(50), [rna.moveTo([0, -0.55, 0]), endAnchor.moveTo([3.555, -1.55, 0])]);
  for (const p of pairs) s.remove(p);
  s.remove(polymerase);
  s.remove(active);
  s.remove(scan);
  s.remove(reading);
  s.remove(growth);
  s.keep(template);
  s.keep(rna);
  s.keep(five);
  s.keep(three);
  s.keep(endLeader);
  s.keep(endAnchor);
  until(__narration.durationSec);
});