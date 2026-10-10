export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- control ----------
  const progress = s.slider("motion_progress", {
    label: "progress", default: 2, min: 0, max: 2, step: 0.05,
    position: [0.04, 0.86], width: 200,
  });

  // ---------- the real maps ----------
  // progress 0..1: rotation by angle aF; progress 1..2: shear by amount kF on top of it.
  const aF = Math.min(progress, 1) * Math.PI / 2;
  const kF = Math.max(progress - 1, 0);
  const c = Math.cos(aF), sn = Math.sin(aF);
  // Shear expressed in the rotated plane's own coordinates: L = Rot(-a) S_k Rot(a).
  const L = [[1 + kF * sn * c, kF * c * c], [-kF * sn * sn, 1 - kF * sn * c]];
  const img = p => [L[0][0] * p[0] + L[0][1] * p[1], L[1][0] * p[0] + L[1][1] * p[1]];
  const plus = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const rot = p => [c * p[0] - sn * p[1], sn * p[0] + c * p[1]];
  // Combined matrix M = S_k Rot(a): its columns are the final landing spots.
  const M = [[c + kF * sn, -sn + kF * c], [sn, c]];
  const VX = 2, VY = 1;
  const res = [M[0][0] * VX + M[0][1] * VY, M[1][0] * VX + M[1][1] * VY];

  // ---------- layout (same as the previous scene) ----------
  const O = [-2.4, 0];
  const U = 0.7;
  const N = 3;

  // ---------- inherited objects ----------
  const plane = s.previous.get("plane");
  const matR = s.previous.get("matrix-R");
  const matS = s.previous.get("matrix-S");
  const lines = [];
  for (let i = -N; i <= N; i++) {
    lines.push({ h: s.previous.get("grid-v-" + i), pts: [[i * U, -N * U], [i * U, N * U]] });
    lines.push({ h: s.previous.get("grid-h-" + i), pts: [[-N * U, i * U], [N * U, i * U]] });
  }
  const tips = { e1: [U, 0], e2: [0, U], v: [VX * U, VY * U] };
  const vLen = Math.hypot(tips.v[0], tips.v[1]);
  const offs = {
    e1: [0.1, -0.45],
    e2: [-0.45, 0.1],
    v: [0.45 * tips.v[0] / vLen, 0.45 * tips.v[1] / vLen],
  };
  const arrows = { e1: s.previous.get("e1"), e2: s.previous.get("e2"), v: s.previous.get("v") };
  const labels = {
    e1: s.previous.get("e1-label"),
    e2: s.previous.get("e2-label"),
    v: s.previous.get("v-label"),
  };
  const names = ["e1", "e2", "v"];

  // ---------- trails and stop markers (screen-oriented, centred on the origin) ----------
  const SEG = 24;
  const hasArc = aF > 1e-3;
  const delta = aF / SEG;
  const TRAIL = { stroke: "GREY_B", strokeWidth: 0.035 };
  const trailParts = [];
  const arcSegs = [];
  const startAngle = { e1: 0, e2: Math.PI / 2 };
  const basis = ["e1", "e2"];
  if (hasArc) {
    for (const n of basis) {
      for (let i = 0; i < SEG; i++) {
        const h = s.line("trail-" + n + "-arc-" + i, {
          points: [[U, 0], [U, 0.002]], rotation: startAngle[n], ...TRAIL,
        });
        arcSegs.push({ h, target: startAngle[n] + i * delta });
        trailParts.push(h);
      }
    }
  }
  // Stop after the rotation, and the straight push of the shear (in units of U).
  const stops = { e1: rot([1, 0]), e2: rot([0, 1]) };
  const finals = { e1: [M[0][0], M[1][0]], e2: [M[0][1], M[1][1]] };
  const pushes = [];
  const dots = [];
  for (const n of basis) {
    const P = [stops[n][0] * U, stops[n][1] * U];
    const Q = [finals[n][0] * U, finals[n][1] * U];
    const len = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    if (len > 1e-3) {
      const tiny = [P[0] + 0.002 * (Q[0] - P[0]) / len, P[1] + 0.002 * (Q[1] - P[1]) / len];
      const h = s.line("trail-" + n + "-push", { points: [P, tiny], ...TRAIL });
      pushes.push({ h, P, Q });
      trailParts.push(h);
    }
    const d = s.circle("stop-" + n, { position: P, radius: 0.075, fill: "GREY_B", stroke: "none", opacity: 0 });
    dots.push(d);
    trailParts.push(d);
  }
  const trails = s.group("trails", trailParts, { position: O });

  // ---------- motions ----------
  const turn = angle => {
    const acts = [plane.rotateTo(angle)].concat(names.map(n => labels[n].rotateTo(-angle)));
    if (angle !== 0) {
      for (const g of arcSegs) {
        acts.push(g.h.rotateTo(g.target));
        acts.push(g.h.morphTo({ kind: "line", points: [[U, 0], [U * Math.cos(delta), U * Math.sin(delta)]] }));
      }
    }
    return acts;
  };
  const shear = on => {
    const f = on ? img : (p => p);
    const acts = lines.map(l => l.h.morphTo({ kind: "line", points: [f(l.pts[0]), f(l.pts[1])] }));
    for (const n of names) {
      acts.push(arrows[n].morphTo({ kind: "arrow", points: [[0, 0], f(tips[n])] }));
      acts.push(labels[n].moveTo(plus(f(tips[n]), offs[n])));
    }
    if (on) for (const p of pushes) acts.push(p.h.morphTo({ kind: "line", points: [p.P, p.Q] }));
    return acts;
  };

  // ---------- combined matrix (text area, below R and S) ----------
  const fmt = x => {
    const r = Math.round(x * 10) / 10;
    return r === 0 ? "0" : String(r);
  };
  const ph = x => String.raw`\phantom{` + x + "}";
  const m11 = fmt(M[0][0]), m12 = fmt(M[0][1]), m21 = fmt(M[1][0]), m22 = fmt(M[1][1]);
  const FS = 0.5;
  const SLOT = [5.4, -1.3];
  const strut = String.raw`\vphantom{\begin{bmatrix}0\\0\end{bmatrix}}`;
  const emWidth = str => {
    let w = 0;
    for (const ch of str) w += ch === "-" ? 0.78 : ch === "." ? 0.28 : 0.5;
    return w;
  };
  const w1 = Math.max(emWidth(m11), emWidth(m21)), w2 = Math.max(emWidth(m12), emWidth(m22));
  // Horizontal offset of each visible column from the centre of the whole matrix.
  const colOff = { e1: -(1 + w2) / 2 * FS, e2: (1 + w1) / 2 * FS };
  // Each column first appears beside its arrow's tip, beyond the label.
  const tipScreen = n => [O[0] + finals[n][0] * U, O[1] + finals[n][1] * U];
  const nearTip = n => {
    const lo = rot(offs[n]);
    const t = tipScreen(n);
    return [t[0] + 3.2 * lo[0] - colOff[n], t[1] + 3.2 * lo[1]];
  };

  const brackets = s.latex("combined-brackets", {
    tex: String.raw`\begin{bmatrix}` + ph(m11) + "&" + ph(m12) + String.raw`\\` + ph(m21) + "&" + ph(m22) + String.raw`\end{bmatrix}`,
    position: SLOT, fontSize: FS, fill: "PURPLE", opacity: 0,
  });
  const col1 = s.latex("combined-col1", {
    tex: String.raw`\left.\begin{matrix}\animpart{a11}{` + m11 + "}&" + ph(m12) + String.raw`\\\animpart{a21}{` + m21 + "}&" + ph(m22) + String.raw`\end{matrix}\right.` + strut,
    position: nearTip("e1"), fontSize: FS, fill: "GREEN", opacity: 0,
  });
  const col2 = s.latex("combined-col2", {
    tex: String.raw`\left.\begin{matrix}` + ph(m11) + String.raw`&\animpart{a12}{` + m12 + String.raw`}\\` + ph(m21) + String.raw`&\animpart{a22}{` + m22 + String.raw`}\end{matrix}\right.` + strut,
    position: nearTip("e2"), fontSize: FS, fill: "RED", opacity: 0,
  });
  const combined = s.group("matrix-combined", [brackets, col1, col2]);

  // ---------- check: M applied to v = (2, 1), column by column ----------
  const colTex = (a, b) => String.raw`\begin{bmatrix}` + a + String.raw`\\` + b + String.raw`\end{bmatrix}`;
  const r1 = fmt(res[0]), r2 = fmt(res[1]);
  const piece = { c1: String(VX), colA: colTex(m11, m21), plus: "+", c2: String(VY), colB: colTex(m12, m22), eq: "=", res: colTex(r1, r2) };
  // Every element typesets the same full row, with the parts it does not own as phantoms,
  // so all pieces line up exactly.
  const row = show => {
    const g = k => "{" + (show.indexOf(k) >= 0 ? piece[k] : ph(piece[k])) + "}";
    return g("c1") + String.raw`\,` + g("colA") + String.raw`\;` + g("plus") + String.raw`\;` + g("c2") + String.raw`\,` + g("colB") + String.raw`\;` + g("eq") + String.raw`\;` + g("res");
  };
  const rowEm = emWidth(piece.c1) + emWidth(piece.c2) + (w1 + 1.35) + (w2 + 1.35)
    + (Math.max(emWidth(r1), emWidth(r2)) + 1.35) + 2 * 0.78 + 2 * 0.17 + 4 * 0.28;
  const CFS = Math.min(0.42, 4.2 / rowEm);
  const CPOS = [4.55, -3.0];
  const mk = (id, show, fill) => s.latex(id, { tex: row(show), position: CPOS, fontSize: CFS, fill, opacity: 0 });
  const chkCoef = mk("check-coefficients", ["c1", "c2"], "YELLOW");
  const chkA = mk("check-col1", ["colA"], "GREEN");
  const chkB = mk("check-col2", ["colB"], "RED");
  const chkSigns = mk("check-signs", ["plus", "eq"], "WHITE");
  const chkRes = mk("check-result", ["res"], "YELLOW");
  const check = s.group("check", [chkCoef, chkA, chkB, chkSigns, chkRes]);

  // Ring that pulses once at the point where v already sits.
  const landing = s.circle("v-landing", {
    position: [O[0] + res[0] * U, O[1] + res[1] * U], radius: 0.16,
    fill: "none", stroke: "YELLOW", strokeWidth: 0.045, opacity: 0, scale: 0.6,
  });

  const DIM = 0.4;
  const V_DIM = 0.25;
  const sm = { ease: "smooth" };

  // ---------- timeline (55 s) ----------
  s.wait(1.5);

  // Undo smoothly back to the starting grid; v steps back.
  s.play(turn(0).concat(shear(false), [
    arrows.v.animate({ opacity: V_DIM }),
    labels.v.animate({ opacity: V_DIM }),
  ]), { duration: 3.5, ...sm });
  s.wait(1.2);

  // Stage 1: the rotation. e1 and e2 leave their trails.
  s.play(matS.animate({ opacity: DIM }), { duration: 0.6, ...sm });
  s.play(turn(aF), { duration: 4.5, ...sm });
  s.play(dots.map(d => d.fadeIn()), { duration: 0.6, ...sm });
  s.wait(1.5);

  // Stage 2: the shear pushes the upright e1 sideways and leaves e2 where it is.
  s.play([matR.animate({ opacity: DIM }), matS.animate({ opacity: 1 })], { duration: 0.6, ...sm });
  s.play(shear(true), { duration: 4.5, ...sm });
  s.wait(3);

  // An empty matrix for the whole motion.
  s.play(matR.animate({ opacity: 1 }), { duration: 0.6, ...sm });
  s.play(brackets.fadeIn(), { duration: 1, ...sm });
  s.wait(1);

  // Where e1 landed -> first column.
  s.play(col1.fadeIn(), { duration: 0.8, ...sm });
  s.wait(1);
  s.play(col1.moveTo(SLOT), { duration: 1.8, ...sm });
  s.wait(1.5);

  // Where e2 landed -> second column.
  s.play(col2.fadeIn(), { duration: 0.8, ...sm });
  s.wait(1);
  s.play(col2.moveTo(SLOT), { duration: 1.8, ...sm });
  s.wait(4.5);

  // Check with v: 2 (first column) + 1 (second column).
  s.play([arrows.v.animate({ opacity: 1 }), labels.v.animate({ opacity: 1 })], { duration: 0.8, ...sm });
  s.wait(0.5);
  s.play([chkCoef.fadeIn(), chkA.fadeIn(), chkB.fadeIn(), chkSigns.fadeIn()], { duration: 1.2, ...sm });
  s.wait(3);
  s.play(chkRes.fadeIn(), { duration: 1, ...sm });
  s.wait(0.8);
  s.play(landing.animate({ opacity: 1, scale: 1.3 }), { duration: 0.8, ...sm });
  s.play(landing.animate({ opacity: 0, scale: 1.9 }), { duration: 0.9, ...sm });
  s.remove(landing);
  s.wait(3.5);

  // Clear the helpers: computation, trails and stop markers.
  s.play([check.fadeOut(), trails.fadeOut()], { duration: 1.5, ...sm });
  s.remove(check);
  s.remove(trails);
  s.wait(3.7);

  s.keep(plane);
  s.keep(matR);
  s.keep(matS);
  s.keep(combined);
});
