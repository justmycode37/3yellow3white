export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---- Layout (identical in every scene of the film) ----
  // Frame is about 14.2 x 8 scene units. The grid lives in the left two thirds,
  // with the plane's origin at world (OX, OY) and one grid square = 1 scene unit.
  const OX = -2.4;
  const OY = 0;
  const P = (x, y) => [OX + x, OY + y];

  // ---- Grid (muted) ----
  const gridParts = [];
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    gridParts.push(s.line("grid-v-" + i, {
      points: [P(i, -3.6), P(i, 3.6)],
      stroke: { color: "GREY_C", opacity: 0.32 }, strokeWidth: 0.015,
    }));
  }
  for (let j = -3; j <= 3; j++) {
    if (j === 0) continue;
    gridParts.push(s.line("grid-h-" + j, {
      points: [P(-4.4, j), P(4.4, j)],
      stroke: { color: "GREY_C", opacity: 0.32 }, strokeWidth: 0.015,
    }));
  }
  gridParts.push(s.line("axis-x", {
    points: [P(-4.4, 0), P(4.4, 0)], stroke: "GREY_B", strokeWidth: 0.03,
  }));
  gridParts.push(s.line("axis-y", {
    points: [P(0, -3.6), P(0, 3.6)], stroke: "GREY_B", strokeWidth: 0.03,
  }));
  const grid = s.group("grid", gridParts);

  // ---- Text panel (right third) ----
  const PANEL_X = 4.65;
  const panel = s.rectangle("panel", {
    position: [PANEL_X, 0], width: 4.1, height: 7.2,
    fill: { color: "GREY_E", opacity: 0.6 },
    stroke: "GREY_C", strokeWidth: 0.02,
  });

  // ---- Temporary unit-square highlight (created first so it sits under the arrows) ----
  const unitSquare = s.rectangle("unit-square", {
    position: P(0.5, 0.5), width: 1, height: 1,
    fill: { color: "WHITE", opacity: 0.16 },
    stroke: { color: "WHITE", opacity: 0.7 }, strokeWidth: 0.02,
    opacity: 0,
  });

  // ---- Basis arrows: start as tiny invisible stubs at the origin ----
  const VEC_W = 0.075;
  const e1 = s.arrow("e1", {
    points: [P(0, 0), P(0.02, 0)], stroke: "GREEN", strokeWidth: VEC_W, opacity: 0,
  });
  const e2 = s.arrow("e2", {
    points: [P(0, 0), P(0, 0.02)], stroke: "RED", strokeWidth: VEC_W, opacity: 0,
  });

  // ---- Labels beside the tips (appear only after the arrows exist) ----
  const e1Label = s.latex("e1-label", {
    tex: "\\animpart{name}{\\mathbf{e}_1}",
    position: P(0.78, -0.42), fontSize: 0.42, fill: "GREEN", opacity: 0,
  });
  const e2Label = s.latex("e2-label", {
    tex: "\\animpart{name}{\\mathbf{e}_2}",
    position: P(-0.45, 0.78), fontSize: 0.42, fill: "RED", opacity: 0,
  });

  // ---- Panel formulas, colour-matched ----
  const panelE1 = s.latex("panel-basis-e1", {
    tex: "\\animpart{name}{\\mathbf{e}_1}\\animpart{eqhat}{=}\\animpart{hat}{\\hat{\\imath}}\\animpart{eq}{=}\\animpart{open}{(}\\animpart{x}{1}\\animpart{comma}{,\\,}\\animpart{y}{0}\\animpart{close}{)}",
    position: [PANEL_X, 2.6], fontSize: 0.42, fill: "GREEN", opacity: 0,
  });
  const panelE2 = s.latex("panel-basis-e2", {
    tex: "\\animpart{name}{\\mathbf{e}_2}\\animpart{eqhat}{=}\\animpart{hat}{\\hat{\\jmath}}\\animpart{eq}{=}\\animpart{open}{(}\\animpart{x}{0}\\animpart{comma}{,\\,}\\animpart{y}{1}\\animpart{close}{)}",
    position: [PANEL_X, 1.7], fontSize: 0.42, fill: "RED", opacity: 0,
  });
  const panelBasis = s.group("panel_basis", [panelE1, panelE2]);

  // ================= Timeline (30 s) =================
  // Empty grid and empty panel.
  s.wait(2);

  // e1 grows one square to the right.
  s.play([
    e1.fadeIn(),
    e1.morphTo({ kind: "arrow", points: [P(0, 0), P(1, 0)] }),
  ], { duration: 2.5, ease: "smooth" });
  s.wait(2);

  // e2 grows one square upward.
  s.play([
    e2.fadeIn(),
    e2.morphTo({ kind: "arrow", points: [P(0, 0), P(0, 1)] }),
  ], { duration: 2.5, ease: "smooth" });
  s.wait(1.5);

  // The single grid square they span: each is exactly one unit.
  s.play(unitSquare.fadeIn(), { duration: 1, ease: "smooth" });
  s.wait(2.5);
  s.play(unitSquare.fadeOut(), { duration: 1, ease: "smooth" });
  s.remove(unitSquare);
  s.wait(0.5);

  // Name them only now.
  s.play(e1Label.fadeIn(), { duration: 0.8, ease: "smooth" });
  s.wait(0.7);
  s.play(e2Label.fadeIn(), { duration: 0.8, ease: "smooth" });
  s.wait(1.7);

  // Panel: e1 = i-hat = (1, 0), while the green arrow is gently emphasised.
  s.play([
    e1.animate({ strokeWidth: 0.115 }),
    panelE1.fadeIn(),
  ], { duration: 1, ease: "smooth" });
  s.play(e1.animate({ strokeWidth: VEC_W }), { duration: 0.8, ease: "smooth" });
  s.wait(2.2);

  // Panel: e2 = j-hat = (0, 1), while the red arrow is gently emphasised.
  s.play([
    e2.animate({ strokeWidth: 0.115 }),
    panelE2.fadeIn(),
  ], { duration: 1, ease: "smooth" });
  s.play(e2.animate({ strokeWidth: VEC_W }), { duration: 0.8, ease: "smooth" });

  // Hold the finished picture.
  s.wait(4.7);

  // ---- Handoff ----
  s.keep(grid);
  s.keep(panel);
  s.keep(e1);
  s.keep(e2);
  s.keep(e1Label);
  s.keep(e2Label);
  s.keep(panelBasis);
});
