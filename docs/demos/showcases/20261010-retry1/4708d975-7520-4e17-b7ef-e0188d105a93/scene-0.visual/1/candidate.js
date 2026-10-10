const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-kepler\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const duration = __narration.durationSec;
  let cursor = 0;
  const play = (actions, dt) => { s.play(actions, { duration: dt, ease: 'linear' }); cursor += dt; };
  const waitTo = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  play(s.camera.to2D({ height: 8 }), 0);

  // Idealized, dimensionless two-body solution. The ellipse center is the
  // origin; the gravitating body is at +ae, NOT at the ellipse center.
  const a = 4, eccentricity = 0.65;
  const b = a * Math.sqrt(1 - eccentricity * eccentricity);
  const focusPosition = [a * eccentricity, 0, 0];
  const period = duration * 0.8;
  const startTime = duration * 0.05;
  const meanStart = -Math.PI / 8;
  function eccentricAnomaly(mean) {
    let E = mean;
    for (let j = 0; j < 12; j++) {
      E -= (E - eccentricity * Math.sin(E) - mean) / (1 - eccentricity * Math.cos(E));
    }
    return E;
  }
  function point(mean, z = 0) {
    const E = eccentricAnomaly(mean);
    return [a * Math.cos(E), b * Math.sin(E), z];
  }
  const fanSegments = 64;
  function sectorGeometry(begin, end) {
    const vertices = [[focusPosition[0], 0, -0.018]];
    for (let j = 0; j <= fanSegments; j++) {
      vertices.push(point(begin + (end - begin) * j / fanSegments, -0.018));
    }
    const triangles = [];
    for (let j = 0; j < fanSegments; j++) triangles.push([0, j + 1, j + 2]);
    return { vertices, triangles, shading: 'unlit' };
  }

  s.text('model-note', { text: 'Idealized two-body orbit', position: [0, 2.82], fontSize: 0.29, fill: Color.GREY_A });
  let v, planet, star, radius, periSector, apoSector;
  s.view('orbital-model', {
    rect: [0.025, 0.12, 0.95, 0.76], orbit: false,
    camera: { yaw: -0.10, pitch: 0.88, height: 5.6, distance: 18, perspective: 0.15 }
  }, view => {
    v = view;
    const planeVertices = [[0, 0, -0.07]];
    const planeTriangles = [];
    const orbitPoints = [];
    for (let j = 0; j <= 192; j++) {
      const E = 2 * Math.PI * j / 192;
      const p = [a * Math.cos(E), b * Math.sin(E), 0];
      orbitPoints.push(p);
      planeVertices.push([p[0], p[1], -0.07]);
      if (j > 0) planeTriangles.push([0, j, j + 1]);
    }
    v.mesh('orbital-plane', { vertices: planeVertices, triangles: planeTriangles, fill: Color.GREY_E, opacity: 0.16, stroke: Color.NONE, shading: 'unlit' });
    v.path('kepler-ellipse', { points: orbitPoints, fill: Color.NONE, stroke: Color.GREY_A, strokeWidth: 0.023 });
    star = v.sphere('central-body-at-focus', {
      position: focusPosition, radius: 0.20, fill: Color.GOLD,
      texture: { pattern: 'noise', color: Color.GOLD_B, scale: 12, seed: 31, bumpStrength: 0.001 },
      material: { roughness: 0.8, specular: 0.15, emissive: Color.GOLD, emissiveIntensity: 0.18 }
    });
    planet = v.sphere('orbiting-planet', {
      position: point(meanStart), radius: 0.145, fill: Color.BLUE_B,
      texture: { pattern: 'marble', color: Color.BLUE_E, scale: [4, 9, 4], seed: 12, bumpStrength: 0.001 },
      material: { roughness: 0.65, specular: 0.25 }
    });
    radius = v.line3D('instantaneous-radius', { stroke: Color.GOLD, strokeWidth: 0.019 });
    v.connect(radius, star, planet);
    const focusLabel = v.text('focus-label', { text: 'focus', fontSize: 0.23, fill: Color.GOLD, billboard: true });
    v.attach(focusLabel, star, { offset: [0, 3.05, 0.045] });
    const peri = v.sphere('periapsis-mark', { radius: 0.027, position: [a, 0, 0], fill: Color.WHITE });
    const apo = v.sphere('apoapsis-mark', { radius: 0.027, position: [-a, 0, 0], fill: Color.WHITE });
    const periLabel = v.text('periapsis-label', { text: 'periapsis', fontSize: 0.23, billboard: true, fill: Color.GREY_A });
    const apoLabel = v.text('apoapsis-label', { text: 'apoapsis', fontSize: 0.23, billboard: true, fill: Color.GREY_A });
    v.attach(periLabel, peri, { offset: [-0.1, -2.0, 0.04] });
    v.attach(apoLabel, apo, { offset: [0.1, 2.0, 0.04] });
  });

  function boundary(id, mean, color) {
    const marker = v.sphere(id + '-point', { position: point(mean), radius: 0.034, fill: color });
    const ray = v.line3D(id + '-ray', { stroke: { color, opacity: 0.65 }, strokeWidth: 0.014 });
    v.connect(ray, star, marker);
  }
  function readout(id, subscript, x, color) {
    return s.latex(id, {
      tex: '\\Delta t_{\\mathrm{' + subscript + '}}/T = \\animnum{elapsed}',
      numbers: { elapsed: 0 }, numberFormat: { decimals: 3, digits: 1 },
      position: [x, -2.66], fontSize: 0.30, fill: color
    });
  }
  waitTo(startTime);
  const periBegin = -Math.PI / 8, periEnd = Math.PI / 8;
  const apoBegin = 7 * Math.PI / 8, apoEnd = 9 * Math.PI / 8;
  periSector = v.mesh('periapsis-swept-area', { ...sectorGeometry(periBegin, periBegin), fill: Color.BLUE, opacity: 0.43, stroke: Color.NONE });
  boundary('peri-sector-start', periBegin, Color.BLUE);
  const periTime = readout('peri-elapsed-time', 'p', 3.0, Color.BLUE_B);
  let apoTime;

  // Constant increments of mean anomaly give constant increments of physical
  // time. The 50 ms chords approximate the exact solved orbit, not constant
  // speed in eccentric anomaly or a decorative eased ellipse traversal.
  const steps = 320;
  for (let i = 0; i < steps; i++) {
    if (i === 160) {
      apoSector = v.mesh('apoapsis-swept-area', { ...sectorGeometry(apoBegin, apoBegin), fill: Color.TEAL, opacity: 0.43, stroke: Color.NONE });
      boundary('apo-sector-start', apoBegin, Color.TEAL);
      apoTime = readout('apo-elapsed-time', 'a', -3.0, Color.TEAL_A);
    }
    const nextMean = meanStart + 2 * Math.PI * (i + 1) / steps;
    const actions = [planet.moveTo(point(nextMean))];
    if (i < 40) {
      actions.push(periSector.morphTo({ kind: 'mesh', ...sectorGeometry(periBegin, nextMean) }));
      actions.push(periTime.countTo({ elapsed: (i + 1) / steps }));
    }
    if (i >= 160 && i < 200) {
      actions.push(apoSector.morphTo({ kind: 'mesh', ...sectorGeometry(apoBegin, nextMean) }));
      actions.push(apoTime.countTo({ elapsed: (i + 1 - 160) / steps }));
    }
    play(actions, period / steps);
    if (i === 39) {
      boundary('peri-sector-end', periEnd, Color.BLUE);
      v.latex('peri-area-label', { tex: 'A_{\\mathrm p}', position: [3.35, 0.65, 0.08], fontSize: 0.32, fill: Color.BLUE_A, billboard: true });
    }
    if (i === 199) {
      boundary('apo-sector-end', apoEnd, Color.TEAL);
      v.latex('apo-area-label', { tex: 'A_{\\mathrm a}', position: [-2.65, 0, 0.08], fontSize: 0.32, fill: Color.TEAL_A, billboard: true });
      s.latex('equal-areas', { tex: 'A_{\\mathrm p}=A_{\\mathrm a}', position: [0, -2.66], fontSize: 0.37, fill: Color.WHITE });
    }
  }
  play(radius.fadeOut(), duration * 0.02);
  waitTo(duration);
});