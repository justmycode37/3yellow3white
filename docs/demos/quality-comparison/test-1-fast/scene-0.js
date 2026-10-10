const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "3d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-1.u1.w${n}`);
  const end = n => __narration.end(`beat-1.u1.w${n}`);
  let cursor = 0;
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; };
  const xs = Array.from({ length: 6 }, (_, i) => (i - 2.5) * 1.1);
  const dnaLetters = "TACGAT";
  const rnaLetters = "AUGCUA";
  let template, rna, polymerase, other, camera, dnaName, rnaName, enzymeName, ring, rule;
  const dna = [], dnaLabels = [], incoming = [], incomingLabels = [], rnaBonds = [], pairs = [], duplexPairs = [], lobes = [], endLabels = [];
  s.view("transcription-view", {
    rect: [0.06, 0.14, 0.88, 0.72], orbit: true, orbitHitTest: "geometry",
    camera: { yaw: 0.28, pitch: 0.22, height: 6.4, distance: 16, target: [0, 0, 0] }
  }, v => {
    camera = v.camera;
    const templateParts = [], otherParts = [], rnaParts = [], otherNodes = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i - 2.5) * 0.32;
      const p = [xs[i], 0.65 * Math.cos(angle), 0.65 * Math.sin(angle)];
      const q = [xs[i], -p[1], -p[2]];
      dna[i] = v.sphere(`template-base-${i}`, { position: p, radius: 0.16, fill: Color.TEAL });
      dnaLabels[i] = v.text(`template-letter-${i}`, { text: dnaLetters[i], position: p, fontSize: 0.46, fill: Color.TEAL, billboard: true, billboardOffset: [0, 0.46, 0.03] });
      v.attach(dnaLabels[i], dna[i]);
      templateParts.push(dna[i], dnaLabels[i]);
      otherNodes[i] = v.sphere(`duplex-other-base-${i}`, { position: q, radius: 0.16, fill: Color.GREY_B });
      otherParts.push(otherNodes[i]);
      const dp = v.line3D(`duplex-pair-${i}`, { stroke: Color.WHITE, strokeWidth: 0.025 });
      v.connect(dp, dna[i], otherNodes[i], { endpoints: "surface" });
      duplexPairs.push(dp);
      if (i > 0) {
        const a = v.line3D(`template-link-${i - 1}-${i}`, { stroke: Color.TEAL, strokeWidth: 0.055 });
        v.connect(a, dna[i - 1], dna[i], { endpoints: "surface" });
        templateParts.push(a);
        const b = v.line3D(`duplex-other-link-${i}`, { stroke: Color.GREY_B, strokeWidth: 0.055 });
        v.connect(b, otherNodes[i - 1], otherNodes[i], { endpoints: "surface" });
        otherParts.push(b);
      }
      incoming[i] = v.sphere(`rna-base-${i}`, { position: [xs[i], i < 4 ? -1.85 : -0.95, 0], radius: 0.16, fill: Color.GREEN, opacity: 0 });
      incomingLabels[i] = v.text(`rna-letter-${i}`, { text: rnaLetters[i], fontSize: 0.46, fill: Color.GREEN, billboard: true, billboardOffset: [0, -0.46, 0.03], opacity: 0 });
      v.attach(incomingLabels[i], incoming[i]);
      rnaParts.push(incoming[i], incomingLabels[i]);
      pairs[i] = v.line3D(`template-rna-pair-${i}`, { stroke: Color.WHITE, strokeWidth: 0.028, opacity: 0 });
      v.connect(pairs[i], dna[i], incoming[i], { endpoints: "surface" });
      rnaParts.push(pairs[i]);
      if (i > 0) {
        rnaBonds[i] = v.line3D(`rna-link-${i - 1}-${i}`, { stroke: Color.GREEN, strokeWidth: 0.055, opacity: 0 });
        v.connect(rnaBonds[i], incoming[i - 1], incoming[i], { endpoints: "surface" });
        rnaParts.push(rnaBonds[i]);
      }
    }
    endLabels.push(v.latex("template-3prime", { tex: "3^{\\prime}", position: [-3.6, 0.65, 0], fontSize: 0.42, fill: Color.TEAL, billboard: true, opacity: 0 }));
    endLabels.push(v.latex("template-5prime", { tex: "5^{\\prime}", position: [3.6, 0.65, 0], fontSize: 0.42, fill: Color.TEAL, billboard: true, opacity: 0 }));
    templateParts.push(...endLabels);
    dnaName = v.text("template-name", { text: "DNA template", position: [-1.95, 2.22, 0], fontSize: 0.4, fill: Color.TEAL, billboard: true, opacity: 0 });
    templateParts.push(dnaName);
    rnaName = v.text("rna-name", { text: "RNA", position: [3.65, -0.95, 0], fontSize: 0.4, fill: Color.GREEN, billboard: true, opacity: 0 });
    rnaParts.push(rnaName);
    template = v.group("template", templateParts, { opacity: 0 });
    other = v.group("duplex-other", otherParts, { opacity: 0 });
    rna = v.group("rna", rnaParts);
    lobes.push(v.sphere("polymerase-lobe-a", { position: [-0.52, 0, -0.65], radius: 0.57, fill: Color.PURPLE }));
    lobes.push(v.sphere("polymerase-lobe-b", { position: [0.52, 0, 0.65], radius: 0.57, fill: Color.PURPLE }));
    ring = v.rectangle("polymerase-active-region", { width: 0.92, height: 2.05, stroke: Color.PURPLE, strokeWidth: 0.045, fill: Color.NONE, opacity: 0 });
    polymerase = v.group("polymerase", [...lobes, ring], { position: [xs[0], -0.15, 0], opacity: 0 });
    enzymeName = v.text("polymerase-name", { text: "RNA polymerase", fontSize: 0.36, fill: Color.PURPLE, billboard: true, opacity: 0 });
    v.attach(enzymeName, polymerase, { offset: [0, 1.8, 0] });
    rule = v.latex("rna-uracil-rule", { tex: "\\mathrm{RNA}:\\ U\\ne T", position: [1.75, 2.22, 0], fontSize: 0.42, fill: Color.GREEN, billboard: true, opacity: 0 });
  });
  // Spatial duplex context, with independently addressable backbones and bases.
  playTo(end(1), [template.fadeIn(), other.fadeIn(), ...duplexPairs.map(p => p.fadeIn())]);
  until(start(9));
  playTo(end(10), [polymerase.fadeIn(), enzymeName.fadeIn()]);
  until(start(11));
  playTo(end(14), [other.moveTo([0, -0.85, 0.7]), ...duplexPairs.map(p => p.fadeOut())]);
  until(start(16));
  // Project the SAME labelled template into the pairing close-up.
  playTo(end(21), [camera.to2D({ height: 6.4, target: [0, 0, 0] }), ...dna.map((p, i) => p.moveTo([xs[i], 0.65, 0])), other.fadeOut(), ...lobes.map(p => p.fadeOut()), ring.fadeIn(), dnaName.fadeIn(), ...endLabels.map(p => p.fadeIn())]);
  s.remove(other);
  duplexPairs.forEach(p => s.remove(p));
  // Each emphasis refers to its word ID, including the repeated A and T.
  for (let i = 0; i < 6; i++) {
    until(start(26 + i));
    const actions = [dna[i].scaleTo(1.55)];
    if (i > 0) actions.push(dna[i - 1].scaleTo(1));
    playTo(end(26 + i), actions);
  }
  until(start(32));
  playTo(end(33), [dna[5].scaleTo(1), rnaName.fadeIn()]);
  function addBase(i, a, b) {
    until(a);
    const dock = a + (b - a) * 0.72;
    playTo(dock, [incoming[i].fadeIn(), incomingLabels[i].fadeIn(), incoming[i].moveTo([xs[i], -0.95, 0])]);
    const links = [pairs[i].fadeIn()];
    if (i > 0) links.push(rnaBonds[i].fadeIn());
    playTo(b, links);
  }
  addBase(0, start(35), end(37));
  until(start(41));
  playTo(end(44), [pairs[0].animate({ strokeWidth: 0.055 })]);
  playTo(start(45), [polymerase.moveTo([xs[1], -0.15, 0]), pairs[0].animate({ strokeWidth: 0.028 })]);
  addBase(1, start(45), end(46));
  playTo(start(48), [polymerase.moveTo([xs[2], -0.15, 0])]);
  addBase(2, start(48), end(49));
  playTo(start(52), [polymerase.moveTo([xs[3], -0.15, 0])]);
  addBase(3, start(52), end(54));
  until(start(56));
  playTo(end(59), [rule.fadeIn()]);
  playTo(end(59) + end(59) - start(58), [rule.fadeOut()]);
  s.remove(rule);
  // AUGC remains paired; the final UA and directional interpretation belong to beat 2.
  s.keep(template);
  s.keep(rna);
  s.keep(polymerase);
  s.keep(enzymeName);
  until(__narration.durationSec);
});