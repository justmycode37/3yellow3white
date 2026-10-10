# Minecraft spatial proof

Original silent 16-second animlib scene. `minecraftProof` is exported from
`shared/animlib/demo/proofs/minecraft.ts` for the shared proof gallery.

The figure preserves Steve's 8-pixel head and 12-pixel torso/leg proportions,
pixel face and hair, cyan shirt, dark blue trousers and square limbs. Shaded opaque
voxel geometry provides volume. The scene includes an oak canopy, bark and end
grain, a grass-and-soil island, a pixel iron axe, contact-linked damage and a log
inventory drop. All geometry is original; there are no imported game assets,
textures, network dependencies or unsupported APIs.

## Motion and evidence

The mining shoulder owns the rigid upper arm, nested forearm joint and axe.
The axe shaft passes through the hand. Feet remain fixed. Strikes occur at
3.0, 6.0 and 9.0 seconds. At each strike, the same cutting-edge point is
`[0.5, 1.68, 0.285]`, on the struck log's `x = 0.5` face and within its bounds.
Successive cracks appear at contact. Wood chips originate there. The struck log
disappears at 9.4 seconds, after the third contact; a scaled inventory log drops
and settles. The last 5.49 seconds hold the completed result.

Compile and native WebGPU rendering passed using the existing library. Ten
sample times were rendered at both 1280×720 and 960×720. Initial frame inspection
found camera cropping and a shoulder/body gap; both were repaired, then all
frames rerendered. Final inspected frames show complete canopy and ground,
connected arm, rooted feet, readable character silhouette, contact, damage and
final gap/drop. No overlays or moving camera compete with the model. The model
view supports geometry-targeted orbit; whole-scene orbit is disabled.

Numeric checks additionally confirmed three exact contact points, cracks absent
immediately before their impacts, release after the final impact, and unchanged
foot geometry at 321 samples across the 16-second scene. Final scene has
91 elements, 70 meshes, 3,992 vertices and 5,844 triangles.

Reproduction and ignored evidence:

```powershell
node_modules/.bin/bun data/spatial-proofs/minecraft-check.ts
node_modules/.bin/bun data/spatial-proofs/minecraft-invariants.ts
node shared/animlib/tools/render-frames.mjs data/spatial-proofs/minecraft-input.json
```

Frame manifest: `data/spatial-proofs/minecraft-frames/frames.json`.
Invariant results: `data/spatial-proofs/minecraft-checks.json`.
Useful frames: `1280x720-2.png` (first contact), `1280x720-6.png`
(third impact), `960x720-9.png` (final hold), in that frame directory.

## Limits

This is an authored voxel-world visualization, not the Minecraft engine or a
physics simulation. Suspended trunk and canopy intentionally match voxel-world
behavior. The log drop changes representation from a world block to a smaller
inventory item. Lighting and colors use the existing Manim-style palette, so
these are recognizable original materials rather than exact game textures.
Sampled frames and numeric checks establish the listed evidence; continuous
browser playback and independent style review belong to the combined gallery
acceptance pass.
