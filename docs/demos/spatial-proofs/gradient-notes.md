# Neural-network loss landscape proof

This is a 16-second silent, seekable 3D visualization, not an explanation video.
The scene lives in `shared/animlib/demo/proofs/gradient.ts` and exports
`gradientProof` with standalone sandbox source and representative sample times.

## Mathematical contract

The scalar network has eight sine hidden units:

`f(x;w) = w₂₄ + Σⱼ w₃ⱼ₊₂ sin(w₃ⱼ x + w₃ⱼ₊₁)`, for `j = 0…7`.

All 25 parameters vary within the affine plane `w = w₀ + αu + βv`.
The code defines `w₀` deterministically and constructs orthonormal `u,v` by
normalization and Gram–Schmidt. The remaining 23 orthogonal directions are held
fixed. The optimization is **restricted to this plane**. It does not claim to
show unrestricted training in 25 dimensions.

The objective is mean squared error over 21 equally spaced samples in
`[−π,π]`, with target `sin(1.3x) + 0.35 cos(2.7x)`. The displayed height is
`1.5 ln(1 + MSE) − 1.8`, with horizontal scale `0.65`; the logarithmic height is
explicitly disclosed. Gradients and line search optimize original MSE.

Starting at `(α,β) = (4,4)`, analytic gradients and Armijo backtracking accept
33 steps. The candidate step starts at `0.26`, halves on failure, and requires
`L(new) ≤ L(old) − 0.15 step ‖∇L‖²`. Both coordinates stay in `[−6,6]`.
The run stops when gradient norm falls below `0.008`, at loss
`0.3599092334132828`, down from `6.251853934849474`.

One objective function generates mesh samples, exact gradients, accepted iterates,
coordinate curves and trajectory height samples. The 80×80 surface has 6,561
vertices and 12,800 triangles. Each accepted parameter step is subdivided at
maximum parameter distance `0.022`, producing 264 short animation segments.
Height is reevaluated at those samples; whole descent steps are never interpolated
through the landscape. Gold trace and sphere have explicit small visibility
clearances. Constant arc speed is a presentation choice, not solver wall time.

Numerics are computed once by the module and embedded as immutable scene data.
This preserves the default sandbox execution limit. The source does not fetch,
import, register frame callbacks, or raise compiler limits.

## Evidence

Checked against the actual exported module on 2026-10-10:

- `u·u = 0.9999999999999998`; `v·v = 0.9999999999999999`;
  `u·v = −2.7755575615628914e−17`.
- Analytic derivatives agree with centered finite differences at five points;
  maximum absolute error `1.510871427967686e−10`.
- Every accepted step decreases MSE; smallest observed decrease
  `0.000022533248173306486`.
- All mesh samples equal the same displayed objective exactly.
- Quarter-step trajectory checks: maximum height interpolation error
  `0.00004046230958953956` scene units.
- Trace clearance above either triangulation of its enclosing mesh cell remains
  at least `0.033368546526860686` scene units after subtracting tube radius.
- Five consecutive default-limit compilations passed; duration exactly 16 seconds,
  282 lifecycle events and 264 animation tracks. Source payload is 229,910 bytes.
- `npm run typecheck --workspace animlib` passed.
- Native production WebGPU rendered six times at both 1280×720 and 960×720:
  `0.5, 2.5, 5, 8, 11.5, 15` seconds.

Initial frame inspection showed the final minimum hidden by a foreground ridge
and the domain outline clipped. Only after that inspection, the camera changed
to a higher viewing angle with additional margin. Coordinate sections gained
small clearance to prevent surface z-fighting. Final sheets and individual 4:3
frame were inspected: the full domain, start, evolving trajectory, final marker
and ring are visible. Geometry owns the canvas; fidelity notes remain outside it.

Local reproducible evidence is under ignored `data/spatial-proofs/`:
`gradient-check.ts`, `gradient-evidence.json`, `gradient-input.json`,
`gradient-source.js`, and `gradient-frames/frames.json` plus native PNGs.
The retained source module is the authoritative reproducible construction.

Whole-scene orbit is disabled. Only visible model geometry starts the dedicated
`loss-model` view's orbit. The authored camera remains still. Frame samples do not
constitute exhaustive playback or interaction verification; gallery browser
playback and orbit checks are performed by the integrating task.
