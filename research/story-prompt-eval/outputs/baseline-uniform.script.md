# Pointwise is not uniform

## Beat 1 — Who chooses the threshold?

Content needed: Define pointwise convergence on D as: for every x in D and epsilon>0 there exists N such that all n>=N satisfy |f_n(x)-f(x)|<epsilon. Uniform convergence: for every epsilon>0 there exists N such that for every x in D and every n>=N the inequality holds. Compare N(x,epsilon) with N(epsilon).

Narration: Pointwise convergence means this: for each point x and each positive tolerance epsilon, there is a threshold N beyond which every function value is within epsilon of the limit at that point. The threshold may depend on x.

Narration: Uniform convergence asks for more. For each positive epsilon, one threshold must work at every point, for every index beyond that threshold. We choose N before anyone chooses x.

Narration: Both definitions require all later indices. The difference is whether the threshold can adapt to the point. For x to the power n, how much does that freedom matter? Compare the interval from zero to one with an interval stopping short of one.

## Beat 2 — Find the actual limit

Content needed: For n>=1, f_n(x)=x^n on [0,1]. The pointwise limit is zero for 0<=x<1 and one at x=1. Preserve the open endpoint at (1,0) and filled endpoint at (1,1). Error is x^n below one and zero at one. Illustrate with n=1,2,8,32 and fixed probes x=1/2,9/10,1.

Narration: Fix x strictly between zero and one. Repeated multiplication by that fixed number gives a geometric sequence tending to zero. At zero, every term is already zero. But at one, every power is one. The pointwise limit is zero below one, and one at the endpoint.

Narration: This endpoint matters for the error. Below one, the error is x to the power n. At one, the error is zero: the function and its limit are both one.

Narration: One half settles toward zero quickly; nine tenths more slowly. Each fixed point eventually meets any positive tolerance. But this lets the threshold change with the point. It supplies no threshold for the whole interval.

## Beat 3 — Defeat every threshold

Content needed: Fix epsilon=1/4. For every n>=1 choose x_n=(1/2)^(1/n)<1. Its limit value is zero and its error is 1/2. The witness changes with n. For each n, sup over [0,1] of |f_n-f| equals one, approached below one but never attained; endpoint error remains zero. A sampled plot supports this algebraic argument but cannot prove it.

Narration: Set the tolerance to one quarter. For any index n, choose x to be the nth root of one half. This point is below one, so its limit value is zero. Yet its nth power is one half. The error exceeds our tolerance.

Narration: Whatever threshold you propose, choose an index beyond it and then this point. Your threshold fails. The point moves toward one; we are not claiming that one fixed point fails forever. Uniform convergence must withstand this changing choice.

Narration: At every index, errors approach one as x approaches one from below, while the error at one itself is zero. The supremum error is one, although no point attains it. Every fixed point converges, but the uniform error never shrinks. Our defeating point proves failure; the graph illustrates it.

## Beat 4 — Stop short of one

Content needed: Restrict to [0,a] for fixed 0<a<1; the limit is zero everywhere. For n>=1, x^n preserves order on nonnegative x. Withhold maximum-error location and value until Reveal. Show maximum error a^n, tending to zero. Choose N with a^N<epsilon, then x^n<=a^n<=a^N<epsilon for every x in [0,a] and n>=N. N may depend on fixed a and epsilon, not x.

Narration: Restrict the domain to zero through a, with a fixed below one. The limit is zero throughout. For each positive index, raising nonnegative numbers to that power preserves their order.

Invitation (spoken): Where is the largest error on this shorter interval? Take a moment to predict it.

Pause: 5s

Reveal (spoken): At a. Every error is at most a to the power n. That bound tends to zero because a is fixed below one. Choose N so that a to the power N is below epsilon. Every later power is smaller, so this N works for every x.

Narration: N may depend on a and epsilon, but not x. Pointwise convergence handles each fixed point separately. Uniform convergence requires one threshold for the entire fixed domain.