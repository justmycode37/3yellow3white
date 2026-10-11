const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode}, s => {
  const start = n => __narration.start('beat-1.u1.w' + n);
  const end = n => __narration.end('beat-1.u1.w' + n);
  let cursor = 0;
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, {duration: t - cursor, ease: 'smooth'}); cursor = t; };
  const xs = Array.from({length: 6}, (_, i) => (i - 2.5) * 1.05);
  const dna = [], rna = [], dnaLetters = [], rnaLetters = [], rnaBonds = [], pairs = [], oldPairs = [];
  let template, transcript, polymerase, other, modelCamera, reader;
  s.view('transcription-view', {rect: [0.06, 0.14, 0.88, 0.70], orbit: true, orbitHitTest: 'geometry', camera: {yaw: 0.42, pitch: 0.24, height: 6.2, distance: 15, target: [0,0,0]}}, v => {
    modelCamera = v.camera;
    const templateParts = [], rnaParts = [], otherParts = [], opposite = [];
    for (let i = 0; i < 6; i++) {
      dna[i] = v.sphere('template-base-' + i, {position: [xs[i],0.8,0], radius: 0.17, fill: Color.TEAL});
      dnaLetters[i] = v.text('template-letter-' + i, {text: 'TACGAT'[i], fontSize: 0.46, fill: Color.TEAL, billboard: true, billboardOffset: [0,0.48,0]});
      v.attach(dnaLetters[i], dna[i]);
      templateParts.push(dna[i], dnaLetters[i]);
      opposite[i] = v.sphere('other-base-' + i, {position: [xs[i],-0.8,0.65], radius: 0.15, fill: Color.GREY_B});
      otherParts.push(opposite[i]);
      const op = v.line3D('original-pair-' + i, {stroke: Color.GREY_B, strokeWidth: 0.025});
      v.connect(op, dna[i], opposite[i], {endpoints: 'surface'});
      oldPairs.push(op);
      rna[i] = v.sphere('rna-base-' + i, {position: [xs[i],-0.8,0], radius: 0.17, fill: Color.GREEN, opacity: 0});
      rnaLetters[i] = v.text('rna-letter-' + i, {text: 'AUGCUA'[i], fontSize: 0.46, fill: Color.GREEN, billboard: true, billboardOffset: [0,-0.48,0], opacity: 0});
      v.attach(rnaLetters[i], rna[i]);
      rnaParts.push(rna[i], rnaLetters[i]);
      pairs[i] = v.line3D('rna-template-pair-' + i, {stroke: Color.WHITE, strokeWidth: 0.025, opacity: 0});
      v.connect(pairs[i], dna[i], rna[i], {endpoints: 'surface'});
      templateParts.push(pairs[i]);
      if (i > 0) {
        const db = v.line3D('template-backbone-' + i, {stroke: Color.TEAL, strokeWidth: 0.065});
        v.connect(db, dna[i-1], dna[i], {endpoints: 'surface'});
        templateParts.push(db);
        const ob = v.line3D('other-backbone-' + i, {stroke: Color.GREY_B, strokeWidth: 0.05});
        v.connect(ob, opposite[i-1], opposite[i], {endpoints: 'surface'});
        otherParts.push(ob);
        rnaBonds[i] = v.line3D('rna-backbone-' + i, {stroke: Color.GREEN, strokeWidth: 0.065, opacity: 0});
        v.connect(rnaBonds[i], rna[i-1], rna[i], {endpoints: 'surface'});
        rnaParts.push(rnaBonds[i]);
      }
    }
    templateParts.push(v.text('template-3prime', {text: '3′', position: [-3.4,0.8,0], fontSize: 0.4, fill: Color.TEAL, billboard: true}));
    templateParts.push(v.text('template-5prime', {text: '5′', position: [3.4,0.8,0], fontSize: 0.4, fill: Color.TEAL, billboard: true}));
    template = v.group('template', templateParts);
    transcript = v.group('rna', rnaParts);
    other = v.group('other-DNA-strand', otherParts);
    const rimParts = [];
    for (const z of [-0.22,0.22]) {
      const points = Array.from({length: 65}, (_, j) => {
        const a = 2 * Math.PI * j / 64;
        return [0.43 * Math.cos(a),1.04 * Math.sin(a),z];
      });
      rimParts.push(v.line3D(z < 0 ? 'polymerase-rear-rim' : 'polymerase-front-rim', {points, stroke: Color.PURPLE, strokeWidth: 0.075}));
    }
    for (const y of [-1.04,1.04]) rimParts.push(v.line3D(y < 0 ? 'polymerase-bottom' : 'polymerase-top', {points: [[0,y,-0.22],[0,y,0.22]], stroke: Color.PURPLE, strokeWidth: 0.075}));
    polymerase = v.group('polymerase', rimParts, {position: [xs[0],0,0], opacity: 0});
    reader = v.line3D('sequence-reader', {points: [[-0.23,1.7,0],[0.23,1.7,0]], position: [xs[0],0,0], stroke: Color.WHITE, strokeWidth: 0.045, opacity: 0});
  });
  const dnaLabel = s.text('DNA-label', {text: 'DNA', position: [0,2.85], fontSize: 0.43, fill: Color.TEAL, billboard: true});
  const enzymeLabel = s.text('polymerase-label', {text: 'RNA polymerase', position: [0,-2.6], fontSize: 0.43, fill: Color.PURPLE, opacity: 0, billboard: true});
  const rnaLabel = s.text('RNA-label', {text: 'RNA', position: [0,-2.6], fontSize: 0.43, fill: Color.GREEN, opacity: 0, billboard: true});
  // The short DNA region has real depth; the same template becomes the close-up.
  playTo(end(4), [template.fadeIn(), other.fadeIn(), dnaLabel.fadeIn(), ...oldPairs.map(p => p.fadeIn())]);
  until(start(9));
  playTo(end(10), [polymerase.fadeIn(), enzymeLabel.fadeIn()]);
  until(start(11));
  playTo(end(14), [other.moveTo([0,-1.25,0.5]), other.fadeOut(), ...oldPairs.map(p => p.fadeOut())]);
  s.remove(other); oldPairs.forEach(p => s.remove(p));
  until(start(16));
  playTo(end(21), [modelCamera.to2D({height: 6.2, target: [0,0,0]}), enzymeLabel.fadeOut()]);
  until(start(26));
  playTo(end(26), [reader.fadeIn()]);
  for (let i = 1; i < 6; i++) {
    until(start(26 + i));
    playTo(end(26 + i), [reader.moveTo([xs[i],0,0])]);
  }
  playTo(start(32), [reader.fadeOut()]);
  s.remove(reader);
  // First nucleotide approaches, then a surface-bound pairing link is established.
  until(start(33));
  // Its starting displacement is authored while it is still invisible.
  s.play(rna[0].moveTo([xs[0],-1.6,0]), {duration: 0});
  playTo(end(34), [rna[0].fadeIn(), rnaLetters[0].fadeIn(), rnaLabel.fadeIn()]);
  until(start(35));
  playTo(end(38), [rna[0].moveTo([xs[0],-0.8,0]), pairs[0].fadeIn()]);
  until(start(41));
  playTo(end(44), [pairs[0].animate({strokeWidth: 0.065})]);
  playTo(start(45), [pairs[0].animate({strokeWidth: 0.025})]);
  const cues = [[45,47],[48,50],[52,54]];
  for (let i = 1; i <= 3; i++) {
    const cue = cues[i-1];
    until(start(cue[0]));
    playTo(end(cue[1]), [polymerase.moveTo([xs[i],0,0]), rna[i].fadeIn(), rnaLetters[i].fadeIn(), rnaBonds[i].fadeIn(), pairs[i].fadeIn()]);
  }
  // Leave the final two sites unfilled for the following direction-and-release scene.
  until(start(55));
  const uCue = s.latex('uracil-cue', {tex: String.raw`\mathrm{RNA}:\quad U\ne T`, position: [0,-2.6], fontSize: 0.43, fill: Color.GREEN, opacity: 0, billboard: true});
  playTo(end(56), [rnaLabel.fadeOut()]);
  until(start(57));
  playTo(end(59), [uCue.fadeIn()]);
  const cleanupEnd = __narration.durationSec - 2;
  playTo((end(59) + cleanupEnd) / 2, [uCue.fadeOut()]);
  s.remove(uCue);
  playTo(cleanupEnd, [rnaLabel.fadeIn()]);
  s.keep(template); s.keep(transcript); s.keep(polymerase);
  s.keep(dnaLabel); s.keep(rnaLabel);
  until(__narration.durationSec);
});