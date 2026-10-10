const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-planetary\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const duration = __narration.durationSec;
  let cursor = 0;
  const waitTo = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playFor = (actions, dt) => { s.play(actions, { duration: dt, ease: 'linear' }); cursor += dt; };
  s.play(s.camera.to2D({ height: 10 }), { duration: 0 });

  // Idealized, standard 20-degree involute spur gears, in the XY plane.
  // Module is a common model unit, not a measured engineering dimension.
  const module = 0.09, ns = 24, np = 24, nr = ns + 2 * np;
  const rs = module * ns / 2, rp = module * np / 2;
  const orbitRadius = rs + rp;
  const pressure = 20 * Math.PI / 180;
  const tau = 2 * Math.PI;
  const inv = a => Math.tan(a) - a;
  const finish = color => ({
    fill: color, stroke: Color.NONE,
    texture: { pattern: 'noise', color, scale: [42, 42, 8], seed: 17, bumpStrength: 0.0005 },
    material: { metalness: 0.78, roughness: 0.48, specular: 0.35 }
  });
  function toothProfile(count, internal) {
    const pitch = module * count / 2;
    const base = pitch * Math.cos(pressure);
    const root = internal ? pitch + 1.25 * module : pitch - 1.25 * module;
    const tip = internal ? pitch - module : pitch + module;
    const step = tau / count;
    const backlashHalf = 0.025 * module / (2 * pitch);
    const half = r => Math.PI / (2 * count) - backlashHalf +
      (internal ? 1 : -1) * (inv(Math.acos(base / Math.max(base, r))) - inv(pressure));
    const flankStart = internal ? root : Math.max(base, root);
    const h0 = half(flankStart);
    const filletAngle = internal ? 0.0018 : 0.009;
    const result = [];
    const point = (r, a) => result.push([r * Math.cos(a), r * Math.sin(a), a]);
    for (let k = 0; k < count; k++) {
      const center = k * step;
      point(root, center - h0 - filletAngle);
      for (let j = 0; j <= 6; j++) {
        const r = flankStart + (tip - flankStart) * j / 6;
        point(r, center - half(r));
      }
      const ht = half(tip);
      for (let j = 1; j <= 3; j++) point(tip, center - ht + 2 * ht * j / 3);
      for (let j = 5; j >= 0; j--) {
        const r = flankStart + (tip - flankStart) * j / 6;
        point(r, center + half(r));
      }
      point(root, center + h0 + filletAngle);
      const a = center + h0 + filletAngle;
      const b = center + step - h0 - filletAngle;
      for (let j = 1; j <= 3; j++) point(root, a + (b - a) * j / 4);
    }
    return result;
  }
  const circleProfile = (r, n = 96) => Array.from({ length: n }, (_, i) => {
    const a = tau * i / n;
    return [r * Math.cos(a), r * Math.sin(a), a];
  });

  let carrier, sun, planetSpinners;
  s.view('gear-model', {
    rect: [0.03, 0.13, 0.94, 0.72], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.16, pitch: -0.32, distance: 20, height: 8.9, perspective: 0, target: [0, 0, 0] }
  }, v => {
    // Closed annular extrusions: four separate surface strips keep hard rims.
    function annularMesh(id, profile, circularRadius, internal, depth, z, color) {
      const n = profile.length, vertices = [], triangles = [];
      const inner = profile.map(p => internal ? [p[0], p[1]] : [circularRadius * Math.cos(p[2]), circularRadius * Math.sin(p[2])]);
      const outer = profile.map(p => internal ? [circularRadius * Math.cos(p[2]), circularRadius * Math.sin(p[2])] : [p[0], p[1]]);
      const bottom = z - depth / 2, top = z + depth / 2;
      const row = (pts, h) => { for (const p of pts) vertices.push([p[0], p[1], h]); };
      row(inner, top); row(outer, top);
      row(inner, bottom); row(outer, bottom);
      row(outer, bottom); row(outer, top);
      row(inner, bottom); row(inner, top);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        triangles.push([i, n + i, n + j], [i, n + j, j]);
        triangles.push([2*n+i, 3*n+j, 3*n+i], [2*n+i, 2*n+j, 3*n+j]);
        triangles.push([4*n+i, 4*n+j, 5*n+j], [4*n+i, 5*n+j, 5*n+i]);
        triangles.push([6*n+i, 7*n+i, 7*n+j], [6*n+i, 7*n+j, 6*n+j]);
      }
      return v.mesh(id, { vertices, triangles, shading: 'flat', ...finish(color) });
    }
    const annulus = (id, outer, inner, depth, z, color) => annularMesh(id, circleProfile(outer), inner, false, depth, z, color);
    const shaft = (id, radius, height, position, color) => v.cylinder(id, {
      radius, height, radialSegments: 48, rotation: [Math.PI / 2, 0, 0], position, ...finish(color)
    });
    function screw(id, x, y, z, radius, color) {
      const cap = shaft(id + '-cap', radius, 0.06, [x, y, z], color);
      const socket = v.mesh(id + '-socket', {
        vertices: [[x, y, z+0.031], ...Array.from({ length: 6 }, (_, i) => [x+radius*0.42*Math.cos(tau*i/6), y+radius*0.42*Math.sin(tau*i/6), z+0.031])],
        triangles: Array.from({ length: 6 }, (_, i) => [0, 1+i, 1+(i+1)%6]),
        fill: Color.GREY_E, stroke: Color.NONE, shading: 'unlit'
      });
      return [cap, socket];
    }
    function gear(id, count, color) {
      const body = annularMesh(id + '-teeth', toothProfile(count, false), 0.185, false, 0.36, 0, color);
      const hub = annulus(id + '-hub', 0.35, 0.185, 0.105, 0.2225, color);
      const groove1 = annulus(id + '-face-groove', 0.785, 0.774, 0.004, 0.183, color === Color.GOLD ? Color.GOLD_D : Color.BLUE_E);
      const groove2 = annulus(id + '-hub-groove', 0.47, 0.46, 0.004, 0.183, color === Color.GOLD ? Color.GOLD_D : Color.BLUE_E);
      const index = v.box(id + '-index', { width: 0.038, height: 0.19, depth: 0.007, position: [0, 0.66, 0.187], fill: Color.WHITE, stroke: Color.NONE });
      return [body, hub, groove1, groove2, index];
    }

    // The 72-tooth internal profile is a genuine open ring, not a disk overlay.
    const ringParts = [annularMesh('ring-teeth', toothProfile(nr, true), 3.72, true, 0.48, -0.035, Color.GREY_B)];
    ringParts.push(annulus('ring-machined-rim', 3.70, 3.57, 0.025, 0.2175, Color.GREY_C));
    for (let i = 0; i < 6; i++) {
      const a = tau * (i + 0.5) / 6;
      ringParts.push(...screw('ring-fastener-' + i, 3.51*Math.cos(a), 3.51*Math.sin(a), 0.226, 0.072, Color.GREY_A));
    }
    // Small fixed mounting ears make the stationary housing mechanically legible.
    for (let i = 0; i < 3; i++) {
      const a = tau*i/3 + Math.PI/2;
      const x = 3.75*Math.cos(a), y = 3.75*Math.sin(a);
      ringParts.push(v.box('housing-ear-' + i, { width: 0.40, height: 0.32, depth: 0.32, position: [x, y, -0.04], rotation: [0, 0, a-Math.PI/2], ...finish(Color.GREY_C) }));
      ringParts.push(...screw('housing-bolt-' + i, x, y, 0.14, 0.095, Color.GREY_A));
    }
    v.group('fixed-ring', ringParts);

    const sunParts = gear('sun', ns, Color.GOLD);
    sunParts.push(shaft('sun-input-shaft', 0.15, 1.18, [0, 0, 0.18], Color.GOLD));
    sunParts.push(...screw('sun-input-cap', 0, 0, 0.78, 0.18, Color.GOLD));
    sun = v.group('sun-rotor', sunParts);

    const moving = [];
    planetSpinners = [];
    for (let i = 0; i < 3; i++) {
      const a = tau*i/3;
      const x = orbitRadius*Math.cos(a), y = orbitRadius*Math.sin(a);
      // Initial half-tooth shift satisfies both sun/planet and planet/ring meshes.
      const spinner = v.group('planet-' + i + '-rotor', gear('planet-' + i, np, Color.BLUE), {
        position: [x, y, 0], rotation: [0, 0, a + Math.PI/np]
      });
      planetSpinners.push(spinner);
      moving.push(spinner);
      moving.push(shaft('planet-' + i + '-axle', 0.166, 0.90, [x, y, 0.10], Color.GREY_A));
      const armLength = orbitRadius - 0.32;
      moving.push(v.box('carrier-arm-' + i, {
        width: armLength, height: 0.17, depth: 0.13,
        position: [(0.32+armLength/2)*Math.cos(a), (0.32+armLength/2)*Math.sin(a), 0.49],
        rotation: [0, 0, a], ...finish(Color.TEAL_D)
      }));
      const bearing = annulus('carrier-bearing-' + i, 0.25, 0.17, 0.13, 0.49, Color.TEAL);
      s.play(bearing.moveTo([x, y, 0]), { duration: 0 });
      moving.push(bearing);
      moving.push(...screw('carrier-pin-' + i, x, y, 0.594, 0.16, Color.GREY_A));
    }
    moving.push(annulus('carrier-hub', 0.43, 0.215, 0.15, 0.50, Color.TEAL));
    carrier = v.group('carrier-assembly', moving);
  });

  // Upright, quiet annotations remain outside the orbitable model's swept area.
  s.text('ring-label', { text: 'Fixed ring 72T', position: [0, 3.86], fontSize: 0.29, fill: Color.GREY_A });
  s.text('sun-label', { text: 'Sun 24T', position: [-2.65, -3.50], fontSize: 0.29, fill: Color.GOLD });
  s.text('planet-label', { text: '3 planets 24T', position: [0, -3.50], fontSize: 0.29, fill: Color.BLUE });
  s.text('carrier-label', { text: 'Carrier', position: [2.65, -3.50], fontSize: 0.29, fill: Color.TEAL });
  s.text('model-note', { text: 'Idealized involute geometry', position: [0, -4.02], fontSize: 0.21, fill: Color.GREY_B });

  waitTo(duration * 0.10);
  // Willis constraint with fixed ring:
  // (ns + nr) * wc = ns * ws; (wp - wc) = -ns/np * (ws - wc).
  // The carrier owns all planet centers and pins; only each rotor spins locally.
  const carrierAngle = Math.PI;
  const sunAngle = (ns + nr) / ns * carrierAngle;
  const relativePlanetAngle = -ns / np * (sunAngle - carrierAngle);
  playFor([
    carrier.rotateTo([0, 0, carrierAngle]),
    sun.rotateTo([0, 0, sunAngle]),
    ...planetSpinners.map((p, i) => p.rotateTo([0, 0, tau*i/3 + Math.PI/np + relativePlanetAngle]))
  ], duration * 0.80);
  waitTo(duration);
});