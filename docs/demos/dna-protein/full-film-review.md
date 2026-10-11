# Independent full-film review

This report covers the original schematic film, preserved as `data/dna-protein/film-before-smooth.mp4`. The later molecular-surface revision is documented separately in `smooth-revision.md` and `smooth-final-review.md`.

## Final decision

**Ready to deliver as a native animlib approximation with the limitations below. The user's near-exact visual reconstruction target is not achieved.** The sequence is recognizable, coherent, and technically exportable, but substantial authoring simplifications remain in anatomy, protein shape, composition, staging, and atmosphere. These differences must not all be attributed to renderer limitations.

| Gate | Verdict | Scope |
| --- | --- | --- |
| Biological mechanism | **ready for a schematic overview** | Packaging, complementary RNA synthesis, export, codon recognition, peptide transfer, progression, release, and folding are represented. This is not atomistic dynamics or complete biochemical detail. |
| Readability | **ready** | Persistent objects, exposed recognition bases, local labels, and distinguishable operations support the explanation. |
| Reference correspondence | **revise against the near-exact request; ready only as a bounded approximation** | Major proof defects were repaired, but the full film remains noticeably simpler and differently staged than the reference. |
| Technical delivery | **ready for the verified MP4 and tested browser path** | Complete MP4 decoded; final source sequence compiles; normal browser playback crossed all chapter boundaries. Full-frame temporal similarity to the reference was not established. |

The technical and readability passes do not convert the fidelity verdict into an exact-match pass.

## Evidence and independence

I directly inspected original reference pixels under review-only `data/reference-dna-protein`: frames 000, 016, 026, 032, 042, 048, 053, 065, 081, 091, 097, 113, 129, 145, and 155. Visible player times take precedence over filenames: 065 is 1:04, 081 is 1:20, 091 is 1:30, and 097 is 1:36. Browser chrome, controls, and watermark are excluded from the comparison. No reference pixels were supplied to authors or included in production; authors received written findings.

Inspected authored source, ordered native 1280×720 contact sheets for every chapter, selected individual native-size frames, and some 960×720 proof endpoints. Sample coverage:

- Cell/packaging: global 0, 7, 10, 14, 18, 20, 23, 26, 30, 33, 36, 37, 38, 39, 40, 44.
- Transcription: local 0, 3, 7, 11, 14, 16.5, 20, 24, 29.5, 31, 32.
- Export: local 0, 3, 6, 7, 9, 12, 15, 17, 21, 26.
- Translation: local 0, 7, 16, 20.5, 24.7, 30.5, 33.8, 38.8, 42, 46, 48.5, 51, 53.5, 59.

After the last source changes, I refreshed transcription at local 24 seconds, export at local 12 seconds and its final frame, and translation's corrected close-up, docking, later sheets, and final hold. Final middle render inputs contain the frozen source; final native frame manifests are dated 21:47:46 and 21:47:50 UTC. Translation frames are dated 21:45:33 UTC.

I also opened `data/dna-protein/encoded-064.png`, `encoded-109.png`, and `encoded-159.png`, extracted from the completed MP4. They preserve the reviewed geometry and corrections. My direct visual judgment is based on stills/source, not an independent viewing of every moving frame. Browser playback observations below are explicitly attributed to the coordinator.

## Chapter findings

### Cell and packaging — global 0–44 seconds

**Mechanism/readability: ready. Fidelity: moderate to substantial simplification.**

The cutaways expose the nucleus and then chromatin; packaging context connects chromosome, histones, and DNA. Local labels have leaders. The enlarged helix is clear. The caption explicitly identifies the condensed chromosome as packaging context and says active genes are read from less condensed chromatin.

The opening pink cell approximates the reference silhouette but lacks its dense fine texture and luminous rim. The interior is much sparser: four simple folded arcs, three schematic mitochondria, and a smooth nucleus replace a crowded, varied, deeply layered cellular environment. The camera is more frontal. This is an authoring reduction as well as a rendering difference.

At 26 seconds, a smooth X-shaped chromosome replaces the reference's relatively parallel packed chromatids and fibrous surface. Histones are simple gold cylinders wrapped by a single thick centerline; the reference depicts visible double-helical DNA and a richer scale progression. The final close helix omits the retained packaging context and highlighted gene segment visible in the reference. A caption describes a gene, but the geometry does not isolate one.

Performance work split the original 44-second chapter into 24 and 20 seconds. The saved pixel comparison covers 32 corresponding frames plus both boundary sizes. The reported maximum mean absolute channel difference is 0.000103 on a 0–255 scale; the final DNA frames match exactly. This supports preservation of the already reviewed visuals. I read the comparison report rather than independently rerunning that comparison.

### Transcription — global 44–76 seconds

**Mechanism/readability: ready. Fidelity: a bounded counterpart, not near-exact.**

Strand opening, complementary additions, persistent RNA, 5′/3′ labels, release, and DNA reannealing are visible. The same sequence drives template rods and incoming partners. The reviewed v4 vocabulary carries through: an oblique cleft, occupied gold volume, medium domains, thin slate backbones, and long colored bases.

