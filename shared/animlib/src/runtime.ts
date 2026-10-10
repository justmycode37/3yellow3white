import type { AnimationAction, CameraState, CompileInput, CompiledScene, ControlDefinition, ControlValue, ElementHandle, ElementProps, ElementState, ElementStyle, Geometry, ReactiveProperties, ReactiveUpdate, SceneContext, SceneOptions, SliderHandle, SliderOptions, Vec2, Vec3, ViewState } from "./types.js";
import type { createSurfaceBuilders } from "./surfaces.js";
import type { createSolidBuilders } from "./solids.js";

type MeshBuilders = ReturnType<typeof createSurfaceBuilders> & ReturnType<typeof createSolidBuilders>;

/** Self-contained on purpose: the function is installed inside QuickJS, never eval'd by the host. */
export function buildScene(options: SceneOptions, builder: (context: SceneContext) => void, input: CompileInput = {}, installReactive?: (update: (values: Record<string, ControlValue>, changed: string[]) => ReactiveUpdate[]) => void, meshBuilders?: MeshBuilders): CompiledScene {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const vector = (value: number[] = [0, 0, 0]): Vec3 => [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
  const rotation = (value: number | number[] = 0): Vec3 => typeof value === "number" ? [0, 0, value] : vector(value);
  const viewport = (value: Vec2): Vec2 => { if(!Array.isArray(value)||value.length!==2)throw new Error("Viewport offset requires two coordinates");return [value[0],value[1]]; };
  const finite = (value: number, label: string) => {
    if (!Number.isFinite(value) || Math.abs(value) > 1e6) throw new Error(`${label} must be a finite number with magnitude <= 1,000,000`);
    return value;
  };
  const numericFormat = (format: Geometry["numberFormat"]): void => {
    if(format===undefined)return;
    if(!format||typeof format!=="object"||Array.isArray(format))throw new Error("Invalid numeric format");
    const decimals=format.decimals===undefined?2:format.decimals,digits=format.digits===undefined?1:format.digits;
    if(!Number.isInteger(decimals)||decimals<0||decimals>4||!Number.isInteger(digits)||digits<1||digits>6)throw new Error("Numeric format requires decimals 0–4 and digits 1–6");
  };
  const idCheck = (id: string) => { if (typeof id !== "string" || !id || id.length > 256 || id.startsWith("@")) throw new Error("IDs must be nonempty strings <=256 characters, without an @ prefix"); };
  const mode = options.mode ?? "2d";
  const defaultCamera: CameraState = { yaw: mode === "3d" ? 0.55 : 0, pitch: mode === "3d" ? 0.35 : 0, target: [0, 0, 0], height: 8, distance: 12, perspective: mode === "3d" ? 1 : 0 };
  const camera = clone(input.previous?.camera ?? defaultCamera);
  let cameraNow = clone(camera);
  const views = new Map<string, ViewState>((input.previous?.views ?? []).map(v => [v.id, { id: v.id, rect: clone(v.rect), camera: clone(v.camera), orbit: v.orbit, ...(v.orbitHitTest ? {orbitHitTest:v.orbitHitTest} : {}) }]));
  const viewCameras = new Map([...views].map(([id, view]) => [id, clone(view.camera)]));
  const declaredViews = new Set<string>();
  let currentView: string | undefined;
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
    e.viewportOffset ??= [0,0];
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
      if(parent.viewportOffset)e.viewportOffset=[(e.viewportOffset?.[0]??0)+parent.viewportOffset[0],(e.viewportOffset?.[1]??0)+parent.viewportOffset[1]];
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
  const behaviors: NonNullable<CompiledScene["behaviors"]> = [];
  const bindings: NonNullable<CompiledScene["bindings"]> = [];
  const callbacks: { target: string; controls: string[]; callback: (...values: number[]) => ReactiveProperties; keys?: string[] }[] = [];
  const reactiveHandles = new Set<SliderHandle>();
  let building = true;
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
      if (properties.viewportOffset !== undefined) normalized.viewportOffset = viewport(properties.viewportOffset);
      return { ids: [id], type: "animate", properties: normalized as Partial<ElementState> };
    },
    moveTo: position => ({ ids: [id], type: "animate", properties: { position: vector(position) } }),
    rotateTo: value => ({ ids: [id], type: "animate", properties: { rotation: rotation(value) } }),
    scaleTo: scale => ({ ids: [id], type: "animate", properties: { scale } }),
    fadeIn: () => ({ ids: [id], type: "animate", properties: { opacity: 1 }, fromOpacity: 0 }),
    fadeOut: () => ({ ids: [id], type: "animate", properties: { opacity: 0 } }),
    morphTo: (geometry, morphOptions = {}) => { numericFormat(geometry.numberFormat);return { ids: [id], type: "morph", geometry: clone(geometry), map: morphOptions.map }; },
    countTo: values => ({ ids: [id], type: "numbers", values: clone(values) }),
  });

  const add = (kind: Geometry["kind"], id: string, props: ElementProps = {}, internal = false): ElementHandle => {
    if (!internal) idCheck(id);
    if (used.has(id)) throw new Error(`Duplicate element ID: ${id}`);
    if (used.size >= 2000) throw new Error("Scene element limit exceeded (2000)");
    used.add(id);
    const { position, rotation: r, scale, opacity, fill, stroke, strokeWidth, strokeProfile, space, billboard, billboardOffset, viewportOffset, ...geometry } = props;
    numericFormat(geometry.numberFormat);
    const element: ElementState = {
      id, geometry: { kind, ...clone(geometry) }, position: vector(position), rotation: rotation(r),
      scale: scale ?? 1, opacity: opacity ?? 1, fill: fill === undefined ? (kind === "line" || kind === "arrow" ? "none" : (input.palette?.foreground ?? "WHITE")) : fill,
      stroke: stroke === undefined ? (kind === "line" || kind === "arrow" ? (input.palette?.foreground ?? "WHITE") : "none") : stroke, strokeWidth: strokeWidth ?? (space === "screen" ? 1 : 0.04),
      ...(strokeProfile !== undefined ? { strokeProfile } : {}),
      space: space ?? "world", ...(billboard !== undefined ? { billboard } : {}), ...(billboardOffset !== undefined ? { billboardOffset:vector(billboardOffset) } : {}), viewportOffset: viewportOffset !== undefined ? viewport(viewportOffset) : [0,0], ...(currentView ? { view: currentView } : {}), persistent: false,
    };
    states.set(id, element);
    lifecycle.push({ time: cursor, type: "add", ids: [id], elements: [clone(element)] });
    return handle(id);
  };

  // Constructor callbacks and sampling options stay inside the builder. Only
  // ordinary mesh data and supported style properties cross the VM boundary.
  const generatedMesh = (id: string, geometry: Geometry, props: ElementStyle): ElementHandle => {
    const style: ElementStyle = {};
    for (const key of ["position", "rotation", "scale", "opacity", "fill", "stroke", "strokeWidth", "strokeProfile", "space", "billboard", "billboardOffset", "viewportOffset"] as const) {
      if (props[key] !== undefined) Object.assign(style, { [key]: props[key] });
    }
    const { kind: _kind, ...mesh } = geometry;
    return add("mesh", id, { ...mesh, ...style });
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
    view: (id, spec, build) => {
      idCheck(id);
      if (currentView !== undefined) throw new Error("Views cannot be nested");
      if (declaredViews.has(id)) throw new Error(`Duplicate view ID: ${id}`);
      if (declaredViews.size >= 32) throw new Error("Scene view limit exceeded (32)");
      declaredViews.add(id);
      const inheritedCamera = views.get(id)?.camera;
      const viewCamera: CameraState = { yaw: 0.55, pitch: 0.35, target: [0,0,0], height: 8, distance: 12, perspective: 1, ...clone(inheritedCamera ?? {}), ...clone(spec.camera ?? {}) };
      views.delete(id);
      if (spec.orbitHitTest !== undefined && spec.orbitHitTest !== 'geometry') throw new Error('orbitHitTest must be "geometry"');
      views.set(id, { id, rect: clone(spec.rect), orbit: spec.orbit ?? true, camera: viewCamera, ...(spec.orbitHitTest ? {orbitHitTest:spec.orbitHitTest} : {}) });
      viewCameras.set(id, clone(viewCamera));
      currentView = id;
      const { view: _view, ...scoped } = context;
      // A captured view builder must retain its ownership after this callback
      // returns (and when used inside another view). Do not let it add objects to
      // whichever view happens to be active at call time.
      for (const key of Object.keys(scoped)) {
        const value = (scoped as unknown as Record<string, unknown>)[key];
        if (typeof value !== "function") continue;
        (scoped as unknown as Record<string, unknown>)[key] = (...args: unknown[]) => {
          const priorView = currentView;
          currentView = id;
          try { return value(...args); }
          finally { currentView = priorView; }
        };
      }
      scoped.camera = {
        animate: properties => ({ type: "camera", ids: [], view: id, properties }),
        to3D: properties => ({ type: "camera", ids: [], view: id, properties: { perspective: 1, yaw: 0.55, pitch: 0.35, ...properties } }),
        to2D: properties => ({ type: "camera", ids: [], view: id, properties: { perspective: 0, yaw: 0, pitch: 0, ...properties } }),
      };
      try {
        const result: unknown = build(scoped);
        if (result && typeof (result as { then?: unknown }).then === "function") throw new Error("View builders must be synchronous");
      } finally { currentView = undefined; }
    },
    circle: (id, props) => add("circle", id, { radius: 0.5, ...props }),
    sphere: (id, props) => add("sphere", id, { radius: 0.5, ...props }),
    rectangle: (id, props) => add("rectangle", id, { width: 1, height: 1, ...props }),
    path: (id, props) => add("path", id, props),
    line: (id, props) => add("line", id, { points: [[0, 0], [1, 0]], ...props }),
    arrow: (id, props) => add("arrow", id, { points: [[0, 0], [1, 0]], ...props }),
    line3D: (id, props) => add("line", id, { points: [[0,0,0],[1,0,0]], ...props, strokeProfile: "round" }),
    arrow3D: (id, props) => add("arrow", id, { points: [[0,0,0],[1,0,0]], ...props, strokeProfile: "round" }),
    text: (id, props) => add("text", id, { fontSize: props.space === "screen" ? 16 : 0.4, ...props }),
    latex: (id, props) => add("latex", id, { fontSize: props.space === "screen" ? 24 : 0.6, ...props }),
    mesh: (id, props) => add("mesh", id, props),
    surface: (id, props) => generatedMesh(id, meshBuilders!.surface(props), props),
    parametricSurface: (id, props) => generatedMesh(id, meshBuilders!.parametricSurface(props), props),
    box: (id, props = {}) => generatedMesh(id, meshBuilders!.box(props), props),
    cylinder: (id, props = {}) => generatedMesh(id, meshBuilders!.cylinder(props), props),
    cone: (id, props = {}) => generatedMesh(id, meshBuilders!.cone(props), props),
    torus: (id, props = {}) => generatedMesh(id, meshBuilders!.torus(props), props),
    tube: (id, props) => generatedMesh(id, meshBuilders!.tube(props), props),
    behavior: (target, behavior) => {
      descendants(target.id);
      behaviors.push({ target: target.id, behavior: clone(behavior) });
    },
    attach: (target, source, spec = {}) => {
      descendants(target.id); descendants(source.id);
      bindings.push({ type: "attach", target: target.id, source: source.id, ...(spec.offset ? { offset: vector(spec.offset) } : {}) });
    },
    connect: (target, from, to, spec = {}) => {
      descendants(target.id); descendants(from.id); descendants(to.id);
      bindings.push({ type: "connect", target: target.id, from: from.id, to: to.id, ...clone(spec) });
    },
    group: (id, children, spec = {}) => {
      const childIds = children.map(child => child.id);
      for (const child of childIds) if (states.get(child)?.view !== currentView) throw new Error("Groups must contain elements from the same view");
      for (const child of childIds) {
        descendants(child);
        if (groups.has(child)) throw new Error(`Element ${child} already has a parent group`);
        groups.add(child);
      }
      return add("group", id, { children: childIds, space: states.get(childIds[0])?.space ?? "world", ...clone(spec) });
    },
    play: (actionList, timing) => {
      const duration = finite(timing.duration, "duration");
      if (duration < 0) throw new Error("Animation duration must be nonnegative");
      const actions = Array.isArray(actionList) ? actionList : [actionList];
      const writes = new Set<string>();
      for (const action of actions) {
        if (action.type === "camera" && action.view !== undefined && !viewCameras.has(action.view)) throw new Error(`Unknown camera view: ${action.view}`);
        if(action.type==="morph")numericFormat(action.geometry?.numberFormat);
        if (tracks.length >= 10000) throw new Error("Animation track limit exceeded (10000)");
        const from: Record<string, ElementState> = Object.create(null);
        const properties = action.type === "morph" || action.type === "numbers" ? ["geometry"] : Object.keys(action.properties ?? {});
        for (const id of action.type === "camera" ? [`@camera:${action.view ?? ""}`] : action.ids) {
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
          ...(action.type === "camera" ? { cameraFrom: clone(action.view ? viewCameras.get(action.view) : cameraNow) } : {}) });
        if (action.type === "camera") {
          if (action.view) {
            if (!viewCameras.has(action.view)) throw new Error(`Unknown camera view: ${action.view}`);
            viewCameras.set(action.view, { ...viewCameras.get(action.view)!, ...clone(action.properties ?? {}) });
          } else cameraNow = { ...cameraNow, ...clone(action.properties ?? {}) };
        } else for (const id of action.ids) {
          const e = states.get(id)!;
          if (action.type === "morph") {
            if (!action.geometry) throw new Error("Morph needs destination geometry");
            if (e.geometry.kind === "group" || action.geometry.kind === "group") throw new Error("Morph group children individually");
            if ((e.geometry.kind === "latex" || action.geometry.kind === "latex") && !action.map) throw new Error("LaTeX morphs require an explicit map (an empty map fades all parts)");
            e.geometry = clone(action.geometry);
          } else if (action.type === "numbers") {
            if (e.geometry.kind !== "latex" || !e.geometry.numbers) throw new Error("countTo requires LaTeX numeric slots");
            for (const key of Object.keys(action.values ?? {})) if (!Object.hasOwn(e.geometry.numbers,key)) throw new Error(`Unknown numeric slot: ${key}`);
            e.geometry.numbers = { ...e.geometry.numbers, ...clone(action.values ?? {}) };
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
    slider: ((id: string, spec: SliderOptions & { reactive?: boolean }) => {
      const value = control(id, { ...spec, kind: "slider" });
      if (!spec.reactive) return value as number;
      const handle: SliderHandle = Object.freeze({ id, reactive: true as const,
        [Symbol.toPrimitive]() { throw new Error('Reactive sliders are handles; use s.bind to read their values'); },
      });
      reactiveHandles.add(handle);
      return handle;
    }) as SceneContext['slider'],
    bind: (target, dependencies, callback) => {
      descendants(target.id);
      if (!Array.isArray(dependencies) || !dependencies.length || dependencies.length > 100 || dependencies.some(c => !reactiveHandles.has(c))) throw new Error('s.bind requires reactive slider handles from this scene');
      if (typeof callback !== 'function' || callbacks.length >= 2000) throw new Error('Invalid or oversized reactive bindings');
      if (callbacks.some(c => c.target === target.id)) throw new Error('An element can have only one reactive binding');
      callbacks.push({ target: target.id, controls: dependencies.map(c => c.id), callback });
    },
    toggle: (id, spec) => control(id, { ...spec, kind: "toggle" }) as boolean,
    select: (id, spec) => control(id, { ...spec, kind: "select" }) as string,
    previous: {
      get: id => { if (!inherited.has(id) || !states.has(id)) throw new Error(`Missing persistent element: ${id}`); return handle(id); },
      exiting: () => {
        if (!building) throw new Error('Scene building APIs cannot be called from reactive bindings');
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
  // Retained callbacks may calculate property values, but cannot mutate the builder.
  for (const key of Object.keys(context)) {
    const fn = (context as unknown as Record<string, unknown>)[key];
    if (typeof fn === 'function') (context as unknown as Record<string, unknown>)[key] = (...args: unknown[]) => {
      if (!building) throw new Error('Scene building APIs cannot be called from reactive bindings');
      return fn(...args);
    };
  }
  const returned: unknown = builder(context);
  if (returned && typeof (returned as { then?: unknown }).then === "function") throw new Error("Scene builders must be synchronous");
  building = false;
  const update = (values: Record<string, ControlValue>, changed: string[]): ReactiveUpdate[] => callbacks.filter(binding => binding.controls.some(id => changed.includes(id))).map(binding => {
    const output = binding.callback(...binding.controls.map(id => values[id] as number));
    if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('Reactive bindings must return property objects');
    const keys = Object.keys(output).sort();
    if (!keys.length || keys.some(key => !['radius','position','rotation','scale','opacity','fill'].includes(key))) throw new Error('Unsupported reactive property');
    if (binding.keys && JSON.stringify(keys) !== JSON.stringify(binding.keys)) throw new Error('Reactive bindings must return the same property keys on every update');
    binding.keys ??= keys;
    const properties = { ...output };
    if (properties.position !== undefined) properties.position = vector(properties.position);
    if (properties.rotation !== undefined) properties.rotation = rotation(properties.rotation);
    return { target: binding.target, properties: clone(properties) };
  });
  const initialUpdates = update(Object.fromEntries(controls.map(c => [c.id, c.value])), controls.map(c => c.id));
  const reactiveBindings = callbacks.map((binding, i) => ({ target: binding.target, controls: binding.controls, properties: initialUpdates[i].properties }));
  if (callbacks.length) installReactive?.(update);
  return { options: { mode, end: options.end ?? "hold", orbit: options.orbit ?? mode === "3d", background: options.background === undefined ? input.palette?.background ?? "BLACK" : options.background, ...(options.audio ? { audio: options.audio } : {}) }, duration: cursor, controls, initial, camera, views: [...views.values()].filter(v => declaredViews.has(v.id) || [...initial, ...lifecycle.flatMap(event => event.elements ?? [])].some(e => e.view === v.id)), lifecycle, tracks, behaviors, bindings, ...(reactiveBindings.length ? { reactiveBindings } : {}) };
}
