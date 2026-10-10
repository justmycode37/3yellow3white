const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-planetary\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const T = __narration.durationSec;
  let cursor = 0;
  function play(actions, duration, ease = 'linear') {
    s.play(actions, { duration, ease });
    cursor += duration;
  }
  function until(time) {
    if (time > cursor) s.wait(time - cursor);
    cursor = time;
  }
  play(s.camera.to2D({ height: 10 }), 0);

  // Idealized, generated involute geometry, in XY; every shaft is parallel to Z.
  // Common module and pressure angle. Nr = Ns + 2 Np; (Nr + Ns)/3 is integral.
  const Ns = 24, Np = 18, Nr = 60, module = 0.1;
  const rs = module * Ns / 2, rp = module * Np / 2;
  const orbitRadius = rs + rp;
  const pressure = 20 * Math.PI / 180;
  const tau = 2 * Math.PI;
  const carrierTurn = tau / 3;
  const sunTurn = carrierTurn * (Ns + Nr) / Ns;
  const planetRelativeTurn = -carrierTurn * Nr / Np;
  const gold = Color.GOLD_D, silver = Color.GREY_B, blue = Color.BLUE_D;
  const finish = color => ({
    fill: color, stroke: Color.NONE,
    texture: { pattern: 'stripes', color, scale: [65, 65, 65], offset: [0.23, 0, 0], bumpStrength: 0.0006 },
    material: { metalness: 0.75, roughness: 0.43, specular: 0.45 }
  });
  let assembly, sun, carrier;
  const planets = [], counts = [];

  s.view('mechanism-view', {
    rect: [0.04, 0.10, 0.92, 0.76],
    orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.20, pitch: 0.42, distance: 20, height: 8.9, target: [0, 0, 0] }
  }, v => {
    // A bevelled annular extrusion. Each sample gives [angle, inner radius, outer radius].
    function annulus(id, samples, thickness, z, color, bevel = 0.012) {
      const vertices = [], triangles = [], n = samples.length;
      const levels = [-thickness / 2, -thickness / 2 + bevel, thickness / 2 - bevel, thickness / 2];
      for (let k = 0; k < 4; k++) {
        const b = k === 0 || k === 3 ? bevel : 0;
        for (const [a, inner, outer] of samples) {
          vertices.push([(inner + b) * Math.cos(a), (inner + b) * Math.sin(a), z + levels[k]]);
          vertices.push([(outer - b) * Math.cos(a), (outer - b) * Math.sin(a), z + levels[k]]);
        }
      }
      const at = (k, j, side) => 2 * (k * n + (j % n)) + side;
      for (let i = 0; i < n; i++) {
        const j = i + 1;
        triangles.push([at(3,i,0), at(3,i,1), at(3,j,1)], [at(3,i,0), at(3,j,1), at(3,j,0)]);
        triangles.push([at(0,i,0), at(0,j,1), at(0,i,1)], [at(0,i,0), at(0,j,0), at(0,j,1)]);
        for (let k = 0; k < 3; k++) {
          triangles.push([at(k,i,1), at(k,j,1), at(k+1,j,1)], [at(k,i,1), at(k+1,j,1), at(k+1,i,1)]);
          triangles.push([at(k,i,0), at(k+1,j,0), at(k,j,0)], [at(k,i,0), at(k+1,i,0), at(k+1,j,0)]);
        }
      }
      return v.mesh(id, { vertices, triangles, shading: 'flat', ...finish(color) });
    }
    function roundBand(id, inner, outer, thickness, z, color, segments = 96, bevel = 0.01) {
      return annulus(id, Array.from({length: segments}, (_, i) => [tau * i / segments, inner, outer]), thickness, z, color, bevel);
    }
    function axialCylinder(id, radius, height, position, color, segments = 40) {
      return v.cylinder(id, { radius, height, radialSegments: segments, position, rotation: [Math.PI / 2, 0, 0], ...finish(color) });
    }
    function toothProfile(teeth, internal) {
      const r = module * teeth / 2;
      const base = r * Math.cos(pressure);
      const root = r + (internal ? 1.25 : -1.25) * module;
      const tip = r + (internal ? -1 : 1) * module;
      const inv = a => Math.tan(a) - a;
      // Small manufacturing clearance on both wheels; involute working flanks.
      const half = Math.PI / (2 * teeth) - (0.035 * module) / (2 * r);
      const width = radius => {
        const a = Math.acos(Math.min(1, base / radius));
        return half + (internal ? 1 : -1) * (inv(a) - inv(pressure));
      };
      const low = internal ? root : Math.max(root, base);
      const result = [];
      const add = (angle, radius) => result.push(internal ? [angle, radius, 3.55] : [angle, teeth === Ns ? 0.88 : 0.58, radius]);
      for (let t = 0; t < teeth; t++) {
        const center = tau * t / teeth;
        add(center - Math.PI / teeth, root);
        if (!internal && root < base) add(center - width(low), root);
        for (let j = 0; j <= 4; j++) {
          const radius = low + (tip - low) * j / 4;
          add(center - width(radius), radius);
        }
        add(center, tip);
        for (let j = 4; j >= 0; j--) {
          const radius = low + (tip - low) * j / 4;
          add(center + width(radius), radius);
        }
        if (!internal && root < base) add(center + width(low), root);
      }
      return result;
    }
    function wheel(id, teeth, color) {
      const isSun = teeth === Ns;
      const hub = isSun ? 0.39 : 0.29;
      const innerRim = isSun ? 0.88 : 0.58;
      const bore = isSun ? 0.145 : 0.135;
      const parts = [
        annulus(id + '-teeth', toothProfile(teeth, false), 0.36, 0, color),
        roundBand(id + '-hub', bore, hub, 0.44, 0, color, 64)
      ];
      for (let k = 0; k < 6; k++) {
        const a = tau * k / 6;
        const center = (hub + innerRim) / 2;
        parts.push(v.box(id + '-spoke-' + k, {
          width: innerRim - hub + 0.10, height: isSun ? 0.17 : 0.14, depth: 0.18,
          position: [center * Math.cos(a), center * Math.sin(a), 0], rotation: a,
          ...finish(color)
        }));
      }
      parts.push(roundBand(id + '-hub-face', bore, hub - 0.035, 0.025, 0.235, color, 64, 0.004));
      return parts;
    }

    const fixed = [];
    fixed.push(annulus('ring-60-teeth', toothProfile(Nr, true), 0.46, 0, silver));
    fixed.push(roundBand('ring-rear-flange', 3.16, 3.65, 0.12, -0.27, Color.GREY_C));
    fixed.push(roundBand('ring-machined-face', 3.21, 3.49, 0.025, 0.244, Color.GREY_C, 192, 0.004));
    for (let i = 0; i < 8; i++) {
      const a = tau * (i + 0.5) / 8;
      const p = [3.36 * Math.cos(a), 3.36 * Math.sin(a), 0.285];
      fixed.push(axialCylinder('ring-bolt-' + i, 0.082, 0.07, p, Color.GREY_A, 6));
      fixed.push(v.line3D('ring-bolt-slot-' + i, {
        points: [[p[0] - 0.044, p[1], 0.328], [p[0] + 0.044, p[1], 0.328]],
        stroke: Color.GREY_D, strokeWidth: 0.013
      }));
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + tau * i / 4;
      const p = [3.55 * Math.cos(a), 3.55 * Math.sin(a), -0.11];
      fixed.push(v.box('fixed-mount-' + i, { width: 0.46, height: 0.43, depth: 0.34, position: p, rotation: a, ...finish(Color.GREY_C) }));
      fixed.push(axialCylinder('mount-bolt-' + i, 0.095, 0.05, [3.66 * Math.cos(a), 3.66 * Math.sin(a), 0.085], Color.GREY_A, 6));
    }
    const housing = v.group('fixed-ring-housing', fixed);

    const sunParts = wheel('sun-24', Ns, gold);
    sunParts.push(axialCylinder('sun-input-shaft', 0.14, 1.10, [0,0,0.12], Color.GREY_B));
    sunParts.push(v.box('sun-shaft-key', { width: 0.055, height: 0.075, depth: 0.24, position: [0.135,0,0.49], ...finish(gold) }));
    // One small index mark makes input rotation easy to follow.
    sunParts.push(v.box('sun-index', { width: 0.12, height: 0.045, depth: 0.012, position: [0.99,0,0.191], ...finish(Color.GOLD_A) }));
    sun = v.group('sun-input', sunParts);

    const moving = [];
    moving.push(roundBand('carrier-rear-hub', 0.18, 0.49, 0.18, -0.46, blue));
    // The open front hoop leaves both sun/planet and planet/ring contacts exposed.
    moving.push(roundBand('carrier-front-hoop', orbitRadius - 0.065, orbitRadius + 0.065, 0.105, 0.47, blue, 192));
    for (let i = 0; i < 3; i++) {
      const theta = tau * i / 3;
      const x = orbitRadius * Math.cos(theta), y = orbitRadius * Math.sin(theta);
      moving.push(v.box('carrier-rear-arm-' + i, {
        width: orbitRadius - 0.20, height: 0.27, depth: 0.16,
        position: [(orbitRadius + 0.20) / 2 * Math.cos(theta), (orbitRadius + 0.20) / 2 * Math.sin(theta), -0.46],
        rotation: theta, ...finish(blue)
      }));
      moving.push(axialCylinder('carrier-rear-boss-' + i, 0.24, 0.18, [x,y,-0.46], blue));
      moving.push(axialCylinder('planet-axle-' + i, 0.125, 1.01, [x,y,0.005], Color.GREY_A));
      moving.push(axialCylinder('carrier-front-boss-' + i, 0.205, 0.12, [x,y,0.48], blue));
      const bearing = roundBand('planet-bearing-' + i, 0.135, 0.24, 0.035, 0.277, Color.GREY_A, 48, 0.004);
      const parts = wheel('planet-' + i + '-18', Np, silver);
      parts.push(bearing);
      const planet = v.group('planet-spin-' + i, parts, { position: [x,y,0], rotation: theta + Math.PI / Np });
      planets.push({ handle: planet, phase: theta + Math.PI / Np });
      moving.push(planet);
    }
    carrier = v.group('carrier-output', moving);
    assembly = v.group('planetary-assembly', [housing, sun, carrier]);

    const sunNumber = v.text('sun-tooth-count', { text: '24', fontSize: 0.21, fill: Color.WHITE, billboard: true, position: [0,0,0.73] });
    v.attach(sunNumber, sun, { offset: [0,0,0.73] });
    counts.push(sunNumber);
    for (let i = 0; i < planets.length; i++) {
      const number = v.text('planet-tooth-count-' + i, { text: '18', fontSize: 0.20, fill: Color.WHITE, billboard: true });
      v.attach(number, planets[i].handle, { offset: [0,0,0.59] });
      counts.push(number);
    }
  });

  const ringLabel = s.text('fixed-ring-label', { text: 'Ring 60 · fixed', fontSize: 0.30, position: [0,3.60], fill: Color.GREY_A });
  const inputLabel = s.text('sun-input-label', { text: 'Sun input', fontSize: 0.27, position: [-2.60,-3.35], fill: Color.GOLD });
  const outputLabel = s.text('carrier-output-label', { text: 'Carrier output', fontSize: 0.27, position: [2.55,-3.35], fill: Color.BLUE });
  const note = s.text('geometry-note', { text: 'Idealized involute gears · 24 / 18 / 60 teeth', fontSize: 0.26, position: [0,3.16], fill: Color.GREY_B });
  const labels = [ringLabel, inputLabel, outputLabel, note, ...counts];
  play([assembly.fadeIn(), ...labels.map(h => h.fadeIn())], T * 0.05, 'smooth');
  until(T * 0.10);
  // Willis constraint: Ns(ws-wc)+Nr(wr-wc)=0, with wr=0.
  // All rotations share one linear clock. Nested carrier transforms preserve
  // exact orbit radii and 120-degree spacing throughout, not just at keyframes.
  play([
    sun.rotateTo(sunTurn),
    carrier.rotateTo(carrierTurn),
    ...planets.map(p => p.handle.rotateTo(p.phase + planetRelativeTurn))
  ], T * 0.75, 'linear');
  const ratio = s.latex('speed-ratio', { tex: String.raw`\omega_c=\frac{2}{7}\omega_s`, fontSize: 0.31, position: [0,-3.35], fill: Color.WHITE });
  play(ratio.fadeIn(), T * 0.03, 'smooth');
  until(T);
});