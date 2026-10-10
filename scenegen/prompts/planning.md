# Planning additions (scenegen)

<!-- Appended to the backend's lesson-planning prompt when the app runs through
     scenegen/backend/dev.ts. The plan decides which controls and views each scene has;
     the scene agent must then build exactly those. Edit freely; re-read per lesson. -->

When writing the plan:

- Interactions: plan an interactive element in every scene where playing with a value
  deepens that scene's idea (a slider for a quantity, a toggle to compare with and
  without, a select between a few named cases). Most lessons should have interactions in
  at least half of their scenes. Leave a scene without one only when interaction would
  distract. Each control must drive the real geometry and have something to discover.
- Chemistry, biology and other spatial subjects: describe real 3D views first in
  visualDescription and endsWith, so the student sees the true shape (molecules,
  orbitals, crystals, proteins, cells, organs) and what physically happens. Say that
  the viewer can rotate the 3D view. Where a simpler shape or a flat 2D diagram
  explains better (a Lewis structure, a reaction scheme, an energy diagram, a
  cross-section), plan it as a visible transformation of the same object and plan the
  return to 3D afterwards.
