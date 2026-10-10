const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-svd\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: "2d", orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const T = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: "smooth" }); cursor += duration; };
  const until = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  play(s.camera.to2D({ height: 10, target: [0, 0, 0] }), 0);

  // Exact example: A = R(atan(3/4)) diag(2,1) R(-pi/4).
  // Coordinates are mathematical, not measured data.
  const angleV = -Math.PI / 4;
  const angleU = Math.atan2(3, 4);
  const center = [0, -0.55];
  const stretchLocal = p => [1.5 * p[0] + 0.5 * p[1], 0.5 * p[0] + 1.5 * p[1]];
  const formula = s.latex("exact-svd", {
    tex: String.raw`\frac{1}{5\sqrt{2}}\begin{bmatrix}11&5\\2&10\end{bmatrix}=\underbrace{\frac15\begin{bmatrix}4&-3\\3&4\end{bmatrix}}_{U}\underbrace{\begin{bmatrix}2&0\\0&1\end{bmatrix}}_{\Sigma}\underbrace{\frac{1}{\sqrt2}\begin{bmatrix}1&1\\-1&1\end{bmatrix}}_{V^{T}}`,
    position: [0, 3.18], fontSize: 0.43, fill: Color.WHITE
  });

  // Fixed scaffold and a persistent reference copy of the input basis.
  s.line("fixed-x-axis", { points: [[-3.75, center[1]], [3.75, center[1]]], stroke: { color: Color.GREY_B, opacity: 0.35 }, strokeWidth: 0.015 });
  s.line("fixed-y-axis", { points: [[0, -2.95], [0, 1.7]], stroke: { color: Color.GREY_B, opacity: 0.35 }, strokeWidth: 0.015 });
  s.circle("reference-circle", { position: center, radius: 1, fill: Color.NONE, stroke: { color: Color.GREY_B, opacity: 0.5 }, strokeWidth: 0.022 });
  s.arrow("reference-e1", { points: [center, [1, center[1]]], stroke: { color: Color.BLUE, opacity: 0.3 }, strokeWidth: 0.028 });
  s.arrow("reference-e2", { points: [center, [0, center[1] + 1]], stroke: { color: Color.YELLOW, opacity: 0.3 }, strokeWidth: 0.028 });

  const children = [];
  const deforming = [];
  const path = (id, points, style, closed = false) => {
    const element = s.path(id, { points, closed, fill: Color.NONE, ...style });
    children.push(element);
    deforming.push({ element, points, closed });
    return element;
  };
  // A finite square grid makes the first rotation observable even though a circle is invariant.
  for (let i = -5; i <= 5; i++) {
    const q = i / 4;
    const style = { stroke: { color: Color.BLUE_E, opacity: i === 0 ? 0.75 : 0.48 }, strokeWidth: i === 0 ? 0.022 : 0.013 };
    path("grid-horizontal-" + (i + 5), [[-1.25, q], [1.25, q]], style);
    path("grid-vertical-" + (i + 5), [[q, -1.25], [q, 1.25]], style);
  }
  const circlePoints = Array.from({ length: 96 }, (_, i) => {
    const a = 2 * Math.PI * i / 96;
    return [Math.cos(a), Math.sin(a)];
  });
  path("moving-unit-circle", circlePoints, { stroke: Color.WHITE, strokeWidth: 0.035 }, true);
  const h = Math.SQRT1_2;
  path("principal-diameter-1", [[-h, -h], [h, h]], { stroke: { color: Color.TEAL, opacity: 0.7 }, strokeWidth: 0.022 });
  path("principal-diameter-2", [[h, -h], [-h, h]], { stroke: { color: Color.TEAL, opacity: 0.7 }, strokeWidth: 0.022 });
  const samples = [];
  for (let i = 0; i < 16; i++) {
    const a = 2 * Math.PI * i / 16;
    const p = [Math.cos(a), Math.sin(a)];
    const dot = s.circle("circle-sample-" + i, { position: p, radius: 0.035, fill: Color.WHITE, stroke: Color.NONE });
    children.push(dot);
    samples.push({ dot, p });
  }
  const origin = s.circle("moving-origin", { radius: 0.035, fill: Color.WHITE, stroke: Color.NONE });
  const tip1 = s.circle("basis-tip-1", { position: [1, 0], radius: 0.04, fill: Color.BLUE, stroke: Color.NONE });
  const tip2 = s.circle("basis-tip-2", { position: [0, 1], radius: 0.04, fill: Color.YELLOW, stroke: Color.NONE });
  const basis1 = s.arrow("moving-basis-1", { points: [[0, 0], [1, 0]], stroke: Color.BLUE, strokeWidth: 0.055 });
  const basis2 = s.arrow("moving-basis-2", { points: [[0, 0], [0, 1]], stroke: Color.YELLOW, strokeWidth: 0.055 });
  children.push(origin, tip1, tip2, basis1, basis2);
  const model = s.group("linear-image", children, { position: center });
  s.connect(basis1, origin, tip1);
  s.connect(basis2, origin, tip2);
  const label1 = s.latex("input-e1-label", { tex: "e_1", fontSize: 0.3, fill: Color.BLUE });
  const label2 = s.latex("input-e2-label", { tex: "e_2", fontSize: 0.3, fill: Color.YELLOW });
  s.attach(label1, tip1, { offset: [0.22, -0.22, 0] });
  s.attach(label2, tip2, { offset: [-0.25, 0.22, 0] });
  const inputCaption = s.latex("input-caption", { tex: String.raw`\|x\|=1`, position: [0, -3.45], fontSize: 0.38, fill: Color.WHITE });
  play([formula.fadeIn(), model.fadeIn(), label1.fadeIn(), label2.fadeIn(), inputCaption.fadeIn()], T * 0.04);
  until(T * 0.1);
  play([label1.fadeOut(), label2.fadeOut(), inputCaption.fadeOut()], T * 0.02);
  s.remove(label1); s.remove(label2); s.remove(inputCaption);

  const rotationCaption = s.latex("right-rotation-caption", { tex: String.raw`V^T:\quad -45^\circ`, position: [0, 2.05], fontSize: 0.38, fill: Color.TEAL });
  play(rotationCaption.fadeIn(), T * 0.02);
  play(model.rotateTo(angleV), T * 0.13);
  until(T * 0.31);
  play(rotationCaption.fadeOut(), T * 0.02);
  s.remove(rotationCaption);

  const stretchCaption = s.latex("stretch-caption", { tex: String.raw`\Sigma:\quad (x,y)\mapsto(2x,y)`, position: [0, 2.05], fontSize: 0.38, fill: Color.TEAL });
  play(stretchCaption.fadeIn(), T * 0.02);
  // Group stays rotated by -45 degrees. Conjugating the local deformation
  // makes every intermediate world transform diag(1+t,1) V^T.
  const stretching = deforming.map(({ element, points, closed }) => element.morphTo({ kind: "path", points: points.map(stretchLocal), closed }));
  stretching.push(...samples.map(({ dot, p }) => dot.moveTo(stretchLocal(p))));
  stretching.push(tip1.moveTo(stretchLocal([1, 0])), tip2.moveTo(stretchLocal([0, 1])));
  play(stretching, T * 0.17);
  const majorValue = s.latex("major-axis-length", { tex: "2", position: [2.2, -0.55], fontSize: 0.3, fill: Color.TEAL });
  const minorValue = s.latex("minor-axis-length", { tex: "1", position: [-0.23, 0.63], fontSize: 0.3, fill: Color.TEAL });
  play([majorValue.fadeIn(), minorValue.fadeIn()], T * 0.02);
  until(T * 0.6);
  play([stretchCaption.fadeOut(), majorValue.fadeOut(), minorValue.fadeOut()], T * 0.02);
  s.remove(stretchCaption); s.remove(majorValue); s.remove(minorValue);

  const leftCaption = s.latex("left-rotation-caption", { tex: String.raw`U:\quad \theta=\arctan(3/4)`, position: [0, 2.05], fontSize: 0.38, fill: Color.TEAL });
  play(leftCaption.fadeIn(), T * 0.02);
  // Rigid rotation preserves the stretched ellipse and both singular lengths.
  play(model.rotateTo(angleV + angleU), T * 0.135);
  play(leftCaption.fadeOut(), T * 0.02);
  s.remove(leftCaption);
  const output1 = s.latex("output-Ae1-label", { tex: "Ae_1", fontSize: 0.31, fill: Color.BLUE });
  const output2 = s.latex("output-Ae2-label", { tex: "Ae_2", fontSize: 0.31, fill: Color.YELLOW });
  s.attach(output1, tip1, { offset: [0.43, -0.16, 0] });
  s.attach(output2, tip2, { offset: [0.04, 0.62, 0] });
  const result = s.latex("result-caption", { tex: String.raw`A=U\Sigma V^T\qquad \{Ax:\|x\|=1\}`, position: [0, -3.45], fontSize: 0.38, fill: Color.WHITE });
  play([output1.fadeIn(), output2.fadeIn(), result.fadeIn()], T * 0.025);
  until(T);
});