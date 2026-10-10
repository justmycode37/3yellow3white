# Pointwise is not uniform

## Beat 1 — Where the cutoff may depend on x

Content needed: State pointwise convergence as ∀x∈D ∀ε>0 ∃N ∀n≥N: |f_n(x)−f(x)|<ε, and uniform convergence as ∀ε>0 ∃N ∀x∈D ∀n≥N: |f_n(x)−f(x)|<ε. N is a positive integer. Emphasize allowed dependence N(x,ε) versus N(ε); keep the same error inequality.

Narration: Pointwise convergence means this: for every point x and every positive tolerance epsilon, there is an integer cutoff N such that, for all n at least N, the distance between f sub n of x and f of x is less than epsilon.

Narration: Uniform convergence means that for every positive tolerance epsilon, there is one cutoff N that works for every x in the domain and every n at least N.

Narration: The error test is identical. What changes is when we must choose the cutoff. Pointwise, we may first inspect x and then choose N. Uniformly, we must choose N before knowing which x will be tested. A collection of successful individual choices need not contain one choice that works everywhere. Let us see exactly where that can fail.

## Beat 2 — Keep the endpoint

Content needed: Introduce f_n(x)=x^n for positive integers n on [0,1]. Show selected curves n=1,2,8,32. Derive the pointwise limit f(x)=0 for 0≤x<1 and f(1)=1. In the limit graph, use an open point at (1,0) and filled point at (1,1). Inspect x=1/2 and x=1 separately. Do not substitute distance to zero for error at x=1.

Narration: Take f sub n of x equal to x to the n, on the closed interval from zero to one. At one half, repeated powers approach zero. The same happens at every fixed x strictly below one: powers of a nonnegative number smaller than one tend to zero. At zero, they are already zero.

Narration: But at one, every power is one. So our pointwise limit is zero everywhere below one, and one at the endpoint. That endpoint belongs to the domain; we cannot quietly remove it.

Narration: Now measure error against this actual limit. Below one, the error is x to the n. At one, the error is zero, because both functions equal one. The difficulty must therefore come from points near the endpoint, rather than the endpoint itself.

## Beat 3 — A moving witness

Content needed: For every positive integer n define x_n=(1/2)^(1/n), strictly below one, so x_n^n=1/2. Use ε=1/4. Withhold the prediction's answer until Reveal. Then demonstrate that any proposed N fails already at n=N and x=x_N. Show uniform error E_n=sup_{x∈[0,1]}|x^n−f(x)|=1; this supremum is not attained. Distinguish the changing witness x_n from a fixed x.

Narration: For any positive n, choose x to be the nth root of one half. This point lies strictly below one, and raising it to the nth power gives one half. Its limit value is zero, so its error is one half.

Invitation (spoken): Predict whether any cutoff can make every error smaller than one quarter. Take a few seconds to use this chosen point.

Pause: 5s

Reveal (spoken): No cutoff can work. Whatever cutoff N you propose, take n equal to N and choose that corresponding root. The error is still one half, exceeding one quarter.

Narration: The chosen point changes with n, approaching one. This does not contradict pointwise convergence, which keeps x fixed while n grows. In fact, for every n, errors below one approach one as x approaches one. Their supremum is one, although no point attains it. That uniform error never tends to zero.

## Beat 4 — One bound for the whole interval

Content needed: Restrict the same sequence to [0,a] with fixed 0<a<1. Its pointwise limit is now zero everywhere, and E_n=sup_{x∈[0,a]}x^n=a^n→0. Derive 0≤x^n≤a^n and choose N with a^N<ε; for n≥N, a^n≤a^N<ε. Use a=0.9 and ε=1/4 as an optional visible concrete instance: N=14 works since 0.9^14≈0.229. The bound and cutoff may depend on fixed a and ε, but not x. Conclude the quantifier comparison on this construction.

Narration: Now restrict the domain to the interval from zero to a, where a is fixed and strictly less than one. The pointwise limit is zero throughout this interval.

Narration: Every x is at most a, so every error is at most a to the n. This time the supremum is exactly a to the n, attained at a. And that bound tends to zero.

Narration: Given any positive epsilon, choose N so that a to the N is smaller than epsilon. For every n at least N, and every x in our interval, the error is at most a to the n, which is at most a to the N. So one cutoff works everywhere.

Narration: The cutoff may depend on our fixed endpoint a and on epsilon. It does not depend on x. Restricting the interval gives all points a shared distance from one, and therefore a shared error bound. That is the extra requirement hidden in uniform convergence.