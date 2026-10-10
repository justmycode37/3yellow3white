const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-dipole\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  const wait = duration => { s.wait(duration); cursor += duration; };
  // Dimensionless idealized dipole: k|q|=1, with equal charges at x=+-1.5.
  const a = 1.5, cutoff = 0.29;
  const positive = [-a, 0, 0], negative = [a, 0, 0];
  const add = (p, v, h) => p.map((x, i) => x + h * v[i]);
  const norm = p => Math.hypot(...p);
  function field(p) {
    const rP = p.map((x, i) => x - positive[i]);
    const rN = p.map((x, i) => x - negative[i]);
    const dP = norm(rP), dN = norm(rN);
    return rP.map((x, i) => x / (dP * dP * dP) - rN[i] / (dN * dN * dN));
  }
  function direction(p) { const e = field(p), n = norm(e); return e.map(x => x / n); }
  function step(p, h) {
    const k1 = direction(p), k2 = direction(add(p, k1, h / 2));
    const k3 = direction(add(p, k2, h / 2)), k4 = direction(add(p, k3, h));
    return p.map((x, i) => x + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }
  const curves = [];
  for (const theta of [0.65, 1.25, 1.8]) {
    for (let j = 0; j < 6; j++) {
      const phi = 0.2 + j * Math.PI / 3;
      let p = [-a + cutoff * Math.cos(theta), cutoff * Math.sin(theta) * Math.cos(phi), cutoff * Math.sin(theta) * Math.sin(phi)];
      const points = [p];
      for (let n = 0; n < 450; n++) {
        const next = step(p, 0.065);
        const r = next.map((x, i) => x - negative[i]);
        if (norm(r) <= cutoff) {
          // Intersect the last segment with the exclusion sphere, never the singularity.
          let lo = 0, hi = 1;
          for (let k = 0; k < 16; k++) {
            const t = (lo + hi) / 2;
            const q = p.map((x, i) => x + t * (next[i] - x));
            if (norm(q.map((x, i) => x - negative[i])) > cutoff) lo = t; else hi = t;
          }
          points.push(p.map((x, i) => x + lo * (next[i] - x)));
          break;
        }
        if (norm(next) > 6) break;
        points.push(next); p = next;
      }
      curves.push(points);
    }
  }
  play(s.camera.to2D({ height: 10 }), 0);
  let v, camera, chargeGroup, vectorGroup;
  const fronts = [];
  s.view('dipole-space', {
    rect: [0.04, 0.1, 0.92, 0.77], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: -0.18, pitch: 0.2, distance: 22, height: 9.5, perspective: 0.65 }
  }, builder => {
    v = builder; camera = v.camera;
    const plus = v.sphere('positive-charge', { position: positive, radius: 0.26, fill: Color.RED, material: { roughness: 0.7, specular: 0.2 } });
    const minus = v.sphere('negative-charge', { position: negative, radius: 0.26, fill: Color.BLUE, material: { roughness: 0.7, specular: 0.2 } });
    const plusLabel = v.latex('positive-label', { tex: '+q', fontSize: 0.3, fill: Color.WHITE, billboard: true, billboardOffset: [0, 0, 0.29] });
    const minusLabel = v.latex('negative-label', { tex: '-q', fontSize: 0.3, fill: Color.WHITE, billboard: true, billboardOffset: [0, 0, 0.29] });
    v.attach(plusLabel, plus); v.attach(minusLabel, minus);
    chargeGroup = v.group('charges', [plus, minus, plusLabel, minusLabel]);
    const arrows = [];
    let id = 0;
    for (const x of [-3, 0, 3]) for (const y of [-2, 0, 2]) for (const z of [-1.7, 1.7]) {
      const p = [x, y, z], d = direction(p);
      arrows.push(v.arrow3D('field-sample-' + id++, { points: [add(p, d, -0.23), add(p, d, 0.23)], stroke: Color.GREY_B, strokeWidth: 0.022, opacity: 0.65 }));
    }
    vectorGroup = v.group('direction-samples', arrows, { opacity: 0 });
  });
  const note = s.text('model-note', { text: 'Idealized point charges; arrows show direction', position: [0, -3.65], fontSize: 0.25, fill: Color.GREY_B });
  play([chargeGroup.fadeIn(), note.fadeIn()], D * 0.04);
  play(vectorGroup.fadeIn(), D * 0.06);
  wait(D * 0.05);
  curves.forEach((points, i) => {
    fronts.push(v.sphere('trace-front-' + i, { position: points[0], radius: 0.045, fill: Color.YELLOW }));
  });
  // Moving dots are drawing tips, not particles or a simulated charge current.
  const slices = 20;
  for (let k = 0; k < slices; k++) {
    const pieces = [], actions = [];
    curves.forEach((points, i) => {
      const first = Math.floor(k * (points.length - 1) / slices);
      const last = Math.floor((k + 1) * (points.length - 1) / slices);
      pieces.push(v.path('trace-' + i + '-section-' + k, { points: points.slice(first, last + 1), strokeProfile: 'round', strokeWidth: 0.024, stroke: Color.TEAL, fill: Color.NONE, opacity: 0.8 }));
      actions.push(fronts[i].moveTo(points[last]));
      if (k === 10) {
        const p = points[first], d = direction(p);
        pieces.push(v.arrow3D('trace-direction-' + i, { points: [add(p, d, -0.12), add(p, d, 0.12)], stroke: Color.TEAL_A, strokeWidth: 0.031 }));
      }
    });
    const section = v.group('trace-section-' + k, pieces);
    actions.push(section.fadeIn());
    play(actions, D * 0.48 / slices);
  }
  play(fronts.map(p => p.fadeOut()), D * 0.025);
  fronts.forEach(p => s.remove(p));
  // One restrained inspection turn reveals the rotational family of field lines.
  play(camera.animate({ yaw: 0.48, pitch: 0.32 }), D * 0.2);
  wait(D - cursor);
});