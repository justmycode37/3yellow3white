# Plan the visual model before scene construction

This guidance augments the planning envelope and current animation quality
policy. Use existing fields; do not invent a new schema. Preserve requested
coverage, running example, timing contract and classic/interactive mode.

- Start visualDescription with `3D:` or `2D (because <reason>):`. Use real spatial
  geometry when depth, shape, assembly or a surface explains the subject. A wholly
  planar relation may stay 2D. For mixed scenes, describe spatial setup and the
  motivated flat close-up explicitly; no quota or mandatory return to 3D.
- Describe the actual model: important parts, relationships, proportions, data
  or equations, fidelity level, coordinate/scale convention and operation that
  earns the claim. Plan plausible construction using shaded solids, custom meshes,
  sampled function/parametric surfaces, tubes, spheres and jointed groups. Do not
  force every spatial subject into a sphere-and-line diagram. Scene authors choose
  exact API calls from the installed reference.
- For detailed subjects, plan overview → selected region → mechanism while
  preserving identity. Required detail belongs in geometry; annotations stay
  selective. A small atom-resolved region or coherent articulated assembly is
  preferable to a crowded model with every part labeled. Do not discard requested
  detail merely to minimize object count.
- Put relevant supplied coordinates, topology, dimensions, formulas, units and
  sourceRefs into available planning context. Distinguish verified structures
  from idealized teaching models. Never promise atomic precision, mechanical
  fidelity or data provenance unsupported by the request/materials. If missing
  data limits fidelity, describe that limit without replacing the user's topic.
- A high-dimensional quantity needs a stated slice/projection and fixed values
  when represented as a 3D height surface. Specify objective/update rule and what
  axes/height mean, so surface, path and readout can share one model.
- For articulated actions, describe drivers, pivots, rigid links, contact events
  and causal sequence. Preserve stable part IDs and useful groups across scenes.
  A planned cutaway or abstraction must retain relationships needed later. Shared
  entities represent core semantic objects, not every atom/triangle.
- Match requested subject appearance, including faceted or voxel objects when
  appropriate, within established restrained explanatory style. Do not require
  a fixed text gutter, decorative setting or generic recap card.
- If texture is requested or surface finish identifies a meaningful material,
  include it in visualDescription: relevant parts, primary/secondary color roles,
  local pattern direction/scale, and restrained relief or reflectance. The library
  supports procedural checker, stripes, noise, marble and wood patterns plus
  stylized metalness, roughness, specular and emission. Preserve semantic colors
  and geometric/data fidelity; distinguish lighting-only bump from real shape.
  Plan finish as part of initial construction, preserving an existing model when
  requested, without adding a repair before the first rendered verification.
  Do not plan image/UV textures, displacement, external assets or configurable
  lights as though those APIs exist.
- Honor videoMode: classic uses `interactions: []`; interactive uses only useful
  supported controls with coherent defaults. Describe what changes and what stays
  invariant. Geometry-changing controls require rebuilding geometry; avoid
  expensive gratuitous controls. Model orbit targets geometry, never text.
- End each scene with the actual useful state the next inference needs. Plan
  carry/cleanup IDs and narration to support detailed construction without early
  answers, arbitrary resets, unnecessary motion or unexplained changes of scale.
