export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- layout (identical to the previous scene) ----------
  const OX = -2.5, OY = 0;
  const RAD = 3.15;
  const N = 3;
  const P = off => [OX + off[0], OY + off[1], 0.2];

  // ---------- objects carried over from scene 1 ----------
  const panel = s.previous.get("panel");
  const grid = s.previous.get("grid");
  const e1 = s.previous.get("e1");
  const e2 = s.previous.get("e2");
  const e1Label = s.previous.get("e1-label");
  const e2Label = s.previous.get("e2-label");
  const matR = s.previous.get("R");
  const matS = s.previous.get("S");
  const bracket = s.previous.get("SR_bracket");

  const gridLines = [];   // { h, base, axis, id }
  for (let i = -N; i <= N; i++) {
    const h = Math.sqrt(RAD * RAD - i * i);
    gridLines.push({ h: s.previous.get("grid-v-" + i), base: [[i, -h], [i, h]], id: "v-" + i });
    gridLines.push({ h: s.previous.get("grid-h-" + i), base: [[-h, i], [h, i]], id: "h-" + i });
  }
  const xAxis = gridLines.find(g => g.id === "h-0").h;

  // ---------- maps ----------
  const SR = p => [p[0] - p[1], p[0]];           // rotate, then shear
  const pt = a => [Math.cos(a), Math.sin(a)];
  const DEG = Math.PI / 180;

  // labels ride outside the unit circle so they never touch arrows or trails
  const LR = 1.45;
  const lab1 = a => [LR * Math.cos(a - 20 * DEG), LR * Math.sin(a - 20 * DEG)];  // trails behind e1
  const lab2 = a => [LR * Math.cos(a + 20 * DEG), LR * Math.sin(a + 20 * DEG)];  // leads e2
  const L1_FINAL = [1.4, 1.4];

  const DIM = 0.25;
  const GRID_DIM = 0.3;

  // ---------- a quarter turn as a chain of small true steps, with a growing trail ----------
  const K = 8;
  const STEP_D = [0.6, 0.28, 0.22, 0.2, 0.2, 0.22, 0.28, 0.6];   // 2.6 s, eased in and out
  const arcPoints = (a0, a1, k) => {
    const pts = [];
    const ak = a0 + (a1 - a0) * k / K;
    for (let j = 0; j <= K; j++) {
      pts.push(j <= k ? pt(a0 + (a1 - a0) * j / K) : pt(ak + (j - k) * 1e-5));
    }
    return pts;
  };
  const makeArcTrail = (id, a0, a1) => s.path(id, {
    points: arcPoints(a0, a1, 0), closed: false, position: [OX, OY, 0.05],
    stroke: "GREY_C", strokeWidth: 0.035, fill: "none",
  });
  const swing = (arrow, label, labFn, trail, a0, a1) => {
    for (let k = 1; k <= K; k++) {
      const a = a0 + (a1 - a0) * k / K;
      s.play([
        arrow.morphTo({ kind: "arrow", points: [[0, 0], pt(a)], closed: false }),
        trail.morphTo({ kind: "path", points: arcPoints(a0, a1, k), closed: false }),
        label.moveTo(P(labFn(a))),
      ], { duration: STEP_D[k - 1], ease: k === 1 ? "in" : k === K ? "out" : "linear" });
    }
  };

  // ================= timeline (50 s) =================
  s.wait(0.5);

  // only the two arrows matter: the grid recedes
  s.play(gridLines.map(g => g.h.animate({ opacity: GRID_DIM })), { duration: 1.5, ease: "smooth" });
  s.wait(0.5);

  // undo the combined motion smoothly, back to the identity
  s.play(
    gridLines.map(g => g.h.morphTo({ kind: "line", points: g.base, closed: false })).concat([
      e1.morphTo({ kind: "arrow", points: [[0, 0], [1, 0]], closed: false }),
      e2.morphTo({ kind: "arrow", points: [[0, 0], [0, 1]], closed: false }),
      e1Label.moveTo(P(lab1(0))),
      e2Label.moveTo(P(lab2(Math.PI / 2))),
    ]),
    { duration: 3.5, ease: "smooth" },
  );
  s.wait(1.5);

  // ---------- follow e1 ----------
  s.play([
    e2.animate({ opacity: DIM }), e2Label.animate({ opacity: DIM }),
    matS.animate({ opacity: DIM }),
  ], { duration: 0.8, ease: "smooth" });

  // R: e1 swings up
  const trail1Arc = makeArcTrail("e1-trail-rotate", 0, Math.PI / 2);
  swing(e1, e1Label, lab1, trail1Arc, 0, Math.PI / 2);
  s.wait(0.6);

  // S: e1 slides sideways to the diagonal
  s.play([matR.animate({ opacity: DIM }), matS.animate({ opacity: 1 })], { duration: 0.6, ease: "smooth" });
  const trail1Shear = s.line("e1-trail-shear", {
    points: [[0, 1], [0.00001, 1]], position: [OX, OY, 0.05],
    stroke: "GREY_C", strokeWidth: 0.035,
  });
  s.play([
    e1.morphTo({ kind: "arrow", points: [[0, 0], [1, 1]], closed: false }),
    trail1Shear.morphTo({ kind: "line", points: [[0, 1], [1, 1]], closed: false }),
    e1Label.moveTo(P(L1_FINAL)),
  ], { duration: 2.4, ease: "smooth" });
  s.wait(2.0);

  // ---------- follow e2 ----------
  s.play([
    e1.animate({ opacity: DIM }), e1Label.animate({ opacity: DIM }),
    e2.animate({ opacity: 1 }), e2Label.animate({ opacity: 1 }),
    matS.animate({ opacity: DIM }), matR.animate({ opacity: 1 }),
  ], { duration: 1.0, ease: "smooth" });

  // R: e2 swings to point left
  const trail2Arc = makeArcTrail("e2-trail-rotate", Math.PI / 2, Math.PI);
  swing(e2, e2Label, lab2, trail2Arc, Math.PI / 2, Math.PI);
  s.wait(0.6);

  // S: e2 lies on the horizontal axis, so nothing moves
  s.play([matR.animate({ opacity: DIM }), matS.animate({ opacity: 1 })], { duration: 0.6, ease: "smooth" });
  s.play([e2.animate({ strokeWidth: 0.12 }), xAxis.animate({ opacity: 1 })], { duration: 1.2, ease: "smooth" });
  s.play([e2.animate({ strokeWidth: 0.075 }), xAxis.animate({ opacity: GRID_DIM })], { duration: 1.2, ease: "smooth" });
  s.wait(1.5);

  // both arrows and both matrices back in view
  s.play([
    e1.animate({ opacity: 1 }), e1Label.animate({ opacity: 1 }),
    matR.animate({ opacity: 1 }),
  ], { duration: 1.0, ease: "smooth" });
  s.wait(1.0);

  // ---------- read off the two landing spots ----------
  const C1_POS = P([2.05, 0.95]);
  const C2_POS = P([-2.0, 0.5]);
  const col1 = s.latex("SR_col1", {
    tex: String.raw`\begin{matrix}\animpart{top}{1}\\ \animpart{bottom}{1}\end{matrix}`,
    position: C1_POS, fontSize: 0.4, fill: "GREEN", opacity: 0,
  });
  const col1Box = s.latex("e1-tip-bracket", {
    tex: String.raw`\animpart{mat}{\begin{bmatrix}\phantom{1}\\ \phantom{1}\end{bmatrix}}`,
    position: C1_POS, fontSize: 0.4, fill: "GREEN", opacity: 0,
  });
  const col2 = s.latex("SR_col2", {
    tex: String.raw`\begin{matrix}\animpart{top}{-1}\\ \animpart{bottom}{0}\end{matrix}`,
    position: C2_POS, fontSize: 0.4, fill: "RED", opacity: 0,
  });
  const col2Box = s.latex("e2-tip-bracket", {
    tex: String.raw`\animpart{mat}{\begin{bmatrix}\phantom{-1}\\ \phantom{0}\end{bmatrix}}`,
    position: C2_POS, fontSize: 0.4, fill: "RED", opacity: 0,
  });
  s.play([col1.fadeIn(), col1Box.fadeIn(), col2.fadeIn(), col2Box.fadeIn()], { duration: 1.2, ease: "smooth" });
  s.wait(2.5);

  // they become the columns of the teal bracket (slot centres from the bmatrix layout, 1em = 0.4)
  const BX = 4.6, BY = 0.4, EM = 0.4;
  s.play([col1.moveTo([BX - 1.139 * EM, BY, 0.2]), col1Box.fadeOut()], { duration: 1.8, ease: "smooth" });
  s.remove(col1Box);
  s.wait(0.6);
  s.play([col2.moveTo([BX + 0.75 * EM, BY, 0.2]), col2Box.fadeOut()], { duration: 1.8, ease: "smooth" });
  s.remove(col2Box);
  s.wait(3.5);

  // ---------- clear the helpers ----------
  s.play([trail1Arc.fadeOut(), trail1Shear.fadeOut(), trail2Arc.fadeOut()], { duration: 1.2, ease: "smooth" });
  s.remove(trail1Arc);
  s.remove(trail1Shear);
  s.remove(trail2Arc);
  s.wait(0.5);

  // the whole plane follows its two arrows: identity blended into SR
  s.play(
    gridLines.map(g => g.h.morphTo({ kind: "line", points: g.base.map(SR), closed: false })),
    { duration: 4.0, ease: "smooth" },
  );
  s.wait(1.0);

  // grid back to normal brightness
  s.play(gridLines.map(g => g.h.animate({ opacity: 1 })), { duration: 1.5, ease: "smooth" });
  s.wait(3.2);

  // ---------- handoff ----------
  s.keep(panel);
  for (const g of gridLines) s.keep(g.h);
  s.keep(grid);
  s.keep(e1);
  s.keep(e2);
  s.keep(e1Label);
  s.keep(e2Label);
  s.keep(matR);
  s.keep(matS);
  s.keep(bracket);
  s.keep(col1);
  s.keep(col2);
});
