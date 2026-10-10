const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-terrain\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration, ease = 'smooth') => {
    s.play(actions, { duration, ease });
    cursor += duration;
  };
  const holdTo = time => {
    if (time > cursor) s.wait(time - cursor);
    cursor = time;
  };
  play(s.camera.to2D({ height: 10 }), 0);

  // World convention: Y is elevation; Z increases downstream.
  // This is a single continuous sampled terrain, partitioned only for materials.
  const zMin = -4.4, zMax = 4.4, halfWidth = 3.35;
  const center = z => 0.48 * Math.sin(0.81 * z) + 0.14 * Math.sin(1.61 * z);
  const bed = z => 0.9 - 0.19 * (z - zMin);
  const relief = (u, z) => {
    const bank = 1 - Math.exp(-u * u / 0.85);
    const ridge = Math.pow(0.5 + 0.5 * Math.sin(1.37 * z + 0.7 * u), 2);
    const detail = Math.pow(Math.sin(3.5 * z - 1.9 * u), 2);
    return 0.105 * u * u + bank * (0.38 + 0.88 * ridge + 0.13 * detail);
  };
  const point = (u, z) => [center(z) + u, bed(z) + relief(u, z), z];
  const normal = (u, z) => {
    const e = 0.001;
    const hu = (relief(u + e, z) - relief(u - e, z)) / (2 * e);
    const hz = -0.19 + (relief(u, z + e) - relief(u, z - e)) / (2 * e);
    const cx = (center(z + e) - center(z - e)) / (2 * e);
    const n = [-hu, 1, cx * hu - hz];
    const len = Math.hypot(...n);
    return n.map(x => x / len);
  };

  let marker, upstream, downstream, terrainGroup, model;
  const trace = [];
  const sampleCount = 144;
  const waterLift = 0.055;
  const flowPoint = z => [center(z), bed(z) + waterLift + 0.026, z];
  const route = Array.from({ length: sampleCount + 1 }, (_, i) =>
    flowPoint(zMin + (zMax - zMin) * i / sampleCount));

  s.view('valley-view', {
    rect: [0, 0.09, 1, 0.77], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.58, pitch: 0.75, target: [0, 0.6, 0], height: 10.5, distance: 21, perspective: 0.55 }
  }, v => {
    model = v;
    const nx = 80, nz = 112;
    const vertices = [], normals = [], triangles = [];
    for (let j = 0; j <= nz; j++) {
      const z = zMin + (zMax - zMin) * j / nz;
      for (let i = 0; i <= nx; i++) {
        const u = -halfWidth + 2 * halfWidth * i / nx;
        vertices.push(point(u, z));
        normals.push(normal(u, z));
      }
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        triangles.push([a, c, b], [b, c, d]);
      }
    }
    // Shared vertex positions and shared analytical normals eliminate seams.
    // Elevation bands distinguish low vegetation from exposed upper rock.
    const bands = [
      { top: 0.25, fill: Color.GREEN_E, secondary: Color.GREEN_D, bump: 0.002 },
      { top: 1.25, fill: Color.GREEN_D, secondary: Color.GREEN_E, bump: 0.003 },
      { top: 2.1, fill: Color.GREY_D, secondary: Color.GREY_C, bump: 0.006 },
      { top: Infinity, fill: Color.GREY_B, secondary: Color.GREY_C, bump: 0.006 }
    ];
    const batches = bands.map(() => ({ vertices: [], normals: [], triangles: [], indices: new Map() }));
    for (const tri of triangles) {
      const y = tri.reduce((sum, i) => sum + vertices[i][1], 0) / 3;
      const k = bands.findIndex(b => y <= b.top);
      const batch = batches[k];
      batch.triangles.push(tri.map(i => {
        if (!batch.indices.has(i)) {
          batch.indices.set(i, batch.vertices.length);
          batch.vertices.push(vertices[i]);
          batch.normals.push(normals[i]);
        }
        return batch.indices.get(i);
      }));
    }
    const parts = batches.map((batch, k) => v.mesh('terrain-elevation-' + k, {
      vertices: batch.vertices, normals: batch.normals, triangles: batch.triangles,
      shading: 'smooth', fill: bands[k].fill, stroke: Color.NONE,
      texture: { pattern: 'noise', color: bands[k].secondary,
        scale: [5.5, 4, 5.5], seed: 41, bumpStrength: bands[k].bump },
      material: { roughness: 0.94, specular: 0.12 }
    }));

    // Solve each shoreline against the SAME terrain function.
    // The channel bed and water both descend monotonically in Z.
    const shore = (z, sign) => {
      let lo = 0, hi = 1;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        if (relief(sign * mid, z) < waterLift) lo = mid;
        else hi = mid;
      }
      return sign * (lo + hi) / 2;
    };
    const waterVertices = [], waterTriangles = [];
    const waterSamples = 224;
    for (let j = 0; j <= waterSamples; j++) {
      const z = zMin + (zMax - zMin) * j / waterSamples;
      for (const sign of [-1, 1]) {
        waterVertices.push([center(z) + shore(z, sign), bed(z) + waterLift, z]);
      }
      if (j < waterSamples) {
        const a = 2 * j;
        waterTriangles.push([a, a + 2, a + 1], [a + 1, a + 2, a + 3]);
      }
    }
    const water = v.mesh('connected-river', {
      vertices: waterVertices, triangles: waterTriangles,
      shading: 'smooth', fill: Color.BLUE_D, stroke: Color.NONE,
      texture: { pattern: 'noise', color: Color.BLUE_C, scale: [6, 1, 9], seed: 8, bumpStrength: 0.001 },
      material: { roughness: 0.28, specular: 0.48 }
    });
    parts.push(water);
    terrainGroup = v.group('continuous-valley', parts, { isolated: true });

    const start = v.sphere('upstream-anchor', { position: route[0], radius: 0.055, fill: Color.WHITE });
    const finish = v.sphere('downstream-anchor', { position: route[sampleCount], radius: 0.055, fill: Color.WHITE });
    upstream = v.text('upstream-label', {
      text: 'Upstream', fontSize: 0.25, fill: Color.WHITE, billboard: true,
      billboardOffset: [0, 0.34, 0.16]
    });
    downstream = v.text('downstream-label', {
      text: 'Downstream', fontSize: 0.25, fill: Color.WHITE, billboard: true,
      billboardOffset: [0, -0.34, 0.16]
    });
    v.attach(upstream, start);
    v.attach(downstream, finish);
    marker = v.sphere('flow-front', {
      position: route[0], radius: 0.078, fill: Color.YELLOW,
      material: { roughness: 0.6, specular: 0.1, emissive: Color.YELLOW, emissiveIntensity: 0.15 },
      opacity: 0
    });
    // Each short trajectory section is sampled from water elevation, never a
    // long chord between hills. The animated front shares these exact samples.
    for (let i = 0; i < sampleCount; i++) {
      trace.push(v.line3D('downhill-trace-' + i, {
        points: [route[i], route[i + 1]], stroke: Color.YELLOW,
        strokeWidth: 0.026, opacity: 0
      }));
    }
  });

  s.text('procedural-disclosure', {
    text: 'Procedural terrain and flow - not measured data',
    position: [0, -3.72], fontSize: 0.255, fill: Color.GREY_A
  });

  // No spoken cues exist in this silent packet. Phases scale directly from
  // its immutable duration: inspection, one downstream traversal, final hold.
  holdTo(D * 0.18);
  play(marker.fadeIn(), D * 0.02);
  const stepDuration = D * 0.60 / sampleCount;
  for (let i = 0; i < sampleCount; i++) {
    play([marker.moveTo(route[i + 1]), trace[i].fadeIn()], stepDuration, 'linear');
  }
  play(marker.fadeOut(), D * 0.025);
  holdTo(D);
});