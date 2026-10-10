import type { CompiledScene, Frame } from 'animlib/core';
import type { ScenePlan } from './planning.js';

/** Enforce declarations we can observe. Visual quality and teaching remain review questions. */
export function validateScenePlan(compiled: CompiledScene, finalFrame: Frame, plan: ScenePlan) {
  const errors: string[] = [];
  const elements = new Map(finalFrame.elements.map(element => [element.id, element]));
  for (const id of plan.carry) {
    if (!elements.get(id)?.persistent) errors.push(`Carry entity "${id}" must exist at the end and be passed to s.keep().`);
  }
  function opacity(id: string, visited = new Set<string>()): number {
    const element = elements.get(id);
    if (!element || visited.has(id)) return 0;
    visited.add(id);
    const parent = finalFrame.elements.find(candidate => candidate.geometry.children?.includes(id));
    return element.opacity * (parent ? opacity(parent.id, visited) : 1);
  }
  for (const id of plan.cleanup) {
    if (opacity(id) > 0.01 || elements.get(id)?.persistent) errors.push(`Cleanup entity "${id}" must be removed or faded out by the end, and must not be kept.`);
  }
  const expected = plan.interactions.map(control => `${control.id}:${control.type}`).sort();
  const actual = compiled.controls.map(control => `${control.id}:${control.kind}`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`Declare exactly the planned controls (${expected.join(', ') || 'none'}); received ${actual.join(', ') || 'none'}.`);
  if (errors.length) throw new Error(`${plan.id} plan validation:\n${errors.join('\n')}\nKeep the inherited state, example values, narration, and measured duration while repairing.`);
}
