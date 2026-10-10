const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-1\",\"endMode\":\"advance\",\"durationSec\":24.198291666666666,\"words\":{\"beat-1.u1.w1\":[0.07,0.499],\"beat-1.u1.w2\":[0.557,0.917],\"beat-1.u1.w3\":[0.952,0.975],\"beat-1.u1.w4\":[1.045,1.637],\"beat-1.u1.w5\":[1.881,1.985],\"beat-1.u1.w6\":[2.043,2.299],\"beat-1.u1.w7\":[2.357,2.485],\"beat-1.u1.w8\":[2.531,2.914],\"beat-1.u1.w9\":[3.158,3.541],\"beat-1.u1.w10\":[3.587,4.168],\"beat-1.u1.w11\":[4.226,4.505],\"beat-1.u1.w12\":[4.551,4.574],\"beat-1.u1.w13\":[4.621,4.888],\"beat-1.u1.w14\":[4.957,5.306],\"beat-1.u1.w15\":[5.468,5.631],\"beat-1.u1.w16\":[5.7,6.002],\"beat-1.u1.w17\":[6.06,6.246],\"beat-1.u1.w18\":[6.293,6.629],\"beat-1.u1.w19\":[6.664,6.745],\"beat-1.u1.w20\":[6.792,6.827],\"beat-1.u1.w21\":[6.873,7.407],\"beat-1.u1.w22\":[7.918,8.139],\"beat-1.u1.w23\":[8.173,8.243],\"beat-1.u1.w24\":[8.29,8.719],\"beat-1.u1.w25\":[8.766,9.009],\"beat-1.u1.w26\":[9.067,9.207],\"beat-1.u1.w27\":[9.427,9.659],\"beat-1.u1.w28\":[9.752,9.892],\"beat-1.u1.w29\":[10.089,10.321],\"beat-1.u1.w30\":[10.472,10.635],\"beat-1.u1.w31\":[10.716,10.89],\"beat-1.u1.w32\":[11.61,11.749],\"beat-1.u1.w33\":[11.865,12.26],\"beat-1.u1.w34\":[12.341,12.62],\"beat-1.u1.w35\":[12.678,12.934],\"beat-1.u1.w36\":[12.968,13.084],\"beat-1.u1.w37\":[13.131,13.305],\"beat-1.u1.w38\":[13.351,13.816],\"beat-1.u1.w39\":[13.851,14.257],\"beat-1.u1.w40\":[14.315,14.768],\"beat-1.u1.w41\":[15.244,15.314],\"beat-1.u1.w42\":[15.395,15.673],\"beat-1.u1.w43\":[15.72,15.859],\"beat-1.u1.w44\":[15.906,16.045],\"beat-1.u1.w45\":[16.475,16.707],\"beat-1.u1.w46\":[16.811,16.974],\"beat-1.u1.w47\":[17.02,17.229],\"beat-1.u1.w48\":[17.334,17.531],\"beat-1.u1.w49\":[17.659,17.798],\"beat-1.u1.w50\":[17.833,17.937],\"beat-1.u1.w51\":[18.17,18.297],\"beat-1.u1.w52\":[18.344,18.46],\"beat-1.u1.w53\":[18.599,18.727],\"beat-1.u1.w54\":[18.773,18.936],\"beat-1.u1.w55\":[19.609,20.085],\"beat-1.u1.w56\":[20.155,20.48],\"beat-1.u1.w57\":[20.573,20.817],\"beat-1.u1.w58\":[21.061,21.27],\"beat-1.u1.w59\":[21.316,21.432]}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "3d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start(`beat-1.u1.w${n}`);
  const end = n => __narration.end(`beat-1.u1.w${n}`);
  let cursor = 0;
  const waitTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: "smooth" }); cursor = t; };
  const xs = [-2.75, -1.65, -0.55, 0.55, 1.65, 2.75];
  const dna = ["T", "A", "C", "G", "A", "T"];
  const rna = ["A", "U", "G", "C", "U", "A"];
  const helix = (u, opposite = false) => {
    const a = u * 0.66 - 0.8 + (opposite ? Math.PI : 0);
    return [-2.75 + 1.1 * u, 0.65 * Math.cos(a), 0.65 * Math.sin(a)];
  };
  // Coarse-grained backbone tubes, not an atom-resolved DNA structure.
  // The matching samples provide a schematic unrolling into the close-up.
  function backboneGeometry(opposite, flat) {
    const vertices = [], triangles = [];
    const N = 60, R = 8;
    for (let i = 0; i <= N; i++) {
      const u = 5 * i / N;
      const p = flat ? [-2.75 + 1.1 * u, 0.65, 0] : helix(u, opposite);
      for (let j = 0; j < R; j++) {
        const a = 2 * Math.PI * j / R;
        vertices.push([p[0], p[1] + 0.044 * Math.cos(a), p[2] + 0.044 * Math.sin(a)]);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) {
      const a = i * R + j, b = i * R + (j + 1) % R;
      triangles.push([a, b, b + R], [a, b + R, a + R]);
    }
    return { vertices, triangles, shading: "smooth" };
  }
  function regionGeometry(flat) {
    const vertices = [], triangles = [];
    const N = 40, R = 8;
    for (let i = 0; i < N; i++) {
      const a = 2 * Math.PI * i / N;
      for (let j = 0; j < R; j++) {
        const b = 2 * Math.PI * j / R, t = 0.055;
        vertices.push(flat
          ? [(0.48 + t * Math.cos(b)) * Math.cos(a), (1.13 + t * Math.cos(b)) * Math.sin(a), t * Math.sin(b) - 0.12]
          : [t * Math.sin(b), (1.02 + t * Math.cos(b)) * Math.cos(a), (1.02 + t * Math.cos(b)) * Math.sin(a)]);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) {
      const a = i * R + j, b = i * R + (j + 1) % R;
      const c = ((i + 1) % N) * R + j, d = ((i + 1) % N) * R + (j + 1) % R;
      triangles.push([a, b, d], [a, d, c]);
    }
    return { vertices, triangles, shading: "smooth" };
  }
  const templateBackbone = s.mesh("template-backbone", { ...backboneGeometry(false, false), fill: Color.TEAL, stroke: Color.NONE });
  const otherBackbone = s.mesh("other-backbone", { ...backboneGeometry(true, false), fill: Color.GREY_B, stroke: Color.NONE });
  const templateNodes = [], otherNodes = [], templateLetters = [], rungs = [];
  for (let i = 0; i < 6; i++) {
    const node = s.sphere(`template-base-${i}`, { position: helix(i), radius: 0.13, fill: Color.TEAL, stroke: Color.NONE });
    const other = s.sphere(`other-base-${i}`, { position: helix(i, true), radius: 0.13, fill: Color.GREY_B, stroke: Color.NONE });
    const letter = s.text(`template-letter-${i}`, { text: dna[i], fontSize: 0.32, fill: Color.WHITE, opacity: 0, billboard: true });
    s.attach(letter, node, { offset: [0, 0, 0.32] });
    const rung = s.line3D(`duplex-pair-${i}`, { stroke: Color.GREY_B, strokeWidth: 0.027 });
    s.connect(rung, node, other, { endpoints: "surface" });
    templateNodes.push(node); otherNodes.push(other); templateLetters.push(letter); rungs.push(rung);
  }
  const templateName = s.text("template-label", { text: "DNA template", position: [0, 1.68], fontSize: 0.34, fill: Color.TEAL, opacity: 0 });
  const end3 = s.latex("template-3prime", { tex: "3^{\\prime}", position: [-3.45, 0.65], fontSize: 0.34, opacity: 0 });
  const end5 = s.latex("template-5prime", { tex: "5^{\\prime}", position: [3.45, 0.65], fontSize: 0.34, opacity: 0 });
  const template = s.group("template", [templateBackbone, ...templateNodes, ...templateLetters, templateName, end3, end5]);
  const otherStrand = s.group("other-strand", [otherBackbone, ...otherNodes]);
  const title = s.text("dna-intro-label", { text: "DNA", position: [0, 2.2], fontSize: 0.42, billboard: true });
  const schematic = s.text("schematic-label", { text: "Schematic segment", position: [0, -2.85], fontSize: 0.24, fill: Color.GREY_B, billboard: true });
  const region = s.mesh("polymerase-region", { ...regionGeometry(false), fill: Color.PURPLE, stroke: Color.NONE });
  const polymerase = s.group("polymerase", [region], { position: [xs[0], -0.1, 0], opacity: 0 });
  const polymeraseLabel = s.text("polymerase-label", { text: "RNA polymerase", fontSize: 0.29, fill: Color.PURPLE, billboard: true, opacity: 0 });
  s.attach(polymeraseLabel, polymerase, { offset: [0, -2.55, 0] });
  const rnaNodes = [], rnaLetters = [], rnaLinks = [], pairLinks = [];
  for (let i = 0; i < 6; i++) {
    const node = s.sphere(`rna-base-${i}`, { position: [xs[i], -1.5, 0], radius: 0.28, fill: Color.GREEN, stroke: Color.NONE, opacity: 0 });
    const letter = s.text(`rna-letter-${i}`, { text: rna[i], fontSize: 0.32, fill: Color.WHITE, opacity: 0 });
    s.attach(letter, node, { offset: [0, 0, 0.32] });
    const pair = s.line3D(`rna-template-pair-${i}`, { stroke: Color.WHITE, strokeWidth: 0.019, opacity: 0 });
    s.connect(pair, templateNodes[i], node, { endpoints: "surface" });
    rnaNodes.push(node); rnaLetters.push(letter); pairLinks.push(pair);
    if (i > 0) {
      const link = s.line3D(`rna-backbone-${i - 1}-${i}`, { stroke: Color.GREEN, strokeWidth: 0.065, opacity: 0 });
      s.connect(link, rnaNodes[i - 1], node, { endpoints: "surface" });
      rnaLinks.push(link);
    }
  }
  const rnaName = s.text("rna-label", { text: "RNA", position: [-1.1, -1.98], fontSize: 0.34, fill: Color.GREEN, opacity: 0 });
  const rnaGroup = s.group("rna", [...rnaNodes, ...rnaLetters, ...rnaLinks, rnaName]);
  // Pairing links are separate from the RNA so they can disappear on release.
  const pairing = s.group("pairing-links", pairLinks);
  s.play(s.camera.to3D({ yaw: -0.16, pitch: 0.23, height: 8.4, distance: 16, target: [0, 0, 0] }), { duration: 0 });
  waitTo(start(9));
  playTo(end(10), [polymerase.fadeIn(), polymeraseLabel.fadeIn()]);
  waitTo(start(11));
  playTo(end(14), [otherStrand.moveTo([0, 1.35, 0]), ...rungs.map(r => r.fadeOut())]);
  rungs.forEach(r => s.remove(r));
  waitTo(start(16));
  // Follow the same teal strand into a planar pairing schematic.
  playTo(end(21), [
    s.camera.to2D({ height: 8.4, target: [0, 0, 0] }),
    templateBackbone.morphTo({ kind: "mesh", ...backboneGeometry(false, true) }),
    ...templateNodes.map((n, i) => n.moveTo([xs[i], 0.65, 0])),
    ...templateNodes.map(n => n.scaleTo(0.28 / 0.13)),
    ...templateLetters.map(t => t.fadeIn()),
    templateName.fadeIn(), end3.fadeIn(), end5.fadeIn(),
    otherStrand.fadeOut(), title.fadeOut(),
    region.morphTo({ kind: "mesh", ...regionGeometry(true) })
  ]);
  s.remove(otherStrand); s.remove(title);
  const scan = s.line("sequence-reading-mark", { points: [[-0.21, 0], [0.21, 0]], position: [xs[0], 1.12], stroke: Color.WHITE, strokeWidth: 0.025, opacity: 0 });
  waitTo(start(26));
  playTo(end(26), [scan.fadeIn()]);
  for (let i = 1; i < 6; i++) {
    waitTo(start(26 + i));
    playTo(end(26 + i), [scan.moveTo([xs[i], 1.12])]);
  }
  waitTo(start(32));
  playTo(end(32), [scan.fadeOut(), schematic.fadeOut()]);
  s.remove(scan); s.remove(schematic);
  waitTo(start(33));
  playTo(end(34), [rnaNodes[0].fadeIn(), rnaName.fadeIn()]);
  waitTo(start(35));
  playTo(end(37), [rnaNodes[0].moveTo([xs[0], -0.85, 0]), pairLinks[0].fadeIn()]);
  // The first concrete pair is named only when its A is spoken.
  waitTo(start(41));
  playTo(end(41), [rnaLetters[0].fadeIn()]);
  waitTo(start(42));
  playTo(end(44), [pairLinks[0].animate({ strokeWidth: 0.032 })]);
  playTo(start(45), [polymerase.moveTo([xs[1], -0.1, 0])]);
  playTo(end(45), [rnaNodes[1].fadeIn(), rnaLetters[1].fadeIn()]);
  waitTo(start(46));
  playTo(end(47), [rnaNodes[1].moveTo([xs[1], -0.85, 0]), pairLinks[1].fadeIn(), rnaLinks[0].fadeIn()]);
  waitTo(start(48));
  playTo(end(48), [polymerase.moveTo([xs[2], -0.1, 0]), rnaNodes[2].fadeIn(), rnaLetters[2].fadeIn()]);
  waitTo(start(49));
  playTo(end(50), [rnaNodes[2].moveTo([xs[2], -0.85, 0]), pairLinks[2].fadeIn(), rnaLinks[1].fadeIn()]);
  waitTo(start(51));
  playTo(start(52), [polymerase.moveTo([xs[3], -0.1, 0])]);
  playTo(end(52), [rnaNodes[3].fadeIn(), rnaLetters[3].fadeIn()]);
  waitTo(start(53));
  playTo(end(54), [rnaNodes[3].moveTo([xs[3], -0.85, 0]), pairLinks[3].fadeIn(), rnaLinks[2].fadeIn()]);
  // Leave the last two RNA bases for the next scene's completion step.
  waitTo(start(57));
  const uracil = s.text("rna-identity-note", { text: "RNA: U", position: [0, 2.55], fontSize: 0.36, fill: Color.GREEN });
  playTo(end(57), [uracil.fadeIn()]);
  waitTo(start(58));
  playTo(end(59), [uracil.morphTo({ kind: "text", text: "RNA: U, not T", fontSize: 0.36 })]);
  s.keep(template); s.keep(rnaGroup); s.keep(polymerase); s.keep(polymeraseLabel); s.keep(pairing);
  waitTo(__narration.durationSec);
});