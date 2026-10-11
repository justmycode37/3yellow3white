const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-fourier\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const duration = __narration.durationSec;
  let cursor = 0;
  const play = (actions, seconds, ease = 'linear') => {
    s.play(actions, { duration: seconds, ease });
    cursor += seconds;
  };
  const wait = seconds => { s.wait(seconds); cursor += seconds; };
  play(s.camera.to2D({ height: 10, target: [0, 0, 0] }), 0);

  // An authored, simple asymmetric radial outline, not measured data:
  // z(t) = r(t) exp(it). Each cosine supplies two complex coefficients.
  // r(t) stays positive, so the completed outline cannot self-intersect.
  const harmonics = [
    [2, 0.42, 0.3], [3, 0.34, -1.1], [4, 0.24, 0.8],
    [5, 0.18, -1.8], [6, 0.14, 0.4]
  ];
  const coefficients = [{ k: 1, radius: 1.65, phase: 0 }];
  for (const [m, amplitude, phase] of harmonics) {
    coefficients.push({ k: 1 + m, radius: amplitude / 2, phase });
    coefficients.push({ k: 1 - m, radius: amplitude / 2, phase: -phase });
  }
  const origin = [0, -0.1];
  const pointAt = angle => {
    let x = origin[0], y = origin[1];
    for (const c of coefficients) {
      x += c.radius * Math.cos(c.phase + c.k * angle);
      y += c.radius * Math.sin(c.phase + c.k * angle);
    }
    return [x, y];
  };

  const joints = [];
  const rings = [];
  let endpoint;
  function joint(i) {
    const c = coefficients[i];
    const previous = i ? coefficients[i - 1] : null;
    const center = s.circle('center-' + i, {
      radius: 0.014, fill: Color.WHITE, stroke: Color.NONE
    });
    const tip = s.circle('tip-' + i, {
      position: [c.radius, 0], radius: i === coefficients.length - 1 ? 0.055 : 0.018,
      fill: i === coefficients.length - 1 ? Color.YELLOW : Color.BLUE_A,
      stroke: Color.NONE
    });
    if (i === coefficients.length - 1) endpoint = tip;
    const ring = s.circle('epicycle-' + i, {
      radius: c.radius, fill: Color.NONE,
      stroke: { color: Color.WHITE, opacity: 0.22 }, strokeWidth: 0.012
    });
    rings.push(ring);
    const vector = s.arrow('vector-' + i, {
      points: [[0, 0], [c.radius, 0]],
      stroke: i === 0 ? Color.BLUE : Color.TEAL,
      strokeWidth: i === 0 ? 0.032 : 0.022
    });
    const children = [ring, vector, center, tip];
    if (i + 1 < coefficients.length) children.push(joint(i + 1));
    const g = s.group('joint-' + i, children, {
      position: previous ? [previous.radius, 0] : origin,
      rotation: c.phase - (previous ? previous.phase : 0)
    });
    joints[i] = g;
    s.connect(vector, center, tip, { endpoints: 'center' });
    return g;
  }
  const chain = joint(0);
  const equation = s.latex('fourier-sum', {
    tex: String.raw`z(t)=\sum_{k\in K}c_k e^{ikt}`,
    position: [0, 3.15], fontSize: 0.45, fill: Color.WHITE
  });
  const provenance = s.text('idealized-label', {
    text: '11 complex terms / idealized curve',
    position: [0, -3.5], fontSize: 0.26, fill: Color.GREY_B
  });
  play([chain.fadeIn(), equation.fadeIn(), provenance.fadeIn()], duration * 0.03, 'smooth');

  // Joint rotations, rather than endpoint tweens, preserve every vector length.
  // Each child rotates at the difference of adjacent Fourier frequencies.
  // Trace chords sample the identical coefficient sum at 480 uniform phases;
  // their subpixel deviation from the continuous endpoint is bounded by
  // sum(radius*k*k) * (2*pi/480)^2 / 8 in scene units.
  const samples = 480;
  const drawEnd = duration * 0.9;
  const drawStart = cursor;
  for (let j = 0; j < samples; j++) {
    const a0 = 2 * Math.PI * j / samples;
    const a1 = 2 * Math.PI * (j + 1) / samples;
    const p0 = pointAt(a0), p1 = pointAt(a1);
    const trace = s.line('trace-' + j, {
      points: [p0, p0], stroke: Color.YELLOW, strokeWidth: 0.035
    });
    const actions = coefficients.map((c, i) => {
      const previous = i ? coefficients[i - 1] : { phase: 0, k: 0 };
      return joints[i].rotateTo(c.phase - previous.phase + (c.k - previous.k) * a1);
    });
    actions.push(trace.morphTo({ kind: 'line', points: [p0, p1] }));
    const next = drawStart + (drawEnd - drawStart) * (j + 1) / samples;
    play(actions, next - cursor);
  }
  // Keep the entire closed trace and the exact final epicycle configuration.
  wait(duration - cursor);
});