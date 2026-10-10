# Planning additions (scenegen)

<!-- Appended to the backend's lesson-planning prompt when the app runs through
     scenegen/backend/dev.ts. The plan decides which controls and views each scene has;
     the scene agent must then build exactly those. Edit freely; re-read per lesson. -->

When writing the plan:

- **3D is the default.** Start every scene's visualDescription with either `3D:` or
  `2D (because <reason>):`. Use 3D unless a flat view is clearly much better for
  understanding. Anything with a real spatial shape or arrangement must be 3D:
  molecules, atoms and bonds, orbitals, crystals, proteins, cells, organs, physical
  objects, forces and fields in space, surfaces, solids. Describe the true shape and
  what physically happens, and say that the viewer can rotate the view.
- 2D needs a real reason: the idea itself lives in a plane (vectors and matrices on a
  2D grid, a graph, a number line, an energy diagram) or a flat diagram is clearly more
  intuitive at that moment (a Lewis structure, a reaction scheme, a cross-section).
  "Simpler to draw" is not a reason. For a subject that has a 3D shape, plan the flat
  step as a visible transformation of the same 3D object, and plan the return to 3D.
  A lesson about a spatial subject should be 3D in most of its scenes.
- **Show little (2D and 3D alike):** a scene shows only what the student needs to
  see for its one idea: the objects being talked about, short labels, and at most
  three formulas or matrices at a time. Do not plan a growing list of results. When
  a scene introduces a new formula, say in its description which earlier one leaves
  or turns into it. Carry at most three formulas into the next scene, and list the
  others under cleanup. Fewer, larger, well-spaced things beat a full screen.
- **Interactions:** plan an interactive element in every scene where playing with a
  value deepens that scene's idea (a slider for a quantity, a toggle to compare with
  and without, a select between a few named cases). Most lessons should have
  interactions in at least half of their scenes. Leave a scene without one only when
  interaction would distract. Each control must drive the real geometry and have
  something to discover. Rotating a 3D view needs no control.
  Controls are always shown stacked in the top right corner of the animation, in
  every scene; formulas go below them on the right. Do not plan a control anywhere
  else, and do not describe on-screen content in that corner.
