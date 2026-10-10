import { VERTEX_FLOATS } from './texture-shader.js';
/** Shared draw order for the two native graphics backends. */
export type RenderCommand =
  | { first: number; count: number; opaque: boolean }
  | { children: RenderCommand[]; opacity: number; opaque: boolean };
export interface DrawItem {
  depth: number; vertices: Float32Array; transparent: boolean; screen: boolean;
  /** Requires world-space packing after the effective camera is known. */
  cameraDependentGeometry?: boolean;
  groups?: { id: string; opacity: number }[];
}

/** Isolated groups form atomic compositing units; ordinary groups remain flattened. */
export function composeItems(items: DrawItem[], first: number): { commands: RenderCommand[]; items: DrawItem[] } {
  interface Unit { depth: number; transparent: boolean; item?: DrawItem; children?: Unit[]; opacity: number; }
  const root: Unit[] = [], groups = new Map<string, Unit>();
  for (const item of items) {
    let children = root;
    for (const group of item.groups ?? []) {
      let unit = groups.get(group.id);
      if (!unit) { unit = { depth: item.depth, transparent: group.opacity < 0.999999, children: [], opacity: group.opacity }; groups.set(group.id, unit); children.push(unit); }
      unit.depth = Math.min(unit.depth, item.depth);
      unit.transparent ||= item.transparent;
      children = unit.children!;
    }
    children.push({ depth: item.depth, transparent: item.transparent, item, opacity: 1 });
  }
  const ordered: DrawItem[] = [];
  const build = (units: Unit[]): RenderCommand[] => {
    // A nested translucent layer makes its enclosing layer translucent as well.
    const transparent = (unit: Unit): boolean => unit.transparent || Boolean(unit.children?.some(transparent));
    for (const unit of units) unit.transparent = transparent(unit);
    units.sort((a,b) => Number(a.transparent)-Number(b.transparent) || b.depth-a.depth);
    const commands: RenderCommand[] = units.map(unit => {
      if (unit.children) return { children: build(unit.children), opacity: unit.opacity, opaque: !unit.transparent };
      const item = unit.item!, count = item.vertices.length/VERTEX_FLOATS, command = { first, count, opaque: !item.transparent };
      ordered.push(item); first += count; return command;
    });
    const merged: RenderCommand[] = [];
    for (const command of commands) {
      const previous = merged.at(-1);
      if (previous && 'first' in previous && 'first' in command && previous.opaque === command.opaque && previous.first+previous.count === command.first) previous.count += command.count;
      else merged.push(command);
    }
    return merged;
  };
  return { commands: build(root), items: ordered };
}
