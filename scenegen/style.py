"""Shared visual language, injected into every LLM request so scenes match."""

DEFAULT_PALETTE = {
    "background": "#0F1117",
    "text": "#ECEFF4",
    "muted": "#6B7280",
    "grid": "#2A3A55",
    "primary": "#58C4DD",    # 3b1b blue
    "secondary": "#FFFF00",  # 3b1b yellow
    "accent_green": "#83C167",
    "accent_red": "#FC6255",
    "accent_teal": "#5CD0B3",
    "accent_gold": "#F0AC5F",
    "accent_purple": "#9A72AC",
}

STYLE_GUIDE = """\
Visual style: 3Blue1Brown-like explanatory animation.
- Dark background, few bright colours. Each colour means ONE concept for the whole
  film (e.g. green = first basis vector, red = second). Never recolour an object
  to mean something else.
- Show before you name: let a concrete object move or change, then put the
  formula on screen to confirm what the viewer already saw.
- Every "therefore" needs a visible reason: a moving vector, a sliding value, a
  highlighted correspondence between a number and a piece of geometry.
- Keep identities: the same object stays the same object across scenes. Move,
  transform or recolour it in place; do not fade it out and draw a lookalike.
- Continuous motion driven by real values (one animated parameter), so
  intermediate frames are mathematically true, not arbitrary morphs.
- Unhurried pacing: give the viewer time to watch and think. Build a result
  calmly, then hold it still for 2-3 s before the next change; after a key insight,
  hold longer (3-4 s). Never stack several changes back to back.
- Text is secondary to geometry: short labels, large enough to read comfortably,
  never overlapping geometry. Formulas stay fixed to the screen.
- No full-screen clears without a narrative reason. No decorative motion.

Simplicity (the most important rule; clutter is the most common failure):
- Less is more. Show the fewest objects that make the point; one idea at a time.
- Never leave duplicates behind. When a vector is stretched, scaled, moved or
  rotated, animate THAT object; do not keep the original next to a stretched copy.
  A temporary helper copy must be removed as soon as it has done its job.
- A scene ends with only the core objects the story still needs (e.g. grid, basis
  vectors, the example vector, the current matrix). Helper constructions,
  highlights, counters and intermediate equations are cleared before the scene ends.
- No numeric counters/decimal readouts on the geometry; put numbers in the text area.

Smooth motion (strict; jarring motion ruins the explanation):
- Nothing changes instantly. Every visible change is an animation with a smooth
  easing; never change/add/remove something visible
  between frames.
- Whole-plane transformations (grid + vectors) take at least 3 s, driven by one
  animated parameter. Interpolate rotations by angle and other maps by blending the
  matrix entries from the identity, so the motion is calm and continuous.
- No sudden flips or resets: never snap the plane back to the identity. If a scene
  needs a fresh plane, undo the motion smoothly (>= 2.5 s) or cross-fade slowly.
  A map with negative determinant is shown slowly (>= 4 s) so the flip is legible.
- One major motion at a time; pause about 1 s between big motions. No camera
  shakes, no fast zooms, no flashes.

On-screen text (strict):
- Only necessary text: short object labels (e.g. v, î, A), formulas, matrices and
  numbers that are part of the mathematics. Nothing else.
- NO explanatory sentences or captions in the animation ("Lines stay straight",
  "Record where î lands", "Order matters!", titles, bullet points). The motion itself
  must carry the explanation; a narrator will add the words later.
- If a word seems necessary, show the idea visually instead (highlight, colour,
  motion, side-by-side comparison).

Spatial subjects (chemistry, biology and anything with a real 3D shape):
- Prioritise real 3D: show molecules, orbitals, crystals, proteins, cells and organs
  with their true spatial shape, proportions and angles, and let the viewer rotate
  them, so the student grasps what the thing actually looks like and what is
  physically happening (which parts approach, bond, bend, fold or move).
- Switch to a simpler shape or a flat 2D diagram when that explains better (e.g. a
  Lewis structure, a reaction scheme, an energy diagram, a cross-section), and make
  the switch a visible transformation of the same object: the 3D model flattens or
  simplifies into the diagram, or the diagram lifts back into 3D, so the student
  sees they are the same thing.
- Never leave the student with only the abstraction when a real shape exists: return
  to the 3D picture when the abstract step is done.

Interactivity:
- Keep interactive elements wherever they help: a planned slider, toggle or select
  must be built and must drive the real geometry; 3D objects should be rotatable.
  Do not drop a planned interaction to simplify the scene.

Layout (keep it identical in every scene):
- Geometry (2D or 3D) on the left two thirds of the frame; the right third is a fixed text
  area for formulas and matrices. It is just empty space: NO box, border, frame,
  backing rectangle or panel shape around text anywhere. Geometry never enters the
  text area; text never sits on the grid except short object labels.
- Labels sit beside what they name with a visible gap and move with it; nothing
  touches or overlaps, including during motion.
- Minimum text height about 0.35 scene units; keep 0.4+ margin from the frame edge.
- Draw vectors with clearly thicker strokes than grid lines so they stay crisp.
"""
