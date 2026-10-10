const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-lipid\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const holdTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions, ease = 'smooth') => { s.play(actions, { duration: t - cursor, ease }); cursor = t; };
  const ions = [];
  s.text('schematic-note', { text: 'Schematic cutaway / not to scale', space: 'screen', position: [0, 0], viewportOffset: [0, -0.37], fontSize: 18, fill: Color.GREY_B });
  s.view('membrane-view', {
    rect: [0.02, 0.08, 0.96, 0.78], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: -0.16, pitch: 0.25, height: 9.4, distance: 20, target: [0, 0, 0], perspective: 0.35 }
  }, v => {
    // Y is the membrane normal; XZ is the membrane plane.
    // The same foreground section is omitted from membrane and protein.
    const cut = 0.74;
    const lipidParts = [];
    let selectedHead;
    for (let ix = -7; ix <= 7; ix++) {
      for (let iz = -3; iz <= 3; iz++) {
        const x = ix * 0.55;
        const z = iz * 0.57 + (ix % 2 === 0 ? 0.07 : -0.07);
        if (Math.hypot(x, z) < 1.55 || (z > 0 && Math.abs(Math.atan2(x, z)) < cut)) continue;
        for (const side of [-1, 1]) {
          const id = `lipid-${ix + 7}-${iz + 3}-${side === 1 ? 'upper' : 'lower'}`;
          const head = v.sphere(id + '-head', { radius: 0.22, position: [x, side * 1.5, z], fill: Color.BLUE, stroke: Color.NONE });
          const parts = [head];
          // Two separate inward-pointing hydrocarbon chains per polar head.
          for (let branch = 0; branch < 2; branch++) {
            const dx = branch === 0 ? -0.105 : 0.105;
            const points = [];
            for (let k = 0; k < 7; k++) {
              points.push([x + dx + (k % 2 ? 0.035 : -0.035), side * (1.32 - k * 0.195), z + (branch === 0 ? -0.025 : 0.025) + (k > 3 && branch === 1 ? 0.035 * (k - 3) : 0)]);
            }
            parts.push(v.tube(id + '-tail-' + branch, { points, radius: 0.053, radialSegments: 6, fill: Color.GOLD_D, stroke: Color.NONE }));
          }
          lipidParts.push(v.group(id, parts));
          if (ix === -5 && iz === 0 && side === 1) selectedHead = head;
        }
      }
    }
    v.group('bilayer', lipidParts);
    // Idealized lobed annular protein, not an atom-resolved structure.
    // The lumen is continuous and mildly narrowed at the membrane center.
    const shellParts = [];
    const angularSpan = 2 * Math.PI - 2 * cut;
    for (let sector = 0; sector < 5; sector++) {
      const a0 = cut + sector * angularSpan / 5 + 0.008;
      const a1 = cut + (sector + 1) * angularSpan / 5 - 0.008;
      const na = 14, ny = 24;
      const vertices = [], triangles = [];
      const index = (wall, j, i) => wall * (ny + 1) * (na + 1) + j * (na + 1) + i;
      for (let wall = 0; wall < 2; wall++) {
        for (let j = 0; j <= ny; j++) {
          const y = -1.9 + 3.8 * j / ny;
          const flare = Math.pow(Math.abs(y) / 1.9, 3);
          for (let i = 0; i <= na; i++) {
            const a = a0 + (a1 - a0) * i / na;
            const r = wall === 0 ? 1.14 + 0.12 * Math.sin(Math.PI * i / na) + 0.13 * flare : 0.54 + 0.22 * flare;
            vertices.push([r * Math.sin(a), y, r * Math.cos(a)]);
          }
        }
      }
      const quad = (a, b, c, d) => { triangles.push([a,b,c], [a,c,d]); };
      for (let j = 0; j < ny; j++) for (let i = 0; i < na; i++) {
        quad(index(0,j,i), index(0,j+1,i), index(0,j+1,i+1), index(0,j,i+1));
        quad(index(1,j,i+1), index(1,j+1,i+1), index(1,j+1,i), index(1,j,i));
      }
      for (let i = 0; i < na; i++) {
        quad(index(0,0,i+1), index(1,0,i+1), index(1,0,i), index(0,0,i));
        quad(index(0,ny,i), index(1,ny,i), index(1,ny,i+1), index(0,ny,i+1));
      }
      for (let j = 0; j < ny; j++) {
        quad(index(0,j,0), index(1,j,0), index(1,j+1,0), index(0,j+1,0));
        quad(index(0,j+1,na), index(1,j+1,na), index(1,j,na), index(0,j,na));
      }
      shellParts.push(v.mesh('channel-subunit-' + sector, { vertices, triangles, shading: 'smooth', fill: sector % 2 ? Color.PURPLE_D : Color.PURPLE_C, stroke: Color.NONE }));
    }
    v.group('channel', shellParts);
    const headsLabel = v.text('heads-label', { text: 'Hydrophilic heads', position: [-3.05, 2.55, 0], billboard: true, fontSize: 0.29, fill: Color.BLUE_A });
    const headLeader = v.line3D('heads-leader', { stroke: Color.GREY_B, strokeWidth: 0.015 });
    v.connect(headLeader, headsLabel, selectedHead);
    const tailsLabel = v.text('tails-label', { text: 'Hydrophobic tails', position: [-3.0, -2.5, 0.8], billboard: true, fontSize: 0.29, fill: Color.GOLD_B });
    const tailAnchor = v.circle('tail-anchor', { radius: 0.015, position: [-2.855, -0.75, 1.64], opacity: 0 });
    const tailLeader = v.line3D('tails-leader', { stroke: Color.GREY_B, strokeWidth: 0.015 });
    v.connect(tailLeader, tailsLabel, tailAnchor);
    const channelLabel = v.text('channel-label', { text: 'Channel (cutaway)', position: [2.75, 2.55, 0], billboard: true, fontSize: 0.29, fill: Color.PURPLE_A });
    const channelAnchor = v.circle('channel-anchor', { radius: 0.015, position: [1.1, 1.7, 0.35], opacity: 0 });
    const channelLeader = v.line3D('channel-leader', { stroke: Color.GREY_B, strokeWidth: 0.015 });
    v.connect(channelLeader, channelLabel, channelAnchor);
    const starts = [[0,3.0,0], [1.0,3.1,0], [-1.0,3.1,0]];
    starts.forEach((position, i) => {
      const ion = v.sphere('ion-' + i, { radius: 0.18, position, fill: Color.GREEN_C, stroke: Color.NONE });
      const charge = v.text('ion-charge-' + i, { text: '+', fontSize: 0.26, fill: Color.BLACK, billboard: true, billboardOffset: [0,0,0.19] });
      v.attach(charge, ion);
      ions.push(ion);
    });
    v.text('ions-label', { text: 'Ions', position: [2.65, -2.8, 0], billboard: true, fontSize: 0.29, fill: Color.GREEN_A });
  });
  // Only the central lumen transports ions. Lateral spreading is outside the membrane.
  holdTo(D * 0.15);
  playTo(D * 0.32, [ions[0].moveTo([0, -2.45, 0])], 'linear');
  playTo(D * 0.37, [ions[0].moveTo([-1.15, -2.95, 0]), ions[1].moveTo([0, 2.8, 0])]);
  playTo(D * 0.54, [ions[1].moveTo([0, -2.65, 0])], 'linear');
  playTo(D * 0.59, [ions[1].moveTo([0, -3.15, 0]), ions[2].moveTo([0, 2.8, 0])]);
  playTo(D * 0.76, [ions[2].moveTo([0, -2.45, 0])], 'linear');
  playTo(D * 0.82, [ions[2].moveTo([1.15, -2.95, 0])]);
  holdTo(D);
});