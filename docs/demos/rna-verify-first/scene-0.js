const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "2d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-1.u1.w${n}`);
  const end = n => __narration.end(`beat-1.u1.w${n}`);
  let cursor = 0;
  const holdTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; };
  const xs = Array.from({length: 6}, (_, i) => (i - 2.5) * 0.85);
  const dna = [], other = [], rna = [], dnaLabels = [], rnaLabels = [], pairs = [], rnaBonds = [], dnaRungs = [];
  let template, partner, transcript, polymerase, modelCamera, templateName, rnaName, ends;
  s.view("transcription-view", {
    rect: [0.04, 0.13, 0.92, 0.74], orbit: true, orbitHitTest: "geometry",
    camera: { yaw: 0.25, pitch: 0.28, distance: 13, height: 6.2, target: [0, 0, 0] }
  }, v => {
    modelCamera = v.camera;
    const templateParts = [], partnerParts = [], rnaParts = [];
    for (let i = 0; i < 6; i++) {
      const angle = i * 0.65 - 0.8;
      const p = [xs[i], 0.62 * Math.cos(angle), 0.62 * Math.sin(angle)];
      const q = [xs[i], -p[1], -p[2]];
      dna[i] = v.sphere(`template-base-${i}`, { position: p, radius: 0.13, fill: Color.TEAL });
      other[i] = v.sphere(`other-dna-base-${i}`, { position: q, radius: 0.13, fill: Color.WHITE });
      dnaLabels[i] = v.latex(`template-letter-${i}`, { tex: "TACGAT"[i], position: p, fontSize: 0.43, fill: Color.TEAL, billboard: true, billboardOffset: [0, 1.2, 0.1] });
      v.attach(dnaLabels[i], dna[i]);
      templateParts.push(dna[i], dnaLabels[i]);
      partnerParts.push(other[i]);
      const rung = v.line3D(`dna-rung-${i}`, { stroke: Color.GREY_B, strokeWidth: 0.025 });
      v.connect(rung, dna[i], other[i], { endpoints: "surface" });
      partnerParts.push(rung);
      dnaRungs.push(rung);
      rna[i] = v.sphere(`rna-base-${i}`, { position: [xs[i], i === 0 ? -1.25 : -0.6, 0], radius: 0.13, fill: Color.GREEN, opacity: 0 });
      rnaLabels[i] = v.latex(`rna-letter-${i}`, { tex: "AUGCUA"[i], position: [xs[i], -0.6, 0], fontSize: 0.43, fill: Color.GREEN, billboard: true, billboardOffset: [0, -1.05, 0.1], opacity: 0 });
      v.attach(rnaLabels[i], rna[i]);
      rnaParts.push(rna[i], rnaLabels[i]);
      pairs[i] = v.line3D(`rna-template-pair-${i}`, { stroke: Color.GREY_B, strokeWidth: 0.025, opacity: 0 });
      v.connect(pairs[i], dna[i], rna[i], { endpoints: "surface" });
      if (i > 0) {
        const db = v.line3D(`template-backbone-${i}`, { stroke: Color.TEAL, strokeWidth: 0.055 });
        v.connect(db, dna[i-1], dna[i], { endpoints: "surface" });
        templateParts.push(db);
        const ob = v.line3D(`other-dna-backbone-${i}`, { stroke: Color.WHITE, strokeWidth: 0.045 });
        v.connect(ob, other[i-1], other[i], { endpoints: "surface" });
        partnerParts.push(ob);
        rnaBonds[i] = v.line3D(`rna-backbone-${i}`, { stroke: Color.GREEN, strokeWidth: 0.055, opacity: 0 });
        v.connect(rnaBonds[i], rna[i-1], rna[i], { endpoints: "surface" });
        rnaParts.push(rnaBonds[i]);
      }
    }
    templateName = v.latex("template-name", { tex: "\\animpart{dna}{\\mathrm{DNA}}", anchor: "dna", position: [0, 2.65, 0], fontSize: 0.44, fill: Color.TEAL, billboard: true });
    templateParts.push(templateName);
    ends = [v.latex("template-3prime", { tex: "3'", position: [-2.85, 0.75, 0], fontSize: 0.42, fill: Color.TEAL, opacity: 0 }), v.latex("template-5prime", { tex: "5'", position: [2.85, 0.75, 0], fontSize: 0.42, fill: Color.TEAL, opacity: 0 })];
    templateParts.push(...ends);
    rnaName = v.latex("rna-name", { tex: "\\mathrm{RNA}", position: [-2.1, -2.3, 0], fontSize: 0.44, fill: Color.GREEN, opacity: 0 });
    rnaParts.push(rnaName);
    template = v.group("template", templateParts);
    partner = v.group("other-dna", partnerParts);
    transcript = v.group("rna", rnaParts);
    const ringPoints = Array.from({length: 65}, (_, i) => {
      const a = i * 2 * Math.PI / 64;
      return [0.59 * Math.cos(a), 1.28 * Math.sin(a), 0.22 * Math.sin(2*a) - 0.3];
    });
    const ring = v.line3D("polymerase-rim", { points: ringPoints, stroke: Color.PURPLE, strokeWidth: 0.075 });
    const lobe1 = v.sphere("polymerase-lobe-1", { position: [-0.54, 0, -0.35], radius: 0.22, fill: Color.PURPLE });
    const lobe2 = v.sphere("polymerase-lobe-2", { position: [0.54, 0, -0.35], radius: 0.22, fill: Color.PURPLE });
    polymerase = v.group("polymerase", [ring, lobe1, lobe2], { scale: 1.15, opacity: 0 });
  });
  playTo(end(4), [template.fadeIn(), partner.fadeIn()]);
  holdTo(start(9));
  playTo(end(10), polymerase.fadeIn());
  holdTo(start(11));
  playTo(end(11), dnaRungs.map(o => o.fadeOut()));
  playTo(end(14), other.map((o, i) => {
    const a = i * 0.65 - 0.8;
    return o.moveTo([xs[i], -0.62 * Math.cos(a) - 0.8, -0.62 * Math.sin(a)]);
  }));
  holdTo(start(16));
  // The same spatial strand opens into a readable planar sequence.
  playTo(end(21), [
    ...dna.map((o, i) => o.moveTo([xs[i], 0.75, 0])),
    partner.fadeOut(), modelCamera.to2D({ height: 6.2, target: [0, 0, 0] }),
    polymerase.moveTo([xs[0], 0, 0]), polymerase.scaleTo(1),
    templateName.morphTo({ kind: "latex", tex: "\\animpart{dna}{\\mathrm{DNA}}\\animpart{template}{\\mathrm{\\ template}}", anchor: "dna", fontSize: 0.44 }, { map: { dna: "dna" } }),
    ...ends.map(o => o.fadeIn())
  ]);
  s.remove(partner);
  holdTo(start(33));
  playTo(end(34), [rnaName.fadeIn(), rna[0].fadeIn()]);
  holdTo(start(35));
  playTo(end(40), [rna[0].moveTo([xs[0], -0.6, 0]), pairs[0].fadeIn()]);
  holdTo(start(41));
  playTo(end(44), rnaLabels[0].fadeIn());
  // Active-site motion and matching bases share the same sequence index.
  playTo(start(45), polymerase.moveTo([xs[1], 0, 0]));
  playTo(end(47), [rna[1].fadeIn(), rnaLabels[1].fadeIn(), pairs[1].fadeIn(), rnaBonds[1].fadeIn()]);
  playTo(end(50), [polymerase.moveTo([xs[2], 0, 0]), rna[2].fadeIn(), rnaLabels[2].fadeIn(), pairs[2].fadeIn(), rnaBonds[2].fadeIn()]);
  playTo(start(52), polymerase.moveTo([xs[3], 0, 0]));
  playTo(end(54), [rna[3].fadeIn(), rnaLabels[3].fadeIn(), pairs[3].fadeIn(), rnaBonds[3].fadeIn()]);
  holdTo(start(57));
  const uracil = s.latex("uracil-cue", { tex: "\\mathrm{RNA}:\\ U", position: [1.4, -2.1], fontSize: 0.42, fill: Color.GREEN });
  playTo(end(57), uracil.fadeIn());
  holdTo(start(58));
  playTo(end(59), uracil.morphTo({ kind: "latex", tex: "\\mathrm{RNA}:\\ U\\ne T", fontSize: 0.42 }, { map: {} }));
  playTo(end(59) + (end(59) - start(55)) / 3, uracil.fadeOut());
  s.remove(uracil);
  // Preserve the four-base product; the next scene completes AUGCUA.
  s.keep(template); s.keep(transcript); s.keep(polymerase);
  for (const pair of pairs) s.keep(pair);
  holdTo(__narration.durationSec);
});