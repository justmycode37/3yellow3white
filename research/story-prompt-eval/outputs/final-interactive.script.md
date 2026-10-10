# When a downhill step goes too far

## Beat 1 — Read the step

Content needed: On white axes, plot f(x)=x² in blue. Mark the current iterate in yellow on the horizontal axis and its corresponding graph point. Begin at x₀=1 with η=0.25. Show f′(1)=2 and x₁=1−0.25·2=0.5, then x₂=0.25. The horizontal displacement is minus η times the derivative; graph-point heights are always recomputed as x². Reveal each arithmetic result with the matching sentence. These are algorithm iterations, not a ball sliding on the curve.

Narration: Gradient descent takes the current value of x and subtracts the learning rate times the derivative. For x squared, that derivative is twice x. So the next x is the current x minus eta times twice x.

Narration: Start at one, with eta equal to one quarter. The derivative is two, so we subtract one half and land at one half. At that new point, the derivative is one. Another step subtracts one quarter, leaving one quarter.

Narration: The yellow positions move toward zero, where the blue curve reaches its minimum. Notice that each step uses the derivative at its own starting point. We are updating a horizontal coordinate, then evaluating its height on the curve.

## Beat 2 — Crossing zero can still converge

Content needed: Retain the curve, axes, and yellow quarter-rate trajectory. Factor the update into xₙ₊₁=(1−2η)xₙ. Introduce q=1−2η only in visual notation; absolute distance to zero scales by |q|. Compare the retained η=0.25 example with a purple η=0.75 trajectory starting again at x₀=1: 1, −0.5, 0.25, −0.125. Corresponding heights are 1, 0.25, 0.0625, 0.015625. Show distance brackets supporting contraction. Reveal |1−2η|<1 iff 0<η<1 with the spoken explanation. Show η=0.5 giving zero in one step.

Narration: To see what changes with the learning rate, factor out x. Each new value is the old value multiplied by one minus twice eta. That multiplier tells us both the direction and the size of every step's result.

Narration: With eta equal to three quarters, the multiplier is negative one half. Starting again at one, we get negative one half, then one quarter, then negative one eighth. The signs alternate, but the distance to zero halves each time. Crossing the minimum does not necessarily mean failing to converge.

Narration: For convergence, we need the multiplier's magnitude below one. That means the multiplier lies between negative one and one, which gives eta between zero and one, excluding the endpoints. Above one half, the signs alternate. At exactly one half, the multiplier is zero: one step reaches the minimum.

## Beat 3 — The boundaries explain failure

Content needed: Preserve the multiplier relationship. Compare trajectories from x₀=1 for η=0, 1, and 1.2: respectively 1→1→1; 1→−1→1; and 1→−1.4→1.96→−2.744. At the matching spoken reveals, show their multipliers 1, −1, and −1.4. Keep curve heights equal to x²; label three snapshots separately rather than overlapping paths. Conclude with an exploration trajectory whose default is the original η=0.25, x₀=1. One optional slider η∈[0,1.2] drives six updates, points, heights, multiplier, and regime readout from the same model. Make the control available after the fixed boundary comparisons so input cannot contradict their narration. No pauses.

Narration: The endpoints reveal why the inequality is strict. At eta equal to zero, the multiplier is one, so nothing moves. At eta equal to one, it is negative one: starting at one, we alternate forever between one and negative one. The function value stays at one.

Narration: Above one, the multiplier is less than negative one. At eta equal to one point two, the values begin one, negative one point four, then one point nine six. Each distance from zero grows by forty percent, and the squared heights grow too.

Narration: Our original quarter-sized rate sits safely inside the contracting interval. For this quadratic, the same multiplier applies everywhere, so we can classify the entire trajectory. Other objectives can have changing curvature; this learning-rate interval is not a universal guarantee.