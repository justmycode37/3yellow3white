const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-dijkstra\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const T = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'smooth' }); cursor += duration; };
  const wait = duration => { s.wait(duration); cursor += duration; };
  const morphMath = (object, tex, fontSize) => object.morphTo({ kind: 'latex', tex, fontSize }, { map: {} });
  play(s.camera.to2D({ height: 9 }), 0);

  // Abstract undirected graph: drawn lengths are not measured edge costs.
  const names = 'ABCDEFGHIJKL'.split('');
  const positions = names.map((_, i) => [-3.9 + 2.6 * (i % 4), 1.4 - 1.6 * Math.floor(i / 4)]);
  const data = [
    ['A','B',8], ['B','C',2], ['C','D',6],
    ['E','F',2], ['F','G',7], ['G','H',2],
    ['I','J',3], ['J','K',1], ['K','L',3],
    ['A','E',1], ['B','F',2], ['C','G',1], ['D','H',2],
    ['E','I',7], ['F','J',2], ['G','K',2], ['H','L',4]
  ];
  const distances = Object.fromEntries(names.map(n => [n, Infinity]));
  distances.A = 0;
  const visited = new Set(), parent = {}, trace = [], settled = [];
  const queue = () => names.filter(n => !visited.has(n) && Number.isFinite(distances[n]))
    .sort((a,b) => distances[a] - distances[b] || names.indexOf(a) - names.indexOf(b));
  const queueText = () => 'min queue:  ' + (queue().map(n => n + ':' + distances[n]).join('   ') || 'empty');
  while (queue().length) {
    const u = queue()[0];
    visited.add(u);
    settled.push(u);
    const step = { u, distance: distances[u], order: settled.join('  '), queue: queueText(), scans: [] };
    trace.push(step);
    if (u === 'L') break;
    data.forEach(([a,b,w], edge) => {
      const v = a === u ? b : b === u ? a : null;
      if (!v || visited.has(v)) return;
      const old = distances[v], candidate = distances[u] + w;
      const changed = candidate < old;
      if (changed) { distances[v] = candidate; parent[v] = { u, edge }; }
      step.scans.push({ v, edge, old, candidate, w, changed, queue: queueText() });
    });
  }
  const path = ['L'], pathEdges = [];
  while (path[0] !== 'A') {
    const p = parent[path[0]];
    pathEdges.unshift(p.edge);
    path.unshift(p.u);
  }

  const nodes = {}, labels = {}, readouts = {};
  const edgeHandles = data.map(([a,b,w]) => s.line('edge-' + a + b, {
    points: [positions[names.indexOf(a)], positions[names.indexOf(b)]],
    stroke: Color.GREY_D, strokeWidth: 0.035
  }));
  names.forEach((n,i) => {
    nodes[n] = s.circle('vertex-' + n, { position: positions[i], radius: 0.245,
      fill: Color.BLACK, stroke: n === 'A' ? Color.BLUE : Color.WHITE, strokeWidth: 0.035 });
    labels[n] = s.text('name-' + n, { text: n, fontSize: 0.29, fill: Color.WHITE, position: positions[i] });
    s.attach(labels[n], nodes[n]);
    readouts[n] = s.latex('distance-' + n, { tex: n === 'A' ? '0' : '\\infty',
      position: [positions[i][0] + 0.44, positions[i][1] + 0.37], fontSize: 0.28,
      fill: n === 'A' ? Color.BLUE : Color.GREY_B });
    s.attach(readouts[n], nodes[n], { offset: [0.44, 0.37, 0] });
  });
  data.forEach(([a,b,w],i) => {
    s.connect(edgeHandles[i], nodes[a], nodes[b], { endpoints: 'surface' });
    const p = positions[names.indexOf(a)], q = positions[names.indexOf(b)];
    const horizontal = p[1] === q[1];
    s.text('weight-' + a + b, { text: String(w), fontSize: 0.27, fill: Color.WHITE,
      position: [(p[0]+q[0])/2 + (horizontal ? 0 : -0.3), (p[1]+q[1])/2 + (horizontal ? -0.24 : 0)] });
  });
  const source = s.text('source-label', { text: 'source', fontSize: 0.23, fill: Color.BLUE, position: [-4.8,1.4] });
  const target = s.text('target-label', { text: 'target', fontSize: 0.23, fill: Color.GOLD, position: [4.8,-1.8] });
  s.attach(source, nodes.A, { offset: [-0.9,0,0] });
  s.attach(target, nodes.L, { offset: [0.9,0,0] });
  const queueLabel = s.text('priority-queue', { text: 'min queue:  A:0', position: [0,2.95], fontSize: 0.3, fill: Color.BLUE });
  const key = s.text('distance-key', { text: 'Dijkstra   |   blue: tentative distance   |   teal: settled', position: [0,2.38], fontSize: 0.235, fill: Color.GREY_B });
  const calculation = s.latex('relaxation', { tex: 'd(A)=0', position: [0,-2.73], fontSize: 0.36, fill: Color.GOLD });
  const orderLabel = s.text('settled-order', { text: 'settled:', position: [0,-3.32], fontSize: 0.25, fill: Color.TEAL });
  wait(T * 0.04);

  const scanCount = trace.reduce((sum, step) => sum + step.scans.length, 0);
  const unit = T * 0.78 / (trace.length * 0.45 + scanCount);
  const fmt = n => Number.isFinite(n) ? String(n) : '\\infty';
  for (const step of trace) {
    play([
      nodes[step.u].animate({ stroke: Color.GOLD, fill: Color.GREY_E }),
      readouts[step.u].animate({ fill: Color.GOLD }),
      queueLabel.morphTo({ kind: 'text', text: step.queue, fontSize: 0.3 }),
      morphMath(calculation, '\\min:\\quad ' + step.u + '=' + step.distance, 0.36),
      orderLabel.morphTo({ kind: 'text', text: 'settled:  ' + step.order, fontSize: 0.25 })
    ], unit * 0.2);
    wait(unit * 0.25);
    for (const scan of step.scans) {
      const tex = scan.changed
        ? 'd(' + scan.v + '):\\quad ' + fmt(scan.old) + '\\;\\longrightarrow\\;' + step.distance + '+' + scan.w + '=' + scan.candidate
        : 'd(' + scan.v + '):\\quad ' + step.distance + '+' + scan.w + '=' + fmt(scan.old) + '\\quad\\text{unchanged}';
      play([
        edgeHandles[scan.edge].animate({ stroke: Color.GOLD, strokeWidth: 0.07 }),
        morphMath(calculation, tex, 0.36)
      ], unit * 0.16);
      const updates = [];
      if (scan.changed) {
        updates.push(nodes[scan.v].animate({ stroke: Color.BLUE }));
        updates.push(morphMath(readouts[scan.v], String(scan.candidate), 0.28));
        updates.push(readouts[scan.v].animate({ fill: Color.BLUE }));
        updates.push(queueLabel.morphTo({ kind: 'text', text: scan.queue, fontSize: 0.3 }));
      }
      if (updates.length) play(updates, unit * 0.24); else wait(unit * 0.24);
      wait(unit * 0.45);
      play(edgeHandles[scan.edge].animate({ stroke: Color.GREY_D, strokeWidth: 0.035 }), unit * 0.15);
    }
    play([nodes[step.u].animate({ stroke: Color.TEAL, fill: Color.BLACK }), readouts[step.u].animate({ fill: Color.TEAL })], 0);
  }

  // Follow actual predecessor pointers backwards from the settled target.
  play([
    queueLabel.morphTo({ kind: 'text', text: 'L settled at 9; remaining queue:  H:10   D:13', fontSize: 0.3 }),
    morphMath(calculation, '\\text{Recover predecessors:}\\quad L\\to A', 0.36),
    nodes.L.animate({ stroke: Color.GOLD }), readouts.L.animate({ fill: Color.GOLD })
  ], T * 0.01);
  for (let i = pathEdges.length - 1; i >= 0; i--) {
    play([
      edgeHandles[pathEdges[i]].animate({ stroke: Color.GOLD, strokeWidth: 0.085 }),
      nodes[path[i]].animate({ stroke: Color.GOLD }),
      readouts[path[i]].animate({ fill: Color.GOLD })
    ], T * 0.065 / pathEdges.length);
  }
  play([
    morphMath(calculation, 'A\\to E\\to F\\to J\\to K\\to L\\qquad 1+2+2+1+3=9', 0.34),
    key.morphTo({ kind: 'text', text: 'Shortest path recovered   |   edge weights, not hop count', fontSize: 0.235 })
  ], T * 0.015);
  wait(T - cursor);
});