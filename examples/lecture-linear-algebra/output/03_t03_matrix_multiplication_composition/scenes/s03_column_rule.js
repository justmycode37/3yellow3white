export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => {
  // ---------- control ----------
  const k = s.slider("shear_amount", {
    label: "Shear amount", default: 1, min: 0, max: 2, step: 0.5,
    position: [0.05, 0.80], width: 220,
  });

  // ---------- fixed layout (identical to the previous scenes) ----------
  const OX = -2.35;          // origin of the plane
  const U = 1.3;             // world length of one grid unit
  const PX = 4.74;           // centre of the text panel
  const N = 10;              // moving grid: lines -N..N

  // ---------- the running example: quarter-turn R, then shear S (amount k) ----------
  const mul = (A, B) => [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  const ap = (A, p) => [A[0][0] * p[0] + A[0][1] * p[1], A[1][0] * p[0] + A[1][1] * p[1]];
  const W = p => [U * p[0], U * p[1]];
  const R = [[0, -1], [1, 0]];
  const S = [[1, k], [0, 1]];
  const T = mul(S, R);                 // first R, then S

  const fmt = v => {
    const r = Math.round(v * 100) / 100;
    if (r === 0) return "0";
    if (Number.isInteger(r)) return String(r);
    return String(parseFloat(r.toFixed(2)));
  };
  const em = str => {
    let w = 0;
    for (const ch of str) w += ch === "-" ? 0.78 : ch === "." ? 0.28 : 0.5;
    return w;
  };
  const kTex = fmt(k);

  // ---------- objects inherited from the previous scene ----------
  const ghost = s.previous.get("ghost-grid");
  const plane = s.previous.get("grid");
  const mask = s.previous.get("panel-mask");
  const panel = s.previous.get("panel");
  const matR = s.previous.get("matrix-R");
  const matS = s.previous.get("matrix-S");
  const frame = s.previous.get("product-frame");
  const bracket = s.previous.get("product-bracket");
  const col1 = s.previous.get("product-col1");
  const col2 = s.previous.get("product-col2");
  const e1 = s.previous.get("e1");
  const e2 = s.previous.get("e2");
  const lab1 = s.previous.get("e1-label");

  const lines = [];
  for (let i = -N; i <= N; i++) {
    lines.push({ a: [i, -N], b: [i, N], el: s.previous.get("grid-v-" + i) });
    lines.push({ a: [-N, i], b: [N, i], el: s.previous.get("grid-h-" + i) });
  }
  const E1 = [1, 0], E2 = [0, 1];
  const QH = [0.42, 1.08];              // e1 label beside the halfway tip (0,1)
  const QF = [k + 0.42, 1.08];          // e1 label beside the final tip (k,1)

  const lineTo = (A, l) => l.el.morphTo({ kind: "line", points: [W(ap(A, l.a)), W(ap(A, l.b))], closed: false });
  const arrowTo = (A, el, p) => el.morphTo({ kind: "arrow", points: [[0, 0], W(ap(A, p))], closed: false });
  const labelAt = (el, q) => el.moveTo([U * q[0], U * q[1], 0.15]);
  const gridTo = A => lines.map(l => lineTo(A, l)).concat([arrowTo(A, e1, E1), arrowTo(A, e2, E2)]);

  // ---------- panel formulas ----------
  const F = 0.42;                       // font size of R and S (as laid out in scene 1)
  const XR = 3.8514, YM = 2.45;         // centre of the R matrix
  const FS = 0.6;                       // font size of the product matrix
  const COLX = 1.139 * FS;              // distance of a product column from the bracket centre
  const YP = -0.4;                      // centre of the product matrix

  const matTex = (name, a, b, c, d) =>
    String.raw`\begin{array}{c}\animpart{name}{` + name + String.raw`}\\[0.25em]\begin{bmatrix}\animpart{a11}{` + a +
    String.raw`}&\animpart{a12}{` + b + String.raw`}\\ \animpart{a21}{` + c + String.raw`}&\animpart{a22}{` + d +
    String.raw`}\end{bmatrix}\end{array}`;

  // R keeps its blue letter and frame; its entries are handed over to two coloured columns
  const frameTexR = String.raw`\begin{array}{c}\animpart{name}{R}\\[0.25em]\begin{bmatrix}\phantom{0}&\phantom{-1}\\ \phantom{1}&\phantom{0}\end{bmatrix}\end{array}`;
  const VP = String.raw`\vphantom{\begin{matrix}0&-1\\ 1&0\end{matrix}}`;
  const PL = String.raw`\phantom{\left[` + VP + String.raw`\right.}`;
  const PR = String.raw`\phantom{\left.` + VP + String.raw`\right]}`;
  const rColTex = body => String.raw`\begin{array}{c}\phantom{R}\\[0.25em]` + PL + body + PR + String.raw`\end{array}`;
  const rc1 = s.latex("matrix-R-col1", {
    tex: rColTex(String.raw`\begin{matrix}\animpart{top}{0}&\phantom{-1}\\ \animpart{bottom}{1}&\phantom{0}\end{matrix}`),
    fontSize: F, fill: "GREEN", position: [XR, YM, 0.62], opacity: 0,
  });
  const rc2 = s.latex("matrix-R-col2", {
    tex: rColTex(String.raw`\begin{matrix}\phantom{0}&\animpart{top}{-1}\\ \phantom{1}&\animpart{bottom}{0}\end{matrix}`),
    fontSize: F, fill: "RED", position: [XR, YM, 0.62], opacity: 0,
  });

  // one line of working:  S [column of R] = [column of the product]
  const FL = 0.5;
  const YL = -2.6;
  const mkLine = (n, color, inTop, inBot, outTop, outBot) => {
    const wS = 0.65, g1 = 0.12, g2 = 0.3, wEq = 0.78;
    const wIn = Math.max(em(inTop), em(inBot)) + 1.16;
    const wOut = Math.max(em(outTop), em(outBot)) + 1.16;
    const total = (wS + g1 + wIn + g2 + wEq + g2 + wOut) * FL;
    let x = PX - total / 2;
    const xS = x + wS * FL / 2; x += (wS + g1) * FL;
    const xIn = x + wIn * FL / 2; x += (wIn + g2) * FL;
    const xEq = x + wEq * FL / 2; x += (wEq + g2) * FL;
    const xOut = x + wOut * FL / 2;
    const id = "working-" + n;
    return {
      letter: s.latex(id + "-S", { tex: "S", fontSize: FL, fill: "GOLD", position: [xS, YL, 0.62], opacity: 0 }),
      input: s.latex(id + "-column-of-R", {
        tex: String.raw`\begin{bmatrix}` + inTop + String.raw`\\ ` + inBot + String.raw`\end{bmatrix}`,
        fontSize: FL, fill: color, position: [xIn, YL, 0.62], opacity: 0,
      }),
      eq: s.latex(id + "-equals", { tex: "=", fontSize: FL, fill: "WHITE", position: [xEq, YL, 0.62], opacity: 0 }),
      outBr: s.latex(id + "-result-bracket", {
        tex: String.raw`\begin{bmatrix}\phantom{` + outTop + String.raw`}\\ \phantom{` + outBot + String.raw`}\end{bmatrix}`,
        fontSize: FL, fill: color, position: [xOut, YL, 0.62], opacity: 0,
      }),
      // result numbers: same size as the product entries once they land (scale 1)
      out: s.latex(id + "-result", {
        tex: String.raw`\begin{matrix}\animpart{top}{` + outTop + String.raw`}\\ \animpart{bottom}{` + outBot + String.raw`}\end{matrix}`,
        fontSize: FS, scale: FL / FS, fill: color, position: [xOut, YL, 0.66], opacity: 0,
      }),
    };
  };
  const line1 = mkLine(1, "GREEN", "0", "1", kTex, "1");
  const line2 = mkLine(2, "RED", "-1", "0", "-1", "0");

  const runLine = (ln, arrow, targetX) => {
    // S meets a column of R; the arrow that column describes glows
    s.play([ln.letter.fadeIn(), ln.input.fadeIn(), arrow.animate({ strokeWidth: 0.15 })], { duration: 1.2, ease: "smooth" });
    s.wait(0.6);
    s.play([ln.eq.fadeIn(), ln.outBr.fadeIn(), ln.out.fadeIn()], { duration: 1.2, ease: "smooth" });
    s.wait(2);
    // the result slides onto the matching column of the product and agrees with it
    s.play([ln.out.moveTo([targetX, YP, 0.66]), ln.out.scaleTo(1), ln.outBr.fadeOut()], { duration: 1.8, ease: "smooth" });
    s.play(ln.out.scaleTo(1.25), { duration: 0.5, ease: "smooth" });
    s.play(ln.out.scaleTo(1), { duration: 0.5, ease: "smooth" });
    s.play([
      ln.letter.fadeOut(), ln.input.fadeOut(), ln.eq.fadeOut(), ln.out.fadeOut(),
      arrow.animate({ strokeWidth: 0.09 }),
    ], { duration: 1, ease: "smooth" });
    s.remove(ln.letter);
    s.remove(ln.input);
    s.remove(ln.eq);
    s.remove(ln.outBr);
    s.remove(ln.out);
  };

  // ---------- timeline (45 s) ----------
  // bring the inherited picture in line with the chosen shear amount (no change at the default)
  if (k !== 1) {
    s.play(gridTo(T).concat([
      labelAt(lab1, QF),
      matS.morphTo({ kind: "latex", tex: matTex("S", "1", kTex, "0", "1"), fontSize: F },
        { map: { name: "name", a11: "a11", a12: "a12", a21: "a21", a22: "a22" } }),
      col1.morphTo({
        kind: "latex",
        tex: String.raw`\begin{matrix}\animpart{top}{` + kTex + String.raw`}&\phantom{-1}\\ \animpart{bottom}{1}&\phantom{-1}\end{matrix}`,
        fontSize: FS,
      }, { map: { top: "top", bottom: "bottom" } }),
    ]), { duration: 0 });
  }
  s.wait(1.5);

  // 1. undo the shear: the plane rests in the halfway position, rotated only
  s.play(gridTo(R).concat([labelAt(lab1, QH)]), { duration: 4, ease: "smooth" });
  s.wait(1.2);

  // 2. the columns of R take the colours of the arrows
  s.play([
    matR.morphTo({ kind: "latex", tex: frameTexR, fontSize: F }, { map: { name: "name" } }),
    rc1.fadeIn(), rc2.fadeIn(),
  ], { duration: 1.8, ease: "smooth" });
  s.wait(0.7);

  // 3. each column pulses with the arrow it describes
  s.play([rc1.scaleTo(1.12), e1.animate({ strokeWidth: 0.15 })], { duration: 0.7, ease: "smooth" });
  s.play([rc1.scaleTo(1), e1.animate({ strokeWidth: 0.09 })], { duration: 0.7, ease: "smooth" });
  s.wait(0.5);
  s.play([rc2.scaleTo(1.12), e2.animate({ strokeWidth: 0.15 })], { duration: 0.7, ease: "smooth" });
  s.play([rc2.scaleTo(1), e2.animate({ strokeWidth: 0.09 })], { duration: 0.7, ease: "smooth" });
  s.wait(2);

  // 4. the shear again, slowly: (1-t) R + t S R
  s.play(gridTo(T).concat([labelAt(lab1, QF)]), { duration: 5, ease: "smooth" });
  s.wait(1.5);

  // 5. S applied to the green column of R
  runLine(line1, e1, PX - COLX);
  s.wait(0.7);

  // 6. S applied to the red column of R
  runLine(line2, e2, PX + COLX);

  // hold: R with coloured columns, S, and the product they produce
  s.wait(5.7);

  // ---------- handoff ----------
  s.keep(ghost);
  s.keep(plane);
  s.keep(mask);
  s.keep(panel);
  s.keep(matR);
  s.keep(rc1);
  s.keep(rc2);
  s.keep(matS);
  s.keep(frame);
  s.keep(bracket);
  s.keep(col1);
  s.keep(col2);
});
