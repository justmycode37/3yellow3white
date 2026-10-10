const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2\",\"endMode\":\"hold\",\"durationSec\":26.3345,\"words\":{\"beat-2.u1.w1\":[0.012,0.186],\"beat-2.u1.w2\":[0.255,0.499],\"beat-2.u1.w3\":[0.557,0.639],\"beat-2.u1.w4\":[0.697,1.033],\"beat-2.u1.w5\":[1.068,1.451],\"beat-2.u1.w6\":[1.707,2.368],\"beat-2.u1.w7\":[2.438,2.694],\"beat-2.u1.w8\":[2.74,2.821],\"beat-2.u1.w9\":[2.868,3.332],\"beat-2.u1.w10\":[3.355,3.483],\"beat-2.u1.w11\":[3.529,3.646],\"beat-2.u1.w12\":[3.68,4.261],\"beat-2.u1.w13\":[4.319,4.609],\"beat-2.u1.w14\":[4.853,5.166],\"beat-2.u1.w15\":[5.213,5.329],\"beat-2.u1.w16\":[5.375,5.944],\"beat-2.u1.w17\":[5.979,6.258],\"beat-2.u1.w18\":[6.815,7.024],\"beat-2.u1.w19\":[7.094,7.454],\"beat-2.u1.w20\":[7.5,7.825],\"beat-2.u1.w21\":[7.895,7.953],\"beat-2.u1.w22\":[8.011,8.081],\"beat-2.u1.w23\":[8.127,8.44],\"beat-2.u1.w24\":[8.522,8.963],\"beat-2.u1.w25\":[9.033,9.625],\"beat-2.u1.w26\":[9.671,9.95],\"beat-2.u1.w27\":[10.275,10.426],\"beat-2.u1.w28\":[10.542,10.96],\"beat-2.u1.w29\":[11.018,11.273],\"beat-2.u1.w30\":[11.331,11.923],\"beat-2.u1.w31\":[11.958,12.016],\"beat-2.u1.w32\":[12.086,12.794],\"beat-2.u1.w33\":[13.015,13.177],\"beat-2.u1.w34\":[13.235,13.514],\"beat-2.u1.w35\":[13.572,13.665],\"beat-2.u1.w36\":[13.746,13.955],\"beat-2.u1.w37\":[14.199,14.443],\"beat-2.u1.w38\":[14.594,14.837],\"beat-2.u1.w39\":[15.081,15.255],\"beat-2.u1.w40\":[15.499,15.743],\"beat-2.u1.w41\":[15.894,16.219],\"beat-2.u1.w42\":[16.834,16.95],\"beat-2.u1.w43\":[17.032,17.217],\"beat-2.u1.w44\":[17.333,17.728],\"beat-2.u1.w45\":[17.798,18.1],\"beat-2.u1.w46\":[18.146,18.564],\"beat-2.u1.w47\":[18.889,19.005],\"beat-2.u1.w48\":[19.063,19.446],\"beat-2.u1.w49\":[19.493,19.957],\"beat-2.u1.w50\":[20.004,20.538],\"beat-2.u1.w51\":[20.828,21.49],\"beat-2.u1.w52\":[21.559,21.908],\"beat-2.u1.w53\":[21.954,22.488],\"beat-2.u1.w54\":[22.535,22.825],\"beat-2.u1.w55\":[22.895,23.162],\"beat-2.u1.w56\":[23.22,23.324],\"beat-2.u1.w57\":[23.382,23.452],\"beat-2.u1.w58\":[23.522,23.986]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = id => __narration.start(id);
  const end = id => __narration.end(id);
  let cursor = 0;
  function until(t) { if (t > cursor) s.wait(t - cursor); cursor = t; }
  function run(t, actions) { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; }

  const template = s.previous.get('template');
  const rna = s.previous.get('rna');
  const polymerase = s.previous.get('polymerase');
  const rnaName = s.previous.get('rna-name');
  const dnaBases = [], rnaBases = [], letters = [], pairs = [], links = [];
  for (let i = 0; i < 6; i++) {
    dnaBases.push(s.previous.get(`template-base-${i}`));
    rnaBases.push(s.previous.get(`rna-base-${i}`));
    letters.push(s.previous.get(`rna-letter-${i}`));
    const dnaLetter = s.previous.get(`template-letter-${i}`);
    s.attach(dnaLetter, dnaBases[i]);
    s.attach(letters[i], rnaBases[i]);
    pairs.push(s.previous.get(`rna-template-pair-${i}`));
    s.connect(pairs[i], dnaBases[i], rnaBases[i], { endpoints: 'surface' });
    if (i > 0) {
      const backbone = s.previous.get(`template-backbone-${i}`);
      s.connect(backbone, dnaBases[i - 1], dnaBases[i], { endpoints: 'surface' });
      links[i] = s.previous.get(`rna-backbone-${i}`);
      s.connect(links[i], rnaBases[i - 1], rnaBases[i], { endpoints: 'surface' });
    }
  }

  let readArrow, growArrow, rnaFive, rnaThree, tip;
  s.view('transcription-view', { rect: [0.04, 0.13, 0.92, 0.74], orbit: true, orbitHitTest: 'geometry' }, v => {
    readArrow = v.arrow('template-reading-direction', {
      points: [[-2.125, 1.4, 0], [2.125, 1.4, 0]],
      stroke: Color.TEAL, strokeWidth: 0.045, opacity: 0
    });
    growArrow = v.arrow('rna-growth-direction', {
      points: [[-2.125, -2.15, 0], [2.125, -2.15, 0]],
      stroke: Color.GREEN, strokeWidth: 0.045, opacity: 0
    });
    tip = v.sphere('rna-terminal-anchor', { radius: 0.001, position: [0.425, -0.6, 0], opacity: 0 });
    rnaFive = v.latex('rna-5prime', { tex: "5'", fontSize: 0.42, fill: Color.GREEN, opacity: 0 });
    rnaThree = v.latex('rna-3prime', { tex: "3'", fontSize: 0.42, fill: Color.GREEN, opacity: 0 });
    v.attach(rnaFive, rnaBases[0], { offset: [-0.725, 0, 0] });
    v.attach(rnaThree, tip, { offset: [0, -0.36, 0] });
  });

  // The incoming close-up already contains AUGC; do not reset its active site.
  until(start('beat-2.u1.w2'));
  run(end('beat-2.u1.w5'), [rnaName.moveTo([0, -2.65, 0]), rnaFive.fadeIn(), rnaThree.fadeIn()]);
  until(start('beat-2.u1.w7'));
  run(end('beat-2.u1.w9'), [readArrow.fadeIn()]);
  until(start('beat-2.u1.w14'));
  run(end('beat-2.u1.w17'), [polymerase.moveTo([1.275, 0, 0])]);

  // An incoming nucleotide docks at the existing 3-prime terminus.
  until(start('beat-2.u1.w18'));
  s.play(rnaBases[4].moveTo([1.275, -0.95, 0]), { duration: 0 });
  run(end('beat-2.u1.w19'), [rnaBases[4].fadeIn(), letters[4].fadeIn()]);
  until(start('beat-2.u1.w20'));
  run(end('beat-2.u1.w20'), [rnaBases[4].moveTo([1.275, -0.6, 0])]);
  run(end('beat-2.u1.w24'), [links[4].fadeIn(), pairs[4].fadeIn(), tip.moveTo([1.275, -0.6, 0])]);

  until(start('beat-2.u1.w29'));
  run(end('beat-2.u1.w30'), [polymerase.moveTo([2.125, 0, 0])]);
  run(end('beat-2.u1.w32'), [rnaBases[5].fadeIn(), letters[5].fadeIn(), links[5].fadeIn(), pairs[5].fadeIn(), tip.moveTo([2.125, -0.6, 0]), growArrow.fadeIn()]);

  // The complete complementary sequence stays legible during its spoken reading.
  until(start('beat-2.u1.w42'));
  run(start('beat-2.u1.w45'), [readArrow.fadeOut(), growArrow.fadeOut(), polymerase.fadeOut(), ...pairs.map(p => p.fadeOut())]);
  pairs.forEach(p => s.remove(p));
  s.remove(readArrow);
  s.remove(growArrow);
  s.remove(polymerase);
  // Release the same intact RNA strand by rigid translation, not stretched links.
  run(end('beat-2.u1.w46'), [
    rna.moveTo([0, -0.45, 0]),
    tip.moveTo([2.125, -1.05, 0]),
    rnaName.moveTo([0, -2.2, 0])
  ]);
  // Both complete backbones remain: the original template was never consumed.
  until(__narration.durationSec);
});