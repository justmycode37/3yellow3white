const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-mobius\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'smooth' }); cursor += duration; };
  const holdTo = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  s.play(s.camera.to2D({ height: 8, target: [0, 0, 0] }), { duration: 0 });

  // This is explicitly pointwise interpolation, not a family of conformal maps.
  // Endpoint geometry, the highlighted curve and its point share one map.
  const map = ([x, y]) => {
    const den = (x + 1) * (x + 1) + y * y;
    return [(x * x + y * y - 1) / den, 2 * y / den];
  };
  const pathData = points => points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const positive = [0.004, 0.008, 0.016, 0.032, 0.064];
  for (let j = 1; j <= 80; j++) positive.push(j * 0.05 + 0.064);
  positive.push(4.5, 5, 6, 8, 12, 20, 36, 64, 128, 256);
  const all = positive.slice().reverse().map(y => -y).concat([0], positive);
  const specifications = [];
  for (let j = -6; j <= 6; j++) {
    const x = j / 2;
    if (x === -1) {
      // Separate branches at the pole; the views clip unbounded excursions.
      specifications.push({ id: `v${j}lower`, color: Color.BLUE, points: positive.slice().reverse().map(y => [x, -y]) });
      specifications.push({ id: `v${j}upper`, color: Color.BLUE, points: positive.map(y => [x, y]) });
    } else {
      specifications.push({ id: `v${j}`, color: Color.BLUE, points: all.map(y => [x, y]) });
    }
    const y = j / 2;
    if (y === 0) {
      specifications.push({ id: 'real-left', color: Color.TEAL, points: positive.slice().reverse().map(q => [-1 - q, 0]) });
      specifications.push({ id: 'real-right', color: Color.TEAL, points: positive.map(q => [-1 + q, 0]) });
    } else {
      specifications.push({ id: `h${j}`, color: Color.TEAL, points: all.map(q => [q - 1, y]) });
    }
  }
  const circlePoints = [];
  for (let k = 0; k <= 320; k++) {
    const a = -Math.PI + 0.002 + (2 * Math.PI - 0.004) * k / 320;
    circlePoints.push([Math.cos(a), Math.sin(a)]);
  }
  const z0 = [3 / 5, 4 / 5];
  const w0 = map(z0);
  const makePlane = (prefix, rect, moving) => {
    let result;
    s.view(prefix + '-view', { rect, orbit: false, camera: { mode: '2d', yaw: 0, pitch: 0, perspective: 0, height: 4.6, target: [0, 0, 0] } }, v => {
      const scaffold = [];
      scaffold.push(v.line(prefix + '-re-axis', { points: [[-4, 0], [4, 0]], stroke: { color: Color.WHITE, opacity: 0.28 }, strokeWidth: 0.012 }));
      scaffold.push(v.line(prefix + '-im-axis', { points: [[0, -2.3], [0, 2.3]], stroke: { color: Color.WHITE, opacity: 0.28 }, strokeWidth: 0.012 }));
      scaffold.push(v.text(prefix + '-one', { text: '1', position: [1, -0.2], fontSize: 0.22, fill: Color.GREY_A }));
      scaffold.push(v.text(prefix + '-i', { text: 'i', position: [0.17, 1.08], fontSize: 0.22, fill: Color.GREY_A }));
      scaffold.push(v.text(prefix + '-re', { text: 'Re', position: [2.5, -0.2], fontSize: 0.21, fill: Color.GREY_B }));
      scaffold.push(v.text(prefix + '-im', { text: 'Im', position: [0.25, 2.08], fontSize: 0.21, fill: Color.GREY_B }));
      const axes = v.group(prefix + '-scaffold', scaffold);
      const paths = specifications.map(spec => v.path(prefix + '-' + spec.id, {
        d: pathData(spec.points), fill: Color.NONE,
        stroke: { color: spec.color, opacity: 0.55 }, strokeWidth: 0.013,
      }));
      const grid = v.group(prefix + '-grid', paths);
      const circle = v.path(prefix + '-selected-circle', { d: pathData(circlePoints), fill: Color.NONE, stroke: Color.YELLOW, strokeWidth: 0.04 });
      const point = v.circle(prefix + '-point', { position: z0, radius: 0.065, fill: Color.PINK, stroke: Color.BLACK, strokeWidth: 0.016 });
      const pointLabel = v.latex(prefix + '-point-label', { tex: moving ? 'w_0' : 'z_0', fontSize: 0.29, fill: Color.PINK });
      v.attach(pointLabel, point, { offset: [0.3, 0.27, 0] });
      const selection = v.group(prefix + '-selection', [circle, point, pointLabel], { opacity: 0 });
      let pole;
      if (!moving) {
        const crossA = v.line('pole-cross-a', { points: [[-1.07, -0.07], [-0.93, 0.07]], stroke: Color.RED, strokeWidth: 0.028 });
        const crossB = v.line('pole-cross-b', { points: [[-1.07, 0.07], [-0.93, -0.07]], stroke: Color.RED, strokeWidth: 0.028 });
        const label = v.latex('pole-label', { tex: '-1', position: [-1.08, -0.29], fontSize: 0.23, fill: Color.RED });
        pole = v.group('pole', [crossA, crossB, label], { opacity: 0 });
      }
      result = { axes, paths, grid, circle, point, selection, pole };
    });
    return result;
  };
  const left = makePlane('source', [0.04, 0.27, 0.44, 0.46], false);
  const right = makePlane('image', [0.52, 0.27, 0.44, 0.46], true);
  const formula = s.latex('map-formula', { tex: 'w=\\frac{z-1}{z+1}', fontSize: 0.52, position: [0, 2.85] });
  const sourceHeading = s.latex('source-heading', { tex: 'z', position: [0, 2.08], viewportOffset: [-0.24, 0], fontSize: 0.36 });
  const imageHeading = s.latex('image-heading', { tex: 'w', position: [0, 2.08], viewportOffset: [0.24, 0], fontSize: 0.36 });
  const sourceCircleLabel = s.latex('source-circle-label', { tex: '|z|=1', position: [0, -2.15], viewportOffset: [-0.24, 0], fontSize: 0.36, fill: Color.YELLOW, opacity: 0 });
  const sourcePointValue = s.latex('source-point-value', { tex: 'z_0=\\frac{3+4i}{5}', position: [0, -2.83], viewportOffset: [-0.24, 0], fontSize: 0.33, fill: Color.PINK, opacity: 0 });
  const interpolation = s.text('interpolation-label', { text: 'Pointwise interpolation', position: [0, -2.15], viewportOffset: [0.24, 0], fontSize: 0.27, fill: Color.GREY_A, opacity: 0 });
  const poleRule = s.latex('pole-rule', { tex: '-1\\mapsto\\infty', position: [0, -2.83], viewportOffset: [0.24, 0], fontSize: 0.32, fill: Color.RED, opacity: 0 });

  play([formula.fadeIn(), sourceHeading.fadeIn(), imageHeading.fadeIn(), left.axes.fadeIn(), right.axes.fadeIn(), left.grid.fadeIn(), right.grid.fadeIn()], D * 0.06);
  play([left.selection.fadeIn(), right.selection.fadeIn(), left.pole.fadeIn(), sourceCircleLabel.fadeIn(), sourcePointValue.fadeIn(), poleRule.fadeIn()], D * 0.06);
  holdTo(D * 0.18);
  play(interpolation.fadeIn(), D * 0.02);
  const deformation = right.paths.map((path, i) => path.morphTo({ kind: 'path', d: pathData(specifications[i].points.map(map)), fill: Color.NONE }));
  deformation.push(right.circle.morphTo({ kind: 'path', d: pathData(circlePoints.map(map)), fill: Color.NONE }));
  deformation.push(right.point.moveTo(w0));
  play(deformation, D * 0.55);
  play([interpolation.fadeOut(), poleRule.fadeOut()], D * 0.025);
  s.remove(interpolation);
  s.remove(poleRule);
  const imageCircleLabel = s.latex('image-circle-label', { tex: '\\operatorname{Re}w=0', position: [0, -2.15], viewportOffset: [0.24, 0], fontSize: 0.36, fill: Color.YELLOW });
  const imagePointValue = s.latex('image-point-value', { tex: 'w_0=\\frac{i}{2}', position: [0, -2.83], viewportOffset: [0.24, 0], fontSize: 0.33, fill: Color.PINK });
  play([imageCircleLabel.fadeIn(), imagePointValue.fadeIn()], D * 0.025);
  holdTo(D);
});