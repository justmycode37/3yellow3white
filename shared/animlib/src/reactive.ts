import { paletteResolver } from './palette.js';
import type { CompiledScene, ElementState, ReactiveProperties, ReactiveUpdate, Vec3 } from './types.js';

const keys = new Set(['radius', 'position', 'rotation', 'scale', 'opacity', 'fill']);
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e6;

/** Validate every callback result after it crosses the untrusted VM boundary. */
export function validateReactiveProperties(properties: ReactiveProperties, target: ElementState, scene: CompiledScene): void {
  check(properties && typeof properties === 'object' && !Array.isArray(properties), 'Invalid reactive properties');
  check(Object.keys(properties).length > 0 && Object.keys(properties).every(key => keys.has(key)), 'Unsupported reactive property');
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'fill') paletteResolver(scene.options.palette).validate(value);
    else if (key === 'position' || key === 'rotation') check(Array.isArray(value) && value.length === 3 && value.every(finite), `Invalid reactive ${key}`);
    else {
      check(finite(value) && value >= 0, `Invalid reactive ${key}`);
      if (key === 'opacity') check(value <= 1, 'Reactive opacity must be <= 1');
      if (key === 'radius') check(['sphere', 'circle'].includes(target.geometry.kind), 'Reactive radius requires a sphere or circle');
    }
  }
}

export function validateReactiveBindings(scene: CompiledScene): void {
  const bindings = scene.reactiveBindings ?? [];
  check(Array.isArray(bindings) && bindings.length <= 2000, 'Invalid reactive bindings');
  const elements = new Map([...scene.initial, ...scene.lifecycle.flatMap(e => e.elements ?? [])].map(e => [e.id, e]));
  const targets = new Set<string>();
  for (const binding of bindings) {
    const target = elements.get(binding.target);
    check(target && !targets.has(binding.target), 'Invalid or duplicate reactive target');
    targets.add(binding.target);
    check(Array.isArray(binding.controls) && binding.controls.length > 0 && binding.controls.length <= 100
      && binding.controls.every(id => scene.controls.some(c => c.id === id && c.kind === 'slider' && c.reactive === true)), 'Invalid reactive control dependency');
    validateReactiveProperties(binding.properties, target, scene);
    const properties = Object.keys(binding.properties);
    for (const track of scene.tracks) if (track.action.ids.includes(binding.target)) {
      check(!properties.some(key => Object.hasOwn(track.action.properties ?? {}, key)
        || key === 'radius' && track.action.type === 'morph'), 'A reactive binding and timeline cannot own the same property');
    }
    if (properties.includes('position')) {
      check(!scene.bindings?.some(b => b.target === binding.target) && !scene.behaviors?.some(b => b.target === binding.target), 'Reactive position conflicts with an attachment or behavior');
    }
  }
}

export function mergeReactiveUpdates(scene: CompiledScene, updates: ReactiveUpdate[], changed: string[]): NonNullable<CompiledScene['reactiveBindings']> {
  const expected = (scene.reactiveBindings ?? []).filter(b => b.controls.some(id => changed.includes(id)));
  check(Array.isArray(updates) && updates.length === expected.length, 'Invalid reactive update count');
  const elements = new Map([...scene.initial, ...scene.lifecycle.flatMap(e => e.elements ?? [])].map(e => [e.id, e]));
  const byTarget = new Map<string, ReactiveProperties>();
  for (const update of updates) {
    const binding = expected.find(b => b.target === update.target);
    check(binding && !byTarget.has(update.target), 'Invalid reactive update target');
    check(JSON.stringify(Object.keys(update.properties ?? {}).sort()) === JSON.stringify(Object.keys(binding.properties).sort()), 'Reactive property keys changed');
    validateReactiveProperties(update.properties, elements.get(update.target)!, scene);
    byTarget.set(update.target, update.properties);
  }
  return (scene.reactiveBindings ?? []).map(b => byTarget.has(b.target) ? { ...b, properties: byTarget.get(b.target)! } : b);
}

/** Apply absolute values to the freshly evaluated authored frame, before attachments. */
export function applyReactiveProperties(element: ElementState, properties: ReactiveProperties): void {
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'radius') element.geometry.radius = value as number;
    else if (key === 'position' || key === 'rotation') element[key] = [...value as Vec3];
    else Object.assign(element, { [key]: structuredClone(value) });
  }
}
