const __narration=(()=>{const data={audioAssetId:'d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1',endMode:'advance',durationSec:24.198291666666666,words:{'beat-1.u1.w1':[0.07,0.499],'beat-1.u1.w2':[0.557,0.917],'beat-1.u1.w3':[0.952,0.975],'beat-1.u1.w4':[1.045,1.637],'beat-1.u1.w5':[1.881,1.985],'beat-1.u1.w6':[2.043,2.299],'beat-1.u1.w7':[2.357,2.485],'beat-1.u1.w8':[2.531,2.914],'beat-1.u1.w9':[3.158,3.541],'beat-1.u1.w10':[3.587,4.168],'beat-1.u1.w11':[4.226,4.505],'beat-1.u1.w12':[4.551,4.574],'beat-1.u1.w13':[4.621,4.888],'beat-1.u1.w14':[4.957,5.306],'beat-1.u1.w15':[5.468,5.631],'beat-1.u1.w16':[5.7,6.002],'beat-1.u1.w17':[6.06,6.246],'beat-1.u1.w18':[6.293,6.629],'beat-1.u1.w19':[6.664,6.745],'beat-1.u1.w20':[6.792,6.827],'beat-1.u1.w21':[6.873,7.407],'beat-1.u1.w22':[7.918,8.139],'beat-1.u1.w23':[8.173,8.243],'beat-1.u1.w24':[8.29,8.719],'beat-1.u1.w25':[8.766,9.009],'beat-1.u1.w26':[9.067,9.207],'beat-1.u1.w27':[9.427,9.659],'beat-1.u1.w28':[9.752,9.892],'beat-1.u1.w29':[10.089,10.321],'beat-1.u1.w30':[10.472,10.635],'beat-1.u1.w31':[10.716,10.89],'beat-1.u1.w32':[11.61,11.749],'beat-1.u1.w33':[11.865,12.26],'beat-1.u1.w34':[12.341,12.62],'beat-1.u1.w35':[12.678,12.934],'beat-1.u1.w36':[12.968,13.084],'beat-1.u1.w37':[13.131,13.305],'beat-1.u1.w38':[13.351,13.816],'beat-1.u1.w39':[13.851,14.257],'beat-1.u1.w40':[14.315,14.768],'beat-1.u1.w41':[15.244,15.314],'beat-1.u1.w42':[15.395,15.673],'beat-1.u1.w43':[15.72,15.859],'beat-1.u1.w44':[15.906,16.045],'beat-1.u1.w45':[16.475,16.707],'beat-1.u1.w46':[16.811,16.974],'beat-1.u1.w47':[17.02,17.229],'beat-1.u1.w48':[17.334,17.531],'beat-1.u1.w49':[17.659,17.798],'beat-1.u1.w50':[17.833,17.937],'beat-1.u1.w51':[18.17,18.297],'beat-1.u1.w52':[18.344,18.46],'beat-1.u1.w53':[18.599,18.727],'beat-1.u1.w54':[18.773,18.936],'beat-1.u1.w55':[19.609,20.085],'beat-1.u1.w56':[20.155,20.48],'beat-1.u1.w57':[20.573,20.817],'beat-1.u1.w58':[21.061,21.27],'beat-1.u1.w59':[21.316,21.432]}};const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "2d", background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = id => __narration.start(id);
  const end = id => __narration.end(id);
  let cursor = 0;
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; };
  const xs = [-3.25, -1.95, -0.65, 0.65, 1.95, 3.25];
  const dnaSequence = "TACGAT";
  const rnaSequence = "AUGCUA";
  const dna = [], dnaLetters = [], other = [], oldPairs = [], rnaBases = [], rnaLetters = [], rnaBonds = [], pairs = [];
  let template, rna, polymerase, partner, camera, dnaName, rnaName, endLeft, endRight;
  s.view("transcription-view", {
    rect: [0.04, 0.14, 0.92, 0.72], orbit: true, orbitHitTest: "geometry",
    camera: { yaw: 0.2, pitch: 0.65, distance: 16, height: 6.5, target: [0, 0.3, 0.3] }
  }, v => {
    camera = v.camera;
    const templateParts = [], partnerParts = [], rnaParts = [];
    for (let i = 0; i < 6; i++) {
      dna[i] = v.sphere(`template-base-${i}`, { position: [xs[i], 0.5, 0], radius: 0.3, fill: Color.TEAL, opacity: 0 });
      dnaLetters[i] = v.latex(`template-letter-${i}`, { tex: dnaSequence[i], position: [xs[i], 0.5, 0], fontSize: 0.43, fill: Color.TEAL, opacity: 0 });
      v.attach(dnaLetters[i], dna[i], { offset: [0, 0, 0.02] });
      other[i] = v.sphere(`partner-base-${i}`, { position: [xs[i], 0.5, 1.25], radius: 0.3, fill: Color.GREY_B, opacity: 0 });
      oldPairs[i] = v.line3D(`dna-pair-${i}`, { stroke: Color.WHITE, strokeWidth: 0.035, opacity: 0 });
      v.connect(oldPairs[i], dna[i], other[i], { endpoints: "surface" });
      templateParts.push(dna[i], dnaLetters[i]);
      partnerParts.push(other[i]);
      rnaBases[i] = v.circle(`rna-base-${i}`, { position: [xs[i], i === 0 ? -1.7 : -1, 0], radius: 0.3, fill: Color.NONE, stroke: Color.GREEN, strokeWidth: 0.035, opacity: 0 });
      rnaLetters[i] = v.latex(`rna-letter-${i}`, { tex: rnaSequence[i], position: [xs[i], i === 0 ? -1.7 : -1, 0.02], fontSize: 0.43, fill: Color.GREEN, opacity: 0 });
      v.attach(rnaLetters[i], rnaBases[i], { offset: [0, 0, 0.02] });
      pairs[i] = v.line(`rna-template-pair-${i}`, { stroke: Color.WHITE, strokeWidth: 0.025, opacity: 0 });
      v.connect(pairs[i], dna[i], rnaBases[i], { endpoints: "surface" });
      rnaParts.push(rnaBases[i], rnaLetters[i]);
      if (i > 0) {
        const tb = v.line3D(`template-link-${i - 1}-${i}`, { stroke: Color.TEAL, strokeWidth: 0.055, opacity: 0 });
        v.connect(tb, dna[i - 1], dna[i], { endpoints: "surface" });
        templateParts.push(tb);
        const pb = v.line3D(`partner-link-${i - 1}-${i}`, { stroke: Color.GREY_B, strokeWidth: 0.05, opacity: 0 });
        v.connect(pb, other[i - 1], other[i], { endpoints: "surface" });
        partnerParts.push(pb);
        rnaBonds[i - 1] = v.line(`rna-link-${i - 1}-${i}`, { stroke: Color.GREEN, strokeWidth: 0.055, opacity: 0 });
        v.connect(rnaBonds[i - 1], rnaBases[i - 1], rnaBases[i], { endpoints: "surface" });
        rnaParts.push(rnaBonds[i - 1]);
      }
    }
    dnaName = v.latex("template-name", { tex: "\\mathrm{DNA}", position: [0, 2.8, 0], fontSize: 0.46, fill: Color.TEAL, opacity: 0, billboard: true });
    endLeft = v.latex("template-end-3", { tex: "3^{\\prime}", position: [-4.15, 0.5, 0], fontSize: 0.43, fill: Color.TEAL, opacity: 0 });
    endRight = v.latex("template-end-5", { tex: "5^{\\prime}", position: [4.15, 0.5, 0], fontSize: 0.43, fill: Color.TEAL, opacity: 0 });
    templateParts.push(dnaName, endLeft, endRight);
    rnaName = v.latex("rna-name", { tex: "\\mathrm{RNA}", position: [-3.25, -2.2, 0], fontSize: 0.46, fill: Color.GREEN, opacity: 0 });
    rnaParts.push(rnaName);
    template = v.group("template", templateParts);
    partner = v.group("partner", partnerParts);
    rna = v.group("rna", rnaParts);
    polymerase = v.sphere("polymerase", { position: [xs[0], -0.25, -0.65], radius: 1.05, fill: Color.PURPLE, opacity: 0 });
    const intro = [...dna, ...other, ...oldPairs, dnaName];
    for (const item of templateParts) {
      if (!dna.includes(item) && !dnaLetters.includes(item) && item !== dnaName && item !== endLeft && item !== endRight) intro.push(item);
    }
    for (const item of partnerParts) if (!other.includes(item)) intro.push(item);
    playTo(end("beat-1.u1.w2"), intro.map(item => item.fadeIn()));
  });
  const enzymeName = s.latex("polymerase-name", { tex: "\\mathrm{RNA\\ polymerase}", position: [0, 2.75], fontSize: 0.43, fill: Color.PURPLE, opacity: 0 });
  until(start("beat-1.u1.w9"));
  playTo(end("beat-1.u1.w10"), [polymerase.fadeIn(), enzymeName.fadeIn(), dnaName.fadeOut()]);
  until(start("beat-1.u1.w11"));
  playTo(end("beat-1.u1.w14"), [partner.moveTo([0, 1.3, 0.55]), ...oldPairs.map(p => p.fadeOut())]);
  until(start("beat-1.u1.w16"));
  playTo(end("beat-1.u1.w21"), [
    partner.fadeOut(), enzymeName.fadeOut(), dnaName.moveTo([0, 1.55, 0]),
    camera.to2D({ height: 6.5, target: [0, 0, 0] }),
    polymerase.morphTo({ kind: "rectangle", width: 1.05, height: 2.3 }),
    polymerase.animate({ fill: Color.NONE, stroke: Color.PURPLE, strokeWidth: 0.045 }),
    polymerase.moveTo([xs[0], -0.25, -0.1]),
    ...dna.map(base => base.morphTo({ kind: "circle", radius: 0.3 })),
    ...dna.map(base => base.animate({ fill: Color.NONE, stroke: Color.TEAL, strokeWidth: 0.035 })),
    ...dnaLetters.map(letter => letter.fadeIn()), endLeft.fadeIn(), endRight.fadeIn()
  ]);
  s.remove(partner);
  oldPairs.forEach(p => s.remove(p));
  s.remove(enzymeName);
  playTo(start("beat-1.u1.w22"), dnaName.fadeIn());
  // The six template letters remain legible throughout their spoken sequence.
  until(start("beat-1.u1.w33"));
  playTo(end("beat-1.u1.w34"), [rnaBases[0].fadeIn(), rnaLetters[0].fadeIn(), rnaName.fadeIn()]);
  until(start("beat-1.u1.w35"));
  playTo(end("beat-1.u1.w40"), [rnaBases[0].moveTo([xs[0], -1, 0]), pairs[0].fadeIn()]);
  until(end("beat-1.u1.w44"));
  playTo(start("beat-1.u1.w45"), polymerase.moveTo([xs[1], -0.25, -0.1]));
  playTo(end("beat-1.u1.w47"), [rnaBases[1].fadeIn(), rnaLetters[1].fadeIn(), pairs[1].fadeIn(), rnaBonds[0].fadeIn()]);
  until(start("beat-1.u1.w48"));
  playTo(end("beat-1.u1.w50"), [polymerase.moveTo([xs[2], -0.25, -0.1]), rnaBases[2].fadeIn(), rnaLetters[2].fadeIn(), pairs[2].fadeIn(), rnaBonds[1].fadeIn()]);
  playTo(start("beat-1.u1.w52"), polymerase.moveTo([xs[3], -0.25, -0.1]));
  playTo(end("beat-1.u1.w54"), [rnaBases[3].fadeIn(), rnaLetters[3].fadeIn(), pairs[3].fadeIn(), rnaBonds[2].fadeIn()]);
  const uracil = s.latex("uracil-cue", { tex: "\\mathrm{RNA}:\\ U", position: [0, 2.75], fontSize: 0.5, fill: Color.GREEN, opacity: 0 });
  until(start("beat-1.u1.w55"));
  playTo(end("beat-1.u1.w57"), uracil.fadeIn());
  until(start("beat-1.u1.w58"));
  playTo(end("beat-1.u1.w59"), uracil.morphTo({ kind: "latex", tex: "\\mathrm{RNA}:\\ U\\ne T", fontSize: 0.5 }, { map: {} }));
  // The closing pause holds only the established template and partial transcript.
  playTo(end("beat-1.u1.w59") + 2 * (end("beat-1.u1.w59") - start("beat-1.u1.w58")), uracil.fadeOut());
  s.remove(uracil);
  s.keep(template);
  s.keep(rna);
  s.keep(polymerase);
  pairs.forEach(p => s.keep(p));
  until(__narration.durationSec);
});