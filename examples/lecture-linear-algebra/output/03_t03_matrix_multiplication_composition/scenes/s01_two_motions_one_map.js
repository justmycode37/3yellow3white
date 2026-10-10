export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- control ----------
  const deg = s.slider("rotation_angle", {
    label: "Rotation angle", default: 90, min: 0, max: 180, step: 15,
    position: [0.05, 0.80], width: 220,
  });
  const th = deg * Math.PI / 180;
  const c = Math.cos(th), sn = Math.sin(th);

  // ---------- fixed layout ----------
  const OX = -2.35;          // origin of the plane (centre of the geometry area)
  const U = 1.3;             // world length of one grid unit
  const PX = 4.74;           // centre of the text panel
  const N = 10;              // moving grid: lines -N..N
  const G = 5;               // ghost grid: lines -G..G

  // ---------- linear algebra helpers (plane coordinates) ----------
  const mul = (A, B) => [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  const ap = (A, p) => [A[0][0] * p[0] + A[0][1] * p[1], A[1][0] * p[0] + A[1][1] * p[1]];
  const W = p => [U * p[0], U * p[1]];
  const I2 = [[1, 0], [0, 1]];
  const R = [[c, -sn], [sn, c]];
  const Rinv = [[c, sn], [-sn, c]];
  const S = [[1, 1], [0, 1]];
  const T = mul(S, R);                 // first R, then S
  const M = mul(Rinv, T);              // shear expressed inside the rotated group

  // ---------- ghost of the starting grid (muted, behind everything) ----------
  const ghostLines = [];
  for (let i = -G; i <= G; i++) {
    ghostLines.push(s.line("ghost-v-" + i, { points: [W([i, -8]), W([i, 8])], stroke: "GREY_D", strokeWidth: 0.02 }));
    ghostLines.push(s.line("ghost-h-" + i, { points: [W([-8, i]), W([8, i])], stroke: "GREY_D", strokeWidth: 0.02 }));
  }
  const ghost = s.group("ghost-grid", ghostLines);
  s.play(ghost.moveTo([OX, 0, -0.2]), { duration: 0 });

  // ---------- the moving plane ----------
  const lines = [];
  for (let i = -N; i <= N; i++) {
    const axis = i === 0;
    const style = { stroke: axis ? "GREY_A" : "GREY_C", strokeWidth: axis ? 0.03 : 0.02 };
    const v = { a: [i, -N], b: [i, N] };
    const h = { a: [-N, i], b: [N, i] };
    v.el = s.line("grid-v-" + i, { points: [W(v.a), W(v.b)], ...style });
    h.el = s.line("grid-h-" + i, { points: [W(h.a), W(h.b)], ...style });
    lines.push(v, h);
  }
  const E1 = [1, 0], E2 = [0, 1];
  const L1 = [0.62, -0.4], L2 = [-0.4, 0.62];   // label spots, inside a grid cell beside each tip
  const e1 = s.arrow("e1", { points: [[0, 0], W(E1)], stroke: "GREEN", strokeWidth: 0.09, position: [0, 0, 0.1] });
  const e2 = s.arrow("e2", { points: [[0, 0], W(E2)], stroke: "RED", strokeWidth: 0.09, position: [0, 0, 0.1] });
  const lab1 = s.latex("e1-label", { tex: "e_1", fontSize: 0.5, fill: "GREEN", position: [U * L1[0], U * L1[1], 0.15] });
  const lab2 = s.latex("e2-label", { tex: "e_2", fontSize: 0.5, fill: "RED", position: [U * L2[0], U * L2[1], 0.15] });
  const plane = s.group("grid", lines.map(l => l.el).concat([e1, e2, lab1, lab2]));
  s.play(plane.moveTo([OX, 0, 0]), { duration: 0 });

  const lineTo = (A, l) => l.el.morphTo({ kind: "line", points: [W(ap(A, l.a)), W(ap(A, l.b))], closed: false });
  const arrowTo = (A, el, p) => el.morphTo({ kind: "arrow", points: [[0, 0], W(ap(A, p))], closed: false });
  const labelTo = (A, el, p) => { const q = ap(A, p); return el.moveTo([U * q[0], U * q[1], 0.15]); };
  const planeTo = A => lines.map(l => lineTo(A, l)).concat([
    arrowTo(A, e1, E1), arrowTo(A, e2, E2), labelTo(A, lab1, L1), labelTo(A, lab2, L2),
  ]);

  // ---------- panel (masks the plane on the right third) ----------
  const mask = s.rectangle("panel-mask", { width: 40, height: 60, position: [22.4, 0, 0.4], fill: "BLACK", stroke: "none" });
  const panel = s.rectangle("panel", { width: 4.3, height: 7.2, position: [PX, 0, 0.5], fill: "GREY_E", stroke: "GREY_C", strokeWidth: 0.02 });

  // ---------- panel formulas ----------
  const fmt = v => {
    const r = Math.round(v * 100) / 100;
    if (r === 0) return "0";
    if (Number.isInteger(r)) return String(r);
    return String(parseFloat(r.toFixed(2)));
  };
  const em = str => {
    let w = 0;
    for (const ch of str) w += ch === "-" ? 0.78 : ch === "." ? 0.28 : 0.5;
    return w;
  };
  const r11 = fmt(c), r12 = fmt(-sn), r21 = fmt(sn), r22 = fmt(c);
  const wR = 2.16 + Math.max(em(r11), em(r21)) + Math.max(em(r12), em(r22));
  const wS = 3.16;
  const gap = 0.45;
  const F = Math.min(0.42, (3.7 - gap) / (wR + wS));
  const total = (wR + wS) * F + gap;
  const left = PX - total / 2;
  const xR = left + wR * F / 2;
  const xS = left + wR * F + gap + wS * F / 2;
  const matTex = (name, a, b, cc, d) =>
    String.raw`\begin{array}{c}\animpart{name}{` + name + String.raw`}\\[0.25em]\begin{bmatrix}\animpart{a11}{` + a +
    String.raw`}&\animpart{a12}{` + b + String.raw`}\\ \animpart{a21}{` + cc + String.raw`}&\animpart{a22}{` + d +
    String.raw`}\end{bmatrix}\end{array}`;
  const matR = s.latex("matrix-R", { tex: matTex("R", r11, r12, r21, r22), fontSize: F, fill: "BLUE", position: [xR, 2.45, 0.6], opacity: 0 });
  const matS = s.latex("matrix-S", { tex: matTex("S", "1", "1", "0", "1"), fontSize: F, fill: "GOLD", position: [xS, 2.45, 0.6], opacity: 0 });

  const frame = s.rectangle("product-frame", { width: 3.4, height: 2.3, position: [PX, -0.4, 0.55], fill: "none", stroke: "TEAL", strokeWidth: 0.03, opacity: 0 });
  const bracket = s.latex("product-bracket", {
    tex: String.raw`\begin{bmatrix}\phantom{-1}&\phantom{-1}\\ \phantom{-1}&\phantom{-1}\end{bmatrix}`,
    fontSize: 0.6, fill: "WHITE", position: [PX, -0.4, 0.6], opacity: 0,
  });
  const question = s.latex("product-question", { tex: "?", fontSize: 0.7, fill: "WHITE", position: [PX, -0.4, 0.62], opacity: 0 });

  // ---------- timeline (50 s) ----------
  s.wait(2.5);

  // 1. the rotation R: interpolated by angle; labels stay upright
  s.play([plane.rotateTo(th), lab1.rotateTo(-th), lab2.rotateTo(-th), matR.fadeIn()], { duration: 5.5, ease: "smooth" });
  s.wait(2);

  // 2. the shear S: one parameter, (1-t) I + t S applied after the rotation
  s.play(planeTo(M).concat([matS.fadeIn()]), { duration: 5.5, ease: "smooth" });
  s.wait(1.5);

  // the origin has not moved
  const dot = s.circle("origin-dot", { radius: 0.1, position: [OX, 0, 0.2], fill: "WHITE", stroke: "none", opacity: 0 });
  s.play(dot.fadeIn(), { duration: 1, ease: "smooth" });
  s.wait(3);
  s.play(dot.fadeOut(), { duration: 1, ease: "smooth" });
  s.remove(dot);
  s.wait(0.5);

  // 3. ease calmly back onto the ghost
  s.play(planeTo(I2).concat([plane.rotateTo(0), lab1.rotateTo(0), lab2.rotateTo(0)]), { duration: 5, ease: "smooth" });
  s.wait(2);

  // 4. the same result as ONE motion: (1-t) I + t (S R), no stop in the middle
  s.play(planeTo(T), { duration: 8, ease: "smooth" });
  s.wait(3.5);

  // 5. one linear map, one matrix: which one?
  s.play([frame.fadeIn(), bracket.fadeIn()], { duration: 2, ease: "smooth" });
  s.wait(0.5);
  s.play(question.fadeIn(), { duration: 1.5, ease: "smooth" });
  s.wait(5);

  // ---------- handoff ----------
  s.keep(ghost);
  s.keep(plane);
  s.keep(mask);
  s.keep(panel);
  s.keep(matR);
  s.keep(matS);
  s.keep(frame);
  s.keep(bracket);
  s.keep(question);
});
