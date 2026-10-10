# Deposited envelope integration

Only the existing `rna-export.js` and `translation.js` chapters were changed. Their durations remain exactly 26 and 59 seconds. The camera tracks, blue-violet/cyan field, gold finish, small subunit, RNA, tRNAs, transfer sequence, peptide joints, and existing label timing are retained.

The large subunit now uses the offline smoothed envelope from all 6,567 protein Cα / RNA P sites supplied for deposited structure 1JJ2. This is a coarse envelope of the **large subunit only**. The small subunit remains schematic; the combined assembly is not a measured complete ribosome. The final example uses the smoothed envelope of all 327 supplied heavy atoms in crambin, 1CRN. Both input asset files retain their preparation parameters and provenance under `shared/animlib/demo/assets/molecules/`.

The final nine-bead folding sequence remains a schematic. At local 51.9–53 it blends into the deposited crambin envelope as an **example folded protein**, not as a claim that the nine-residue schematic sequence is crambin. The integration source states that distinction explicitly. The coordinator owns the matching subtitle wording.

No measured coordinates are stretched on separate axes. Both meshes use a uniform scale, a 90-degree Z rotation, and translation. The final large-subunit placement is scale 0.03534436208335379 and position `[0, 1.65, -5.19138333906043]` in translation, with exactly +20 X in export. The frontmost point remains at Z = −0.85, behind the RNA/tRNA plane. Its deposited shape is deeper and less horizontally flattened than the old invented envelope; the closest fit preserves that geometry and the existing camera. The final crambin scale is 0.06202042346968211, position `[-0.45, 6.75, 0.65]`. A 0.2-unit left placement correction keeps the existing Protein label clear without moving the label or camera.

Baseline sources and freshly rendered matching views are preserved in `smooth-integration-baseline/`, `smooth-before-export-frames/`, and `smooth-before-translation-frames/`. The first integrated assets exposed block-like grid steps and narrow surface slits; that first native verification remains in `smooth-export-first-frames/`, `smooth-translation-first-frames/`, and their associated input JSONs. The library author then supplied resolution-14 meshes with six Taubin smoothing cycles, corrected tetrahedral winding, and recomputed normals. The repaired native film renders have smooth coherent contours without the first version's grid steps in the inspected views.

Final frame mappings:

| View | Before | After |
| --- | --- | --- |
| Export endpoint, local 26 | `smooth-before-export-frames/1280x720-0.png` | `smooth-export-frames/1280x720-2.png` |
| Translation boundary, local 0 | `smooth-before-translation-frames/1280x720-0.png` | `smooth-translation-frames/1280x720-0.png` |
| tRNA close-up, local 7 | `smooth-before-translation-frames/1280x720-1.png` | `smooth-translation-frames/1280x720-1.png` |
| Paired codons, local 20.5 | `smooth-before-translation-frames/1280x720-2.png` | `smooth-translation-frames/1280x720-2.png` |
| Final protein, local 59 | `smooth-before-translation-frames/1280x720-7.png` | `smooth-translation-frames/1280x720-7.png` |

All these views also exist at 960×720. Translation frame indices 3–6 inspect local 51.9, 52, 52.5, and 53 across the representation change; index 8 additionally inspects 52.75. Export additionally samples local 17 and 21 during subunit assembly. Original older native evidence was not overwritten.

`smooth-integration-verification.json` records compilation under the unchanged default 200 ms scene limit and 256 KB source limit, using the actual preceding transcription frame for export. Source lengths are 177,399 characters (export) and 197,962 (translation). Camera tracks are byte-identical as compiled track data. Quarter-second samples report zero changes to RNA, tRNA, and amino-acid world positions; fixed peptide-link error is 1.89e−15. The deposited mesh matches across the 102-second boundary to 1.78e−15 after the required 20-unit world offset. Sampled glyph intersections are absent at both aspects. The representation change starts at 51.9 and lasts 1.1 seconds, with no repositioning jump. Independent review found translucent triangle patches in the original simultaneous fade. That evidence is preserved in `smooth-transition-pre-reveal-fix/`. The repaired reveal places the completed schematic and crambin in isolated display groups, then fades the schematic out for 0.45 seconds and the crambin example in for 0.65 seconds. Their translucent images never overlap; group opacity is applied to an internally opaque rendering, preventing self-triangle patches. The measured mechanism hierarchy and all its transforms remain unchanged.

Reproduce from repository root:

```powershell
node docs/demos/dna-protein/smooth-integrate.mjs
node docs/demos/dna-protein/smooth-verify.mjs
node shared/animlib/tools/