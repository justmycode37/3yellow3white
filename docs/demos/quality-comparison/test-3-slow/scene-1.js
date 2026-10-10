const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-2.u1.w${n}`);
  const end = n => __narration.end(`beat-2.u1.w${n}`);
  let cursor = 0;
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  const template = s.previous.get('template');
  const rna = s.previous.get('rna');
  const polymerase = s.previous.get('polymerase');
  const pairing = s.previous.get('pairing');
  const templateLabel = s.previous.get('template-label');
  const rnaLabel = s.previous.get('rna-label');
  const t3 = s.previous.get('template-3prime');
  const t5 = s.previous.get('template-5prime');
  const tb = [], rb = [], tl = [], rl = [], pairs = [], backbone = [];
  for (let i = 0; i < 6; i++) {
    tb.push(s.previous.get(`template-base-${i}`));
    rb.push(s.previous.get(`rna-base-${i}`));
    tl.push(s.previous.get(`template-letter-${i}`));
    rl.push(s.previous.get(`rna-letter-${i}`));
    pairs.push(s.previous.get(`rna-template-pair-${i}`));
    s.attach(tl[i], tb[i], { offset: [0, 0, 0] });
    s.attach(rl[i], rb[i], { offset: [0, 0, 0] });
    s.connect(pairs[i], tb[i], rb[i], { endpoints: 'surface' });
    if (i > 0) {
      s.connect(s.previous.get(`template-backbone-${i-1}`), tb[i-1], tb[i], { endpoints: 'surface' });
      const bond = s.previous.get(`rna-backbone-${i-1}`);
      backbone.push(bond);
      s.connect(bond, rb[i-1], rb[i], { endpoints: 'surface' });
    }
  }
  s.attach(t3, tb[0], { offset: [-0.75, 0, 0] });
  s.attach(t5, tb[5], { offset: [0.75, 0, 0] });
  s.attach(templateLabel, template, { offset: [0, 2.45, 0] });
  s.attach(rnaLabel, rna, { offset: [0, -2.3, 0] });
  let r5, r3, reading, growth, terminal, readingSpot;
  s.view('transcription-view', { rect: [0.04, 0.1, 0.92, 0.8], orbit: true, orbitHitTest: 'geometry', camera: { yaw: 0, pitch: 0, target: [0,0,0], height: 7.5, distance: 17, perspective: 0 } }, v => {
    r5 = v.latex('rna-5prime', { tex: "5'", position: [-3.625,-0.88,0], fontSize: 0.42, fill: Color.GREEN, opacity: 0, billboard: true });
    r3 = v.latex('rna-3prime', { tex: "3'", position: [3.625,-1.28,0], fontSize: 0.42, fill: Color.GREEN, opacity: 0, billboard: true });
    v.attach(r5, rb[0], { offset: [-0.75,0,0] });
    v.attach(r3, rb[5], { offset: [0.75,0,0] });
    reading = v.arrow('reading-direction', { points: [[-2.875,1.98,0],[-2.2,1.98,0]], stroke: Color.TEAL, strokeWidth: 0.045, opacity: 0 });
    growth = v.arrow('growth-direction', { points: [[-2.875,-1.97,0],[-2.2,-1.97,0]], stroke: Color.GREEN, strokeWidth: 0.045, opacity: 0 });
    terminal = v.circle('growing-end', { position: [0.575,-0.88,0], radius: 0.26, fill: Color.NONE, stroke: Color.GREEN, strokeWidth: 0.035, opacity: 0 });
    readingSpot = v.line('sequence-reading-mark', { points: [[-0.23,0,0],[0.23,0,0]], position: [-2.875,-1.91,0], stroke: Color.GREEN, strokeWidth: 0.045, opacity: 0 });
  });

  // Start from the four paired residues in the evaluated handoff.
  until(start(2));
  playTo(end(5), [terminal.fadeIn(), rnaLabel.morphTo({ kind: 'latex', tex: '\\mathrm{RNA}', fontSize: 0.43 }, { map: {} })]);
  until(start(7));
  playTo(end(9), [polymerase.moveTo([1.725,0,0]), r5.fadeIn()]);
  until(start(12));
  playTo(end(13), reading.fadeIn());
  until(start(14));
  playTo(end(17), reading.morphTo({ kind: 'arrow', points: [[-2.875,1.98,0],[2.875,1.98,0]] }));

  // Only the free incoming residue moves; each backbone link appears after docking.
  until(start(18));
  playTo(end(19), [rb[4].fadeIn(), rl[4].fadeIn()]);
  until(start(20));
  playTo(end(22), [rb[4].moveTo([1.725,-0.88,0]), terminal.moveTo([1.725,-0.88,0])]);
  until(start(23));
  playTo(end(23), [backbone[3].fadeIn(), pairs[4].fadeIn(), polymerase.moveTo([2.875,0,0])]);
  until(start(24));
  playTo(end(24), [rb[5].fadeIn(), rl[5].fadeIn(), rb[5].moveTo([2.875,-0.88,0]), terminal.moveTo([2.875,-0.88,0])]);
  until(start(25));
  playTo(end(26), [backbone[4].fadeIn(), pairs[5].fadeIn(), r3.fadeIn()]);
  until(start(27));
  playTo(end(28), [terminal.fadeOut(), rnaLabel.fadeOut(), growth.fadeIn()]);
  until(start(29));
  playTo(end(32), growth.morphTo({ kind: 'arrow', points: [[-2.875,-1.97,0],[2.875,-1.97,0]] }));
  until(start(33));
  playTo(end(35), [reading.fadeOut(), growth.fadeOut()]);
  // One small reading mark follows the spoken sequence; it is not another strand.
  until(start(36));
  playTo(end(36), readingSpot.fadeIn());
  for (let i = 1; i < 6; i++) {
    until(start(36+i));
    playTo(end(36+i), readingSpot.moveTo([-2.875 + 1.15*i, -1.91, 0]));
  }
  until(start(42));
  playTo(end(44), [readingSpot.fadeOut(), pairing.fadeOut(), polymerase.fadeOut()]);
  s.remove(pairing);
  s.remove(polymerase);
  // The RNA moves as one rigid group: all five backbone distances stay fixed.
  until(start(45));
  playTo(end(46), [rna.moveTo([0,-0.65,0]), rnaLabel.fadeIn()]);
  // The untouched teal template and the complete separate green copy remain visible.
  s.remove(reading);
  s.remove(growth);
  s.remove(terminal);
  s.remove(readingSpot);
  until(__narration.durationSec);
});