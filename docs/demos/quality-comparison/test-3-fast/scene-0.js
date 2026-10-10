const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode}, s => {
  const start = n => __narration.start('beat-1.u1.w' + n);
  const end = n => __narration.end('beat-1.u1.w' + n);
  let cursor = 0;
  const waitTo = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, {duration: t - cursor, ease: 'smooth'}); cursor = t; };
  const xs = Array.from({length: 6}, (_, i) => (i - 2.5) * 1.15);
  const dna = [], other = [], rna = [], dnaLetters = [], rnaLetters = [];
  const dnaLinks = [], otherLinks = [], rnaLinks = [], oldPairs = [], newPairs = [];
  let template, transcript, partner, enzyme, enzymeName, dnaName, rnaName, camera, scan;
  s.view('transcription-view', {
    rect: [0.04, 0.13, 0.92, 0.73], orbit: true, orbitHitTest: 'geometry',
    camera: {height: 6.5, distance: 15, yaw: 0.32, pitch: 0.24, target: [0, 0.25, 0]}
  }, v => {
    camera = v.camera;
    const dt = [], rt = [], pt = [];
    for (let i = 0; i < 6; i++) {
      dna[i] = v.sphere('template-base-' + i, {position: [xs[i], 0.45, 0], radius: 0.27, fill: Color.TEAL});
      other[i] = v.sphere('context-base-' + i, {position: [xs[i], 1.45, 0.65], radius: 0.24, fill: Color.GREY_B});
      rna[i] = v.circle('rna-base-' + i, {position: [xs[i], i === 0 ? -1.8 : -1, 0], radius: 0.27, fill: Color.BLACK, stroke: Color.GREEN, strokeWidth: 0.035, opacity: 0});
      dnaLetters[i] = v.latex('template-letter-' + i, {tex: '\\mathrm{' + 'TACGAT'[i] + '}', position: [xs[i], 0.45, 0.04], fontSize: 0.38, fill: Color.TEAL, opacity: 0});
      rnaLetters[i] = v.latex('rna-letter-' + i, {tex: '\\mathrm{' + 'AUGCUA'[i] + '}', position: [xs[i], -1, 0.04], fontSize: 0.38, fill: Color.GREEN, opacity: 0});
      v.attach(dnaLetters[i], dna[i], {offset: [0, 0, 0.04]});
      v.attach(rnaLetters[i], rna[i], {offset: [0, 0, 0.04]});
      oldPairs[i] = v.line3D('context-pair-' + i, {stroke: Color.WHITE, strokeWidth: 0.025});
      v.connect(oldPairs[i], dna[i], other[i], {endpoints: 'surface'});
      newPairs[i] = v.line3D('rna-pair-' + i, {stroke: Color.WHITE, strokeWidth: 0.022, opacity: 0});
      v.connect(newPairs[i], dna[i], rna[i], {endpoints: 'surface'});
      dt.push(dna[i], dnaLetters[i]); rt.push(rna[i], rnaLetters[i]); pt.push(other[i]);
      if (i) {
        const dl = v.line3D('template-link-' + (i - 1), {stroke: Color.TEAL, strokeWidth: 0.065});
        const pl = v.line3D('context-link-' + (i - 1), {stroke: Color.GREY_B, strokeWidth: 0.05});
        const rl = v.line3D('rna-link-' + (i - 1), {stroke: Color.GREEN, strokeWidth: 0.06, opacity: 0});
        v.connect(dl, dna[i-1], dna[i], {endpoints: 'surface'});
        v.connect(pl, other[i-1], other[i], {endpoints: 'surface'});
        v.connect(rl, rna[i-1], rna[i], {endpoints: 'surface'});
        dnaLinks.push(dl); otherLinks.push(pl); rnaLinks.push(rl);
        dt.push(dl); pt.push(pl); rt.push(rl);
      }
    }
    dnaName = v.text('template-label', {text: 'DNA template', position: [0, 1.42, 0], fontSize: 0.42, fill: Color.TEAL, opacity: 0});
    rnaName = v.text('rna-label', {text: 'RNA', position: [-0.6, -1.95, 0], fontSize: 0.42, fill: Color.GREEN, opacity: 0});
    const left = v.latex('template-3prime', {tex: "3'", position: [xs[0]-0.68, 0.45, 0], fontSize: 0.4, fill: Color.TEAL, opacity: 0});
    const right = v.latex('template-5prime', {tex: "5'", position: [xs[5]+0.68, 0.45, 0], fontSize: 0.4, fill: Color.TEAL, opacity: 0});
    dt.push(dnaName, left, right); rt.push(rnaName);
    template = v.group('template', dt);
    transcript = v.group('rna', rt);
    partner = v.group('context-strand', pt);
    const rim = v.line3D('polymerase-rim', {points: [[-0.46,-1.16,-0.22],[0.46,-1.16,-0.22],[0.46,1.16,-0.22],[-0.46,1.16,-0.22],[-0.46,-1.16,-0.22]], stroke: Color.PURPLE, strokeWidth: 0.075});
    const lobes = [-1,1].map((sign, i) => v.sphere('polymerase-lobe-' + i, {position: [sign*0.52, 0, -0.32], radius: 0.2, fill: Color.PURPLE}));
    enzyme = v.group('polymerase', [rim, ...lobes], {position: [xs[0], 0.85, 0], opacity: 0});
    enzymeName = v.text('polymerase-label', {text: 'RNA polymerase', position: [0, 2.48, 0], billboard: true, fontSize: 0.4, fill: Color.PURPLE, opacity: 0});
    scan = v.line('template-reading-mark', {points: [[-0.24,0],[0.24,0]], position: [xs[0],0.02,0.05], stroke: Color.TEAL, strokeWidth: 0.035, opacity: 0});
    // Endpoint labels remain hidden until the planar inspection.
    s.play([template.fadeIn(), partner.fadeIn(), ...oldPairs.map(p => p.fadeIn())], {duration: end(4), ease: 'smooth'});
    cursor = end(4);
    waitTo(start(9));
    playTo(end(10), [enzyme.fadeIn(), enzymeName.fadeIn()]);
    playTo(start(11), [enzymeName.fadeOut()]);
    playTo(end(14), [partner.moveTo([0, 1.05, 0.6]), ...oldPairs.map(p => p.fadeOut())]);
    waitTo(start(16));
    playTo(end(21), [camera.to2D({height: 6.5, target: [0,0.25,0]}), partner.fadeOut(), enzyme.moveTo([xs[0],-0.275,0]), dnaName.fadeIn(), left.fadeIn(), right.fadeIn(), ...dna.map(a => a.morphTo({kind: 'circle', radius: 0.27})), ...dna.map(a => a.animate({fill: Color.BLACK, stroke: Color.TEAL, strokeWidth: 0.035})), ...dnaLetters.map(a => a.fadeIn())]);
  });
  // Reading follows the authoritative word IDs, including repeated bases.
  waitTo(start(26));
  playTo(end(26), [scan.fadeIn()]);
  for (let i = 1; i < 6; i++) {
    waitTo(start(26+i));
    playTo(end(26+i), [scan.moveTo([xs[i],0.02,0.05])]);
  }
  waitTo(start(32));
  playTo(end(34), [scan.fadeOut(), rnaName.fadeIn(), rna[0].fadeIn()]);
  waitTo(start(35));
  playTo(end(40), [rna[0].moveTo([xs[0],-1,0])]);
  waitTo(start(41));
  playTo(end(44), [rnaLetters[0].fadeIn(), newPairs[0].fadeIn()]);
  const cues = [[45,46,47],[48,49,50],[52,53,54]];
  cues.forEach((c, j) => {
    const i = j+1;
    waitTo(start(c[0]));
    playTo(end(c[1]), [enzyme.moveTo([xs[i],-0.275,0])]);
    playTo(end(c[2]), [rna[i].fadeIn(), rnaLetters[i].fadeIn(), rnaLinks[i-1].fadeIn(), newPairs[i].fadeIn()]);
  });
  waitTo(start(56));
  playTo(end(57), [rna[1].animate({strokeWidth: 0.075})]);
  waitTo(start(58));
  playTo(end(59), [rna[1].animate({strokeWidth: 0.035})]);
  // The remaining U,A sites are intentionally unrevealed: completion belongs to beat 2.
  s.keep(template); s.keep(transcript); s.keep(enzyme);
  newPairs.forEach(p => s.keep(p));
  waitTo(__narration.durationSec);
});