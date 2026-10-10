# DNA coordinate proof

## Current revision: twelve base pairs, atoms only

At the user's request, the live scene now includes all 486 deposited heavy atoms
across the twelve-base-pair duplex, twice the original six-pair segment. Every
atom uses its conventional van der Waals radius: neighboring volumes overlap
and touch naturally without changing coordinates. Covalent sticks, dashed
contacts and their controls were removed entirely. The optional central-two-pair
view remains atom-only. Five color batches contain 20,412 vertices and 38,880
triangles, with smooth normals and the existing satin texture/material.

The 14-second groove inspection remains; camera framing expands to fit the full
structure. Native samples at seven times in both 16:9 and 4:3 were inspected,
including the turn and final zoom. Independent review found no blocker. Library
typecheck and demo build pass. Browser playback and region switching are checked
separately. The notes below preserve the earlier six-pair milestone's provenance.

## Original six-pair milestone

The scene shows six base pairs (A4–A9 and B16–B21) from RCSB PDB 1BNA, the
Dickerson dodecamer determined by X-ray diffraction at 1.90 Å resolution.
The displayed region contains 246 deposited heavy atoms, 274 covalent bonds and
14 canonical base-pair hydrogen-bond contacts. This is a coordinate-based
structural visualization, not molecular dynamics or a claim of exact positions.
Hydrogens are absent from this coordinate set; deposited solvent is omitted.
The selected segment cuts the backbones without adding artificial capping atoms.

Sources are vendored under `shared/animlib/demo/proofs/data`: `1BNA.pdb` from
https://files.rcsb.org/download/1BNA.pdb and DA/DC/DG/DT dictionaries from
https://files.rcsb.org/ligands/download/DA.cif (substitute each residue name).
Run `node shared/animlib/demo/proofs/data/prepare-dna.mjs` from the repository root
to regenerate `dna.json`. The full dataset retains 486 DNA atoms and 544 bonds;
the scene selects its smaller region without changing those coordinates.

Connectivity uses CCD atom identities and bond orders plus sequential O3′–P
links. Canonical Watson–Crick contacts use named donor/acceptor heavy atoms.
Full-structure covalent distances span 1.224–1.607 Å; contact distances span
2.61–3.249 Å. Coordinates undergo only translation, rigid axis rotation and
uniform scale (0.22 scene units per Å). Double bonds use parallel cylinders.

Controls choose six or central two base pairs, ball-and-stick or space filling,
and base-pair contact visibility. Small atom glyphs use smooth-shaded 12-vertex
icosahedra; larger space-filling glyphs use 42-vertex icospheres. This changes
rendered sphere approximation, not atomic positions or chemical detail.
Van der Waals radii are C 1.70, N 1.55, O 1.52 and P 1.80 Å. Element batches
reduce scene object overhead; the default has five meshes, 8,872 vertices and
10,840 triangles. The existing VM deadline and mesh budgets remain unchanged.

First frame inspection exposed inward mesh winding; corrected before the next
render. Independent review then found space-filling endpoint cropping; camera
framing was widened and both regions rerendered at 16:9 and 4:3. Final sampled
frames fit. Winding checks found no opposing nondegenerate faces in any variant.
Default compilation passes five fresh Bun file processes and three fresh Node
processes using the shipped core API. Bun `-e` remained a failing harness case;
see the independent review. All eight control combinations passed the parent
compile check. Browser compilation and control checks are recorded in README.
