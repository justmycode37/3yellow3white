const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-snell\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "2d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const holdTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions, ease = "smooth") => { s.play(actions, { duration: t - cursor, ease }); cursor = t; };
  s.play(s.camera.to2D({ height: 8 }), { duration: 0 });

  // Equilateral cross-section in XY, extruded along Z. All optical paths
  // are computed in the central XY plane; no measured-glass claim is made.
  const root3 = Math.sqrt(3);
  const apex = [0, 1.7];
  const bottomY = apex[1] - 1.8 * root3;
  const cross = [apex, [-1.8, bottomY], [1.8, bottomY]];
  const entry = [(0.15 - apex[1]) / root3, 0.15, 0];
  const angle = 18 * Math.PI / 180;
  const incoming = [Math.cos(angle), Math.sin(angle), 0];
  const sourceX = -3.95;
  const source = [sourceX, entry[1] - (entry[0] - sourceX) * Math.tan(angle), 0];
  const leftNormal = [-root3 / 2, 0.5, 0];
  const rightNormal = [root3 / 2, 0.5, 0];
  const add = (p, q, k = 1) => p.map((x, i) => x + k * q[i]);
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  // N points toward the incident medium. This is vector Snell refraction.
  const refract = (direction, N, nFrom, nTo) => {
    const eta = nFrom / nTo;
    const c = -dot(direction, N);
    const k = 1 - eta * eta * (1 - c * c);
    if (k < 0) throw new Error("Unexpected total internal reflection");
    return direction.map((x, i) => eta * x + (eta * c - Math.sqrt(k)) * N[i]);
  };
  const wavelengths = [700, 620, 550, 470, 400];
  const colors = [Color.RED, Color.ORANGE, Color.GREEN, Color.BLUE, Color.PURPLE];
  const rays = wavelengths.map((nm, i) => {
    const um = nm / 1000;
    const n = 1.43 + 0.030 / (um * um);
    const inside = refract(incoming, leftNormal, 1, n);
    // Right face: sqrt(3) x + y = apex.y.
    const length = (apex[1] - root3 * entry[0] - entry[1]) / (root3 * inside[0] + inside[1]);
    const exit = add(entry, inside, length);
    const outside = refract(inside, rightNormal.map(x => -x), n, 1);
    const end = add(exit, outside, (4.05 - exit[0]) / outside[0]);
    return { nm, n, color: colors[i], inside, exit, outside, end };
  });
  let v, prism, incident, front, entryNormal, exitNormal;
  let entryArcs, exitArcs, whiteLabel;
  const insideLines = [], outsideLines = [], tips = [];

  s.view("prism-view", {
    rect: [0, 0, 1, 1], orbit: true, orbitHitTest: "geometry",
    camera: { yaw: 0.18, pitch: 0.13, height: 8, distance: 18, perspective: 0.25, target: [0, -0.05, 0] }
  }, builder => {
    v = builder;
    const vertices = [];
    for (const z of [-0.85, 0.85]) for (const p of cross) vertices.push([p[0], p[1], z]);
    const shell = v.mesh("prism-glass-shell", {
      vertices,
      triangles: [[0,2,1],[3,4,5],[0,1,4],[0,4,3],[1,2,5],[1,5,4],[2,0,3],[2,3,5]],
      shading: "flat", fill: Color.BLUE_B, stroke: Color.NONE, opacity: 0.085,
      material: { roughness: 0.25, specular: 0.35 }
    });
    const edges = [];
    const pairs = [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]];
    pairs.forEach(([a,b], i) => edges.push(v.line3D("prism-edge-" + i, {
      points: [vertices[a], vertices[b]], stroke: { color: Color.GREY_B, opacity: 0.55 }, strokeWidth: 0.018
    })));
    prism = v.group("prism", [shell, ...edges], { isolated: true });
  });
  playTo(D * 0.08, [prism.fadeIn()]);
  holdTo(D * 0.12);

  incident = v.line3D("common-incident-ray", {
    points: [source, add(source, incoming, 0.002)], stroke: Color.WHITE, strokeWidth: 0.045
  });
  front = v.sphere("incident-trace-tip", { position: source, radius: 0.045, fill: Color.WHITE });
  whiteLabel = v.text("white-light-label", {
    text: "white light", position: [-3.05, -0.22, 0], fontSize: 0.27, fill: Color.WHITE, billboard: true
  });
  playTo(D * 0.29, [
    incident.morphTo({ kind: "line", points: [source, entry] }),
    front.moveTo(entry), whiteLabel.fadeIn()
  ], "linear");
  s.remove(front);

  const normal = (id, p, N, offset) => {
    const pieces = [];
    for (let j = 0; j < 12; j++) {
      const a = -0.98 + j * 0.17;
      pieces.push(v.line3D(id + "-dash-" + j, {
        points: [add(p, N, a), add(p, N, a + 0.09)],
        stroke: { color: Color.WHITE, opacity: 0.68 }, strokeWidth: 0.014
      }));
    }
    const label = v.text(id + "-label", {
      text: "normal", position: add(p, offset), fontSize: 0.22, fill: Color.GREY_A, billboard: true
    });
    return v.group(id, [...pieces, label]);
  };
  const arc = (id, center, a, b, radius) => {
    const points = [];
    for (let j = 0; j <= 30; j++) {
      const t = a + (b - a) * j / 30;
      points.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t), center[2]]);
    }
    return v.path(id, { points, strokeProfile: "round", stroke: Color.GREEN, strokeWidth: 0.016, fill: Color.NONE });
  };
  const reference = rays[2];
  const insideAngle = Math.atan2(reference.inside[1], reference.inside[0]);
  const outsideAngle = Math.atan2(reference.outside[1], reference.outside[0]);
  entryNormal = normal("entry-normal", entry, leftNormal, [-0.85, 0.78, 0]);
  entryArcs = v.group("entry-angle-arcs", [
    arc("entry-air-angle", entry, 5 * Math.PI / 6, Math.PI + angle, 0.47),
    arc("entry-glass-angle", entry, -Math.PI / 6, insideAngle, 0.56)
  ]);
  playTo(D * 0.33, [entryNormal.fadeIn(), entryArcs.fadeIn()]);

  const modelFormula = s.latex("illustrative-index-law", {
    tex: String.raw`n(\lambda)=1.43+\frac{0.030}{\lambda^2}\qquad (\lambda\text{ in }\mu\mathrm{m})`,
    position: [0, -2.65], fontSize: 0.29, fill: Color.WHITE
  });
  const modelNote = s.text("model-qualification", {
    text: "Illustrative dispersion, not measured glass", position: [0, -3.13], fontSize: 0.22, fill: Color.GREY_A
  });
  rays.forEach(ray => {
    insideLines.push(v.line3D("inside-" + ray.nm, {
      points: [entry, add(entry, ray.inside, 0.002)], stroke: ray.color, strokeWidth: 0.027
    }));
    tips.push(v.sphere("trace-tip-" + ray.nm, { position: entry, radius: 0.032, fill: ray.color }));
  });
  playTo(D * 0.53, [
    ...insideLines.map((line, i) => line.morphTo({ kind: "line", points: [entry, rays[i].exit] })),
    ...tips.map((tip, i) => tip.moveTo(rays[i].exit)),
    modelFormula.fadeIn(), modelNote.fadeIn()
  ], "linear");

  exitNormal = normal("exit-normal", reference.exit, rightNormal, [0.89, 0.84, 0]);
  exitArcs = v.group("exit-angle-arcs", [
    arc("exit-glass-angle", reference.exit, Math.PI + insideAngle, 7 * Math.PI / 6, 0.48),
    arc("exit-air-angle", reference.exit, outsideAngle, Math.PI / 6, 0.59)
  ]);
  const snell = s.latex("snell-law", {
    tex: String.raw`n_1\sin\theta_1=n_2\sin\theta_2`, position: [0, 2.65], fontSize: 0.38, fill: Color.WHITE
  });
  playTo(D * 0.57, [exitNormal.fadeIn(), exitArcs.fadeIn(), snell.fadeIn()]);
  rays.forEach(ray => outsideLines.push(v.line3D("outside-" + ray.nm, {
    points: [ray.exit, add(ray.exit, ray.outside, 0.002)], stroke: ray.color, strokeWidth: 0.032
  })));
  playTo(D * 0.77, [
    ...outsideLines.map((line, i) => line.morphTo({ kind: "line", points: [rays[i].exit, rays[i].end] })),
    ...tips.map((tip, i) => tip.moveTo(rays[i].end))
  ], "linear");
  const labels = [0, 4].map(i => {
    const ray = rays[i];
    const label = v.text("wavelength-" + ray.nm, {
      text: ray.nm + " nm", fontSize: 0.24, fill: ray.color, billboard: true
    });
    v.attach(label, tips[i], { offset: [0.48, i === 0 ? 0.12 : -0.13, 0] });
    return label;
  });
  playTo(D * 0.81, [...tips.map(tip => tip.fadeOut()), ...labels.map(label => label.fadeIn())]);
  holdTo(D);
});