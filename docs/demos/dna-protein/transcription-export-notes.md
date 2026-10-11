# Transcription and export chapter: 58 seconds

Final source is split at an actual, continuous carried frame:

- `transcription-export.js`: **32 seconds**, global 44–76, `end:'advance'`.
- `rna-export.js`: **26 seconds**, global 76–102, `end:'advance'`.

Both are silent native animlib scenes. `rna-export.js` receives the evaluated final frame of `transcription-export.js`; it intentionally uses the real retained RNA, DNA and polymerase objects. The coordinator authorized this split after the original 58-second builder intermittently exceeded the normal 200 ms VM execution budget. Captions retain their global timestamps.

## Visible sequence

The long overview helix, camera and 31 base-pair positions/colors match the opening author's final state. Polymerase enters from outside the left edge, engages DNA, and the strands open while the camera enters the occupied gold cleft. Six incoming RNA units **U, C, A, G, C, U** pair against **A, G, T, C, G, A**, remaining in the same connected RNA chain. The template runs 3′ to 5′ left-to-right; RNA grows at its right-hand 3′ end. Selected local letters and polarity marks remain inside the inspected aspect ratios.

The camera then pulls back while that RNA releases, DNA reanneals and polymerase moves right. The same RNA pieces remain connected during straightening and rigid rotation for export. The membrane is an actual annular surface at **x=10**, with a thick rounded pore whose clear radius is **4.2**. The RNA lies at y=-2.65, z=0 after straightening, and moves through the opening along x. Its entire backbone finishes beyond the pore plane: the tail ends at x=11.52. The shot finishes with two unequal gold ribosome subunits closing around the RNA, using the translation author's revised nine-domain recipe.

The final RNA relative to the camera's x=20 target has backbone x=-8.48…3.42, y=-2.65, z=0; ten bases point upward by 1.15 units at x=-3.8+i·0.76, with sequence **A C U G U C A G C U**. Final camera yaw=.17, pitch=.12, height=10.8, distance=27, target=[20,.2,0]. The translation author matches this geometry with a world-x translation of -20 and removes inherited `exported-mRNA` at its t=0 before constructing the matching standalone chapter. Faded DNA and polymerase are removed at export t=6. Ribosome groups are not retained across the next boundary.

## Verification and performance

The first full native baseline is preserved in `transcription-baseline-frames/`, including its original `source.js`, 16 sample times at each aspect, and contact sheets. That baseline required an evidence-only compilation allowance; no renderer or production budget was changed. Subsequent repairs addressed the compilation cost, thin initial ribosome, background blending seams, cap-normal seams at RNA joins, and a clipped polarity label.

Final scenes use four batched semantic-color DNA meshes and precomputed **native mesh coordinates**, rounded to 0.0001 scene units, for the same deterministic protein surfaces. These are original vector geometry, not image assets. This removes repeated surface sampling without reducing domain count. Both scenes passed 125 ms and 150 ms VM budget probes after this optimization, along with normal 200 ms compilation. The coordinator subsequently confirmed the complete five-scene film loads and plays in the browser and passed three sequential validation runs.

Final default-budget compilation/evaluation confirms 32+26=58 seconds. Sampled text-overlap checks, including moving labels, report no intersections at 1280×720 and 960×720. Native WebGPU rendered final evidence at both aspects:

- `transcription-final-frames/`: 11 times, 22 frames, including setup, opening, six-base growth, release and exact scene boundary.
- `rna-export-final-frames/`: 10 times, 20 frames, including exact carried start, straightening, pore approach/crossing, ribosome approach and final handoff.

The render-input JSON files embed the source and the RNA export's evaluated previous frame. Their embedded source was explicitly compared with the final source files after the last render. `frames.json` in each image directory maps filenames to scene-local times. The final native production renders were inspected, including 4:3 active-site lettering, the pore crossing, RNA cap joins and the ribosome endpoint.

Re-render the current verified inputs from repository root:

```powershell
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/transcription-final-render-input.json
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/rna-export-render-input.json
```

After editing either source, regenerate both render inputs and the export's previous frame before using these commands.

## Limits

The author received only written reference descriptions and written review findings, and inspected only own-output frames. No reference image, video, extracted chunk or bitmap asset entered the scenes. V1–V4 proofs remain unchanged. The structures, strand deformation and timing are schematic; processing, atomistic chemistry, deposited coordinates, cast shadows, depth of field and exact reference motion are not claimed. These notes certify sampled native evidence and reported integration checks, not every possible frame or interaction. The main coordinator owns the final encoded film and subtitle export.
