const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-interference\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  // Ideal equal-amplitude monochromatic waves, without radial attenuation.
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  s.play(s.camera.to2D({ height: 8.4 }), { duration: 0 });
  const halfWidth = 4.65, halfHeight = 2.6;
  const separation = 3, wavelength = 1.5, k = 2 * Math.PI / wavelength;
  const nx = 36, ny = 24, phases = 8;
  const dx = 2 * halfWidth / nx, dy = 2 * halfHeight / ny;
  const samples = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x0 = -halfWidth + ix * dx, y0 = -halfHeight + iy * dy;
      const x = x0 + dx / 2, y = y0 + dy / 2;
      const r1 = Math.hypot(x + separation / 2, y), r2 = Math.hypot(x - separation / 2, y);
      samples.push([x0, y0, Math.cos(k*r1)+Math.cos(k*r2), Math.sin(k*r1)+Math.sin(k*r2)]);
    }
  }
  const frames = [];
  for (let p = 0; p < phases; p++) {
    const phase = 2 * Math.PI * p / phases;
    const co = Math.cos(phase), si = Math.sin(phase);
    const bins = Array.from({ length: 10 }, () => ({ vertices: [], triangles: [] }));
    for (const sample of samples) {
      const x0 = sample[0], y0 = sample[1], u = sample[2]*co + sample[3]*si;
      const level = Math.min(4, Math.floor(Math.abs(u) * 2.5));
      const bin = bins[(u >= 0 ? 0 : 5) + level], n = bin.vertices.length;
      bin.vertices.push([x0,y0,0], [x0+dx,y0,0], [x0+dx,y0+dy,0], [x0,y0+dy,0]);
      bin.triangles.push([n,n+1,n+2], [n,n+2,n+3]);
    }
    const parts = [];
    bins.forEach((bin, b) => {
      if (bin.vertices.length) parts.push(s.mesh(`field-${p}-${b}`, {
        vertices: bin.vertices, triangles: bin.triangles, shading: 'unlit',
        fill: b < 5 ? Color.BLUE : Color.GOLD,
        opacity: 0.035 + 0.125 * (b % 5), stroke: Color.NONE,
      }));
    });
    // The crests use exactly the same phase as the superposed field.
    for (let source = 0; source < 2; source++) {
      const sx = source === 0 ? -separation / 2 : separation / 2;
      for (let ring = 0; ring <= 4; ring++) {
        const radius = (phase + 2 * Math.PI * ring) / k;
        if (radius < 0.04) continue;
        let arc = [], arcIndex = 0;
        const flush = () => {
          if (arc.length > 1) parts.push(s.path(`crest-${p}-${source}-${ring}-${arcIndex++}`, {
            points: arc, stroke: Color.WHITE, strokeWidth: 0.012,
            opacity: 0.22, fill: Color.NONE,
          }));
          arc = [];
        };
        for (let j = 0; j <= 80; j++) {
          const a = 2 * Math.PI * j / 80;
          const x = sx + radius * Math.cos(a), y = radius * Math.sin(a);
          if (Math.abs(x) <= halfWidth && Math.abs(y) <= halfHeight) arc.push([x,y,0.015]);
          else flush();
        }
        flush();
      }
    }
    frames.push(s.group(`phase-${p}`, parts, { opacity: 0, isolated: true }));
  }
  for (let j = 0; j < 2; j++) {
    const x = (j === 0 ? -1 : 1) * separation / 2;
    const source = s.circle(`source-${j+1}`, { position: [x,0,0.08], radius: 0.085, fill: Color.WHITE, stroke: Color.BLACK, strokeWidth: 0.025 });
    const label = s.latex(`source-label-${j+1}`, { tex: `S_${j+1}`, fontSize: 0.26, fill: Color.WHITE });
    s.attach(label, source, { offset: [0,-0.36,0.04] });
  }
  s.text('idealization', { text: 'Idealized waves', position: [-3.35,3.08], fontSize: 0.24, fill: Color.GREY_B });
  s.latex('shared-wave-law', { tex: String.raw`u=\cos(kr_1-\omega t)+\cos(kr_2-\omega t)`, position: [0,-3.08], fontSize: 0.32, fill: Color.WHITE });
  s.text('positive-key', { text: '+', position: [-0.3,3.08], fontSize: 0.3, fill: Color.BLUE });
  s.text('negative-key', { text: '-', position: [0.3,3.08], fontSize: 0.3, fill: Color.GOLD });
  // Exact fixed cancellation loci: |r1-r2| = (m+1/2) wavelength.
  const nodeParts = [];
  for (let m = 0; m < 2; m++) {
    const a = (m+0.5)*wavelength/2, b = Math.sqrt((separation/2)**2-a*a);
    for (const sign of [-1,1]) {
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const y = -halfHeight+2*halfHeight*j/64, x = sign*a*Math.sqrt(1+y*y/(b*b));
        if (Math.abs(x) <= halfWidth) points.push([x,y,0.1]);
      }
      nodeParts.push(s.path(`node-${m}-${sign}`, { points, stroke: Color.WHITE, strokeWidth: 0.019, opacity: 0.8, fill: Color.NONE }));
    }
  }
  nodeParts.push(s.text('node-label', { text: 'fixed nodes', position: [3.05,3.08], fontSize: 0.26, fill: Color.WHITE }));
  nodeParts.push(s.line('node-leader', { points: [[3.05,2.88,0.1],[3.15,2.63,0.1]], stroke: Color.WHITE, strokeWidth: 0.017 }));
  const nodes = s.group('stationary-nodes', nodeParts, { opacity: 0 });
  play(frames[0].animate({ opacity: 1 }), D*0.04);
  // Three synchronized periods; sampled phase fields crossfade smoothly.
  const stepDuration = D*0.9/(3*phases);
  for (let step = 1; step <= 3*phases; step++) {
    const previous = (step-1)%phases, next = step%phases;
    const actions = [frames[previous].animate({ opacity: 0 }), frames[next].animate({ opacity: 1 })];
    if (step === phases+1) actions.push(nodes.animate({ opacity: 1 }));
    play(actions, stepDuration);
  }
  s.wait(D-cursor);
});