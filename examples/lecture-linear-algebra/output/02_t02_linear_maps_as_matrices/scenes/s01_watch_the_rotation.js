export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---- layout -------------------------------------------------------------
  // Frame is about 14.2 x 8 units. Geometry lives in the left two thirds,
  // centred on CX; the panel occupies the right third.
  const CX = -2.4;          // screen x of the plane's origin
  const U = 0.95;           // scene units per grid step
  const R = 3.75;           // bright grid is clipped to a disc of this radius (grid steps)
  const QUARTER = Math.PI / 2;

  // ---- panel (already in place on the first frame) -------------------------
  const panel = s.rectangle("panel", {
    position: [4.65, 0], width: 4.1, height: 7.2,
    fill: { color: "GREY_E", opacity: 0.55 },
    stroke: "GREY_C", strokeWidth: 0.02,
  });

  s.wait(1);

  // ---- faint static reference grid ----------------------------------------
  const refLines = [];
  for (let i = -4; i <= 4; i++) {
    refLines.push(s.line("reference-grid-v-" + i, {
      points: [[CX + i * U, -3.6], [CX + i * U, 3.6]],
      stroke: { color: "GREY_B", opacity: 0.32 }, strokeWidth: 0.018, opacity: 0,
    }));
  }
  for (let j = -3; j <= 3; j++) {
    refLines.push(s.line("reference-grid-h-" + j, {
      points: [[CX - 4.3, j * U], [CX + 4.3, j * U]],
      stroke: { color: "GREY_B", opacity: 0.32 }, strokeWidth: 0.018, opacity: 0,
    }));
  }
  const referenceGrid = s.group("reference-grid", refLines);
  s.play(refLines.map(l => l.fadeIn()), { duration: 1.5, ease: "smooth" });
  s.wait(0.5);

  // ---- bright moving grid (each line pivots about the plane's origin) ------
  const movingLines = [];
  for (let i = -3; i <= 3; i++) {
    const half = Math.sqrt(R * R - i * i) * U;
    const w = i === 0 ? 0.04 : 0.025;
    movingLines.push(s.line("moving-grid-v-" + i, {
      position: [CX, 0], points: [[i * U, -half], [i * U, half]],
      stroke: "BLUE", strokeWidth: w, opacity: 0,
    }));
    movingLines.push(s.line("moving-grid-h-" + i, {
      position: [CX, 0], points: [[-half, i * U], [half, i * U]],
      stroke: "BLUE", strokeWidth: w, opacity: 0,
    }));
  }
  const movingGrid = s.group("moving-grid", movingLines);

  // ---- basis arrows, tracked vector, origin dot ----------------------------
  const e1 = s.arrow("e1-arrow", {
    position: [CX, 0], points: [[0, 0], [U, 0]],
    stroke: "GREEN", strokeWidth: 0.075, opacity: 0,
  });
  const e2 = s.arrow("e2-arrow", {
    position: [CX, 0], points: [[0, 0], [0, U]],
    stroke: "RED", strokeWidth: 0.075, opacity: 0,
  });
  const v = s.arrow("v-arrow", {
    position: [CX, 0], points: [[0, 0], [3 * U, 2 * U]],
    stroke: "YELLOW", strokeWidth: 0.075, opacity: 0,
  });
  const originDot = s.circle("origin-dot", {
    position: [CX, 0], radius: 0.09, fill: "WHITE", stroke: "none", opacity: 0,
  });

  // ---- panel formulas and the tip label ------------------------------------
  const panelV = s.latex("panel-v", {
    tex: "\\animpart{v}{\\mathbf{v}}\\;\\animpart{eq}{=}\\;\\animpart{val}{(3,\\,2)}",
    anchor: "eq", position: [4.35, 2.6], fontSize: 0.5, fill: "YELLOW", opacity: 0,
  });
  const panelTv = s.latex("panel-Tv", {
    tex: "\\animpart{T}{T}\\animpart{lp}{(}\\animpart{v}{\\mathbf{v}}\\animpart{rp}{)}\\;\\animpart{eq}{=}\\;\\animpart{val}{(-2,\\,3)}",
    anchor: "eq", position: [4.35, 1.6], fontSize: 0.5, fill: "YELLOW", opacity: 0,
  });
  const tipLabel = s.latex("v-tip-label", {
    tex: "\\animpart{val}{(-2,\\,3)}",
    position: [CX - 2 * U - 1.05, 3 * U + 0.15], fontSize: 0.38, fill: "WHITE", opacity: 0,
  });

  // ---- build the starting picture, calmly ----------------------------------
  s.play(movingLines.map(l => l.fadeIn()).concat([originDot.fadeIn()]), { duration: 1.5, ease: "smooth" });
  s.wait(0.5);
  s.play([e1.fadeIn(), e2.fadeIn()], { duration: 1, ease: "smooth" });
  s.wait(0.5);
  s.play([v.fadeIn(), panelV.fadeIn()], { duration: 1.2, ease: "smooth" });
  s.wait(3);

  // ---- the whole plane turns by 90 degrees: one angle drives everything -----
  s.play(
    movingLines.map(l => l.rotateTo(QUARTER)).concat([
      e1.rotateTo(QUARTER), e2.rotateTo(QUARTER), v.rotateTo(QUARTER),
    ]),
    { duration: 5, ease: "smooth" },
  );
  s.wait(3);

  // ---- confirm where v landed ----------------------------------------------
  s.play(tipLabel.fadeIn(), { duration: 1, ease: "smooth" });
  s.wait(1.3);
  s.play(panelTv.fadeIn(), { duration: 1.2, ease: "smooth" });
  s.wait(7.8);

  // ---- handoff ---------------------------------------------------------------
  s.keep(panel);
  s.keep(referenceGrid);
  s.keep(movingGrid);
  s.keep(e1);
  s.keep(e2);
  s.keep(v);
  s.keep(originDot);
  s.keep(tipLabel);
  s.keep(panelV);
  s.keep(panelTv);
});
