export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---- Layout (identical in every scene of the film) ----
  const OX = -2.4;
  const OY = 0;
  const P = (x, y) => [OX + x, OY + y];
  const PANEL_X = 4.65;
  const VEC_W = 0.075;
  const LABEL_FS = 0.42;

  // ---- Objects carried over from scene 1 ----
  const grid = s.previous.get("grid");
  const panel = s.previous.get("panel");
  const e1 = s.previous.get("e1");
  const e2 = s.previous.get("e2");
  const e1Label = s.previous.get("e1-label");
  const e2Label = s.previous.get("e2-label");
  const panelBasis = s.previous.get("panel_basis");
  const panelE1 = s.previous.get("panel-basis-e1");
  const panelE2 = s.previous.get("panel-basis-e2");

  // ---- New objects (all start invisible) ----
  // v is created before the dot so the dot stays visible on top of the arrow tip.
  const v = s.arrow("v", {
    points: [P(0, 0), P(0.03, 0.02)], stroke: "YELLOW", strokeWidth: VEC_W, opacity: 0,
  });
  const vDot = s.circle("v-dot", {
    position: P(3, 2), radius: 0.1, fill: "YELLOW", stroke: Color.NONE, opacity: 0,
  });
  const vLabel = s.latex("v-label", {
    tex: "\\animpart{name}{\\mathbf{v}}",
    position: P(1.25, 1.38), fontSize: LABEL_FS, fill: "YELLOW", opacity: 0,
  });

  // Panel readouts: the stretching amounts (temporary).
  const xReadout = s.latex("readout-x", {
    tex: "\\animpart{name}{x}\\animpart{eq}{=}\\animnum{val}",
    numbers: { val: 0 }, numberFormat: { decimals: 1, digits: 1 },
    position: [PANEL_X, 1.2], fontSize: 0.46, fill: "GREEN", opacity: 0,
  });
  const yReadout = s.latex("readout-y", {
    tex: "\\animpart{name}{y}\\animpart{eq}{=}\\animnum{val}",
    numbers: { val: 0 }, numberFormat: { decimals: 1, digits: 1 },
    position: [PANEL_X, 0.45], fontSize: 0.46, fill: "RED", opacity: 0,
  });

  // Panel recipe: (3,2) = 3 e1 + 2 e2, one colour per piece.
  const RY = -0.7;
  const RFS = 0.4;
  const recipeV = s.latex("recipe-v", {
    tex: "\\animpart{open}{(}\\animpart{x}{3}\\animpart{comma}{,\\,}\\animpart{y}{2}\\animpart{close}{)}",
    position: [3.43, RY], fontSize: RFS, fill: "YELLOW", opacity: 0,
  });
  const recipeEq = s.latex("recipe-eq", {
    tex: "\\animpart{eq}{=}",
    position: [4.19, RY], fontSize: RFS, fill: "WHITE", opacity: 0,
  });
  const recipeX = s.latex("recipe-x-term", {
    tex: "\\animpart{coef}{3}\\animpart{name}{\\mathbf{e}_1}",
    position: [4.8, RY], fontSize: RFS, fill: "GREEN", opacity: 0,
  });
  const recipePlus = s.latex("recipe-plus", {
    tex: "\\animpart{plus}{+}",
    position: [5.41, RY], fontSize: RFS, fill: "WHITE", opacity: 0,
  });
  const recipeY = s.latex("recipe-y-term", {
    tex: "\\animpart{coef}{2}\\animpart{name}{\\mathbf{e}_2}",
    position: [6.02, RY], fontSize: RFS, fill: "RED", opacity: 0,
  });
  const recipeParts = [recipeV, recipeEq, recipeX, recipePlus, recipeY];
  const panelRecipe = s.group("panel_recipe", recipeParts);

  // ================= Timeline (45 s) =================
  s.wait(1);

  // The target: a dot at (3, 2).
  s.play(vDot.fadeIn(), { duration: 1, ease: "smooth" });
  s.wait(1.5);

  // Basis definitions shrink to the top of the panel.
  s.play([
    panelE1.animate({ scale: 0.85, position: [PANEL_X, 3.05] }),
    panelE2.animate({ scale: 0.85, position: [PANEL_X, 2.45] }),
  ], { duration: 1.5, ease: "smooth" });
  s.wait(0.5);

  // x = 0, then x slides to 3 while e1 itself stretches.
  s.play(xReadout.fadeIn(), { duration: 0.8, ease: "smooth" });
  s.wait(0.7);
  s.play([
    xReadout.countTo({ val: 3 }),
    e1.morphTo({ kind: "arrow", points: [P(0, 0), P(3, 0)] }),
    e1Label.morphTo({
      kind: "latex",
      tex: "\\animpart{coef}{3}\\animpart{name}{\\mathbf{e}_1}",
      fontSize: LABEL_FS,
    }, { map: { name: "name" } }),
    e1Label.moveTo(P(1.5, -0.45)),
  ], { duration: 3.5, ease: "smooth" });
  s.wait(2.5);

  // y = 0, then y slides to 2 while e2 itself stretches.
  s.play(yReadout.fadeIn(), { duration: 0.8, ease: "smooth" });
  s.wait(0.7);
  s.play([
    yReadout.countTo({ val: 2 }),
    e2.morphTo({ kind: "arrow", points: [P(0, 0), P(0, 2)] }),
    e2Label.morphTo({
      kind: "latex",
      tex: "\\animpart{coef}{2}\\animpart{name}{\\mathbf{e}_2}",
      fontSize: LABEL_FS,
    }, { map: { name: "name" } }),
    e2Label.moveTo(P(-0.7, 1)),
  ], { duration: 3, ease: "smooth" });
  s.wait(2);

  // Add tip to tail: 2 e2 glides, direction unchanged, onto the tip of 3 e1.
  s.play([
    e2.morphTo({ kind: "arrow", points: [P(3, 0), P(3, 2)] }),
    e2Label.moveTo(P(3.7, 1)),
  ], { duration: 3, ease: "smooth" });
  s.wait(3);

  // The yellow arrow v grows from the origin to the dot.
  s.play([
    v.fadeIn(),
    v.morphTo({ kind: "arrow", points: [P(0, 0), P(3, 2)] }),
  ], { duration: 2.5, ease: "smooth" });
  s.play(vLabel.fadeIn(), { duration: 0.7, ease: "smooth" });
  s.wait(1.8);

  // Only now: the recipe in the panel.
  s.play(recipeParts.map(p => p.fadeIn()), { duration: 1.5, ease: "smooth" });
  s.wait(3.5);

  // Clear the temporary readouts.
  s.play([xReadout.fadeOut(), yReadout.fadeOut()], { duration: 1, ease: "smooth" });
  s.remove(xReadout);
  s.remove(yReadout);
  s.wait(0.5);

  // Stretched arrows relax back to unit length at the origin.
  s.play([
    e1.morphTo({ kind: "arrow", points: [P(0, 0), P(1, 0)] }),
    e1Label.morphTo({
      kind: "latex",
      tex: "\\animpart{name}{\\mathbf{e}_1}",
      fontSize: LABEL_FS,
    }, { map: { name: "name" } }),
    e1Label.moveTo(P(0.78, -0.42)),
    e2.morphTo({ kind: "arrow", points: [P(0, 0), P(0, 1)] }),
    e2Label.morphTo({
      kind: "latex",
      tex: "\\animpart{name}{\\mathbf{e}_2}",
      fontSize: LABEL_FS,
    }, { map: { name: "name" } }),
    e2Label.moveTo(P(-0.45, 0.78)),
  ], { duration: 3.5, ease: "smooth" });

  // Hold: v alone with its recipe.
  s.wait(4.5);

  // ---- Handoff ----
  s.keep(grid);
  s.keep(panel);
  s.keep(e1);
  s.keep(e2);
  s.keep(e1Label);
  s.keep(e2Label);
  s.keep(panelBasis);
  s.keep(v);
  s.keep(vDot);
  s.keep(vLabel);
  s.keep(panelRecipe);
});
