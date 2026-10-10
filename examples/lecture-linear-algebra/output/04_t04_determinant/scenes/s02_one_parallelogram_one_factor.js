export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- layout (identical in every scene of the film) ----------
  const OX = -2.6, OY = 0.3, U = 0.6;
  const LEFT = -7.11, RIGHT = 2.3, BOTTOM = -4, TOP = 4;
  const PX = 4.65;

  // the slanted map A = [[2,1],[1,2]] (columns (2,1) and (1,2), area factor 3)
  const A = [[2, 1], [1, 2]];
  const DET = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  // blend I -> A at parameter t (matrix entries are blended, so every frame is a linear map)
  const M = t => [
    [1 + t * (A[0][0] - 1), t * A[0][1]],
    [t * A[1][0], 1 + t * (A[1][1] - 1)],
  ];
  const P = (x, y, t) => {
    const m = M(t);
    return [OX + U * (m[0][0] * x + m[0][1] * y), OY + U * (m[1][0] * x + m[1][1] * y)];
  };
  const mapPts = (pts, t) => pts.map(p => P(p[0], p[1], t));

  // ---------- kept objects from the previous scene ----------
  const grid = s.previous.get("grid");
  const panel = s.previous.get("panel");
  const unitSquare = s.previous.get("unit_square");
  const leaf = s.previous.get("leaf");
  const e1 = s.previous.get("e1");
  const e2 = s.previous.get("e2");
  const vLines = [], hLines = [];
  for (let i = -7; i <= 8; i++) vLines.push({ i, h: s.previous.get("grid-v-" + i), op: 1, pts: null });
  for (let j = -7; j <= 6; j++) hLines.push({ j, h: s.previous.get("grid-h-" + j), op: 1, pts: null });

  // ---------- leaf shape (same construction as before) ----------
  const leafLocal = [];
  leafLocal.push([-0.30, -0.08]);
  leafLocal.push([0, 0.03]);
  const N = 18;
  for (let k = 1; k <= N; k++) { const q = k / N; leafLocal.push([q, 0.45 * Math.sin(Math.PI * q)]); }
  for (let k = N - 1; k >= 1; k--) { const q = k / N; leafLocal.push([q, -0.35 * Math.sin(Math.PI * q)]); }
  leafLocal.push([0, -0.04]);
  leafLocal.push([-0.31, -0.15]);
  const polyArea = pts => {
    let a = 0;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], q = pts[(k + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  };
  const makeLeaf = (area, angle, minX, minY) => {
    const k = Math.sqrt(area / polyArea(leafLocal));
    const c = Math.cos(angle), sn = Math.sin(angle);
    const pts = leafLocal.map(p => [k * (p[0] * c - p[1] * sn), k * (p[0] * sn + p[1] * c)]);
    const bx = Math.min(...pts.map(p => p[0])), by = Math.min(...pts.map(p => p[1]));
    return pts.map(p => [p[0] - bx + minX, p[1] - by + minY]);
  };
  const AREA1 = 0.8;
  const leafPts = makeLeaf(AREA1, 0.35, 1.25, 0.2);
  const sqPts = [[0, 0], [1, 0], [1, 1], [0, 1]];

  // ---------- true image of a grid line at parameter t, clipped to the geometry window ----------
  const clip = (p, d) => {
    let s0 = -40, s1 = 40;
    const edges = [
      [-d[0], p[0] - LEFT], [d[0], RIGHT - p[0]],
      [-d[1], p[1] - BOTTOM], [d[1], TOP - p[1]],
    ];
    for (const [pp, qq] of edges) {
      if (Math.abs(pp) < 1e-9) { if (qq < 0) return null; continue; }
      const r = qq / pp;
      if (pp < 0) { if (r > s1) return null; if (r > s0) s0 = r; }
      else { if (r < s0) return null; if (r < s1) s1 = r; }
    }
    if (s1 - s0 < 1e-3) return null;
    return { pts: [[p[0] + s0 * d[0], p[1] + s0 * d[1]], [p[0] + s1 * d[0], p[1] + s1 * d[1]]], len: s1 - s0 };
  };
  const lineAt = (px, py, dx, dy, t) => {
    const m = M(t);
    const p = P(px, py, t);
    let d = [m[0][0] * dx + m[0][1] * dy, m[1][0] * dx + m[1][1] * dy];
    const n = Math.hypot(d[0], d[1]);
    d = [d[0] / n, d[1] / n];
    return clip(p, d);
  };
  const lineActions = (rec, c) => {
    const acts = [];
    const op = c ? Math.min(1, c.len / 1.2) : 0;
    if (c) { acts.push(rec.h.morphTo({ kind: "line", points: c.pts })); rec.pts = c.pts; }
    if (Math.abs(op - rec.op) > 1e-6) { acts.push(rec.h.animate({ opacity: op })); rec.op = op; }
    return acts;
  };
  // the whole plane at parameter t
  const planeActions = t => {
    let acts = [];
    for (const rec of vLines) acts = acts.concat(lineActions(rec, lineAt(rec.i, 0, 0, 1, t)));
    for (const rec of hLines) acts = acts.concat(lineActions(rec, lineAt(0, rec.j, 1, 0, t)));
    acts.push(e1.morphTo({ kind: "arrow", points: [P(0, 0, t), P(1, 0, t)] }));
    acts.push(e2.morphTo({ kind: "arrow", points: [P(0, 0, t), P(0, 1, t)] }));
    acts.push(unitSquare.morphTo({ kind: "path", points: mapPts(sqPts, t), closed: true }));
    acts.push(leaf.morphTo({ kind: "path", points: mapPts(leafPts, t), closed: true }));
    return acts;
  };

  // ---------- panel: matrix A with coloured columns ----------
  const MY = 2.35;
  const matLabel = s.latex("matrix-A-label", {
    tex: String.raw`\animpart{A}{A}\;\animpart{eq}{=}`, anchor: "eq",
    position: [3.75, MY], fontSize: 0.5, fill: Color.WHITE, opacity: 0,
  });
  const BL = 4.2, BR = 5.75, BH = 0.68, BS = 0.13;
  const brLeft = s.path("matrix-A-bracket-left", {
    points: [[BL + BS, MY + BH], [BL, MY + BH], [BL, MY - BH], [BL + BS, MY - BH]], closed: false,
    fill: Color.NONE, stroke: Color.WHITE, strokeWidth: 0.035, opacity: 0,
  });
  const brRight = s.path("matrix-A-bracket-right", {
    points: [[BR - BS, MY + BH], [BR, MY + BH], [BR, MY - BH], [BR - BS, MY - BH]], closed: false,
    fill: Color.NONE, stroke: Color.WHITE, strokeWidth: 0.035, opacity: 0,
  });
  const col1 = s.latex("matrix-A-col1", {
    tex: String.raw`\animpart{a}{2}`, position: [4.62, MY + 0.33], fontSize: 0.5, fill: Color.GREEN, opacity: 0,
  });
  const col1b = s.latex("matrix-A-col1-bottom", {
    tex: String.raw`\animpart{c}{1}`, position: [4.62, MY - 0.33], fontSize: 0.5, fill: Color.GREEN, opacity: 0,
  });
  const col2 = s.latex("matrix-A-col2", {
    tex: String.raw`\animpart{b}{1}`, position: [5.33, MY + 0.33], fontSize: 0.5, fill: Color.RED, opacity: 0,
  });
  const col2b = s.latex("matrix-A-col2-bottom", {
    tex: String.raw`\animpart{d}{2}`, position: [5.33, MY - 0.33], fontSize: 0.5, fill: Color.RED, opacity: 0,
  });
  const matParts = [matLabel, brLeft, brRight, col1, col1b, col2, col2b];
  const matrix = s.group("matrix-A", matParts);

  // ---------- panel: area rows (temporary) ----------
  const ICON_X = 3.2, ROW_X = 4.45, FAC_X = 6.0;
  const Y_SQ = 0.65, Y_LEAF = -0.3;
  const rowTex = (from, to) => String.raw`\animpart{from}{` + from + String.raw`}\;\animpart{arrow}{\to}\;\animpart{to}{` + to + `}`;
  const iconSq = s.rectangle("icon-square", {
    position: [ICON_X, Y_SQ], width: 0.32, height: 0.32,
    fill: { color: Color.BLUE, opacity: 0.38 }, stroke: Color.BLUE, strokeWidth: 0.025, opacity: 0,
  });
  const rowSq = s.latex("area-square", {
    tex: rowTex("1", String(DET)), anchor: "arrow",
    position: [ROW_X, Y_SQ], fontSize: 0.42, fill: Color.WHITE, opacity: 0,
  });
  const iconLeafPts = (() => {
    const pts = makeLeaf(0.085, 0.35, 0, 0);
    const mx = (Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2;
    const my = (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2;
    return pts.map(p => [p[0] - mx + ICON_X, p[1] - my + Y_LEAF]);
  })();
  const iconLeaf = s.path("icon-leaf", {
    points: iconLeafPts, closed: true,
    fill: { color: Color.TEAL, opacity: 0.3 }, stroke: Color.TEAL, strokeWidth: 0.022, opacity: 0,
  });
  const rowLeaf = s.latex("area-leaf", {
    tex: rowTex("0.8", (DET * AREA1).toFixed(1)), anchor: "arrow",
    position: [ROW_X, Y_LEAF], fontSize: 0.42, fill: Color.WHITE, opacity: 0,
  });
  const facTex = String.raw`\animpart{times}{\times}\animpart{val}{` + DET + `}`;
  const facSq = s.latex("factor-square", {
    tex: facTex, position: [FAC_X, Y_SQ], fontSize: 0.46, fill: Color.YELLOW, opacity: 0,
  });
  const facLeaf = s.latex("factor-leaf", {
    tex: facTex, position: [FAC_X, Y_LEAF], fontSize: 0.46, fill: Color.YELLOW, opacity: 0,
  });

  // ---------- panel: det A = (parallelogram) = 3 ----------
  const DY = -1.9;
  const detLabel = s.latex("det-A", {
    tex: String.raw`\animpart{det}{\det A}\;\animpart{eq}{=}`, anchor: "eq",
    position: [4.05, DY], fontSize: 0.5, fill: Color.YELLOW, opacity: 0,
  });
  const IC = 0.2, ICX = 4.78;
  const detIcon = s.path("det-A-icon", {
    points: [[0, 0], [A[0][0], A[1][0]], [A[0][0] + A[0][1], A[1][0] + A[1][1]], [A[0][1], A[1][1]]]
      .map(p => [ICX + IC * (p[0] - (A[0][0] + A[0][1]) / 2), DY + IC * (p[1] - (A[1][0] + A[1][1]) / 2)]),
    closed: true,
    fill: { color: Color.BLUE, opacity: 0.38 }, stroke: Color.BLUE, strokeWidth: 0.025, opacity: 0,
  });
  const detValue = s.latex("det-A-value", {
    tex: String.raw`\animpart{eq}{=}\;\animpart{val}{` + DET + `}`, anchor: "eq",
    position: [5.5, DY], fontSize: 0.5, fill: Color.YELLOW, opacity: 0,
  });

  // ================= timeline (50 s) =================
  s.wait(1);                                                                    // 1.0
  s.play(matParts.map(m => m.fadeIn()), { duration: 1, ease: "smooth" });       // 2.0
  s.wait(1.5);                                                                  // 3.5

  // identity -> A, one blend parameter; each grid line is re-clipped at every step
  const STEPS = 20;
  const smooth = x => x * x * (3 - 2 * x);
  for (let k = 1; k <= STEPS; k++) {
    s.play(planeActions(smooth(k / STEPS)), { duration: 4 / STEPS, ease: "linear" });
  }                                                                             // 7.5
  s.wait(3);                                                                    // 10.5

  // three grid cells from different places glide onto the blue parallelogram
  const target = mapPts(sqPts, 1);
  const cells = [[-3, 2], [0, -3], [2, -2]];
  cells.forEach((c, idx) => {
    const pts = mapPts(sqPts.map(p => [p[0] + c[0], p[1] + c[1]]), 1);
    const cell = s.path("cell-copy-" + idx, {
      points: pts, closed: true,
      fill: { color: Color.GREY_B, opacity: 0.45 }, stroke: Color.GREY_A, strokeWidth: 0.04, opacity: 0,
    });
    s.play(cell.fadeIn(), { duration: 0.7, ease: "smooth" });
    s.wait(0.5);
    s.play(cell.morphTo({ kind: "path", points: target, closed: true }), { duration: 1.6, ease: "smooth" });
    s.wait(1.2);
    s.play(cell.fadeOut(), { duration: 0.6, ease: "smooth" });
    s.remove(cell);
    s.wait(0.3);
  });                                                                           // 25.2
  s.wait(0.9);                                                                  // 26.1

  // the measured areas: square and leaf
  s.play([iconSq.fadeIn(), rowSq.fadeIn(), iconLeaf.fadeIn(), rowLeaf.fadeIn()], { duration: 1, ease: "smooth" }); // 27.1
  s.wait(2.5);                                                                  // 29.6
  s.play([facSq.fadeIn(), facLeaf.fadeIn()], { duration: 0.9, ease: "smooth" }); // 30.5
  s.wait(3);                                                                    // 33.5

  // name it: det A = area of the parallelogram
  s.play([detLabel.fadeIn(), detIcon.fadeIn()], { duration: 1, ease: "smooth" }); // 34.5
  s.wait(0.8);                                                                  // 35.3
  s.play([
    unitSquare.animate({ fill: { color: Color.BLUE, opacity: 0.7 } }),
    detIcon.animate({ fill: { color: Color.BLUE, opacity: 0.7 } }),
  ], { duration: 0.8, ease: "smooth" });                                        // 36.1
  s.play([
    unitSquare.animate({ fill: { color: Color.BLUE, opacity: 0.38 } }),
    detIcon.animate({ fill: { color: Color.BLUE, opacity: 0.38 } }),
  ], { duration: 0.8, ease: "smooth" });                                        // 36.9
  s.wait(0.7);                                                                  // 37.6
  s.play(detValue.fadeIn(), { duration: 0.9, ease: "smooth" });                 // 38.5
  s.wait(3.5);                                                                  // 42.0

  // clear the temporary area rows
  const rows = [iconSq, rowSq, iconLeaf, rowLeaf, facSq, facLeaf];
  s.play(rows.map(r => r.fadeOut()), { duration: 1.2, ease: "smooth" });        // 43.2
  for (const r of rows) s.remove(r);
  s.wait(6.8);                                                                  // 50.0

  s.keep(grid);
  s.keep(panel);
  s.keep(unitSquare);
  s.keep(leaf);
  s.keep(e1);
  s.keep(e2);
  s.keep(matrix);
  s.keep(detLabel);
  s.keep(detIcon);
  s.keep(detValue);
});
