export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- controls ----------
  const progress = s.slider("motion_progress", {
    label: "progress", default: 2, min: 0, max: 2, step: 0.05,
    position: [0.04, 0.86], width: 200,
  });
  const vx = s.slider("sample_vector_x", {
    label: "v: x", default: 2, min: -3, max: 3, step: 0.5,
    position: [0.25, 0.86], width: 200,
  });

  // ---------- the real maps ----------
  // progress 0..1: rotation by angle aF; progress 1..2: shear by amount kF on top of it.
  const aF = Math.min(progress, 1) * Math.PI / 2;
  const kF = Math.max(progress - 1, 0);
  const c = Math.cos(aF), sn = Math.sin(aF);
  // The plane is a group rotated by the angle. In the group's own coordinates the
  // shear S_k reads L = Rot(-a) S_k Rot(a); blending points linearly towards L p
  // blends the matrix entries from the identity, so every frame is a linear map.
  const L = [[1 + kF * sn * c, kF * c * c], [-kF * sn * sn, 1 - kF * sn * c]];
  const img = p => [L[0][0] * p[0] + L[0][1] * p[1], L[1][0] * p[0] + L[1][1] * p[1]];
  const plus = (p, q) => [p[0] + q[0], p[1] + q[1]];

  // ---------- layout ----------
  const O = [-2.4, 0];   // origin of the plane, centre of the left two thirds
  const U = 0.7;         // one grid unit
  const N = 3;           // grid reaches N units each way

  // ---------- grid ----------
  const lines = [];
  for (let i = -N; i <= N; i++) {
    const axis = i === 0;
    const style = { stroke: axis ? "GREY_C" : "GREY_D", strokeWidth: axis ? 0.028 : 0.018 };
    const vPts = [[i * U, -N * U], [i * U, N * U]];
    const hPts = [[-N * U, i * U], [N * U, i * U]];
    lines.push({ h: s.line("grid-v-" + i, { points: vPts, ...style }), pts: vPts });
    lines.push({ h: s.line("grid-h-" + i, { points: hPts, ...style }), pts: hPts });
  }
  const grid = s.group("grid", lines.map(l => l.h));

  // ---------- vectors and labels (all in the plane's own coordinates) ----------
  const tips = { e1: [U, 0], e2: [0, U], v: [vx * U, U] };
  const vLen = Math.hypot(tips.v[0], tips.v[1]);
  const offs = {
    e1: [0.1, -0.45],
    e2: [-0.45, 0.1],
    v: [0.45 * tips.v[0] / vLen, 0.45 * tips.v[1] / vLen],
  };
  const e1 = s.arrow("e1", { points: [[0, 0], tips.e1], stroke: "GREEN", strokeWidth: 0.07 });
  const e2 = s.arrow("e2", { points: [[0, 0], tips.e2], stroke: "RED", strokeWidth: 0.07 });
  const v = s.arrow("v", { points: [[0, 0], tips.v], stroke: "YELLOW", strokeWidth: 0.07 });
  const arrows = { e1, e2, v };
  const labels = {
    e1: s.latex("e1-label", { tex: "e_1", position: plus(tips.e1, offs.e1), fontSize: 0.45, fill: "GREEN" }),
    e2: s.latex("e2-label", { tex: "e_2", position: plus(tips.e2, offs.e2), fontSize: 0.45, fill: "RED" }),
    v: s.latex("v-label", { tex: "v", position: plus(tips.v, offs.v), fontSize: 0.45, fill: "YELLOW" }),
  };
  const names = ["e1", "e2", "v"];

  const plane = s.group("plane", [grid, e1, e2, v, labels.e1, labels.e2, labels.v], { position: O });

  // ---------- motions ----------
  // Turn the whole plane; labels counter-turn so they stay upright beside their arrows.
  const turn = angle => [plane.rotateTo(angle)].concat(names.map(n => labels[n].rotateTo(-angle)));
  // Shear (on = true) or un-shear (on = false) every line, arrow and label position.
  const shear = on => {
    const f = on ? img : (p => p);
    const acts = lines.map(l => l.h.morphTo({ kind: "line", points: [f(l.pts[0]), f(l.pts[1])] }));
    for (const n of names) {
      acts.push(arrows[n].morphTo({ kind: "arrow", points: [[0, 0], f(tips[n])] }));
      acts.push(labels[n].moveTo(plus(f(tips[n]), offs[n])));
    }
    return acts;
  };

  // ---------- text area ----------
  const matR = s.latex("matrix-R", {
    tex: String.raw`\animpart{name}{R}\animpart{eq}{=}\begin{bmatrix}\animpart{a11}{0}&\animpart{a12}{-1}\\\animpart{a21}{1}&\animpart{a22}{0}\end{bmatrix}`,
    anchor: "eq", position: [4.1, 2.3], fontSize: 0.5, fill: "BLUE", opacity: 0,
  });
  const matS = s.latex("matrix-S", {
    tex: String.raw`\animpart{name}{S}\animpart{eq}{=}\begin{bmatrix}\animpart{a11}{1}&\animpart{a12}{1}\\\animpart{a21}{0}&\animpart{a22}{1}\end{bmatrix}`,
    anchor: "eq", position: [4.1, 0.5], fontSize: 0.5, fill: "GOLD", opacity: 0,
  });
  const originDot = s.circle("origin-dot", {
    position: O, radius: 0.08, fill: "WHITE", stroke: "none", opacity: 0,
  });
  const slot = s.latex("matrix-slot", {
    tex: String.raw`\begin{bmatrix}\phantom{0}&\phantom{-1}\\\phantom{1}&\phantom{0}\end{bmatrix}`,
    position: [5.4, -1.3], fontSize: 0.5, fill: "GREY_C", opacity: 0,
  });

  const DIM = 0.4;

  // ---------- timeline (50 s) ----------
  s.wait(1.5);
  s.play([matR.animate({ opacity: DIM }), matS.animate({ opacity: DIM })], { duration: 1.5, ease: "smooth" });
  s.wait(1.5);

  // Stage 1: the rotation acts on the plane.
  s.play(matR.animate({ opacity: 1 }), { duration: 0.8, ease: "smooth" });
  s.play(turn(aF), { duration: 4.5, ease: "smooth" });
  s.wait(2.5);

  // Stage 2: the shear acts on what the rotation produced.
  s.play([matR.animate({ opacity: DIM }), matS.animate({ opacity: 1 })], { duration: 0.8, ease: "smooth" });
  s.play(shear(true), { duration: 4.5, ease: "smooth" });
  s.wait(3);

  // Undo smoothly back to the starting grid.
  s.play(matS.animate({ opacity: DIM }), { duration: 0.8, ease: "smooth" });
  s.play(turn(0).concat(shear(false)), { duration: 3.5, ease: "smooth" });
  s.wait(1.5);

  // Replay as ONE continuous motion: at each instant the plane is Rot(t a) (I + t (L - I)).
  s.play([matR.animate({ opacity: 1 }), matS.animate({ opacity: 1 }), originDot.fadeIn()], { duration: 1, ease: "smooth" });
  s.play(turn(aF).concat(shear(true)), { duration: 7, ease: "smooth" });
  s.wait(4);

  s.play(originDot.fadeOut(), { duration: 0.8, ease: "smooth" });
  s.remove(originDot);
  s.wait(0.8);

  // A linear motion must have a matrix: its place is still empty.
  s.play(slot.animate({ opacity: 0.8 }), { duration: 1.2, ease: "smooth" });
  s.wait(4);
  s.play(slot.fadeOut(), { duration: 1.2, ease: "smooth" });
  s.remove(slot);
  s.wait(3.6);

  s.keep(plane);
  s.keep(matR);
  s.keep(matS);
});
