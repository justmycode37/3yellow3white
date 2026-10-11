# Independent review: transcription proof v1

## Evidence and scope

Reviewed `proof-v1.js`, `style-contract.md`, `proof-notes.md`, and `proof-v1-frames/frames.json`. Opened the actual pixels of all six initial 1280×720 samples (0, 1.7, 2.15, 3.85, 6.45, 8 seconds), the subsequently refreshed 1280×720 six-frame contact sheet, and the refreshed 960×720 endpoint. Compared directly with review-only `data/reference-dna-protein/ref-065.png` (player reads **1:04**), `ref-053.png` (0:53), and `ref-048.png` (0:48). Comparison excludes browser chrome, player controls, and watermark. Also inspected the skill's three bundled baseline images; the newer molecular reference takes priority.

The author updated the backdrop during review. The initial PNGs were from 23:23, while the inspected source was from 23:24:12. Refreshed PNGs dated 23:24:15–16 now show the source's modest purple illumination variation. Thus the initial source/frame mismatch is resolved for the refreshed samples; the findings below apply to that version. Reference images were neither supplied to the author nor used as production assets. No animation files were changed by this review.

Evidence is sparse ordered stills plus source inspection, not playback. Smoothness throughout the paths, exact temporal reference correspondence, and full-video delivery remain unverified.

## Separate verdicts

| Gate | Verdict | Basis |
| --- | --- | --- |
| Mechanism | **ready**, limited to this schematic docking proof | Persistent template A/G/T receives U/C/A, and the new backbone units remain connected after arrival. Source and endpoints agree. This does not verify the wider transcription mechanism, antiparallel orientation, or 3′ polarity: those are not visually encoded in this proof. |
| Visual readability | **revise** | Arrival and final pairing can be followed, but short thick rods, low-contrast small lettering, and a visible RNA-backbone seam weaken the intended molecular reading. |
| Reference correspondence | **revise** | The enzyme topology, internal occupancy, base proportions, material/color response, depth arrangement, and annotation treatment differ substantially from the close-up reference. This is not near-exact reconstruction. |
| Technical proof | **ready**, limited to native sampled output | Independently compiled the current source and evaluated all six sample times successfully; duration is 8 seconds. Manifest identifies native WebGPU and PNGs at both requested sample sizes exist. Encoded video, frame rate, final audio state, and full playback are **unverified**. |

Do not expand this object language into the full video yet. Passing native rendering and complementary pairing does not clear the reference gate.

## Observed differences and reusable corrections

### 1. Enzyme topology and empty space — high priority, all proof samples

The proof reads as a huge, nearly regular torus: one broad gold band surrounds a purple opening. That opening occupies roughly the middle half of the image and extends below the lower strand. The reference at 1:04 instead has irregular gold enzyme surfaces *behind* most of the strands and loose bases. Its active site reads as a cleft within a solid protein environment. At 0:48 and 0:53 the protein silhouette is made of substantial irregular lobes, with deep valleys and uneven projections. Those exterior views do not justify a ring-shaped close-up interior.

**Skill correction:** Describe the occupied volume and the topology of negative space before specifying a surface primitive. For a protein active-site cleft, require supporting inner surfaces behind the action and asymmetric interconnected domains around it. A continuous surface is a construction requirement, not permission to use a torus. Low-amplitude noise on a ring cannot create the required lobe hierarchy.

**Recheck:** Setup and final hold against 1:04; use 0:48/0:53 only to check the same enzyme's domain vocabulary and exterior silhouette. The important correspondence is solid mass versus empty opening, not a particular mesh implementation.

### 2. Base/backbone proportions and internal occupancy — high priority

In the proof, exposed bases are short, wide pegs: their visible length is approximately 2–2.5 times their diameter. Their backbone is a thick hose, with base length only about 1.5–2 backbone diameters. In the 1:04 reference the rods are visibly long and slender, approximately 4–7 diameters depending on orientation, and the backbone is proportionately thinner. These are visual estimates, not pixel-fit measurements.

The proof's DNA strands and rods occupy a narrow, nearly horizontal band from approximately y=175 to y=540 at 1280×720. The close reference spans much more of the image height, including an upper strand near the top edge, a lower strand rising strongly to the right, and long incoming bases at several orientations. Full-width cropping alone has not reproduced the reference's internal density.

**Skill correction:** Specify dimensionless ratios for rod length/diameter, rod/backbone thickness, strand separation, and active-site occupancy. Verify those ratios in projected output, not just world coordinates. Require an annotated written framing description with upper/lower contour positions and diagonal direction before authoring.

