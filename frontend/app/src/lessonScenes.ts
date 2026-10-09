import type { SceneSource } from 'animlib'
import type { Lesson } from './data'

export interface LessonPalette { background: string; ink: string; accent: string }

// Sample explanations remain local demos. Each source is a real, seekable
// animlib timeline; a future explanation engine can supply SceneSource[] here.
export function lessonScenes(lesson: Lesson, palette: LessonPalette): SceneSource[] {
  const phase = lesson.duration / 4
  const setup = `
    const ink = ${JSON.stringify(palette.ink)};
    const accent = ${JSON.stringify(palette.accent)};
    const phase = ${JSON.stringify(phase)};
    s.play(s.camera.to2D({ height: 7 }), { duration: 0 });
  `
  let body: string
  switch (lesson.artwork) {
    case 'idea':
      body = `
        const bulb = s.circle('idea', { position: [0, 0.35], radius: 0.85, fill: 'none', stroke: ink, strokeWidth: 0.065 });
        s.line('base', { points: [[-0.4, -0.65], [0.4, -0.65]], stroke: ink, strokeWidth: 0.065 });
        s.line('base-end', { points: [[-0.25, -0.85], [0.25, -0.85]], stroke: ink, strokeWidth: 0.065 });
        const rays = [];
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI / 4;
          rays.push(s.line('ray-' + i, { points: [[1.2 * Math.cos(angle), 0.35 + 1.2 * Math.sin(angle)], [1.5 * Math.cos(angle), 0.35 + 1.5 * Math.sin(angle)]], stroke: accent, strokeWidth: 0.06, opacity: 0 }));
        }
        s.play(rays.map(ray => ray.fadeIn()), { duration: phase });
        s.play(bulb.scaleTo(1.1), { duration: phase });
        s.play(bulb.scaleTo(1), { duration: phase });
        s.play(rays.map(ray => ray.animate({ opacity: 0.4 })), { duration: phase });
      `
      break
    case 'vectors':
    case 'matrix':
    case 'eigen': {
      const vector = lesson.artwork === 'eigen' ? [1, 0.75] : [1.5, 1]
      const target = lesson.artwork === 'vectors' ? [2, 1.75] : lesson.artwork === 'matrix' ? [2, 0.25] : [2, 1.5]
      body = `
        const grid = [];
        for (let i = -2; i <= 2; i++) {
          grid.push(s.line('vertical-' + i, { points: [[i, -2], [i, 2]], stroke: ink, strokeWidth: 0.015, opacity: 0.15 }));
          grid.push(s.line('horizontal-' + i, { points: [[-2, i], [2, i]], stroke: ink, strokeWidth: 0.015, opacity: 0.15 }));
        }
        s.arrow('x-axis', { points: [[-2.3, 0], [2.4, 0]], stroke: ink, strokeWidth: 0.025, opacity: 0.5 });
        s.arrow('y-axis', { points: [[0, -2.3], [0, 2.4]], stroke: ink, strokeWidth: 0.025, opacity: 0.5 });
        const original = s.arrow('original', { points: [[0, 0], ${JSON.stringify(vector)}], stroke: ink, strokeWidth: 0.07, opacity: 0.35 });
        const moving = s.arrow('moving', { points: [[0, 0], ${JSON.stringify(vector)}], stroke: accent, strokeWidth: 0.08, scale: 0.7, opacity: 0 });
        const intro = Math.min(0.6, phase);
        s.play(moving.fadeIn(), { duration: intro });
        s.play(moving.scaleTo(1), { duration: phase - intro });
        s.play(moving.morphTo({ kind: 'arrow', points: [[0, 0], ${JSON.stringify(target)}] }), { duration: phase });
        ${lesson.artwork === 'matrix' ? `s.play(grid.map(line => line.rotateTo(-0.35)), { duration: phase });` : `s.play(moving.scaleTo(0.7), { duration: phase });`}
        s.play([moving.scaleTo(1), original.animate({ opacity: 0.6 })], { duration: phase });
      `
      break
    }
    case 'orbitals':
      body = `
        s.circle('nucleus', { radius: 0.24, fill: ink, stroke: 'none' });
        const electrons = [];
        for (let orbit = 0; orbit < 3; orbit++) {
          const angle = orbit * Math.PI / 3;
          const points = [];
          for (let i = 0; i <= 64; i++) {
            const t = i * Math.PI * 2 / 64;
            const x = 2 * Math.cos(t), y = 0.65 * Math.sin(t);
            points.push([x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]);
          }
          s.path('orbit-' + orbit, { points, closed: true, stroke: ink, strokeWidth: 0.03, fill: 'none', opacity: 0.5 });
          electrons.push(s.circle('electron-' + orbit, { radius: 0.12, position: points[0], fill: accent, stroke: 'none' }));
        }
        for (let step = 1; step <= 32; step++) {
          s.play(electrons.map((electron, orbit) => {
            const t = step * Math.PI / 8, angle = orbit * Math.PI / 3;
            const x = 2 * Math.cos(t), y = 0.65 * Math.sin(t);
            return electron.moveTo([x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]);
          }), { duration: phase / 8, ease: 'linear' });
        }
      `
      break
    case 'reaction':
      body = `
        const left = s.circle('reactant', { position: [-1.5, 0], radius: 0.4, fill: ink, stroke: 'none' });
        const right = s.circle('partner', { position: [1.5, 0], radius: 0.4, fill: accent, stroke: 'none' });
        const electrons = s.circle('electron-pair', { position: [-1.2, 0.65], radius: 0.12, fill: accent, stroke: 'none', opacity: 0, scale: 0.7 });
        const bond = s.line('bond', { points: [[-0.8, 0], [0.8, 0]], stroke: ink, strokeWidth: 0.07, opacity: 0 });
        const intro = Math.min(0.6, phase);
        s.play(electrons.fadeIn(), { duration: intro });
        s.play(electrons.scaleTo(1), { duration: phase - intro });
        s.play(electrons.moveTo([1.2, 0.65]), { duration: phase });
        s.play([left.moveTo([-0.8, 0]), right.moveTo([0.8, 0]), bond.fadeIn()], { duration: phase });
        s.play(electrons.moveTo([0, 0]), { duration: phase });
      `
      break
    default:
      body = `
        s.circle('carbon', { radius: 0.4, fill: ink, stroke: 'none' });
        const atoms = [], bonds = [];
        for (let i = 0; i < 4; i++) {
          const angle = Math.PI / 4 + i * Math.PI / 2;
          const point = [1.8 * Math.cos(angle), 1.8 * Math.sin(angle)];
          bonds.push(s.line('bond-' + i, { points: [[0, 0], point], stroke: ink, strokeWidth: 0.045, opacity: 0 }));
          atoms.push(s.circle('hydrogen-' + i, { position: point, radius: 0.22, fill: accent, stroke: 'none', opacity: 0 }));
        }
        const molecule = s.group('molecule', atoms.concat(bonds));
        const intro = Math.min(0.6, phase);
        s.play(bonds.concat(atoms).map(element => element.fadeIn()), { duration: intro });
        s.play(molecule.rotateTo(Math.PI / 8), { duration: phase - intro });
        s.play(molecule.rotateTo(Math.PI / 4), { duration: phase });
        s.play(molecule.scaleTo(1.15), { duration: phase });
        s.play([molecule.rotateTo(Math.PI / 2), molecule.scaleTo(1)], { duration: phase });
      `
  }
  return [{ id: 'lesson', source: `export default scene({ mode: '2d', end: 'hold', background: ${JSON.stringify(palette.background)} }, s => { ${setup} ${body} });` }]
}
