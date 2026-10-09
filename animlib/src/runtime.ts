import type { AnimationAction, CameraState, CompileInput, CompiledScene, ControlDefinition, ControlValue, ElementHandle, ElementProps, ElementState, Geometry, SceneContext, SceneOptions, Vec3 } from "./types.js";

/** Self-contained on purpose: the function is installed inside QuickJS, never eval'd by the host. */
export function buildScene(options: SceneOptions, builder: (context: SceneContext) => void, input: CompileInput = {}): CompiledScene {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const vector = (value: number[] = [0, 0, 0]): Vec3 => [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
  const rotation = (value: number | number[] = 0): Vec3 => typeof value === "number" ? [0, 0, value] : vector(value);
  const finite = (value: number, label: string) => {
    if (!Number.isFinite(value) || Math.abs(value) > 1e6) throw new Error(`${label} must be a finite number with magnitude <= 1,000,000`);
    return value;
  };
  const idCheck = (id: string) => { if (typeof id !== "string" || !id || id.length > 256 || id.startsWith("@")) throw new Error("IDs must be nonempty strings <=256 characters, without an @ prefix"); };
  const mode = options.mode ?? "2d";
  const defaultCamera: CameraState = { yaw: mode === "3d" ? 0.55 : 0, pitch: mode === "3d" ? 0.35 : 0, target: [0, 0, 0], height: 8, distance: 12, perspective: mode === "3d" ? 1 : 0 };
  const camera = clone(input.previous?.camera ?? defaultCamera);
  let cameraNow = clone(camera);
  const previousElements = input.previous?.elements ?? [];
  const originalParents = new Map<string, ElementState>();
  for (const e of previousElements) for (const child of e.geometry.children ?? []) originalParents.set(child, e);
  const persistentIds = new Set(previousElements.filter(e => e.persistent).map(e => e.id));
  const rotateVector = (v: Vec3, r: Vec3): Vec3 => {
    let [x,y,z] = v;
    let c=Math.cos(r[0]), sn=Math.sin(r[0]); [y,z]=[y*c-z*sn,y*sn+z*c];
    c=Math.cos(r[1]); sn=Math.sin(r[1]); [x,z]=[x*c+z*sn,-x*sn+z*c];
    c=Math.cos(r[2]); sn=Math.sin(r[2]); return [x*c-y*sn,x*sn+y*c,z];
  };
  const quaternion = ([x,y,z]: Vec3): number[] => {
    const cx=Math.cos(x/2),cy=Math.cos(y/2),cz=Math.cos(z/2),sx=Math.sin(x/2),sy=Math.sin(y/2),sz=Math.sin(z/2);
    return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz];
  };
  const combineRotation = (parent: Vec3, child: Vec3): Vec3 => {
    const [a,b,c,d]=quaternion(parent),[e,f,g,h]=quaternion(child);
    const x=d*e+a*h+b*g-c*f,y=d*f-a*g+b*h+c*e,z=d*g+a*f-b*e+c*h,w=d*h-a*e-b*f-c*g;
    return [Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y)),Math.asin(Math.max(-1,Math.min(1,2*(w*y-z*x)))),Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))];
  };
  const initial = clone(previousElements.filter(e => e.persistent)).map(e => {
    // Keeping one child does not implicitly keep its siblings. Bake departing
    // ancestors until the next durable ancestor, preserving the child's visual pose.
    let parent = originalParents.get(e.id);
    const visited = new Set<string>();
    while (parent && !parent.persistent) {
      if (visited.has(parent.id)) throw new Error(`Group cycle at ${parent.id}`);
      visited.add(parent.id);
      e.position = rotateVector(e.position.map(v => v*parent!.scale) as Vec3,parent.rotation).map((v,i)=>v+parent!.position[i]) as Vec3;
      e.rotation = combineRotation(parent.rotation,e.rotation);
      e.scale *= parent.scale; e.opacity *= parent.opacity;
      parent = originalParents.get(parent.id);
    }
    if (e.geometry.children) e.geometry.children = e.geometry.children.filter(id => persistentIds.has(id));
    return e;
  });
  const states = new Map(initial.map(e => [e.id, clone(e)]));
  const inherited = new Set(initial.map(e => e.id));
  const used = new Set(states.keys());
  const groups = new Set(initial.flatMap(e => e.geometry.children ?? []));
  const controls: ControlDefinition[] = [];
  const tracks: CompiledScene["tracks"] = [];
  const lifecycle: CompiledScene["lifecycle"] = [];
  let cursor = 0;
  let exiting: ElementHandle | undefined;

  const descendants = (id: string, path = new Set<string>()): string[] => {
    if (path.has(id)) throw new Error(`Group cycle at ${id}`);
    const e = states.get(id);
    if (!e) throw new Error(`Element ${id} is missing or was removed`);
    path.add(id);
    const result = [id, ...(e.geometry.children ?? []).flatMap(child => descendants(child, new Set(path)))];
    return [...new Set(result)];
  };

  const handle = (id: string): ElementHandle => ({
    id,
    animate: properties => {
      const normalized = { ...properties };
      if (properties.position) normalized.position = vector(properties.position);
      if (properties.rotation !== undefined) normalized.rotation = rotation(properties.rotation);
      return { ids: [id], type: "animate", properties: normalized as Partial<ElementState> };
    },
    moveTo: position => ({ ids: [id], type: "animate", properties: { position: vector(position) } }),
    rotateTo: value => ({ ids: [id], type: "animate", properties: { rotation: rotation(value) } }),
    scaleTo: scale => ({ ids: [id], type: "animate", properties: { scale } }),
    fadeIn: () => ({ ids: [id], type: "animate", properties: { opacity: 1 }, fromOpacity: 0 }),
    fadeOut: () => ({ ids: [id], type: "animate", properties: { opacity: 0 } }),
    morphTo: (geometry, morphOptions = {}) => ({ ids: [id], type: "morph", geometry: clone(geometry), map: morphOptions.map }),
  });

  const add = (kind: Geometry["kind"], id: string, props: ElementProps = {}, internal = false): ElementHandle => {
    if (!internal) idCheck(id);
    if (used.has(id)) throw new Error(`Duplicate element ID: ${id}`);
    if (used.size >= 2000) throw new Error("Scene element limit exceeded (2000)");
    used.add(id);
    const { position, rotation: r, scale, opacity, fill, stroke, strokeWidth, space, ...geometry } = props;
    const element: ElementState = {
      id, geometry: { kind, ...clone(geometry) }, position: vector(position), rotation: rotation(r),
      scale: scale ?? 1, opacity: opacity ?? 1, fill: fill ?? (kind === "line" || kind === "arrow" ? "none" : "#ffffff"),
      stroke: stroke ?? (kind === "line" || kind === "arrow" ? "#ffffff" : "none"), strokeWidth: strokeWidth ?? (space === "screen" ? 1 : 0.04),
      space: space ?? "world", persistent: false,
    };
    states.set(id, element);
    lifecycle.push({ time: cursor, type: "add", ids: [id], elements: [clone(element)] });
    return handle(id);
  };

  const control = (id: string, definition: Omit<ControlDefinition, "id" | "label" | "value"> & { label?: string }): ControlValue => {
    idCheck(id);
    if (controls.some(c => c.id === id)) throw new Error(`Duplicate control ID: ${id}`);
    if (controls.length >= 100) throw new Error("Scene control limit exceeded (100)");
    let value = Object.hasOwn(input.controls ?? {}, id) ? input.controls![id] : definition.default;
    if (definition.kind === "slider") {
      const min = finite(definition.min!, "slider min"), max = finite(definition.max!, "slider max");
      const step = definition.step ?? 0.01;
      if (min > max || !(step > 0) || !Number.isFinite(step)) throw new Error(`Invalid bounds or step for slider ${id}`);
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Slider ${id} requires a finite number`);
      value = Math.min(max, Math.max(min, value));
    } else if (definition.kind === "toggle") {
      if (typeof value !== "boolean") throw new Error(`Toggle ${id} requires a boolean`);
    } else if (!definition.options?.includes(String(value))) {
      if (definition.options?.includes(String(definition.default))) value = definition.default;
      else throw new Error(`Select ${id} has an invalid default`);
    }
    controls.push({ ...clone(definition), id, label: definition.label ?? id, value });
    return value;
  };

  const context: SceneContext = {
    circle: (id, props) => add("circle", id, { radius: 0.5, ...props }),
    rectangle: (id, props) => add("rectangle", id, { width: 1, height: 1, ...props }),
    path: (id, props) => add("path", id, props),
    line: (id, props) => add("line", id, { points: [[0, 0], [1, 0]], ...props }),
    arrow: (id, props) => add("arrow", id, { points: [[0, 0], [1, 0]], ...props }),
    text: (id, props) => add("text", id, { fontSize: props.space === "screen" ? 16 : 0.4, ...props }),
    latex: (id, props) => add("latex", id, { fontSize: props.space === "screen" ? 24 : 0.6, ...props }),
    mesh: (id, props) => add("mesh", id, props),
    group: (id, children) => {
      const childIds = children.map(child => child.id);
      for (const child of childIds) {
        descendants(child);
        if (groups.has(child)) throw new Error(`Element ${child} already has a parent group`);
        groups.add(child);
      }
      return add("group", id, { children: childIds });
    },
    play: (actionList, timing) => {
      const duration = finite(timing.duration, "duration");
      if (duration < 0) throw new Error("Animation duration must be nonnegative");
      const actions = Array.isArray(actionList) ? actionList : [actionList];
      const writes = new Set<string>();
      for (const action of actions) {
        if (tracks.length >= 10000) throw new Error("Animation track limit exceeded (10000)");
        const from: Record<string, ElementState> = Object.create(null);
        const properties = action.type === "morph" ? ["geometry"] : Object.keys(action.properties ?? {});
        for (const id of action.type === "camera" ? ["@camera"] : action.ids) {
          for (const property of properties) {
            const key = `${id}/${property}`;
            if (writes.has(key)) throw new Error(`Conflicting animations for ${key} in the same play()`);
            writes.add(key);
          }
          if (action.type !== "camera") {
            const e = states.get(id);
            if (!e) throw new Error(`Element ${id} is missing or was removed`);
            from[id] = clone(e);
            if (action.fromOpacity !== undefined) from[id].opacity = action.fromOpacity;
          }
        }
        tracks.push({ start: cursor, duration, ease: timing.ease ?? "smooth", action: clone(action), from,
          ...(action.type === "camera" ? { cameraFrom: clone(cameraNow) } : {}) });
        if (action.type === "camera") {
          cameraNow = { ...cameraNow, ...clone(action.properties ?? {}) };
        } else for (const id of action.ids) {
          const e = states.get(id)!;
          if (action.type === "morph") {
            if (!action.geometry) throw new Error("Morph needs destination geometry");
            if (e.geometry.kind === "group" || action.geometry.kind === "group") throw new Error("Morph group children individually");
            if ((e.geometry.kind === "latex" || action.geometry.kind === "latex") && !action.map) throw new Error("LaTeX morphs require an explicit map (an empty map fades all parts)");
            e.geometry = clone(action.geometry);
          } else Object.assign(e, clone(action.properties ?? {}));
        }
      }
      cursor += duration;
      if (cursor > 86400) throw new Error("Scene duration limit exceeded (24 hours)");
    },
    wait: seconds => { finite(seconds, "wait"); if (seconds < 0) throw new Error("Wait must be nonnegative"); cursor += seconds; if (cursor > 86400) throw new Error("Scene duration limit exceeded (24 hours)"); },
    keep: element => {
      const ids = descendants(element.id);
      for (const id of ids) { states.get(id)!.persistent = true; delete states.get(id)!.transient; }
      lifecycle.push({ time: cursor, type: "keep", ids });
    },
    remove: element => {
      const ids = descendants(element.id);
      for (const id of ids) states.delete(id);
      for (const e of states.values()) if (e.geometry.children) e.geometry.children = e.geometry.children.filter(id => !ids.includes(id));
      for (const id of ids) groups.delete(id);
      lifecycle.push({ time: cursor, type: "remove", ids });
    },
    slider: (id, spec) => control(id, { ...spec, kind: "slider" }) as number,
    toggle: (id, spec) => control(id, { ...spec, kind: "toggle" }) as boolean,
    select: (id, spec) => control(id, { ...spec, kind: "select" }) as string,
    previous: {
      get: id => { if (!inherited.has(id) || !states.has(id)) throw new Error(`Missing persistent element: ${id}`); return handle(id); },
      exiting: () => {
        if (exiting) return exiting;
        const old = clone(input.previous?.elements.filter(e => !e.persistent && !e.transient) ?? []);
        const ids = new Set(old.map(e => e.id));
        const names = new Map<string, string>();
        for (const e of old) {
          let name = `@exit:${e.id}`, suffix = 1;
          while (used.has(name)) name = `@exit:${e.id}:${suffix++}`;
          names.set(e.id, name); used.add(name);
        }
        for (const e of old) {
          e.id = names.get(e.id)!;
          e.persistent = false; e.transient = true;
          if (e.geometry.children) e.geometry.children = e.geometry.children.filter(id => ids.has(id)).map(id => names.get(id)!);
          states.set(e.id, e); used.add(e.id);
        }
        const allChildren = new Set(old.flatMap(e => e.geometry.children ?? []));
        lifecycle.push({ time: cursor, type: "add", ids: old.map(e => e.id), elements: clone(old) });
        let groupId = "@exiting", suffix = 1;
        while (used.has(groupId)) groupId = `@exiting:${suffix++}`;
        exiting = add("group", groupId, { children: old.filter(e => !allChildren.has(e.id)).map(e => e.id) }, true);
        states.get(groupId)!.transient = true;
        lifecycle[lifecycle.length - 1].elements![0].transient = true;
        return exiting;
      },
    },
    camera: {
      animate: properties => ({ type: "camera", ids: [], properties }),
      to3D: properties => ({ type: "camera", ids: [], properties: { perspective: 1, yaw: 0.55, pitch: 0.35, ...properties } }),
      to2D: properties => ({ type: "camera", ids: [], properties: { perspective: 0, yaw: 0, pitch: 0, ...properties } }),
    },
  };
  const returned: unknown = builder(context);
  if (returned && typeof (returned as { then?: unknown }).then === "function") throw new Error("Scene builders must be synchronous");
  return { options: { mode, end: options.end ?? "hold", orbit: options.orbit ?? mode === "3d", background: options.background ?? "#000000", ...(options.audio ? { audio: options.audio } : {}) }, duration: cursor, controls, initial, camera, lifecycle, tracks };
}
