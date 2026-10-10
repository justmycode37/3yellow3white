export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---- layout (identical to the previous scene) -----------------------------
  const CX = -2.4;          // screen x of the plane's origin
  const U = 0.95;           // scene units per grid step
  const R = 3.75;           // bright grid is clipped to a disc of this radius
  const TOTAL = 55;

  // ---- sequential timing helpers that keep track of the clock ---------------
  let clock = 0;
  const P = (actions, duration) => { s.play(actions, { duration, ease: "smooth" }); clock += duration; };
  const W = seconds => { s.wait(seconds); clock += seconds; };

  // ---- carried objects -------------------------------------------------------
  const panel = s.previous.get("panel");
  const referenceGrid = s.previous.get("reference-grid");
  const movingGrid = s.previous.get("moving-grid");
  const e1 = s.previous.get("e1-arrow");
  const e2 = s.previous.get("e2-arrow");
  const v = s.previous.get("v-arrow");
  const originDot = s.previous.get("origin-dot");
  const tipLabel = s.previous.get("v-tip-label");
  const panelV = s.previous.get("panel-v");
  const panelTv = s.previous.get("panel-Tv");

  // Each bright grid line, with its identity end points in grid steps.
  const gridLines = [];
  for (let i = -3; i <= 3; i++) {
    const half = Math.sqrt(R * R - i * i);
    gridLines.push({ h: s.previous.get("moving-grid-v-" + i), a: [i, -half], b: [i, half] });
    gridLines.push({ h: s.previous.get("moving-grid-h-" + i), a: [-half, i], b: [half, i] });
  }

  // Morph the whole plane (grid + arrows) to its image under a map f given in
  // grid steps. End points are blended linearly, so every frame is the map
  // (1 - t) * identity + t * f.
  const identity = p => p;
  const toScene = p => [p[0] * U, p[1] * U];
  const planeTo = f => {
    const actions = gridLines.map(l => l.h.morphTo({ kind: "line", points: [toScene(f(l.a)), toScene(f(l.b))] }));
    actions.push(e1.morphTo({ kind: "arrow", points: [[0, 0], toScene(f([1, 0]))] }));
    actions.push(e2.morphTo({ kind: "arrow", points: [[0, 0], toScene(f([0, 1]))] }));
    actions.push(v.morphTo({ kind: "arrow", points: [[0, 0], toScene(f([3, 2]))] }));
    return actions;
  };
  // A shift moves every object, origin dot included.
  const planeShift = (dx, dy) => gridLines.map(l => l.h.moveTo([CX + dx, dy])).concat([
    e1.moveTo([CX + dx, dy]), e2.moveTo([CX + dx, dy]), v.moveTo([CX + dx, dy]),
    originDot.moveTo([CX + dx, dy]),
  ]);

  // The three test maps (grid steps).
  const shear = p => [p[0] + 0.5 * p[1], p[1]];
  const uneven = p => [p[0] - 0.11 * p[0] * p[0], p[1]];
  const SHIFT = [1.2 * U, -0.4 * U];

  // ---- panel content created for this scene ----------------------------------
  const mapLabel = s.latex("panel-map", {
    tex: "\\animpart{T}{T}\\animpart{colon}{\\,:\\,}\\animpart{dom}{\\mathbb{R}^2}\\animpart{to}{\\;\\to\\;}\\animpart{cod}{\\mathbb{R}^2}",
    position: [4.65, 2.6], fontSize: 0.5, fill: "WHITE", opacity: 0,
  });

  const ICON_X = 3.4, MARK_X = 4.35;
  const ROW_Y = [0.9, -0.3, -1.5];

  // Small icon: a mini grid drawn from segments (local coordinates) plus a dot.
  const makeIcon = (name, y, segments, dot, ring) => {
    const parts = segments.map((seg, k) => s.line("icon-" + name + "-line-" + k, {
      position: [ICON_X, y], points: seg,
      stroke: "BLUE", strokeWidth: 0.025, opacity: 0,
    }));
    if (ring) {
      parts.push(s.circle("icon-" + name + "-ring", {
        position: [ICON_X, y], radius: 0.085,
        fill: "none", stroke: { color: "GREY_B", opacity: 0.8 }, strokeWidth: 0.018, opacity: 0,
      }));
    }
    parts.push(s.circle("icon-" + name + "-dot", {
      position: [ICON_X + dot[0], y + dot[1]], radius: 0.05,
      fill: "WHITE", stroke: "none", opacity: 0,
    }));
    return parts;
  };
  const makeCheck = (name, y) => [s.path("mark-" + name, {
    position: [MARK_X, y], points: [[-0.2, 0.0], [-0.06, -0.16], [0.22, 0.2]], closed: false,
    fill: "none", stroke: "WHITE", strokeWidth: 0.06, opacity: 0,
  })];
  const makeCross = (name, y) => [
    s.line("mark-" + name + "-a", {
      position: [MARK_X, y], points: [[-0.17, -0.17], [0.17, 0.17]],
      stroke: "WHITE", strokeWidth: 0.06, opacity: 0,
    }),
    s.line("mark-" + name + "-b", {
      position: [MARK_X, y], points: [[-0.17, 0.17], [0.17, -0.17]],
      stroke: "WHITE", strokeWidth: 0.06, opacity: 0,
    }),
  ];

  // Icon geometry: 3 x 3 mini grids, step m.
  const m = 0.3;
  const shearSegs = [], shiftSegs = [], unevenSegs = [];
  for (let k = -1; k <= 1; k++) {
    // shear icon
    shearSegs.push([[k * m - 0.5 * m, -m], [k * m + 0.5 * m, m]]);
    shearSegs.push([[-m + 0.5 * k * m, k * m], [m + 0.5 * k * m, k * m]]);
    // shift icon (whole mini grid displaced)
    shiftSegs.push([[k * m + 0.17, -m - 0.1], [k * m + 0.17, m - 0.1]]);
    shiftSegs.push([[-m + 0.17, k * m - 0.1], [m + 0.17, k * m - 0.1]]);
    // uneven icon: horizontals
    unevenSegs.push([[-0.41, k * m], [0.27, k * m]]);
  }
  [-0.41, -0.19, 0, 0.15, 0.27].forEach(x => unevenSegs.push([[x, -m], [x, m]]));

  const row1 = makeIcon("shear", ROW_Y[0], shearSegs, [0, 0], false).concat(makeCheck("shear", ROW_Y[0]));
  const row2 = makeIcon("shift", ROW_Y[1], shiftSegs, [0.17, -0.1], true).concat(makeCross("shift", ROW_Y[1]));
  const row3 = makeIcon("uneven", ROW_Y[2], unevenSegs, [0, 0], false).concat(makeCross("uneven", ROW_Y[2]));

  const linearWord = s.latex("panel-linear", {
    tex: "\\animpart{word}{\\text{linear}}",
    position: [5.5, ROW_Y[0]], fontSize: 0.5, fill: "WHITE", opacity: 0,
  });

  // Faint ring that marks where the origin was during the shift.
  const originRing = s.circle("origin-ring", {
    position: [CX, 0], radius: 0.19,
    fill: "none", stroke: { color: "GREY_B", opacity: 0.85 }, strokeWidth: 0.025, opacity: 0,
  });

  // ---- 1. undo the rotation ---------------------------------------------------
  W(1);
  P([tipLabel.fadeOut(), panelTv.fadeOut()], 1);
  s.remove(tipLabel);
  s.remove(panelTv);
  W(0.5);
  P(gridLines.map(l => l.h.rotateTo(0)).concat([e1.rotateTo(0), e2.rotateTo(0), v.rotateTo(0)]), 3);
  W(0.8);
  P([v.animate({ opacity: 0.35 }), panelV.fadeOut(), mapLabel.fadeIn()], 1);
  s.remove(panelV);
  W(0.7);

  // ---- 2. test one: a shear (passes) -------------------------------------------
  P(planeTo(shear), 3);
  W(2);
  P(row1.map(h => h.fadeIn()), 0.8);
  W(1.4);
  P(planeTo(identity), 2.5);
  W(0.8);

  // ---- 3. test two: a shift (origin leaves its spot) ---------------------------
  P(planeShift(SHIFT[0], SHIFT[1]).concat([originRing.fadeIn()]), 3);
  W(2);
  P(row2.map(h => h.fadeIn()), 0.8);
  W(1.4);
  P(planeShift(0, 0), 2.5);
  P(originRing.fadeOut(), 0.5);
  s.remove(originRing);
  W(0.5);

  // ---- 4. test three: uneven spacing (lines straight, spacing broken) ----------
  P(planeTo(uneven), 3);
  W(2.2);
  P(row3.map(h => h.fadeIn()), 0.8);
  W(1.4);
  P(planeTo(identity), 2.5);
  W(1);

  // ---- 5. only now name the passing kind ---------------------------------------
  P(linearWord.fadeIn(), 1);
  W(3.5);
  const rows = row1.concat(row2, row3);
  P(rows.map(h => h.fadeOut()), 1);
  rows.forEach(h => s.remove(h));
  W(0.3);
  P(linearWord.moveTo([4.65, 1.75]), 1.2);
  W(0.5);
  P(v.animate({ opacity: 1 }), 1);
  W(Math.max(0, TOTAL - clock));

  // ---- handoff -------------------------------------------------------------------
  s.keep(panel);
  s.keep(referenceGrid);
  s.keep(movingGrid);
  s.keep(e1);
  s.keep(e2);
  s.keep(v);
  s.keep(originDot);
  s.keep(mapLabel);
  s.keep(linearWord);
});
