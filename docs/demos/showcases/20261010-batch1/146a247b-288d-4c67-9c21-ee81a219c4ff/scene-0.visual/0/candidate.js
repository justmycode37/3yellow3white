const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-electromagnetic\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  function playTo(t, actions, ease = 'linear') {
    s.play(actions, { duration: t - cursor, ease });
    cursor = t;
  }
  function holdTo(t) { s.wait(t - cursor); cursor = t; }
  s.play(s.camera.to2D({ height: 8.4 }), { duration: 0 });
  const equation = s.latex('phase-law', {
    tex: String.raw`\frac{E_y}{E_0}=\frac{B_z}{B_0}=\cos(kx-\omega t)`,
    position: [0, 2.9], fontSize: 0.38, fill: Color.WHITE,
  });
  const note = s.text('model-note', {
    text: 'Idealized vacuum wave; field amplitudes normalized',
    position: [0, -2.85], fontSize: 0.25, fill: Color.GREY_B,
  });
  let v, model, electricCurve, magneticCurve;
  const electricTips = [], magneticTips = [];
  const halfLength = 4.8, amplitude = 1.3, wavelength = 4.8;
  const k = 2 * Math.PI / wavelength;
  const sampleCount = 17, curveCount = 65;
  function value(x, phase) { const a = amplitude * Math.cos(k * x - phase); return Math.abs(a) < 1e-12 ? 0 : a; }
  function curvePoints(phase, magnetic) {
    const points = [];
    for (let i = 0; i < curveCount; i++) {
      const x = -halfLength + 2 * halfLength * i / (curveCount - 1);
      const a = value(x, phase);
      points.push(magnetic ? [x, 0, a] : [x, a, 0]);
    }
    return points;
  }
  s.view('wave-space', {
    rect: [0, 0, 1, 1], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.40, pitch: 0.34, height: 8.4, distance: 22, perspective: 0 },
  }, builder => {
    v = builder;
    const parts = [];
    parts.push(v.line3D('propagation-axis', {
      points: [[-5.05, 0, 0], [5.05, 0, 0]], stroke: Color.GREY_B, strokeWidth: 0.015,
    }));
    for (let i = 0; i < sampleCount; i++) {
      const x = -halfLength + 2 * halfLength * i / (sampleCount - 1);
      const a = value(x, 0);
      const root = v.sphere('field-origin-' + i, { position: [x, 0, 0], radius: 0.024, fill: Color.GREY_B });
      const e = v.sphere('electric-tip-' + i, { position: [x, a, 0], radius: 0.001, opacity: 0, fill: Color.BLUE });
      const b = v.sphere('magnetic-tip-' + i, { position: [x, 0, a], radius: 0.001, opacity: 0, fill: Color.YELLOW });
      const ea = v.arrow3D('electric-vector-' + i, {
        points: [[x, 0, 0], [x, a, 0]], stroke: Color.BLUE, strokeWidth: 0.027,
      });
      const ba = v.arrow3D('magnetic-vector-' + i, {
        points: [[x, 0, 0], [x, 0, a]], stroke: Color.YELLOW, strokeWidth: 0.027,
      });
      // Signed tip motion passes through the fixed tail; connectors own arrow geometry.
      v.connect(ea, root, e, { endpoints: 'center' });
      v.connect(ba, root, b, { endpoints: 'center' });
      electricTips.push(e); magneticTips.push(b);
      parts.push(root, e, b, ea, ba);
    }
    electricCurve = v.path('electric-envelope', {
      points: curvePoints(0, false), stroke: Color.BLUE, strokeWidth: 0.035, strokeProfile: 'round', fill: Color.NONE,
    });
    magneticCurve = v.path('magnetic-envelope', {
      points: curvePoints(0, true), stroke: Color.YELLOW, strokeWidth: 0.035, strokeProfile: 'round', fill: Color.NONE,
    });
    parts.push(electricCurve, magneticCurve);
    parts.push(v.arrow3D('travel-direction', {
      points: [[-1.8, -2.0, 0], [2.3, -2.0, 0]], stroke: Color.WHITE, strokeWidth: 0.045,
    }));
    model = v.group('wave-model', parts);
    v.latex('electric-label', {
      tex: String.raw`\mathbf E\parallel\hat{\mathbf y}`,
      position: [-1.8, 1.8, 0], fontSize: 0.31, fill: Color.BLUE, billboard: true,
    });
    v.latex('magnetic-label', {
      tex: String.raw`\mathbf B\parallel\hat{\mathbf z}`,
      position: [1.5, 0, 1.95], fontSize: 0.31, fill: Color.YELLOW, billboard: true,
    });
    v.latex('direction-label', {
      tex: String.raw`\mathbf k\parallel\mathbf E\times\mathbf B`,
      position: [0, -2.48, 0], fontSize: 0.29, fill: Color.WHITE, billboard: true,
    });
  });
  playTo(D * 0.07, [model.fadeIn(), equation.fadeIn(), note.fadeIn()], 'smooth');
  holdTo(D * 0.10);
  // A transverse constant-phase plane follows the same crest for two wavelengths.
  const outline = v.path('crest-plane-outline', {
    points: [[0, -1.5, -1.5], [0, 1.5, -1.5], [0, 1.5, 1.5], [0, -1.5, 1.5]],
    closed: true, stroke: { color: Color.GREY_B, opacity: 0.35 }, strokeWidth: 0.014, strokeProfile: 'round', fill: Color.NONE,
  });
  const eCrest = v.sphere('electric-crest', { position: [0, amplitude, 0], radius: 0.065, fill: Color.BLUE_A });
  const bCrest = v.sphere('magnetic-crest', { position: [0, 0, amplitude], radius: 0.065, fill: Color.YELLOW_A });
  const front = v.group('constant-phase-plane', [outline, eCrest, bCrest], { position: [-halfLength, 0, 0] });
  // Piecewise sinusoidal sampling: common phase, common sign, perpendicular axes.
  const steps = 72;
  for (let j = 1; j <= steps; j++) {
    const u = j / steps;
    const phase = 4 * Math.PI * u;
    const actions = [];
    for (let i = 0; i < sampleCount; i++) {
      const x = -halfLength + 2 * halfLength * i / (sampleCount - 1);
      const a = value(x, phase);
      actions.push(electricTips[i].moveTo([x, a, 0]), magneticTips[i].moveTo([x, 0, a]));
    }
    actions.push(
      electricCurve.morphTo({ kind: 'path', points: curvePoints(phase, false), fill: Color.NONE, strokeProfile: 'round' }),
      magneticCurve.morphTo({ kind: 'path', points: curvePoints(phase, true), fill: Color.NONE, strokeProfile: 'round' }),
      front.moveTo([-halfLength + 2 * halfLength * u, 0, 0]),
    );
    playTo(D * (0.10 + 0.80 * u), actions);
  }
  s.text('inspection-note', { text: 'Phase held for inspection', position: [0, -3.3], fontSize: 0.23, fill: Color.GREY_B });
  holdTo(D);
});