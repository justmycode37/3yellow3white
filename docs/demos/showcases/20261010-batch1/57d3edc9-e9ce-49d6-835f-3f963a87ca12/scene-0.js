const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-convolution\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  const wait = duration => { s.wait(duration); cursor += duration; };
  play(s.camera.to2D({ height: 9.4 }), 0);
  // Analytic, idealized pulses; tau and t share the horizontal scale.
  const pulses = [{ a: -2.5, b: -1, h: 1 }, { a: 0.5, b: 2, h: 0.65 }];
  const topY = 1.55, productY = -0.65, outputY = -2.85;
  const vertical = 1.03, divisions = 24;
  const g = u => Math.max(0, 1 - Math.abs(u));
  const t0 = -3.6, t1 = 3.2;
  const axis = (id, y, variable) => {
    s.line(id + '-axis', { points: [[-4.85, y], [4.85, y]], stroke: Color.GREY_B, strokeWidth: 0.016 });
    for (const x of [-4, -2, 0, 2, 4]) {
      s.line(id + '-tick-' + x, { points: [[x, y - 0.055], [x, y + 0.055]], stroke: Color.GREY_B, strokeWidth: 0.014 });
      s.text(id + '-number-' + x, { text: String(x), position: [x, y - 0.22], fontSize: 0.21, fill: Color.GREY_A });
    }
    s.latex(id + '-variable', { tex: variable, position: [5.13, y], fontSize: 0.31 });
  };
  axis('input', topY, '\\tau');
  axis('product', productY, '\\tau');
  axis('output', outputY, 't');
  s.latex('signal-key', { tex: 'f(\\tau)', position: [-3.55, 3.22], fontSize: 0.4, fill: Color.BLUE });
  s.latex('kernel-key', { tex: 'g(t-\\tau)', position: [-0.55, 3.22], fontSize: 0.4, fill: Color.YELLOW });
  s.text('model-note', { text: 'idealized pulses', position: [3.15, 3.22], fontSize: 0.27, fill: Color.GREY_A });
  s.latex('product-key', { tex: 'f(\\tau)\\,g(t-\\tau)', position: [-3.1, 0.85], fontSize: 0.36, fill: Color.TEAL });
  s.latex('convolution-rule', { tex: '(f*g)(t)=\\int f(\\tau)g(t-\\tau)\\,d\\tau', position: [-1.55, -1.48], fontSize: 0.31 });
  const areaReadout = s.latex('area-readout', {
    tex: '\\text{area }A(t)\\approx\\animnum{area}', numbers: { area: 0 },
    numberFormat: { decimals: 3, digits: 1 }, position: [2.55, 0.85], fontSize: 0.34, fill: Color.TEAL
  });
  const timeReadout = s.latex('time-readout', {
    tex: 't=\\animnum{t}', numbers: { t: t0 }, numberFormat: { decimals: 2, digits: 1 },
    position: [3.6, -1.48], fontSize: 0.31, fill: Color.YELLOW
  });
  // Each fixed-correspondence mesh cell is a trapezoid under the product.
  // Integrate those same displayed trapezoids for every output sample.
  function productData(p, t, baseline) {
    const vertices = [], points = [[p.a, baseline]], triangles = [];
    let area = 0, previous = 0;
    const dx = (p.b - p.a) / divisions;
    for (let j = 0; j <= divisions; j++) {
      const x = p.a + j * dx, value = p.h * g(t - x);
      vertices.push([x, baseline, 0], [x, baseline + vertical * value, 0]);
      points.push([x, baseline + vertical * value]);
      if (j > 0) {
        area += (previous + value) * dx / 2;
        const k = 2 * (j - 1);
        triangles.push([k, k + 2, k + 1], [k + 1, k + 2, k + 3]);
      }
      previous = value;
    }
    points.push([p.b, baseline]);
    return { vertices, triangles, points, area };
  }
  const patches = pulses.map((p, index) => {
    const upper = productData(p, t0, topY), lower = productData(p, t0, productY);
    const overlap = s.mesh('overlap-' + index, { vertices: upper.vertices, triangles: upper.triangles, shading: 'unlit', fill: Color.TEAL, opacity: 0.3, stroke: Color.NONE });
    const area = s.mesh('product-area-' + index, { vertices: lower.vertices, triangles: lower.triangles, shading: 'unlit', fill: Color.TEAL, opacity: 0.45, stroke: Color.NONE });
    const outline = s.path('product-outline-' + index, { points: lower.points, stroke: Color.TEAL, strokeWidth: 0.037, fill: Color.NONE });
    return { p, overlap, area, outline };
  });
  const signalPoints = [[-4.8, topY]];
  for (const p of pulses) signalPoints.push([p.a, topY], [p.a, topY + vertical * p.h], [p.b, topY + vertical * p.h], [p.b, topY]);
  signalPoints.push([4.8, topY]);
  s.path('two-pulse-signal', { points: signalPoints, fill: Color.NONE, stroke: Color.BLUE, strokeWidth: 0.042 });
  s.text('unit-height', { text: '1', position: [-2.77, topY + vertical], fontSize: 0.22, fill: Color.BLUE });
  s.text('second-height', { text: '0.65', position: [2.4, topY + vertical * 0.65], fontSize: 0.22, fill: Color.BLUE });
  const kernel = s.path('triangular-kernel', { points: [[-1, 0], [0, vertical], [1, 0]], stroke: Color.YELLOW, strokeWidth: 0.041, fill: Color.NONE });
  const inputMarker = s.circle('kernel-center', { radius: 0.052, fill: Color.YELLOW, stroke: Color.NONE });
  const movingKernel = s.group('moving-kernel', [kernel, inputMarker], { position: [t0, topY] });
  const markerLabel = s.latex('kernel-center-label', { tex: 't', fontSize: 0.27, fill: Color.YELLOW });
  s.attach(markerLabel, inputMarker, { offset: [0, 0.19, 0] });
  const outputMarker = s.circle('integral-marker', { position: [t0, outputY], radius: 0.068, fill: Color.TEAL, stroke: Color.NONE });
  const correspondence = s.line('input-output-correspondence', { stroke: { color: Color.YELLOW, opacity: 0.23 }, strokeWidth: 0.015 });
  s.connect(correspondence, inputMarker, outputMarker);
  wait(D * 0.075);
  const steps = 85, stepDuration = D * 0.84 / steps;
  let lastPoint = [t0, outputY];
  for (let i = 1; i <= steps; i++) {
    const t = t0 + (t1 - t0) * i / steps;
    const actions = [movingKernel.moveTo([t, topY]), timeReadout.countTo({ t })];
    let integral = 0;
    for (const patch of patches) {
      const upper = productData(patch.p, t, topY), lower = productData(patch.p, t, productY);
      integral += lower.area;
      actions.push(
        patch.overlap.morphTo({ kind: 'mesh', vertices: upper.vertices, triangles: upper.triangles, shading: 'unlit' }),
        patch.area.morphTo({ kind: 'mesh', vertices: lower.vertices, triangles: lower.triangles, shading: 'unlit' }),
        patch.outline.morphTo({ kind: 'path', points: lower.points })
      );
    }
    const nextPoint = [t, outputY + vertical * integral];
    const trace = s.line('integral-trace-' + i, { points: [lastPoint, lastPoint], stroke: Color.TEAL, strokeWidth: 0.04 });
    actions.push(trace.morphTo({ kind: 'line', points: [lastPoint, nextPoint] }), outputMarker.moveTo(nextPoint), areaReadout.countTo({ area: integral }));
    play(actions, stepDuration);
    lastPoint = nextPoint;
  }
  wait(D - cursor);
});