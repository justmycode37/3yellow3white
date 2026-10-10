const __narration=(()=>{const data={audioAssetId:'d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1',endMode:'advance',durationSec:24.198291666666666,words:{'beat-1.u1.w1':[0.07,0.499],'beat-1.u1.w2':[0.557,0.917],'beat-1.u1.w3':[0.952,0.975],'beat-1.u1.w4':[1.045,1.637],'beat-1.u1.w5':[1.881,1.985],'beat-1.u1.w6':[2.043,2.299],'beat-1.u1.w7':[2.357,2.485],'beat-1.u1.w8':[2.531,2.914],'beat-1.u1.w9':[3.158,3.541],'beat-1.u1.w10':[3.587,4.168],'beat-1.u1.w11':[4.226,4.505],'beat-1.u1.w12':[4.551,4.574],'beat-1.u1.w13':[4.621,4.888],'beat-1.u1.w14':[4.957,5.306],'beat-1.u1.w15':[5.468,5.631],'beat-1.u1.w16':[5.7,6.002],'beat-1.u1.w17':[6.06,6.246],'beat-1.u1.w18':[6.293,6.629],'beat-1.u1.w19':[6.664,6.745],'beat-1.u1.w20':[6.792,6.827],'beat-1.u1.w21':[6.873,7.407],'beat-1.u1.w22':[7.918,8.139],'beat-1.u1.w23':[8.173,8.243],'beat-1.u1.w24':[8.29,8.719],'beat-1.u1.w25':[8.766,9.009],'beat-1.u1.w26':[9.067,9.207],'beat-1.u1.w27':[9.427,9.659],'beat-1.u1.w28':[9.752,9.892],'beat-1.u1.w29':[10.089,10.321],'beat-1.u1.w30':[10.472,10.635],'beat-1.u1.w31':[10.716,10.89],'beat-1.u1.w32':[11.61,11.749],'beat-1.u1.w33':[11.865,12.26],'beat-1.u1.w34':[12.341,12.62],'beat-1.u1.w35':[12.678,12.934],'beat-1.u1.w36':[12.968,13.084],'beat-1.u1.w37':[13.131,13.305],'beat-1.u1.w38':[13.351,13.816],'beat-1.u1.w39':[13.851,14.257],'beat-1.u1.w40':[14.315,14.768],'beat-1.u1.w41':[15.244,15.314],'beat-1.u1.w42':[15.395,15.673],'beat-1.u1.w43':[15.72,15.859],'beat-1.u1.w44':[15.906,16.045],'beat-1.u1.w45':[16.475,16.707],'beat-1.u1.w46':[16.811,16.974],'beat-1.u1.w47':[17.02,17.229],'beat-1.u1.w48':[17.334,17.531],'beat-1.u1.w49':[17.659,17.798],'beat-1.u1.w50':[17.833,17.937],'beat-1.u1.w51':[18.17,18.297],'beat-1.u1.w52':[18.344,18.46],'beat-1.u1.w53':[18.599,18.727],'beat-1.u1.w54':[18.773,18.936],'beat-1.u1.w55':[19.609,20.085],'beat-1.u1.w56':[20.155,20.48],'beat-1.u1.w57':[20.573,20.817],'beat-1.u1.w58':[21.061,21.27],'beat-1.u1.w59':[21.316,21.432]}};const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "3d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const B = n => __narration.start(`beat-1.u1.w${n}`);
  const E = n => __narration.end(`beat-1.u1.w${n}`);
  let cursor = 0;
  const until = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const run = (t, actions) => { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; };
  const x = i => -2.75 + 1.1 * i;
  const r = 0.71;
  const dna = [], other = [], bases = [], rnaNodes = [], rnaBases = [], rnaLinks = [], pairs = [];
  let template, rna, polymerase, partner, oldPairs, camera, enzymeBody, activeOutline;
  let dnaName, rnaName, enzymeName, pointer;
  // Spatial nucleotide-scale schematic, then a flat pairing close-up.
  s.view("transcription-view", {
    rect: [0.06, 0.12, 0.88, 0.76], orbit: true, orbitHitTest: "geometry",
    camera: { target: [0, 0, 0], height: 5.5, distance: 15, yaw: 0.25, pitch: 0.15, perspective: 1 }
  }, v => {
    camera = v.camera;
    const templateParts = [], partnerParts = [], rnaParts = [], oldRungs = [];
    for (let i = 0; i < 6; i++) {
      dna[i] = v.sphere(`template-node-${i}`, { position: [x(i), -r, 0], radius: 0.12, fill: Color.TEAL });
      other[i] = v.sphere(`opposite-node-${i}`, { position: [x(i), r, 0], radius: 0.12, fill: Color.WHITE });
      bases[i] = v.latex(`template-base-${i}`, { tex: String.raw`\mathrm{${"TACGAT"[i]}}`, position: [x(i), -r - 0.37, 0], fontSize: 0.43, fill: Color.TEAL, opacity: 0, billboard: true });
      templateParts.push(dna[i], bases[i]);
      partnerParts.push(other[i]);
      v.attach(bases[i], dna[i], { offset: [0, -0.37, 0] });
      if (i) {
        const link = v.line3D(`template-link-${i - 1}-${i}`, { stroke: Color.TEAL, strokeWidth: 0.045 });
        v.connect(link, dna[i - 1], dna[i], { endpoints: "surface" });
        templateParts.push(link);
        const oppositeLink = v.line3D(`opposite-link-${i}`, { stroke: Color.WHITE, strokeWidth: 0.035 });
        v.connect(oppositeLink, other[i - 1], other[i], { endpoints: "surface" });
        partnerParts.push(oppositeLink);
      }
      const rung = v.line3D(`original-pair-${i}`, { stroke: { color: Color.WHITE, opacity: 0.45 }, strokeWidth: 0.025 });
      v.connect(rung, dna[i], other[i], { endpoints: "surface" });
      oldRungs.push(rung);
      rnaNodes[i] = v.sphere(`rna-node-${i}`, { position: [x(i), i === 0 ? 1.8 : r, 0], radius: 0.12, fill: Color.GREEN, opacity: 0 });
      rnaBases[i] = v.latex(`rna-base-${i}`, { tex: String.raw`\mathrm{${"AUGCUA"[i]}}`, position: [x(i), r + 0.37, 0], fontSize: 0.43, fill: Color.GREEN, opacity: 0, billboard: true });
      v.attach(rnaBases[i], rnaNodes[i], { offset: [0, 0.37, 0] });
      rnaParts.push(rnaNodes[i], rnaBases[i]);
      if (i) {
        rnaLinks[i] = v.line3D(`rna-link-${i - 1}-${i}`, { stroke: Color.GREEN, strokeWidth: 0.045, opacity: 0 });
        v.connect(rnaLinks[i], rnaNodes[i - 1], rnaNodes[i], { endpoints: "surface" });
        rnaParts.push(rnaLinks[i]);
      }
      pairs[i] = v.line3D(`pair-${i}`, { stroke: { color: Color.WHITE, opacity: 0.6 }, strokeWidth: 0.024, opacity: 0 });
      v.connect(pairs[i], dna[i], rnaNodes[i], { endpoints: "surface" });
    }
    dnaName = v.latex("template-name", { tex: String.raw`\animpart{dna}{\mathrm{DNA}}`, anchor: "dna", position: [-0.9, -1.85, 0], fontSize: 0.42, fill: Color.TEAL, billboard: true });
    const end3 = v.latex("template-end-3", { tex: String.raw`3^{\prime}`, position: [-3.45, -r, 0], fontSize: 0.4, fill: Color.TEAL, opacity: 0, billboard: true });
    const end5 = v.latex("template-end-5", { tex: String.raw`5^{\prime}`, position: [3.45, -r, 0], fontSize: 0.4, fill: Color.TEAL, opacity: 0, billboard: true });
    templateParts.push(dnaName, end3, end5);
    template = v.group("template", templateParts, { rotation: [0.65, 0, 0], opacity: 0 });
    partner = v.group("opposite-strand", partnerParts, { rotation: [0.65, 0, 0], opacity: 0 });
    oldPairs = v.group("original-pairs", oldRungs, { opacity: 0 });
    rnaName = v.latex("rna-name", { tex: String.raw`\animpart{rna}{\mathrm{RNA}}`, anchor: "rna", position: [-1.1, 1.85, 0], fontSize: 0.42, fill: Color.GREEN, opacity: 0, billboard: true });
    rnaParts.push(rnaName);
    rna = v.group("rna", rnaParts);
    // Rounded lobes give the enzyme real depth. Its active-site outline is a
    // simplification within the same carried assembly, not a replacement enzyme.
    const lobes = [];
    for (let j = 0; j < 20; j++) {
      const a = j * Math.PI * 2 / 20;
      lobes.push(v.sphere(`polymerase-lobe-${j}`, {
        position: [0.49 * Math.cos(a), 1.36 * Math.sin(a), -0.25 + 0.18 * Math.sin(2 * a)],
        radius: 0.23, fill: Color.PURPLE
      }));
    }
    enzymeBody = v.group("polymerase-body", lobes, { isolated: true });
    const outline = [];
    for (let j = 0; j <= 64; j++) {
      const a = j * Math.PI * 2 / 64;
      outline.push([0.49 * Math.cos(a), 1.36 * Math.sin(a), -0.1]);
    }
    activeOutline = v.line3D("polymerase-active-outline", { points: outline, stroke: Color.PURPLE, strokeWidth: 0.045, opacity: 0 });
    polymerase = v.group("polymerase", [enzymeBody, activeOutline], { position: [x(0), 0, 0], rotation: [0.65, 0, 0], opacity: 0 });
    enzymeName = v.latex("polymerase-name", { tex: String.raw`\mathrm{RNA\ polymerase}`, position: [0, 2.05, 0], fontSize: 0.38, fill: Color.PURPLE, opacity: 0, billboard: true });
    pointer = v.line3D("sequence-pointer", { points: [[-0.2, 0, 0], [0.2, 0, 0]], position: [x(0), -1.39, 0], stroke: Color.WHITE, strokeWidth: 0.045, opacity: 0 });
    bases.push(end3, end5);
  });
  run(E(4), [template.fadeIn(), partner.fadeIn(), oldPairs.fadeIn()]);
  until(B(9));
  run(E(10), [polymerase.fadeIn(), enzymeName.fadeIn()]);
  until(B(11));
  run(E(11), oldPairs.fadeOut());
  run(E(14), [partner.moveTo([0, 1.4, 0.7]), partner.fadeOut()]);
  until(B(15));
  run(E(21), [
    camera.to2D({ height: 5.5, target: [0, 0, 0] }),
    template.rotateTo([0, 0, 0]), polymerase.rotateTo([0, 0, 0]),
    enzymeBody.fadeOut(), activeOutline.fadeIn(), enzymeName.fadeOut(),
    dnaName.morphTo({ kind: "latex", tex: String.raw`\animpart{dna}{\mathrm{DNA}}\ \mathrm{template}`, anchor: "dna", fontSize: 0.42 }, { map: { dna: "dna" } })
  ]);
  s.remove(partner); s.remove(oldPairs); s.remove(enzymeName);
  // Reveal notation only after the spatial lobes have fully cleared it.
  run(B(22), bases.map(b => b.fadeIn()));
  until(B(26));
  run(E(26), pointer.fadeIn());
  for (let i = 1; i < 6; i++) {
    until(B(26 + i));
    run(E(26 + i), pointer.moveTo([x(i), -1.39, 0]));
  }
  run(B(32), pointer.fadeOut());
  s.remove(pointer);
  until(B(33));
  run(E(34), [rnaName.fadeIn(), rnaNodes[0].fadeIn()]);
  until(B(35));
  run(E(37), rnaNodes[0].moveTo([x(0), r, 0]));
  run(E(38), pairs[0].fadeIn());
  until(B(41));
  run(E(42), rnaBases[0].fadeIn());
  until(E(44));
  run(B(45), polymerase.moveTo([x(1), 0, 0]));
  run(B(47), [rnaNodes[1].fadeIn(), rnaBases[1].fadeIn(), rnaLinks[1].fadeIn(), pairs[1].fadeIn()]);
  run(B(48), polymerase.moveTo([x(2), 0, 0]));
  run(B(50), [rnaNodes[2].fadeIn(), rnaBases[2].fadeIn(), rnaLinks[2].fadeIn(), pairs[2].fadeIn()]);
  until(E(50));
  run(B(52), polymerase.moveTo([x(3), 0, 0]));
  run(E(54), [rnaNodes[3].fadeIn(), rnaBases[3].fadeIn(), rnaLinks[3].fadeIn(), pairs[3].fadeIn()]);
  until(B(56));
  run(E(57), rnaName.morphTo({ kind: "latex", tex: String.raw`\animpart{rna}{\mathrm{RNA}}\animpart{u}{:\quad\mathrm{U}}`, anchor: "rna", fontSize: 0.42 }, { map: { rna: "rna" } }));
  until(B(58));
  run(E(59), rnaName.morphTo({ kind: "latex", tex: String.raw`\animpart{rna}{\mathrm{RNA}}\animpart{u}{:\quad\mathrm{U}}\ne\mathrm{T}`, anchor: "rna", fontSize: 0.42 }, { map: { rna: "rna", u: "u" } }));
  // AUGC remains paired. The next scene completes the last two positions.
  s.keep(template); s.keep(rna); s.keep(polymerase);
  pairs.forEach(p => s.keep(p));
  until(__narration.durationSec);
});