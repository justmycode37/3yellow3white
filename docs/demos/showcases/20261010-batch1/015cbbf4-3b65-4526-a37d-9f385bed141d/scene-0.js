const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-salt-crystal\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  s.play(s.camera.to2D({ height: 8 }), { duration: 0 });

  const sodiumKey = s.latex('sodium-key', { tex: '\\mathrm{Na}^{+}', position: [-1.15, 2.85], fontSize: 0.38, fill: Color.BLUE });
  const chlorideKey = s.latex('chloride-key', { tex: '\\mathrm{Cl}^{-}', position: [1.15, 2.85], fontSize: 0.38, fill: Color.GREEN });
  const radiusNote = s.text('radius-note', { text: 'Idealized sites; display radii reduced for visibility', position: [0, -2.95], fontSize: 0.25, fill: Color.GREY_A });

  let v, camera;
  const ions = new Map();
  const exterior = [], cellIons = [], allIons = [];
  const key = (x, y, z) => `${x},${y},${z}`;
  s.view('crystal-view', {
    rect: [0.06, 0.24, 0.88, 0.55], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.57, pitch: 0.34, height: 6.7, distance: 18, perspective: 0.45, target: [0, 0, 0] }
  }, builder => {
    v = builder;
    camera = v.camera;
    // Simple-cubic sites of spacing a/2, partitioned by parity into two FCC sublattices.
    // The central Na+ and the six face-centred Cl- lie in the conventional cell [-1,1]^3.
    // Radii are deliberately schematic, not ionic-radius measurements.
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
      const sodium = (x + y + z) % 2 === 0;
      const atom = v.sphere(`ion-${x + 2}-${y + 2}-${z + 2}`, {
        position: [x, y, z], radius: sodium ? 0.23 : 0.36,
        fill: sodium ? Color.BLUE : Color.GREEN,
        material: { roughness: 0.8, specular: 0.15 }
      });
      ions.set(key(x, y, z), atom);
      allIons.push(atom);
      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === 2) exterior.push(atom);
      else cellIons.push(atom);
    }
  });
  playTo(D * 0.07, [...allIons.map(a => a.fadeIn()), sodiumKey.fadeIn(), chlorideKey.fadeIn(), radiusNote.fadeIn()]);
  until(D * 0.18);

  // Independent geometric scaffold: a conventional cubic unit cell, side length a.
  const cellEdges = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const p = [0, 0, 0], q = [0, 0, 0];
      const other = [0, 1, 2].filter(i => i !== axis);
      p[axis] = -1; q[axis] = 1;
      p[other[0]] = q[other[0]] = a;
      p[other[1]] = q[other[1]] = b;
      cellEdges.push(v.line3D(`cell-edge-${axis}-${a}-${b}`, { points: [p, q], stroke: Color.GREY_B, strokeWidth: 0.018 }));
    }
  }
  const cellLabel = s.text('cell-label', { text: 'Conventional cubic unit cell', position: [0, 2.20], fontSize: 0.29, fill: Color.WHITE });
  playTo(D * 0.24, [...cellEdges.map(e => e.fadeIn()), cellLabel.fadeIn()]);
  until(D * 0.34);

  const inspection = s.text('inspection-note', { text: 'Outer sites hidden for inspection', position: [0, -2.30], fontSize: 0.28, fill: Color.GREY_A });
  playTo(D * 0.44, [...exterior.map(a => a.fadeOut()), inspection.fadeIn()]);
  exterior.forEach(a => s.remove(a));
  playTo(D * 0.54, [camera.animate({ height: 3.9, distance: 16 })]);
  until(D * 0.58);
  playTo(D * 0.61, [inspection.fadeOut()]);
  s.remove(inspection);

  // Coordination guides, not covalent bonds. All endpoints remain bound to the same ions.
  const center = ions.get(key(0, 0, 0));
  const offsets = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const neighbors = offsets.map(p => ions.get(key(...p)));
  const guides = [];
  neighbors.forEach((atom, i) => {
    const spoke = v.line3D(`neighbor-guide-${i}`, { stroke: Color.WHITE, strokeWidth: 0.022 });
    v.connect(spoke, center, atom, { endpoints: 'surface' });
    guides.push(spoke);
  });
  // The six equal-distance neighbors are the vertices of a regular octahedron.
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const dot = offsets[i].reduce((sum, value, k) => sum + value * offsets[j][k], 0);
    if (dot === 0) {
      const edge = v.line3D(`octahedron-edge-${i}-${j}`, { stroke: Color.GOLD, strokeWidth: 0.016 });
      v.connect(edge, neighbors[i], neighbors[j], { endpoints: 'center' });
      guides.push(edge);
    }
  }
  playTo(D * 0.69, [...guides.map(g => g.fadeIn()), ...cellIons.filter(a => a !== center && !neighbors.includes(a)).map(a => a.fadeOut())]);
  const coordination = s.latex('coordination-label', {
    tex: '6\\text{ nearest }\\mathrm{Cl}^{-}\\quad\\text{(octahedral)}',
    position: [0, -2.30], fontSize: 0.33, fill: Color.GOLD
  });
  playTo(D * 0.73, [coordination.fadeIn()]);
  // No sites move: the operation is a selection/cutaway, not crystal dynamics.
  until(D);
});