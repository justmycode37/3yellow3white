const __narration=(()=>{const data={audioAssetId:'d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1',endMode:'advance',durationSec:24.198291666666666,words:[[0.07,0.499],[0.557,0.917],[0.952,0.975],[1.045,1.637],[1.881,1.985],[2.043,2.299],[2.357,2.485],[2.531,2.914],[3.158,3.541],[3.587,4.168],[4.226,4.505],[4.551,4.574],[4.621,4.888],[4.957,5.306],[5.468,5.631],[5.7,6.002],[6.06,6.246],[6.293,6.629],[6.664,6.745],[6.792,6.827],[6.873,7.407],[7.918,8.139],[8.173,8.243],[8.29,8.719],[8.766,9.009],[9.067,9.207],[9.427,9.659],[9.752,9.892],[10.089,10.321],[10.472,10.635],[10.716,10.89],[11.61,11.749],[11.865,12.26],[12.341,12.62],[12.678,12.934],[12.968,13.084],[13.131,13.305],[13.351,13.816],[13.851,14.257],[14.315,14.768],[15.244,15.314],[15.395,15.673],[15.72,15.859],[15.906,16.045],[16.475,16.707],[16.811,16.974],[17.02,17.229],[17.334,17.531],[17.659,17.798],[17.833,17.937],[18.17,18.297],[18.344,18.46],[18.599,18.727],[18.773,18.936],[19.609,20.085],[20.155,20.48],[20.573,20.817],[21.061,21.27],[21.316,21.432]]};const words=Object.fromEntries(data.words.map((w,i)=>['beat-1.u1.w'+(i+1),w]));const get=(id,index)=>{if(!Object.hasOwn(words,id))throw new Error('Unknown narration word ID: '+id);return words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode: "3d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode}, s => {
  const start = n => __narration.start(`beat-1.u1.w${n}`);
  const end = n => __narration.end(`beat-1.u1.w${n}`);
  let cursor = 0;
  const holdTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, {duration: t - cursor, ease: "smooth"}); cursor = t; };
  const xs = Array.from({length: 6}, (_, i) => (i - 2.5) * 1.15);
  const dnaLetters = "TACGAT", rnaLetters = "AUGCUA";
  const dna = [], other = [], rna = [], dLabels = [], rLabels = [], rnaBonds = [], pairs = [], oldPairs = [];
  let template, transcript, polymerase, otherStrand, oldPairGroup, pairGroup, camera, dnaTag, rnaTag, enzymeTag, marker, ring, ends;
  s.view("transcription-view", {
    rect: [0.04, 0.1, 0.92, 0.8], orbit: true, orbitHitTest: "geometry",
    camera: {yaw: 0.28, pitch: 0.32, height: 7.5, distance: 17, target: [0, 0, 0]}
  }, v => {
    camera = v.camera;
    const templateParts = [], otherParts = [], rnaParts = [];
    for (let i = 0; i < 6; i++) {
      const angle = i * 0.64;
      const p = [xs[i], 0.72 * Math.cos(angle), 0.72 * Math.sin(angle)];
      const q = [xs[i], -p[1], -p[2]];
      dna[i] = v.sphere(`template-base-${i}`, {position: p, radius: 0.15, fill: Color.TEAL});
      other[i] = v.sphere(`other-base-${i}`, {position: q, radius: 0.13, fill: Color.GREY_B});
      rna[i] = v.sphere(`rna-base-${i}`, {position: [xs[i], -1.28, 0], radius: 0.15, fill: Color.GREEN, opacity: 0});
      dLabels[i] = v.text(`template-letter-${i}`, {text: dnaLetters[i], fontSize: 0.48, fill: Color.TEAL, billboard: true, billboardOffset: [0, 0.65, 0], opacity: 0});
      rLabels[i] = v.text(`rna-letter-${i}`, {text: rnaLetters[i], fontSize: 0.48, fill: Color.GREEN, billboard: true, billboardOffset: [0, -0.65, 0], opacity: 0});
      v.attach(dLabels[i], dna[i]); v.attach(rLabels[i], rna[i]);
      templateParts.push(dna[i], dLabels[i]); otherParts.push(other[i]); rnaParts.push(rna[i], rLabels[i]);
      oldPairs[i] = v.line3D(`duplex-pair-${i}`, {stroke: Color.GREY_B, strokeWidth: 0.035});
      v.connect(oldPairs[i], dna[i], other[i], {endpoints: "surface"});
      pairs[i] = v.line3D(`rna-template-pair-${i}`, {stroke: Color.WHITE, strokeWidth: 0.026, opacity: 0});
      v.connect(pairs[i], dna[i], rna[i], {endpoints: "surface"});
      if (i > 0) {
        const b = v.line3D(`template-backbone-${i-1}`, {stroke: Color.TEAL, strokeWidth: 0.06});
        v.connect(b, dna[i-1], dna[i], {endpoints: "surface"}); templateParts.push(b);
        const c = v.line3D(`other-backbone-${i-1}`, {stroke: Color.GREY_B, strokeWidth: 0.045});
        v.connect(c, other[i-1], other[i], {endpoints: "surface"}); otherParts.push(c);
        const r = v.line3D(`rna-backbone-${i-1}`, {stroke: Color.GREEN, strokeWidth: 0.06, opacity: 0});
        v.connect(r, rna[i-1], rna[i], {endpoints: "surface"}); rnaBonds.push(r); rnaParts.push(r);
      }
    }
    template = v.group("template", templateParts);
    transcript = v.group("rna", rnaParts);
    otherStrand = v.group("other-strand", otherParts);
    oldPairGroup = v.group("duplex-pairs", oldPairs);
    pairGroup = v.group("pairing", pairs);
    dnaTag = v.text("template-label", {text: "DNA", position: [0, 2.45, 0], fontSize: 0.43, fill: Color.TEAL, billboard: true});
    rnaTag = v.text("rna-label", {text: "RNA", position: [0, -2.3, 0], fontSize: 0.43, fill: Color.GREEN, billboard: true, opacity: 0});
    v.attach(dnaTag, template, {offset: [0, 2.45, 0]});
    v.attach(rnaTag, transcript, {offset: [0, -2.3, 0]});
    const ringPoints = Array.from({length: 49}, (_, i) => {
      const a = i * Math.PI * 2 / 48;
      return [0.49 * Math.cos(a), 1.12 * Math.sin(a), 0.18 * Math.sin(2*a)];
    });
    ring = v.line3D("polymerase-active-region", {points: ringPoints, stroke: Color.PURPLE, strokeWidth: 0.1});
    polymerase = v.group("polymerase", [ring], {position: [xs[0], 0, 0], opacity: 0});
    enzymeTag = v.text("polymerase-label", {text: "RNA polymerase", position: [-1.7, -2.3, 0], fontSize: 0.4, fill: Color.PURPLE, billboard: true, opacity: 0});
    marker = v.sphere("sequence-reader", {position: [xs[0], 1.84, 0], radius: 0.055, fill: Color.WHITE, opacity: 0});
    const e3 = v.latex("template-3prime", {tex: "3'", fontSize: 0.42, fill: Color.TEAL, opacity: 0});
    const e5 = v.latex("template-5prime", {tex: "5'", fontSize: 0.42, fill: Color.TEAL, opacity: 0});
    v.attach(e3, dna[0], {offset: [-0.75, 0, 0]});
    v.attach(e5, dna[5], {offset: [0.75, 0, 0]});
    ends = [e3, e5];
  });
  playTo(end(1), [template.fadeIn(), otherStrand.fadeIn(), oldPairGroup.fadeIn(), dnaTag.fadeIn()]);
  holdTo(start(9));
  playTo(end(10), [polymerase.fadeIn(), enzymeTag.fadeIn()]);
  holdTo(start(11));
  // Opening the spatial duplex also simplifies the same template into a pairing diagram.
  playTo(end(21), [
    ...dna.map((b,i) => b.moveTo([xs[i], 0.88, 0])),
    otherStrand.moveTo([0, 2.2, -0.6]), otherStrand.fadeOut(), oldPairGroup.fadeOut(),
    enzymeTag.fadeOut(), camera.to2D({height: 7.5}),
    ring.morphTo({kind: "line", points: Array.from({length: 49}, (_,i) => {
      const a = i * Math.PI * 2 / 48; return [0.49*Math.cos(a), 1.12*Math.sin(a), 0];
    })})
  ]);
  s.remove(otherStrand); s.remove(oldPairGroup); s.remove(enzymeTag);
  playTo(start(22), [dnaTag.morphTo({kind: "text", text: "DNA template", fontSize: 0.43})]);
  playTo(end(25), [...dLabels.map(x => x.fadeIn()), ...ends.map(x => x.fadeIn())]);
  holdTo(start(26)); playTo(end(26), [marker.fadeIn()]);
  for (let i = 1; i < 6; i++) {
    holdTo(start(26+i)); playTo(end(26+i), [marker.moveTo([xs[i], 1.84, 0])]);
  }
  playTo(start(32), [marker.fadeOut()]); s.remove(marker);
  playTo(end(34), [rnaTag.fadeIn(), rna[0].fadeIn(), rLabels[0].fadeIn()]);
  holdTo(start(35));
  playTo(end(38), [rna[0].moveTo([xs[0], -0.88, 0]), pairs[0].fadeIn()]);
  holdTo(start(41)); playTo(end(44), [pairs[0].animate({strokeWidth: 0.055})]);
  const cues = [[1,45,47], [2,48,50], [3,52,54]];
  for (const [i, first, last] of cues) {
    holdTo(start(first));
    playTo(end(last), [polymerase.moveTo([xs[i], 0, 0]), rna[i].fadeIn(), rLabels[i].fadeIn(),
      rna[i].moveTo([xs[i], -0.88, 0]), pairs[i].fadeIn(), rnaBonds[i-1].fadeIn(),
      pairs[i-1].animate({strokeWidth: 0.026})]);
  }
  holdTo(start(55));
  playTo(end(57), [rnaTag.morphTo({kind: "latex", tex: String.raw`\mathrm{RNA}:\ U`, fontSize: 0.43}, {map: {}})]);
  holdTo(start(58));
  playTo(end(59), [rnaTag.morphTo({kind: "latex", tex: String.raw`\mathrm{RNA}:\ U\ne T`, fontSize: 0.43}, {map: {}})]);
  // The next scene completes AUGCUA; two RNA residues remain unrevealed here.
  s.keep(template); s.keep(transcript); s.keep(polymerase); s.keep(pairGroup);
  s.keep(dnaTag); s.keep(rnaTag); ends.forEach(x => s.keep(x));
  // Re-establish backbone, pairing and label bindings in the receiving scene before motion.
  holdTo(__narration.durationSec);
});