**Recheck:** Native-size setup, first incoming nucleotide, and endpoint. Preserve legible gaps between intended paired tips while increasing rod slenderness and the useful geometry's share of the image.

### 3. Depth and camera relation — high priority

The proof's strands form an almost frontal, symmetrical opened ladder. Incoming U and C sit conspicuously alone in the large empty region; the endpoint reads as aligned rows. The 1:04 reference shows a more oblique view with curved strands, varied projected orientation, foreground loose nucleotides, and enzyme domains receding behind them. The native proof has real shading, but comparatively little overlapping geometry to make the active site feel embedded in volume.

**Skill correction:** Require depth evidence from overlapping surfaces, object size/orientation changes, occlusion, and foreground/background placement. A nonzero camera yaw and pitch do not establish a comparable view. Describe the actual screen-space relationships the camera must produce. Use the background only behind the protein environment, not as a substitute for the missing internal volume.

**Recheck:** First approach and the second nucleotide's arrival against the 1:04 arrangement. Reference motion matching still requires motion evidence; these stills cannot establish its choreography.

### 4. Material and color — medium/high priority

The proof enzyme is warm orange-gold and smoothly rounded, with broad mottling and a dark continuous inner rim. The reference has more muted ochre/olive-brown surfaces, substantial sculpted lobes, local highlights, and dark crevices distributed across the body. Proof backbones appear dark teal rather than the reference's slate/periwinkle blue. Colored rods are identifiable, but the proof's lighting makes them look like thick manufactured cylinders with dark cut ends.

**Skill correction:** Judge palette roles by the rendered shaded result, not the semantic name of a color token. Establish a geometry-and-material swatch before committing the entire scene. Separate coarse domain shape, medium surface relief, and fine finish; noise should not be responsible for all three. State native renderer limits explicitly. No true depth-of-field or cast-shadow match was demonstrated here.

**Recheck:** Protein silhouette, a visible inner domain, and one complete nucleotide at delivery resolution.

### 5. Correspondence, docking, and chain continuity — retain strengths, repair seam

U is approaching at 1.7 seconds and paired with A at 2.15. C is approaching at 3.85, and U/C/A are all present against A/G/T by 6.45, unchanged at 8. The already assembled RNA stays identifiable; colors remain stable. This operation remains understandable without an explanatory caption. Source inspection locates the three arrival endpoints at 2.15, 4.30, and 6.45 seconds; the second endpoint itself was not individually sampled.

A dark diagonal seam is visible where the RNA exit meets the pre-existing backbone, near the left side of the active region in all samples. It makes the strand look cut or hinged. The final additions otherwise read as a connected extension at sampled endpoints. A close visible gap between complementary tips is not itself a failure; avoid mistaking pairing for a single continuous colored rod.

**Skill correction:** Validate connection positions *and tangents*, cap behavior, and shading at every covalent join. Check continuity at setup and after each addition, not only world-space endpoint equality. Keep a bounded statement of what the schematic demonstrates; do not claim polarity or complete catalytic chemistry from unlabeled tubes.

**Recheck:** Native-size left RNA join, exact second docking endpoint, and intermediate transforms. Retain the stable template and persistent assembled chain.

### 6. Labels and background — medium priority

Proof labels are small dark serif letters placed on only the three selected template rods and three incoming partners. They are readable on close inspection, but have weak contrast on green and orange surfaces. The 1:04 reference uses larger pale letters across a broader run of paired and unpaired bases, making a sequence readable across the active site. Sparse labeling is a reasonable explanatory choice in general, but it is a visible departure for this reconstruction.

The refreshed proof backdrop has a gentle purple light patch, an improvement over the original flat field. It remains a broad exposed purple interior. Reference 0:48/0:53 shows a blue-violet atmosphere with pale blue regions and soft distant forms; reference 1:04 is predominantly gold enzyme behind the active geometry. This is principally an occupancy problem, so additional purple gradients alone cannot solve it.

**Skill correction:** Record annotation density, contrast, type treatment, and relation to the bases from the target passage. Give the author these written constraints without reference pixels. Match the visible share of atmosphere versus solid subject before refining atmospheric decoration. Keep all overlays local; a title or footer would not help.

**Recheck:** Labels at delivery size against 1:04, and only the visible peripheral atmospheric region against 0:48/0:53.

## Next gate

Regenerate the same short proof after applying the reusable constraints above. Keep the original version and this review as evidence. The next comparison should include native-size setup, each exact docking endpoint, intermediate approach samples, and the final hold, plus short playback for temporal judgment. Confirm the source/render version correspondence before reviewing. Expansion is appropriate only after the substantive topology, proportions, depth, and readability mismatches are resolved.
