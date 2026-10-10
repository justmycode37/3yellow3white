export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- fixed layout (identical to the previous scene) ----------
  const OX = -2.35;          // origin of the plane
  const U = 1.3;             // world length of one grid unit
  const PX = 4.74;           // centre of the text panel
  const N = 10;              // moving grid: lines -N..N

  // ---------- the running example: quarter-turn R, then shear S ----------
  const th = Math.PI / 2;
  const c = Math.cos(th), sn = Math.sin(th);
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
  const M = mul(Rinv, T);              // the shear, expressed inside the rotated group

  // ---------- objects inherited from the previous scene ----------
  const ghost = s.previous.get("ghost-grid");
  const plane = s.previous.get("grid");
  const mask = s.previous.get("panel-mask");
  const panel = s.previous.get("panel");
  const matR = s.previous.get("matrix-R");
  const matS = s.previous.get("matrix-S");
  const frame = s.previous.get("product-frame");
  const bracket = s.previous.get("product-bracket");
  const question = s.previous.get("product-question");
  const e1 = s.previous.get("e1");
  const e2 = s.previous.get("e2");
  const lab1 = s.previous.get("e1-label");
  const lab2 = s.previous.get("e2-label");

  const lines = [];
  for (let i = -N; i <= N; i++) {
    lines.push({ a: [i, -N], b: [i, N], el: s.previous.get("grid-v-" + i) });
    lines.push({ a: [-N, i], b: [N, i], el: s.previous.get("grid-h-" + i) });
  }
  const E1 = [1, 0], E2 = [0, 1];
  const L1 = [0.62, -0.4], L2 = [-0.4, 0.62];     // home spots of the labels
  const Q1 = [1.42, 1.08];                        // e1 label beside the final tip (1,1), clear of the drop lines
  const Q2 = ap(R, L2);                           // e2 label stays where the rotation puts it

  const lineTo = (A, l) => l.el.morphTo({ kind: "line", points: [W(ap(A, l.a)), W(ap(A, l.b))], closed: false });
  const arrowTo = (A, el, p) => el.morphTo({ kind: "arrow", points: [[0, 0], W(ap(A, p))], closed: false });
  const labelAt = (el, q) => el.moveTo([U * q[0], U * q[1], 0.15]);
  const gridTo = A => lines.map(l => lineTo(A, l)).concat([arrowTo(A, e1, E1), arrowTo(A, e2, E2)]);

  // ---------- helpers created for this scene ----------
  // the line the shear leaves in place: the horizontal axis (gold = shear)
  const glow = s.line("shear-fixed-axis", {
    points: [[OX - 6, 0], [OX + 6, 0]],
    stroke: { color: "GOLD", opacity: 0.45 }, strokeWidth: 0.14,
    position: [0, 0, 0.05], opacity: 0,
  });

  const tip1 = [OX + U, U];
  const dropV = s.line("e1-drop-vertical", {
    points: [tip1, [tip1[0], tip1[1] - 0.02]],
    stroke: "GREY_B", strokeWidth: 0.05, position: [0, 0, 0.08], opacity: 0,
  });
  const dropH = s.line("e1-drop-horizontal", {
    points: [tip1, [tip1[0] - 0.02, tip1[1]]],
    stroke: "GREY_B", strokeWidth: 0.05, position: [0, 0, 0.08], opacity: 0,
  });
  const ring = s.circle("e2-axis-marker", {
    radius: 0.22, position: [OX - U, 0, 0.08],
    fill: "none", stroke: "GREY_B", strokeWidth: 0.05, opacity: 0,
  });

  // the two columns: same matrix layout as the bracket, so they drop exactly into its cells
  const FS = 0.6;
  const COLX = 1.139 * FS;        // distance of a column centre from the bracket centre
  const STAGE_Y = -2.6;
  const col1 = s.latex("product-col1", {
    tex: String.raw`\begin{matrix}\animpart{top}{1}&\phantom{-1}\\ \animpart{bottom}{1}&\phantom{-1}\end{matrix}`,
    fontSize: FS, fill: "GREEN", position: [PX + COLX, STAGE_Y, 0.62], opacity: 0,
  });
  const col2 = s.latex("product-col2", {
    tex: String.raw`\begin{matrix}\phantom{-1}&\animpart{top}{-1}\\ \phantom{-1}&\animpart{bottom}{0}\end{matrix}`,
    fontSize: FS, fill: "RED", position: [PX - COLX, STAGE_Y, 0.62], opacity: 0,
  });

  // ---------- timeline (45 s) ----------
  s.wait(2);

  // 1. ease back onto the ghost grid: e1 and e2 are home again
  s.play(gridTo(I2).concat([
    plane.rotateTo(0), lab1.rotateTo(0), lab2.rotateTo(0),
    labelAt(lab1, L1), labelAt(lab2, L2),
  ]), { duration: 4, ease: "smooth" });
  s.wait(1);

  // 2. the rotation, by angle: e1 ends pointing up, e2 ends on the horizontal axis
  s.play([plane.rotateTo(th), lab1.rotateTo(-th), lab2.rotateTo(-th)], { duration: 5, ease: "smooth" });
  s.wait(2.5);

  // 3. the shear: e1's tip slides sideways, e2 lies on the fixed axis and stays put
  s.play(gridTo(M).concat([
    labelAt(lab1, ap(Rinv, Q1)),
    glow.fadeIn(),
  ]), { duration: 5, ease: "smooth" });
  s.wait(1.5);
  s.play(glow.fadeOut(), { duration: 1, ease: "smooth" });
  s.remove(glow);

  // same picture, re-expressed without the group rotation (no visible change)
  s.play(gridTo(T).concat([
    plane.rotateTo(0), lab1.rotateTo(0), lab2.rotateTo(0),
    labelAt(lab1, Q1), labelAt(lab2, Q2),
  ]), { duration: 0 });
  s.wait(1);

  // 4. read off e1: drop lines to the axes of the ghost grid, coordinates into column 1
  s.play([
    dropV.fadeIn(), dropH.fadeIn(),
    dropV.morphTo({ kind: "line", points: [tip1, [tip1[0], 0]], closed: false }),
    dropH.morphTo({ kind: "line", points: [tip1, [OX, tip1[1]]], closed: false }),
  ], { duration: 1.5, ease: "smooth" });
  s.wait(0.5);
  s.play(col1.fadeIn(), { duration: 1.2, ease: "smooth" });
  s.wait(1);
  s.play([col1.moveTo([PX, -0.4, 0.62]), question.fadeOut()], { duration: 2, ease: "smooth" });
  s.remove(question);
  s.wait(1);
  s.play([dropV.fadeOut(), dropH.fadeOut()], { duration: 1, ease: "smooth" });
  s.remove(dropV);
  s.remove(dropH);
  s.wait(0.8);

  // 5. read off e2: its tip sits on the horizontal axis, coordinates into column 2
  s.play(ring.fadeIn(), { duration: 1.2, ease: "smooth" });
  s.wait(0.5);
  s.play(col2.fadeIn(), { duration: 1.2, ease: "smooth" });
  s.wait(1);
  s.play(col2.moveTo([PX, -0.4, 0.62]), { duration: 2, ease: "smooth" });
  s.wait(1);
  s.play(ring.fadeOut(), { duration: 1, ease: "smooth" });
  s.remove(ring);

  // hold the finished matrix: green first column, red second column
  s.wait(5.1);

  // ---------- handoff ----------
  s.keep(ghost);
  s.keep(plane);
  s.keep(mask);
  s.keep(panel);
  s.keep(matR);
  s.keep(matS);
  s.keep(frame);
  s.keep(bracket);
  s.keep(col1);
  s.keep(col2);
});
