export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- layout (identical in every scene of the film) ----------
  const OX = -2.6, OY = 0.3, U = 0.6;          // origin and unit length on screen
  const LEFT = -7.11, RIGHT = 2.3, BOTTOM = -4, TOP = 4; // geometry window
  const PX = 4.65;                             // panel centre x

  // image of the plane point (x, y) under the blend I -> diag(2,3) at parameter t
  const P = (x, y, t) => [OX + U * x * (1 + t), OY + U * y * (1 + 2 * t)];
  const mapPts = (pts, t) => pts.map(p => P(p[0], p[1], t));

  // ---------- background grid (present from the first frame) ----------
  const gridLines = [];
  const vLines = [], hLines = [];
  const gridStroke = i => (i === 0 ? { color: Color.GREY_B, opacity: 0.55 } : { color: Color.GREY_C, opacity: 0.38 });
  for (let i = -7; i <= 8; i++) {
    const x = OX + U * i;
    const h = s.line("grid-v-" + i, { points: [[x, BOTTOM], [x, TOP]], stroke: gridStroke(i), strokeWidth: 0.014 });
    vLines.push({ i, h }); gridLines.push(h);
  }
  for (let j = -7; j <= 6; j++) {
    const y = OY + U * j;
    const h = s.line("grid-h-" + j, { points: [[LEFT, y], [RIGHT, y]], stroke: gridStroke(j), strokeWidth: 0.014 });
    hLines.push({ j, h }); gridLines.push(h);
  }
  const grid = s.group("grid", gridLines);

  // grid lines at parameter t: each line moves to its true image, clipped to the window
  const gridActions = t => {
    const acts = [];
    for (const { i, h } of vLines) {
      const x = OX + U * i * (1 + t);
      acts.push(h.morphTo({ kind: "line", points: [[x, BOTTOM], [x, TOP]] }));
      if (OX + U * i * 2 > RIGHT) acts.push(h.animate({ opacity: 1 - t })); // leaves towards the panel
    }
    for (const { j, h } of hLines) {
      const y = OY + U * j * (1 + 2 * t);
      acts.push(h.morphTo({ kind: "line", points: [[LEFT, y], [RIGHT, y]] }));
    }
    return acts;
  };

  // ---------- text panel (created after the grid so it sits in front of it) ----------
  const panel = s.rectangle("panel", {
    position: [PX, 0], width: 4.1, height: 7.2,
    fill: Color.BLACK, stroke: Color.GREY_D, strokeWidth: 0.02,
  });

  // ---------- leaf shape ----------
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
  // a copy of the leaf with exactly the given area, its bounding box's lower-left corner at (minX, minY)
  const makeLeaf = (area, angle, minX, minY) => {
    const k = Math.sqrt(area / polyArea(leafLocal));
    const c = Math.cos(angle), sn = Math.sin(angle);
    const pts = leafLocal.map(p => [k * (p[0] * c - p[1] * sn), k * (p[0] * sn + p[1] * c)]);
    const bx = Math.min(...pts.map(p => p[0])), by = Math.min(...pts.map(p => p[1]));
    return pts.map(p => [p[0] - bx + minX, p[1] - by + minY]);
  };
  const inside = (pts, x, y) => {
    let hit = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const xa = pts[a][0], ya = pts[a][1], xb = pts[b][0], yb = pts[b][1];
      if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) hit = !hit;
    }
    return hit;
  };

  const AREA1 = 0.8, AREA2 = 1.6;
  const leafPts = makeLeaf(AREA1, 0.35, 1.25, 0.2);       // near the origin, first quadrant
  const leaf2Pts = makeLeaf(AREA2, 0.35, -3.4, -2.13);    // twice the area, farther away, third quadrant

  // ---------- core objects ----------
  const sqPts = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const unitSquare = s.path("unit_square", {
    points: mapPts(sqPts, 0), closed: true,
    fill: { color: Color.BLUE, opacity: 0.38 }, stroke: Color.BLUE, strokeWidth: 0.03, opacity: 0,
  });
  const leaf = s.path("leaf", {
    points: mapPts(leafPts, 0), closed: true,
    fill: { color: Color.TEAL, opacity: 0.3 }, stroke: Color.TEAL, strokeWidth: 0.035, opacity: 0,
  });

  // mosaic: the small grid squares (side 1/5) whose centre lies in the leaf
  const CELL = 0.2;
  const mosaic = [];
  for (let a = 0; a < 20; a++) {
    for (let b = 0; b < 12; b++) {
      const x0 = 1 + a * CELL, y0 = b * CELL;
      if (!inside(leafPts, x0 + CELL / 2, y0 + CELL / 2)) continue;
      const pts = [[x0, y0], [x0 + CELL, y0], [x0 + CELL, y0 + CELL], [x0, y0 + CELL]];
      const h = s.path("mosaic-" + a + "-" + b, {
        points: mapPts(pts, 0), closed: true,
        fill: { color: Color.GREY_C, opacity: 0.45 }, stroke: Color.GREY_A, strokeWidth: 0.012, opacity: 0,
      });
      mosaic.push({ pts, h });
    }
  }

  const leaf2 = s.path("leaf-far", {
    points: mapPts(leaf2Pts, 0), closed: true,
    fill: { color: Color.TEAL, opacity: 0.3 }, stroke: Color.TEAL, strokeWidth: 0.035, opacity: 0,
  });

  const O0 = P(0, 0, 0);
  const e1 = s.arrow("e1", { points: [O0, [O0[0] + 0.02, O0[1]]], stroke: Color.GREEN, strokeWidth: 0.065, opacity: 0 });
  const e2 = s.arrow("e2", { points: [O0, [O0[0], O0[1] + 0.02]], stroke: Color.RED, strokeWidth: 0.065, opacity: 0 });

  // ---------- panel contents ----------
  const matrix = s.latex("matrix-A", {
    tex: String.raw`\animpart{A}{A}\animpart{eq}{=}\animpart{mat}{\begin{bmatrix}2&0\\0&3\end{bmatrix}}`,
    position: [PX, 2.35], fontSize: 0.5, fill: Color.WHITE, opacity: 0,
  });
  const ROW_X = 4.75, ICON_X = 3.3;
  const rowTex = from => String.raw`\animpart{from}{` + from + String.raw`}\;\animpart{arrow}{\to}\;\animpart{to}{\animnum{a}}`;
  const fmt = { decimals: 1, digits: 2 };
  const rowSq = s.latex("area-square", {
    tex: rowTex("1.0"), anchor: "arrow", numbers: { a: 1 }, numberFormat: fmt,
    position: [ROW_X, 0.75], fontSize: 0.42, fill: Color.WHITE, opacity: 0,
  });
  const rowLeaf = s.latex("area-leaf", {
    tex: rowTex("0.8"), anchor: "arrow", numbers: { a: AREA1 }, numberFormat: fmt,
    position: [ROW_X, -0.15], fontSize: 0.42, fill: Color.WHITE, opacity: 0,
  });
  const rowLeaf2 = s.latex("area-leaf-far", {
    tex: rowTex("1.6"), anchor: "arrow", numbers: { a: AREA2 }, numberFormat: fmt,
    position: [ROW_X, -1.05], fontSize: 0.42, fill: Color.WHITE, opacity: 0,
  });
  const iconSq = s.rectangle("icon-square", {
    position: [ICON_X, 0.75], width: 0.32, height: 0.32,
    fill: { color: Color.BLUE, opacity: 0.38 }, stroke: Color.BLUE, strokeWidth: 0.025, opacity: 0,
  });
  const iconPts = (size, cx, cy) => {
    const pts = makeLeaf(size, 0.35, 0, 0);
    const mx = (Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2;
    const my = (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2;
    return pts.map(p => [p[0] - mx + cx, p[1] - my + cy]);
  };
  const iconLeaf = s.path("icon-leaf", {
    points: iconPts(0.085, ICON_X, -0.15), closed: true,
    fill: { color: Color.TEAL, opacity: 0.3 }, stroke: Color.TEAL, strokeWidth: 0.022, opacity: 0,
  });
  const iconLeaf2 = s.path("icon-leaf-far", {
    points: iconPts(0.17, ICON_X, -1.05), closed: true,
    fill: { color: Color.TEAL, opacity: 0.3 }, stroke: Color.TEAL, strokeWidth: 0.022, opacity: 0,
  });
  const ratio = s.latex("ratio", {
    tex: String.raw`\animpart{times}{\times}\animpart{six}{6}`,
    position: [PX, -2.3], fontSize: 0.7, fill: Color.YELLOW, opacity: 0,
  });

  // the whole plane at parameter t (one blend parameter drives everything)
  const planeActions = t => {
    const acts = gridActions(t);
    acts.push(e1.morphTo({ kind: "arrow", points: [P(0, 0, t), P(1, 0, t)] }));
    acts.push(e2.morphTo({ kind: "arrow", points: [P(0, 0, t), P(0, 1, t)] }));
    acts.push(unitSquare.morphTo({ kind: "path", points: mapPts(sqPts, t), closed: true }));
    acts.push(leaf.morphTo({ kind: "path", points: mapPts(leafPts, t), closed: true }));
    acts.push(leaf2.morphTo({ kind: "path", points: mapPts(leaf2Pts, t), closed: true }));
    for (const m of mosaic) acts.push(m.h.morphTo({ kind: "path", points: mapPts(m.pts, t), closed: true }));
    return acts;
  };

  // ================= timeline (50 s) =================
  s.wait(1);                                                                    // 1.0

  // basis vectors grow from the origin
  s.play([
    e1.fadeIn(), e2.fadeIn(),
    e1.morphTo({ kind: "arrow", points: [P(0, 0, 0), P(1, 0, 0)] }),
    e2.morphTo({ kind: "arrow", points: [P(0, 0, 0), P(0, 1, 0)] }),
  ], { duration: 1.4, ease: "smooth" });                                        // 2.4
  s.wait(0.4);                                                                  // 2.8

  // unit square fills in
  s.play(unitSquare.fadeIn(), { duration: 1, ease: "smooth" });                 // 3.8
  s.wait(0.5);                                                                  // 4.3

  // leaf, then its mosaic of small squares
  s.play(leaf.fadeIn(), { duration: 1.1, ease: "smooth" });                     // 5.4
  s.wait(0.4);                                                                  // 5.8
  s.play(mosaic.map(m => m.h.fadeIn()), { duration: 1.2, ease: "smooth" });     // 7.0
  s.wait(1.2);                                                                  // 8.2

  // panel: the matrix and the two areas
  s.play(matrix.fadeIn(), { duration: 0.9, ease: "smooth" });                   // 9.1
  s.play([iconSq.fadeIn(), rowSq.fadeIn(), iconLeaf.fadeIn(), rowLeaf.fadeIn()], { duration: 0.9, ease: "smooth" }); // 10.0
  s.wait(1.5);                                                                  // 11.5

  // identity -> diag(2,3): everything stretches together
  s.play(planeActions(1).concat([
    rowSq.countTo({ a: 6 }), rowLeaf.countTo({ a: 6 * AREA1 }),
  ]), { duration: 4, ease: "smooth" });                                         // 15.5
  s.wait(0.8);                                                                  // 16.3
  s.play(ratio.fadeIn(), { duration: 0.8, ease: "smooth" });                    // 17.1
  s.wait(3.4);                                                                  // 20.5

  // back to the original grid for a second, bigger, farther leaf
  s.play(planeActions(0).concat([
    rowSq.countTo({ a: 1 }), rowLeaf.countTo({ a: AREA1 }), ratio.fadeOut(),
  ]), { duration: 3, ease: "smooth" });                                         // 23.5
  s.wait(0.6);                                                                  // 24.1
  s.play([leaf2.fadeIn(), iconLeaf2.fadeIn(), rowLeaf2.fadeIn()], { duration: 1.2, ease: "smooth" }); // 25.3
  s.wait(1.4);                                                                  // 26.7

  // the same smooth stretch again
  s.play(planeActions(1).concat([
    rowSq.countTo({ a: 6 }), rowLeaf.countTo({ a: 6 * AREA1 }), rowLeaf2.countTo({ a: 6 * AREA2 }),
  ]), { duration: 4, ease: "smooth" });                                         // 30.7
  s.wait(0.8);                                                                  // 31.5
  s.play(ratio.fadeIn(), { duration: 0.8, ease: "smooth" });                    // 32.3
  s.wait(3.7);                                                                  // 36.0

  // clear the helpers: mosaic and second leaf
  s.play(mosaic.map(m => m.h.fadeOut()).concat([
    leaf2.fadeOut(), iconLeaf2.fadeOut(), rowLeaf2.fadeOut(),
  ]), { duration: 1.2, ease: "smooth" });                                       // 37.2
  for (const m of mosaic) s.remove(m.h);
  s.remove(leaf2); s.remove(iconLeaf2); s.remove(rowLeaf2);
  s.wait(1);                                                                    // 38.2

  // clear the panel
  s.play([
    matrix.fadeOut(), ratio.fadeOut(), rowSq.fadeOut(), rowLeaf.fadeOut(),
    iconSq.fadeOut(), iconLeaf.fadeOut(),
  ], { duration: 1.2, ease: "smooth" });                                        // 39.4
  s.remove(matrix); s.remove(ratio); s.remove(rowSq); s.remove(rowLeaf);
  s.remove(iconSq); s.remove(iconLeaf);
  s.wait(1);                                                                    // 40.4

  // undo the map smoothly: back to the identity
  const back = gridActions(0);
  back.push(e1.morphTo({ kind: "arrow", points: [P(0, 0, 0), P(1, 0, 0)] }));
  back.push(e2.morphTo({ kind: "arrow", points: [P(0, 0, 0), P(0, 1, 0)] }));
  back.push(unitSquare.morphTo({ kind: "path", points: mapPts(sqPts, 0), closed: true }));
  back.push(leaf.morphTo({ kind: "path", points: mapPts(leafPts, 0), closed: true }));
  s.play(back, { duration: 3.2, ease: "smooth" });                              // 43.6
  s.wait(6.4);                                                                  // 50.0

  s.keep(grid);
  s.keep(panel);
  s.keep(unitSquare);
  s.keep(leaf);
  s.keep(e1);
  s.keep(e2);
});
