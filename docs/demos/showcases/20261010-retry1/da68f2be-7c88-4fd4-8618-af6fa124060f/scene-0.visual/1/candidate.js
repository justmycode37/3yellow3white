const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-lipid\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const hold = duration => { s.wait(duration); cursor += duration; };
  const play = (actions, duration, ease = 'smooth') => {
    s.play(actions, { duration, ease }); cursor += duration;
  };
  // Coordinates: X spans the membrane, Y is its normal, Z is depth.
  // This is an idealized molecular-scale construction, not atom coordinates.
  let ions = [];
  s.view('membrane-view', {
    rect: [0, 0, 1, 1], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.20, pitch: 0.28, height: 10.4, distance: 24, perspective: 0 }
  }, v => {
    const membraneParts = [];
    const headY = 1.36;
    for (let ix = -5; ix <= 5; ix++) {
      for (let iz = -3; iz <= 3; iz++) {
        const x = ix * 0.65;
        const z = iz * 0.60;
        // A cylindrical protein footprint plus a front inspection cutaway.
        if (Math.hypot(x, z) < 1.48 || (z >= 0 && Math.abs(x) < 1.5)) continue;
        for (const side of [-1, 1]) {
          const id = `lipid-${ix + 5}-${iz + 3}-${side > 0 ? 'outer' : 'inner'}`;
          const parts = [];
          parts.push(v.sphere(`${id}-head`, {
            position: [x, side * headY, z], radius: 0.245,
            fill: Color.BLUE, stroke: Color.NONE,
            material: { roughness: 0.72, specular: 0.18 }
          }));
          for (let tail = 0; tail < 2; tail++) {
            const points = [];
            for (let j = 0; j <= 7; j++) {
              const f = j / 7;
              const kink = tail === 1 && j > 4 ? (j - 4) * 0.028 : 0;
              points.push([
                x + (tail === 0 ? -0.115 : 0.115) + (j % 2 ? 0.035 : -0.035) + kink,
                side * (1.23 - 1.10 * f),
                z + (tail === 0 ? -0.025 : 0.025)
              ]);
            }
            parts.push(v.tube(`${id}-tail-${tail}`, {
              points, radius: 0.064, radialSegments: 6,
              fill: Color.GREY_B, stroke: Color.NONE,
              material: { roughness: 0.9, specular: 0.1 }
            }));
          }
          membraneParts.push(v.group(id, parts));
        }
      }
    }
    v.group('bilayer', membraneParts);

    // Thick, fluted protein wall with a continuous aqueous lumen.
    // Remove only the observer-facing sector; cap its exposed section faces.
    const a0 = 1.12, a1 = 2 * Math.PI - 0.72;
    const sectors = 7;
    const proteinParts = [];
    const innerRadius = y => 0.49 + 0.20 * Math.pow(Math.abs(y) / 1.76, 3);
    const outerRadius = (a, y) => 1.08 + 0.10 * Math.cos(6 * a) + 0.09 * Math.cos(y * 1.6) + 0.035 * Math.sin(a * 3 + y);
    for (let k = 0; k < sectors; k++) {
      const start = a0 + (a1 - a0) * k / sectors;
      const finish = a0 + (a1 - a0) * (k + 1) / sectors;
      const na = 8, ny = 24;
      const vertices = [], triangles = [];
      for (let wall = 0; wall < 2; wall++) {
        for (let j = 0; j <= ny; j++) {
          const y = -1.76 + 3.52 * j / ny;
          for (let i = 0; i <= na; i++) {
            const a = start + (finish - start) * i / na;
            const r = wall === 0 ? outerRadius(a, y) : innerRadius(y);
            vertices.push([r * Math.sin(a), y, r * Math.cos(a)]);
          }
        }
      }
      const layer = (na + 1) * (ny + 1);
      const index = (wall, j, i) => wall * layer + j * (na + 1) + i;
      const quad = (a, b, c, d) => { triangles.push([a, b, c], [a, c, d]); };
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < na; i++) {
          quad(index(0,j,i), index(0,j,i+1), index(0,j+1,i+1), index(0,j+1,i));
          quad(index(1,j,i), index(1,j+1,i), index(1,j+1,i+1), index(1,j,i+1));
        }
      }
      for (let i = 0; i < na; i++) {
        quad(index(0,ny,i), index(0,ny,i+1), index(1,ny,i+1), index(1,ny,i));
        quad(index(0,0,i), index(1,0,i), index(1,0,i+1), index(0,0,i+1));
      }
      for (let j = 0; j < ny; j++) {
        quad(index(0,j,0), index(0,j+1,0), index(1,j+1,0), index(1,j,0));
        quad(index(0,j,na), index(1,j,na), index(1,j+1,na), index(0,j+1,na));
      }
      proteinParts.push(v.mesh(`channel-wall-${k}`, {
        vertices, triangles, shading: 'smooth', fill: k % 2 ? Color.GOLD_D : Color.GOLD,
        stroke: Color.NONE, material: { roughness: 0.72, specular: 0.18 }
      }));
    }
    v.group('channel-protein', proteinParts);

    // Local labels stay upright when inspecting the spatial model.
    v.text('heads-label', {
      text: 'Hydrophilic heads', position: [-4.15, 2.26, 0.95],
      fontSize: 0.29, fill: Color.BLUE_A, billboard: true
    });
    v.line3D('heads-leader', {
      points: [[-3.70, 1.97, 0.95], [-3.25, 1.55, 1.20]],
      stroke: Color.BLUE_A, strokeWidth: 0.016
    });
    v.text('tails-label', {
      text: 'Hydrophobic tails', position: [-5.08, -0.42, 1.55],
      fontSize: 0.29, fill: Color.WHITE, billboard: true
    });
    v.line3D('tails-leader', {
      points: [[-3.78, -0.42, 1.55], [-3.19, 0.50, 1.8]],
      stroke: Color.GREY_B, strokeWidth: 0.016
    });
    v.text('pore-label', {
      text: 'Channel pore', position: [2.35, 2.48, 0.2],
      fontSize: 0.32, fill: Color.GOLD_A, billboard: true
    });
    v.line3D('pore-leader', {
      points: [[1.40, 2.24, 0.2], [0.50, 1.87, 0.2]],
      stroke: Color.GOLD_A, strokeWidth: 0.016
    });
    for (let i = 0; i < 3; i++) {
      const ion = v.sphere(`ion-${i}`, {
        radius: 0.18, position: [(i - 1) * 0.8, 2.85, 0],
        fill: Color.TEAL_A, stroke: Color.NONE,
        material: { roughness: 0.48, specular: 0.22 }
      });
      const charge = v.text(`ion-charge-${i}`, {
        text: '+', fontSize: 0.25, fill: Color.WHITE, billboard: true,
        billboardOffset: [0, 0, 0.19]
      });
      v.attach(charge, ion, { offset: [0, 0, 0] });
      ions.push(ion);
    }
    v.text('ions-label', {
      text: 'Ions', position: [-0.2, 3.53, 0], fontSize: 0.30,
      fill: Color.TEAL_A, billboard: true
    });
  });
  // Screen annotation is deliberately outside the orbiting model.
  s.text('schematic-note', {
    text: 'Schematic cutaway - not to scale', space: 'screen',
    position: [0, 0], viewportOffset: [0, -0.35],
    fontSize: 19, fill: Color.GREY_A
  });

  hold(D * 0.12);
  for (let i = 0; i < ions.length; i++) {
    // Dock above the entrance; all transmembrane travel stays on the lumen axis.
    play(ions[i].moveTo([0, 2.15, 0]), D * 0.045);
    play(ions[i].moveTo([0, -2.15, 0]), D * 0.16, 'linear');
    // Spread only after completely clearing the lower membrane surface.
    play(ions[i].moveTo([(i - 1) * 0.8, -2.85, 0]), D * 0.04);
  }
  hold(D - cursor);
});