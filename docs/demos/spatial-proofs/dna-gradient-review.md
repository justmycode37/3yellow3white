# Independent DNA and gradient review

Read-only review by the engine-proof author, who authored neither reviewed scene.
Reviewed current exported sources, numerical evidence, deposited PDB file, style
contract, and final native images. Browser playback and interaction remain the
integrating task's responsibility.

## Verdict

**Both proofs pass this sampled visual/scientific review. No remaining blocker
was found for the normal file-based production compilation path.**

Initial review found space-filling clipping and inaccurate solvent omission
wording. Both are corrected. Representation-aware camera margins keep the final
six-pair space-filling model at `y=[62.98,661.18]` and the central-two model at
`x=[80.63,843.62], y=[63.07,668.41]` in a 960×720 viewport. All four
representation/region combinations fit at inspected times 0, 5, 10 and 14.
New native 16:9 and 4:3 space-filling images confirm those margins. The solvent
note now correctly separates unresolved hydrogens from intentionally omitted
deposited water, and explicitly discloses the uncapped segment boundaries.

Cold-compilation concern was isolated and bounded after atom-template
optimization. Five independent fresh **file-based Bun 1.4.2 processes** using
`node_modules/.bin/bun data/spatial-proofs/dna-review-cold.ts` passed the default
limit (209–239 ms total, including work outside the VM budget). Three independent
fresh Node/V8 processes also passed (221–237 ms total). Both use the shipped
`shared/animlib/dist/core.js`, not source-compiler imports. The otherwise identical
`bun -e` eval harness still fails with `EXECUTION_LIMIT`; it is therefore not a
reliable substitute for this tested production file path. No execution limits
were raised. Cold browser-worker behavior remains the gallery integration check.

## Observations supporting the verdict

DNA native images inspected: `dna/1280x720-5.png` (zoomed final hold) and
`dna/960x720-0.png` (overview). The double-stranded atomic construction, sugar and
phosphate backbone, base rings and dashed inter-base contacts are legible against
black. Stable element colors and simple shading preserve the intended visual
language. The final ball-and-stick image leaves small but adequate top/bottom
native-canvas margins; surrounding gallery controls still need browser review.

Source selection takes residues A4–A9 and B16–B21 from the deposited structure,
not fabricated idealized helix coordinates. The coordinate mapping is a rigid
rotation plus translation and common scale, preserving chirality and distances.
Covalent topology is filtered with the same atom indices; dictionary bond orders
remain represented. Hydrogen-bond dashes are explicit donor/acceptor contacts,
not claimed resolved hydrogen atoms or molecular dynamics. PDB headers confirm
X-ray diffraction at 1.90 Å. The retained full coordinate dataset and displayed
subset are clearly distinct in the code.

Winding was independently checked on compiled mesh faces against their supplied
vertex normals. No opposing nondegenerate faces were found in any of the final
four representation/region combinations (10,840, 3,560, 19,680 and 6,560 triangles).
Small ball-and-stick atoms use 12-vertex smooth-shaded icosahedra; space-filling
atoms retain subdivided 42-vertex icospheres. Latest default and variant images
were inspected: silhouettes remain solid, with restrained visible faceting,
while all deposited coordinates and bond identities remain intact.

Retest evidence: `data/spatial-proofs/dna-review-validation.json` records all four
framing/winding checks; `dna-review-six/1280x720-3.png` and
`dna-review-two/960x720-3.png` show corrected final space-filling frames.

Gradient images inspected: `gradient-frames/1280x720-5.png` (final minimum) and
`gradient-frames/960x720-3.png` (descending interior). The surface stays fully
inside both aspects; the gold marker/trail remains visible across the foreground
valley; the final ring identifies the endpoint without label clutter. No constant
camera drift, gratuitous transparency or visual-style departure is present.

The gradient source defines a genuine eight-hidden-unit sine network with 25
parameters and MSE over 21 samples. Its analytic derivatives, Armijo search,
surface samples and path heights share the same objective. Metadata correctly
discloses a two-dimensional affine parameter slice, a monotone logarithmic height
display, and presentation timing rather than full-dimensional training or solver
wall time. The recorded numerical checks support orthonormal slice directions,
decreasing accepted losses, small height interpolation error and mesh clearance.
There are no field/solver controls in this proof; the fixed run and fixed slice
should not be advertised as freely adjustable training. DNA selects are ordinary
compile-time controls, not live deformation of atomic coordinates.

The gradient gallery note now includes the same `−1.8` display-height translation
as its geometry and detailed mathematical notes.

These conclusions cover inspected samples and source invariants, not arbitrary
user orbit angles, every instant of playback, all browsers or continuous collision
proof. Findings were sent to the parent before final integration; this reviewer
did not edit either scene.
