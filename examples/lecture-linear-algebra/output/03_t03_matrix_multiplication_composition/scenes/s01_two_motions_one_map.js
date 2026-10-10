export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- layout ----------
  const OX = -2.5, OY = 0;          // origin of the plane (left two thirds)
  const RAD = 3.15;                 // the grid is drawn inside a disc, so it never reaches the panel
  const N = 3;

  // ---------- fixed text panel (right third), present from the first frame ----------
  const panel = s.rectangle("panel", {
    width: 4.2, height: 7.2, position: [4.6, 0, -0.2],
    fill: "GREY_E", stroke: "GREY_C", strokeWidth: 0.02,
  });

  // ---------- ghost of the original grid (muted, sits behind everything) ----------
  const ghostLines = [];
  const gridSpecs = [];
  for (let i = -N; i <= N; i++) {
    const h = Math.sqrt(RAD * RAD - i * i);
    gridSpecs.push({ id: "v-" + i, base: [[i, -h], [i, h]], axis: i === 0 });
    gridSpecs.push({ id: "h-" + i, base: [[-h, i], [h, i]], axis: i === 0 });
  }
  for (const g of gridSpecs) {
    ghostLines.push(s.line("ghost-" + g.id, {
      points: g.base, position: [OX, OY, -0.1],
      stroke: "GREY_D", strokeWidth: g.axis ? 0.03 : 0.02, opacity: 0,
    }));
  }

  // ---------- the grid: every line lives at the plane's origin, points in plane coordinates ----------
  const movers = [];   // everything that is carried by the linear map
  const gridLines = [];
  for (const g of gridSpecs) {
    const line = s.line("grid-" + g.id, {
      points: g.base, position: [OX, OY, 0],
      stroke: g.axis ? "GREY_B" : "GREY_C", strokeWidth: g.axis ? 0.03 : 0.02, opacity: 0,
    });
    gridLines.push(line);
    movers.push({ h: line, kind: "line", base: g.base });
  }
  const grid = s.group("grid", gridLines);

  // ---------- basis vectors ----------
  const e1 = s.arrow("e1", {
    points: [[0, 0], [1, 0]], position: [OX, OY, 0.1],
    stroke: "GREEN", strokeWidth: 0.075, opacity: 0,
  });
  const e2 = s.arrow("e2", {
    points: [[0, 0], [0, 1]], position: [OX, OY, 0.1],
    stroke: "RED", strokeWidth: 0.075, opacity: 0,
  });
  movers.push({ h: e1, kind: "arrow", base: [[0, 0], [1, 0]] });
  movers.push({ h: e2, kind: "arrow", base: [[0, 0], [0, 1]] });

  // label offsets from the origin (plane coordinates), chosen to stay clear of the arrows
  const P = off => [OX + off[0], OY + off[1], 0.2];
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const L1_START = [0.75, -0.5];
  const L2_START = [0.5, 0.75];
  const L1_MID = rot(L1_START, Math.PI / 4), L1_ROT = rot(L1_START, Math.PI / 2);
  const L2_MID = rot(L2_START, Math.PI / 4), L2_ROT = rot(L2_START, Math.PI / 2);
  const L1_END = [1.25, 0.55];
  const L2_END = L2_ROT;            // the shear leaves e2 alone

  const e1Label = s.latex("e1-label", {
    tex: String.raw`\animpart{sym}{\mathbf{e}_1}`, position: P(L1_START),
    fontSize: 0.42, fill: "GREEN", opacity: 0,
  });
  const e2Label = s.latex("e2-label", {
    tex: String.raw`\animpart{sym}{\mathbf{e}_2}`, position: P(L2_START),
    fontSize: 0.42, fill: "RED", opacity: 0,
  });

  // ---------- panel formulas ----------
  const matS = s.latex("S", {
    tex: String.raw`\animpart{mat}{\begin{bmatrix}1 & 1\\ 0 & 1\end{bmatrix}}`,
    position: [3.68, 2.0], fontSize: 0.4, fill: "GOLD", opacity: 0,
  });
  const matR = s.latex("R", {
    tex: String.raw`\animpart{mat}{\begin{bmatrix}0 & -1\\ 1 & 0\end{bmatrix}}`,
    position: [5.35, 2.0], fontSize: 0.4, fill: "BLUE", opacity: 0,
  });
  const bracket = s.latex("SR_bracket", {
    tex: String.raw`\animpart{mat}{\begin{bmatrix}\phantom{1} & \phantom{-1}\\ \phantom{1} & \phantom{0}\end{bmatrix}}`,
    position: [4.6, 0.4], fontSize: 0.4, fill: "TEAL", opacity: 0,
  });

  // ---------- helpers: the plane as a function of one map ----------
  // local points -> local points; the element's own rotation is applied afterwards
  const morphAll = f => movers.map(m => m.h.morphTo({ kind: m.kind, points: m.base.map(f), closed: false }));
  const rotateAll = a => movers.map(m => m.h.rotateTo(a));
  const ident = p => [p[0], p[1]];
  // shear S acting on the already rotated plane, written in the rotated frame: R^-1 S R
  const shearInRotatedFrame = p => [p[0], p[1] - p[0]];
  // the combined map SR = [[1,-1],[1,0]]
  const SR = p => [p[0] - p[1], p[0]];

  // ================= timeline (45 s) =================
  s.wait(0.5);

  // the plane with e1 and e2
  s.play(
    gridLines.map(l => l.fadeIn()).concat([e1.fadeIn(), e2.fadeIn(), e1Label.fadeIn(), e2Label.fadeIn()]),
    { duration: 1.5, ease: "smooth" },
  );
  s.wait(1.0);

  // R appears, then acts: a quarter turn driven by the angle
  s.play(matR.fadeIn(), { duration: 1.0, ease: "smooth" });
  s.wait(0.5);
  s.play(rotateAll(Math.PI / 4).concat([e1Label.moveTo(P(L1_MID)), e2Label.moveTo(P(L2_MID))]),
    { duration: 2.0, ease: "in" });
  s.play(rotateAll(Math.PI / 2).concat([e1Label.moveTo(P(L1_ROT)), e2Label.moveTo(P(L2_ROT))]),
    { duration: 2.0, ease: "out" });
  s.wait(2.5);

  // S appears to the left of R, then shears the rotated plane (entries blended from the identity)
  s.play(matS.fadeIn(), { duration: 1.0, ease: "smooth" });
  s.wait(0.5);
  s.play(morphAll(shearInRotatedFrame).concat([e1Label.moveTo(P(L1_END))]),
    { duration: 3.5, ease: "smooth" });
  s.wait(2.5);

  // undo smoothly: first the shear, then the rotation
  s.play(morphAll(ident).concat([e1Label.moveTo(P(L1_ROT))]), { duration: 2.5, ease: "smooth" });
  s.wait(0.5);
  s.play(rotateAll(Math.PI / 4).concat([e1Label.moveTo(P(L1_MID)), e2Label.moveTo(P(L2_MID))]),
    { duration: 1.5, ease: "in" });
  s.play(rotateAll(0).concat([e1Label.moveTo(P(L1_START)), e2Label.moveTo(P(L2_START))]),
    { duration: 1.5, ease: "out" });

  // ghost of the original grid, underneath
  s.play(ghostLines.map(l => l.fadeIn()), { duration: 1.0, ease: "smooth" });
  s.wait(1.0);

  // one direct motion: blend the identity into the combined matrix
  s.play(morphAll(SR).concat([e1Label.moveTo(P(L1_END)), e2Label.moveTo(P(L2_END))]),
    { duration: 4.5, ease: "smooth" });
  s.wait(4.0);

  // one map, so one matrix: still unknown
  s.play(bracket.fadeIn(), { duration: 1.5, ease: "smooth" });
  s.wait(3.5);

  // clear the helper
  s.play(ghostLines.map(l => l.fadeOut()), { duration: 1.5, ease: "smooth" });
  for (const l of ghostLines) s.remove(l);
  s.wait(3.5);

  // ---------- handoff ----------
  s.keep(panel);
  for (const l of gridLines) s.keep(l);
  s.keep(grid);
  s.keep(e1);
  s.keep(e2);
  s.keep(e1Label);
  s.keep(e2Label);
  s.keep(matR);
  s.keep(matS);
  s.keep(bracket);
});
