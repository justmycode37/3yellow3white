const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-kepler\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  const wait = duration => { s.wait(duration); cursor += duration; };
  play(s.camera.to2D({ height: 8 }), 0);
  // Ideal two-body solution: mean anomaly grows uniformly, not true anomaly.
  const a = 3.8, e = 0.62, b = a * Math.sqrt(1 - e * e);
  const N = 360, K = 48, dM = 2 * Math.PI / N;
  const span = K * dM, M0 = -span / 2;
  const focus = [a * e, 0, 0];
  function point(M, y = 0) {
    let E = M;
    for (let j = 0; j < 9; j++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return [a * Math.cos(E), y, b * Math.sin(E)];
  }
  function fan(start, end) {
    const vertices = [[focus[0], 0.012, 0]];
    const triangles = [];
    for (let j = 0; j <= K; j++) vertices.push(point(start + (end - start) * j / K, 0.012));
    for (let j = 0; j < K; j++) triangles.push([0, j + 1, j + 2]);
    return { vertices, triangles, shading: 'unlit', stroke: Color.NONE };
  }
  let v, planet, star, radius, periSector, apoSector;
  const model = [];
  s.view('orbital-model', {
    rect: [0, 0.07, 1, 0.80], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.10, pitch: 0.85, height: 7.5, distance: 15, perspective: 0, target: [0, 0, 0] }
  }, view => {
    v = view;
    const rim = [];
    for (let j = 0; j <= 240; j++) {
      const E = j * 2 * Math.PI / 240;
      rim.push([a * Math.cos(E), 0, b * Math.sin(E)]);
    }
    const vertices = [[0, -0.025, 0], ...rim.slice(0, -1).map(p => [p[0], -0.025, p[2]])];
    const triangles = [];
    for (let j = 0; j < 240; j++) triangles.push([0, j + 1, (j + 1) % 240 + 1]);
    v.mesh('orbital-plane', { vertices, triangles, fill: Color.GREY_B, opacity: 0.055, stroke: Color.NONE });
    model.push(v.path('kepler-ellipse', { points: rim, stroke: Color.WHITE, strokeWidth: 0.024, strokeProfile: 'round', fill: Color.NONE }));
    star = v.sphere('central-star', {
      position: focus, radius: 0.23, fill: Color.GOLD,
      material: { roughness: 0.8, emissive: Color.GOLD, emissiveIntensity: 0.18 }
    });
    planet = v.sphere('orbiting-planet', {
      position: point(M0), radius: 0.16, fill: Color.BLUE,
      texture: { pattern: 'marble', color: Color.BLUE_D, scale: 8, seed: 23, bumpStrength: 0.001 },
      material: { roughness: 0.75, specular: 0.2 }
    });
    radius = v.line3D('focus-radius', { points: [focus, point(M0)], stroke: Color.GOLD_A, strokeWidth: 0.018 });
    v.connect(radius, star, planet, { endpoints: 'center' });
    const focusLabel = v.text('focus-label', { text: 'focus', fontSize: 0.28, fill: Color.GOLD, billboard: true });
    v.attach(focusLabel, star, { offset: [0, 0.67, 0] });
    const periLabel = v.text('periapsis-label', { text: 'periapsis', position: [4.05, -0.72, 0], fontSize: 0.26, billboard: true });
    const apoLabel = v.text('apoapsis-label', { text: 'apoapsis', position: [-3.9, -0.72, 0], fontSize: 0.26, billboard: true });
    model.push(star, planet, radius, focusLabel, periLabel, apoLabel);
  });
  const ideal = s.text('ideal-model-note', { text: 'Ideal two-body orbit', position: [0, 2.95], fontSize: 0.26, fill: Color.GREY_B });
  play([...model.map(x => x.fadeIn()), ideal.fadeIn()], D * 0.05);
  const stepTime = D * 0.8 / N;
  for (let i = 0; i < N; i++) {
    const actions = [planet.moveTo(point(M0 + (i + 1) * dM))];
    if (i === 0) {
      periSector = v.mesh('periapsis-swept-area', { ...fan(M0, M0), fill: Color.TEAL, opacity: 0.65 });
      v.line3D('periapsis-start-ray', { points: [[focus[0], 0.018, 0], point(M0, 0.018)], stroke: Color.TEAL, strokeWidth: 0.018 });
    }
    if (i < K) actions.push(periSector.morphTo({ kind: 'mesh', ...fan(M0, M0 + (i + 1) * dM) }));
    if (i === N / 2) {
      const start = M0 + Math.PI;
      apoSector = v.mesh('apoapsis-swept-area', { ...fan(start, start), fill: Color.BLUE, opacity: 0.60 });
      v.line3D('apoapsis-start-ray', { points: [[focus[0], 0.018, 0], point(start, 0.018)], stroke: Color.BLUE, strokeWidth: 0.018 });
    }
    if (i >= N / 2 && i < N / 2 + K) actions.push(apoSector.morphTo({ kind: 'mesh', ...fan(M0 + Math.PI, M0 + (i + 1) * dM) }));
    play(actions, stepTime);
    if (i === K - 1) {
      v.line3D('periapsis-end-ray', { points: [[focus[0], 0.018, 0], point(M0 + span, 0.018)], stroke: Color.TEAL, strokeWidth: 0.018 });
      s.latex('periapsis-time', { tex: String.raw`\Delta t_{\rm peri}=\frac{2T}{15}`, position: [2.2, -2.2], fontSize: 0.35, fill: Color.TEAL });
    }
    if (i === N / 2 + K - 1) {
      v.line3D('apoapsis-end-ray', { points: [[focus[0], 0.018, 0], point(M0 + Math.PI + span, 0.018)], stroke: Color.BLUE, strokeWidth: 0.018 });
      s.latex('apoapsis-time', { tex: String.raw`\Delta t_{\rm apo}=\frac{2T}{15}`, position: [-2.2, -2.2], fontSize: 0.35, fill: Color.BLUE });
      s.latex('equal-area-conclusion', { tex: String.raw`A_{\rm peri}=A_{\rm apo}=\frac{2\pi ab}{15}`, position: [0, -2.95], fontSize: 0.38 });
    }
  }
  // A complete revolution ends at the initial pose; the remaining time is an inspection hold.
  wait(D - cursor);
});