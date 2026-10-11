# Independent long, space-filling DNA review

Reviewed the updated `dna.ts` and actual native images after the user requested a longer DNA strand with touching atoms and no bond lines. This request intentionally changes the previous six-pair ball-and-stick presentation while retaining the existing deposited structure, visual style and scene.

| Gate | Verdict | Evidence |
| --- | --- | --- |
| Reasoning | ready | Default selection includes all 486 deposited heavy atoms in 24 residues: twelve base pairs, without invented repeats. Atom positions use the same rigid coordinate transform; element-specific van der Waals radii supply touching/overlapping molecular volume. Notes correctly state omitted hydrogens/solvent and no molecular dynamics. |
| Visual readability | ready | Inspected 16:9 native sheet at 0, 2, 4.5, 6, 8.5 and 10.5 seconds, and 4:3 final frame at 13.9 seconds. Longer helix stays fully inside the frame. Grooves, rounded atom volumes and element colors remain visible. No sticks, dashed contacts or bond lines appear. |
| Reference style | ready | Same black open stage, restrained grey/blue/red/gold roles and quiet satin finish. The molecule owns the frame, with the existing single groove inspection, zoom and hold. Additional labels or decorative motion were not introduced. |
| Technical delivery | unverified | Reviewed source creates only atom meshes with `stroke: Color.NONE`; covalent/contact rendering and representation controls are removed. Native frame evidence passes. Parent separately checks build, compiler and browser interaction/playback; this reviewer did not inspect complete playback or the central-two-pair control output. |

The meshes are smooth-shaded 42-vertex/80-face approximations to atomic spheres. Van der Waals spheres intentionally overlap for bonded atoms; the result is a molecular-volume visualization, not literal hard balls or an electron-density measurement. The display-treatment note accurately limits the procedural surface finish.

No blocking finding in the reviewed source or frames. Image evidence: `data/spatial-proofs/dna/1280x720-sheet-0.png` and `data/spatial-proofs/dna/960x720-6.png`.