Remaining differences include a shallow, flattened initial polymerase instead of the reference's substantial globular mass, coarser domains, warmer gold, darker backbones, and fewer simultaneous free nucleotides. Controlled serial arrivals are more diagrammatic than the reference. Polymerase motion and chemistry are compressed; complete initiation, termination, and catalytic chemistry are not demonstrated.

### RNA export and ribosome assembly — global 76–102 seconds

**Mechanism/readability: ready. Fidelity: moderate staging differences.**

The same RNA pieces persist through release and flatten into a connected chain. Source geometry places a genuine aperture around the travel path; the RNA translates across the envelope plane within it. Ordered samples show entry, traversal, exit, and assembly of two unequal ribosomal subunits. Fine joins between RNA units remain faintly visible without breaking the apparent chain.

The reference uses a more immersive camera passage through a richly textured membrane and a much longer curved RNA. The native version shows the complete pore ring externally, a shorter straight RNA, simple wall texture, and explicitly staged subunit assembly. The final nine-domain ribosome agrees closely with translation's opening frame in geometry, framing, and RNA color sequence.

### Translation and folding — global 102–161 seconds

**Mechanism/readability: ready for the stated schematic. Fidelity: moderate to substantial simplification.**

The sequence shows charged tRNA, complementary triplet docking, peptide transfer, triplet-sized advancement, empty-carrier departure, release, and articulated folding. Complement arrays and fixed joint spacing support the represented operation. A nine-residue chain is a reduced illustrative model, not a specific protein structure. Detailed initiation, termination, energetics, processing, and realistic tRNA folding are outside the model; relevant simplifications are identified in captions.

The recognition-base defect was corrected and rechecked: at local 7 and 20.5 seconds, all three rods now project visibly below the tRNA loop and remain exposed at pairing. The final protein was also corrected: a continuous gold body with embedded domains replaces the exposed cluster of large spheres. Its source retains the folded skeleton and blends to a coarse surface representation; this is not a computed physical molecular surface.

The tRNA remains darker than the reference and has fewer structural bars. The translation shot is a wider frontal diagram with few carriers and a short, mostly straight chain; the reference has a crowded oblique cleft, longer chain, and richer domains. The final native protein is taller, simpler, more coarsely faceted, and larger in frame than the reference's compact irregular body. The ending is flat pale cyan instead of deeper blue atmosphere, and its dark label is more conspicuous. These are real fidelity gaps, including fixable authoring choices.

## Technical evidence

The frozen manifest contains **24 + 20 + 32 + 26 + 59 = 161 seconds** and 19 original caption cues. `film-validation.json` records three complete default-limit compilation runs with prior-frame handoffs and deterministic compiled hashes. Host wall times include work outside the VM and are not equivalent to the per-VM execution budget.

Earlier normal-browser compilation interruptions were genuine failures. They were resolved through scene splitting and geometry-preserving precomputation without increasing the normal 200 ms VM budget. On the frozen revision, the coordinator reported successful WebGPU loading of all five chapters, a 2:41 timeline, and one uninterrupted playback run from zero through the 161-second endpoint with captions. That run crossed boundaries at 24, 44, 76, and 102 seconds without seeking or reloading, then stopped at 2:41/2:41 with the Play control and no error. The coordinator saved `final-playback-end.png`; I inspected that endpoint screenshot. I did not independently operate the full browser session.

Read `film-export.log` and `film-decode.log`. The completed MP4 is **161 seconds, 1280×720, 24 fps, 3,864 frames, H.264, yuv420p, no audio**, with a default English `mov_text` subtitle stream. Full decode reaches all 3,864 frames without reported errors. The coordinator extracted and matched all 19 embedded cues to the manifest; I inspected the extracted subtitle file and its final cue. SRT and VTT sidecars also exist.

Independently recomputed MP4 SHA-256:
`17f5d4305c917c211f287439f9c34e4836ae3390f8dc6f697428fd7664b28b95`.

Final source hashes were recomputed from the actual current files, not copied from earlier messages:

| Source | SHA-256 |
| --- | --- |
| `cell-chromatin.js` | `b019b208f6cfe5045f67409bdda11dbadfa4cbb8907598296751b89b2e524fa9` |
| `packaging.js` | `1f217f8008e8e6621364cf24c64b1cb67adf661030d35a7303bd86be00256365` |
| `transcription-export.js` | `7277432ac9b2da37abb53a95c1e78d3f31835ee8c290c5eccc9a6f006609fa5e` |
| `rna-export.js` | `7989892ca29335ed323d097dde824416da8d372e97abe6f1c534356929eb4c90` |
| `translation.js` | `b01bf9357e128b005a8bef4c251a0af182a8d91ea77394ad96f77fba2313b795` |

## Review lessons retained

Require written constraints for occupied volume, negative space, projected landmarks, rod/backbone ratios, and domain scale hierarchy before authoring. Judge rendered colors and shapes, not primitive names. Check joins and endpoint relationships after every addition. Compare native frames and encoded output from the same frozen source. Keep actual renderer limits separate from simpler geometry or staging choices that could be authored more closely.

The delivered file is an original native reconstruction/approximation. It must not be described as visually identical, near-exact, or temporally verified against the entire reference.

