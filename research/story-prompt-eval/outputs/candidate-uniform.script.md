# Pointwise is not uniform

## Beat 1 — Who chooses the threshold?

Content needed: Begin with the two definitions on a domain D: pointwise, for every x in D and every epsilon > 0, there exists N such that all n >= N satisfy |f_n(x)-f(x)| < epsilon; uniform, for every epsilon > 0, there exists N such that every x in D and every n >= N satisfy the same inequality. Mark N=N(x,epsilon) versus N=N(epsilon). Use identical error notation and distinguish the order of the quantifiers.

Narration: Pointwise convergence means this: for every point x and every positive tolerance epsilon, there is a threshold N after which the difference between f n of x and f of x is smaller than epsilon. The threshold may depend on the point as well as the tolerance.

Narration: Uniform convergence changes the order. For every positive epsilon, there is one threshold N that works for every point x, for all indices beyond that threshold. We choose the tolerance, then the threshold, before knowing which point will be tested. Both definitions demand that every later index works. The difference is whether different points can need different thresholds.

## Beat 2 — Find the limit, including the endpoint

Content needed: On D=[0,1], f_n(x)=x^n for integer n>=1. Graph selected powers n=1,2,8,32 with fixed axes, then retain one current curve. Pointwise limit f(x)=0 for 0<=x<1 and f(1)=1. The limit graph has an open marker at (1,0) and filled marker at (1,1). Error e_n(x)=|f_n(x)-f(x)| is x^n below 1 but is 0 at 1. Introduce error only after establishing the limit.

Narration: Consider x to the power n on the closed interval from zero to one. At any fixed point strictly between zero and one, repeated multiplication by that same number drives the value to zero. At zero, every value is already zero. At one, however, every value is one.

Narration: So the pointwise limit is zero below one, and one at the endpoint. Keep that endpoint: we are not comparing our functions with the zero function everywhere. Below one, the error is x to the power n. At one, the error is zero, because the function and its limit both equal one. As n grows, the graph drops near each fixed interior point. Does that give a common threshold?

## Beat 3 — Let the test point move

Content needed: Initially show the current power curve and established limit only. Pose the prediction for epsilon=1/4 without a witness, half-height guide, answer label, or highlighted near-endpoint region during the pause. At Reveal introduce x_n=2^(-1/n), with 0<x_n<1 and x_n^n=1/2. For increasing n, calculate the witness and curve from the same exponent; the witness approaches 1 from below while its error remains 1/2. Show e_n(1)=0 separately. State sup_{x in [0,1]} e_n(x)=1, not attained, only after the witness argument.

Invitation (spoken): Set the tolerance to one quarter. Could some index make the error smaller than this at every point? Take a few seconds to decide, remembering that the test point can depend on the index.

Pause: 5s

Reveal (spoken): No. For any positive index n, choose x to be the nth root of one half. This point lies strictly below one, so its limiting value is zero. But its nth power is exactly one half. Its error therefore exceeds one quarter, however large n is.

Narration: These are different test points, moving toward one. Pointwise convergence holds each point fixed; uniform convergence must also withstand this moving choice. In fact, for each n, errors approach one as x approaches one from below. Their supremum is one, although the error at one itself is zero.

## Beat 4 — A boundary away from one

Content needed: Restrict the same family to [0,a], with fixed 0<a<1. Mark the excluded interval (a,1] before removing it from the active domain. Use a=0.8 only as an illustrative drawing; label the argument for general fixed a. The restricted pointwise limit is identically zero. For every x in [0,a], 0<=x^n<=a^n, so sup_{x in [0,a]}|f_n(x)-0|=a^n -> 0, attained at x=a. For any epsilon>0 choose N with a^N<epsilon; all n>=N have x^n<=a^n<=a^N<epsilon. Threshold depends on a and epsilon, not x.

Narration: Now restrict the domain to zero through a, where a is fixed and strictly less than one. The pointwise limit is zero throughout this smaller interval. Every point x is at most a, so its nth power is at most a to the power n. That upper bound is also attained at a: it is the largest error on the whole interval.

Narration: Because a is fixed below one, its powers tend to zero. Choose a threshold for which a to that power is below epsilon. Every later power is smaller still, and every point's error is bounded by it. This threshold depends on a and epsilon, but not on x. That proves uniform convergence. The restriction supplies a single shrinking error bound; pointwise convergence on the original interval supplied only a separate promise for each fixed point.