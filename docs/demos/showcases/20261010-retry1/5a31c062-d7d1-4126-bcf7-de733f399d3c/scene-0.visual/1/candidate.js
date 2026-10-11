const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-terrain\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const T = __narration.durationSec;
  let cursor = 0;
  function play(actions, duration) { s.play(actions, { duration, ease: 'linear' }); cursor += duration; }
  function holdTo(time) { if (time > cursor) { s.wait(time - cursor); cursor = time; } }
  s.play(s.camera.to2D({ height: 8 }), { duration: 0 });
  // Y is elevation; positive Z is downstream. This is an idealized watershed.
  const z0 = -5.2, z1 = 5.2;
  function center(z) { return 0.74 * Math.sin(0.77 * z) + 0.22 * Math.sin(1.43 * z + 0.5); }
  function width(z) { return 0.17 + 0.075 * (z - z0) / (z1 - z0); }
  function bed(z) { return 0.9 - 0.255 * z; }
  function height(x, z) {
    const d = Math.abs(x - center(z)), w = width(z);
    const bank = Math.max(0, d - w);
    const shoulder = 1 - Math.exp(-1.05 * bank * bank);
    const ridgeA = Math.exp(-Math.pow((x + 2.65 + 0.38 * Math.sin(z * 0.83)) / 0.88, 2));
    const ridgeB = Math.exp(-Math.pow((x - 2.7 - 0.42 * Math.cos(z * 0.64)) / 1.05, 2));
    const lobes = 1.1 + 0.26 * Math.sin(1.63 * z + 0.5 * x) + 0.18 * Math.cos(2.54 * z - x);
    const detail = 0.075 * Math.sin(6.1 * x + 2.7 * z) * Math.cos(4.9 * z - x) + 0.035 * Math.sin(12.3 * x - 5.4 * z);
    return bed(z) + 0.12 * Math.pow(Math.min(d / w, 1), 2) + shoulder * (0.48 + (1.4 * ridgeA + 1.65 * ridgeB) * lobes + detail);
  }
  let v, land;
  s.view('valley-view', {
    rect: [0.035, 0.075, 0.93, 0.715], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: -0.2, pitch: 1.02, height: 12.5, distance: 23, target: [0, 1.3, 0], perspective: 0.35 }
  }, builder => {
    v = builder;
    const vertices = [], triangles = [];
    const nx = 64, nz = 88;
    for (let j = 0; j <= nz; j++) {
      const z = z0 + (z1 - z0) * j / nz;
      for (let i = 0; i <= nx; i++) {
        const x = -4.4 + 8.8 * i / nx;
        vertices.push([x, height(x, z), z]);
      }
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      triangles.push([a, c, b], [b, c, d]);
    }
    const terrain = v.mesh('continuous-terrain', {
      vertices, triangles, shading: 'smooth', fill: Color.GREEN_E, stroke: Color.NONE,
      texture: { pattern: 'noise', color: Color.GREEN_D, scale: [8, 5, 8], seed: 27, bumpStrength: 0.004 },
      material: { roughness: 0.98, specular: 0.08 }
    });
    // These elevation skins share the base mesh's triangles and clipped edges.
    function elevationSkin(id, threshold, above, fill, secondary) {
      const verts = [], faces = [], original = [], edges = new Map();
      const inside = vertices.map(p => above ? p[1] >= threshold : p[1] <= threshold);
      function index(i) {
        if (original[i] === undefined) {
          const p = vertices[i]; original[i] = verts.length;
          verts.push([p[0], p[1] + 0.025, p[2]]);
        }
        return original[i];
      }
      function crossing(i, j) {
        const lo = Math.min(i, j), hi = Math.max(i, j), key = lo * vertices.length + hi;
        if (edges.has(key)) return edges.get(key);
        const a = vertices[lo], b = vertices[hi], t = (threshold - a[1]) / (b[1] - a[1]);
        const k = verts.length;
        verts.push([a[0] + t * (b[0] - a[0]), threshold + 0.025, a[2] + t * (b[2] - a[2])]);
        edges.set(key, k); return k;
      }
      for (let ti = 0; ti < triangles.length; ti++) {
        const tri = triangles[ti];
        if (!inside[tri[0]] && !inside[tri[1]] && !inside[tri[2]]) continue;
        if (inside[tri[0]] && inside[tri[1]] && inside[tri[2]]) {
          faces.push([index(tri[0]), index(tri[1]), index(tri[2])]); continue;
        }
        const poly = [];
        for (let i = 0; i < 3; i++) {
          const a = tri[i], b = tri[(i + 1) % 3];
          if (inside[a]) poly.push(index(a));
          if (inside[a] !== inside[b]) poly.push(crossing(a, b));
        }
        for (let i = 1; i + 1 < poly.length; i++) faces.push([poly[0], poly[i], poly[i + 1]]);
      }
      return v.mesh(id, {
        vertices: verts, triangles: faces, shading: 'smooth', fill, stroke: Color.NONE,
        texture: { pattern: 'noise', color: secondary, scale: [7, 5, 7], seed: 41, bumpStrength: 0.006 },
        material: { roughness: 0.94, specular: 0.1 }
      });
    }
    const lowlands = elevationSkin('low-elevation-grass', 1.05, false, Color.GREEN_D, Color.GREEN_E);
    const rock = elevationSkin('high-elevation-rock', 2.65, true, Color.GREY_C, Color.GREY_D);
    const riverVertices = [], riverTriangles = [], n = 208;
    for (let j = 0; j <= n; j++) {
      const z = z0 + (z1 - z0) * j / n;
      for (const side of [-1, 1]) riverVertices.push([center(z) + side * width(z), height(center(z), z) + 0.124, z]);
    }
    for (let j = 0; j < n; j++) {
      const a = 2 * j;
      riverTriangles.push([a, a + 2, a + 1], [a + 1, a + 2, a + 3]);
    }
    const river = v.mesh('connected-river', {
      vertices: riverVertices, triangles: riverTriangles, shading: 'smooth', fill: Color.BLUE_D, stroke: Color.NONE,
      texture: { pattern: 'noise', color: Color.BLUE_C, scale: [10, 1, 3], seed: 8, bumpStrength: 0.001 },
      material: { roughness: 0.32, specular: 0.5 }
    });
    land = v.group('watershed', [terrain, lowlands, rock, river], { isolated: false });
  });
  s.rectangle('grass-key', { position: [-2.45, -2.55], width: 0.18, height: 0.12, fill: Color.GREEN_D, stroke: Color.NONE });
  s.text('grass-label', { text: 'Lowlands', position: [-1.65, -2.55], fontSize: 0.24, fill: Color.WHITE });
  s.rectangle('rock-key', { position: [0.05, -2.55], width: 0.18, height: 0.12, fill: Color.GREY_C, stroke: Color.NONE });
  s.text('rock-label', { text: 'Rocky high ground', position: [1.4, -2.55], fontSize: 0.24, fill: Color.WHITE });
  s.text('procedural-note', { text: 'Procedural terrain and flow; not measured data', position: [0, -2.9], fontSize: 0.245, fill: Color.GREY_B });
  play(land.fadeIn(), T * 0.05);
  holdTo(T * 0.15);
  function waterPoint(t) {
    const z = z0 + (z1 - z0) * t, x = center(z);
    return [x, height(x, z) + 0.15, z];
  }
  const marker = v.sphere('flow-front', {
    position: waterPoint(0), radius: 0.1, fill: Color.BLUE_A,
    material: { roughness: 0.5, emissive: Color.BLUE_A, emissiveIntensity: 0.4 }
  });
  // Dense short chords follow the sampled valley, not an endpoint shortcut through hills.
  const steps = 156;
  for (let i = 0; i < steps; i++) {
    const a = waterPoint(i / steps), b = waterPoint((i + 1) / steps);
    const trail = v.line3D('flow-trace-' + i, { points: [a, a], stroke: Color.BLUE_A, strokeWidth: 0.055 });
    play([marker.moveTo(b), trail.morphTo({ kind: 'line', points: [a, b] })], T * 0.65 / steps);
  }
  play(marker.fadeOut(), T * 0.025);
  holdTo(T);
});