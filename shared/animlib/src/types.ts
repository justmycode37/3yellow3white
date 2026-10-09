export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Position = Vec2 | Vec3;
export type Mode = "2d" | "3d";
export type Ease = "linear" | "smooth" | "in" | "out";
export type ControlValue = number | boolean | string;

export interface Geometry {
  kind: "circle" | "sphere" | "rectangle" | "path" | "line" | "arrow" | "text" | "latex" | "mesh" | "group";
  radius?: number;
  width?: number;
  height?: number;
  points?: Position[];
  closed?: boolean;
  text?: string;
  tex?: string;
  fontSize?: number;
  vertices?: Position[];
  triangles?: [number, number, number][];
  children?: string[];
  /** Named LaTeX part whose center is the element's origin. */
  anchor?: string;
  /** Values rendered in fixed-width \\animnum{name} LaTeX slots. */
  numbers?: Record<string, number>;
  numberFormat?: { decimals?: number; digits?: number };
}

export interface ElementStyle {
  position?: Position;
  rotation?: Position | number;
  scale?: number;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Round world-space tubes instead of flat stroke ribbons. Not animated. */
  strokeProfile?: "flat" | "round";
  space?: "world" | "screen";
  billboard?: boolean;
  billboardOffset?: Position;
  /** Camera-independent translation in fractions of the viewport width/height. */
  viewportOffset?: Vec2;
}

export type ElementProps = Omit<Geometry, "kind"> & ElementStyle;
export interface ElementState {
  id: string;
  geometry: Geometry;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeProfile?: "flat" | "round";
  space: "world" | "screen";
  billboard?: boolean;
  billboardOffset?: Vec3;
  viewportOffset?: Vec2;
  /** Region owning this element; omitted for the main scene. */
  view?: string;
  persistent: boolean;
  transient?: boolean;
  morph?: { from: Geometry; to: Geometry; progress: number; map?: Record<string, string> };
}

export interface ControlPlacement {
  /** Top-left corner, in fractions of the canvas width/height. */
  position?: Vec2;
  /** Widget width in CSS pixels; defaults to 220. */
  width?: number;
}

export interface ViewOptions {
  /** [left, top, width, height], in fractions of the canvas size. */
  rect: [number, number, number, number];
  camera?: Partial<CameraState>;
  orbit?: boolean;
}

export interface ViewState {
  id: string;
  rect: [number, number, number, number];
  camera: CameraState;
  orbit: boolean;
}

export interface CameraState {
  yaw: number;
  pitch: number;
  target: Vec3;
  height: number;
  distance: number;
  perspective: number;
}

export interface SceneOptions {
  mode?: Mode;
  end?: "hold" | "advance";
  audio?: string;
  orbit?: boolean;
  background?: string;
}

export interface AnimationAction {
  ids: string[];
  type: "animate" | "morph" | "camera" | "numbers";
  properties?: Partial<ElementState> | Partial<CameraState>;
  geometry?: Geometry;
  map?: Record<string, string>;
  /** Camera region; omitted for the main scene camera. */
  view?: string;
  fromOpacity?: number;
  values?: Record<string, number>;
}

export interface Track {
  start: number;
  duration: number;
  ease: Ease;
  action: AnimationAction;
  from: Record<string, ElementState>;
  cameraFrom?: CameraState;
}

export interface ControlDefinition extends ControlPlacement {
  id: string;
  label: string;
  kind: "slider" | "toggle" | "select";
  value: ControlValue;
  default: ControlValue;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface Lifecycle {
  time: number;
  type: "add" | "remove" | "keep";
  ids: string[];
  elements?: ElementState[];
}

export interface CompiledScene {
  options: Required<Omit<SceneOptions, "audio">> & { audio?: string };
  duration: number;
  controls: ControlDefinition[];
  initial: ElementState[];
  camera: CameraState;
  views?: ViewState[];
  lifecycle: Lifecycle[];
  tracks: Track[];
}

export interface Frame {
  elements: ElementState[];
  camera: CameraState;
  cameraAnimated: boolean;
  views?: (ViewState & { cameraAnimated: boolean })[];
}

export interface ElementHandle {
  readonly id: string;
  animate(properties: Omit<ElementStyle, "space" | "billboard" | "billboardOffset" | "strokeProfile">): AnimationAction;
  moveTo(position: Position): AnimationAction;
  rotateTo(rotation: Position | number): AnimationAction;
  scaleTo(scale: number): AnimationAction;
  fadeIn(): AnimationAction;
  fadeOut(): AnimationAction;
  morphTo(geometry: Geometry, options?: { map?: Record<string, string> }): AnimationAction;
  countTo(values: Record<string, number>): AnimationAction;
}

export interface SceneContext {
  circle(id: string, props?: ElementProps): ElementHandle;
  sphere(id: string, props?: ElementProps): ElementHandle;
  rectangle(id: string, props?: ElementProps): ElementHandle;
  path(id: string, props: ElementProps): ElementHandle;
  line(id: string, props: ElementProps): ElementHandle;
  arrow(id: string, props: ElementProps): ElementHandle;
  line3D(id: string, props: ElementProps): ElementHandle;
  arrow3D(id: string, props: ElementProps): ElementHandle;
  text(id: string, props: ElementProps): ElementHandle;
  latex(id: string, props: ElementProps): ElementHandle;
  mesh(id: string, props: ElementProps): ElementHandle;
  group(id: string, children: ElementHandle[]): ElementHandle;
  play(actions: AnimationAction | AnimationAction[], options: { duration: number; ease?: Ease }): void;
  wait(seconds: number): void;
  keep(element: ElementHandle): void;
  remove(element: ElementHandle): void;
  view(id: string, options: ViewOptions, builder: (context: ViewContext) => void): void;
  slider(id: string, options: ControlPlacement & { label?: string; default: number; min: number; max: number; step?: number }): number;
  toggle(id: string, options: ControlPlacement & { label?: string; default: boolean }): boolean;
  select(id: string, options: ControlPlacement & { label?: string; default: string; options: string[] }): string;
  previous: { get(id: string): ElementHandle; exiting(): ElementHandle };
  camera: {
    animate(properties: Partial<CameraState>): AnimationAction;
    to3D(properties?: Partial<CameraState>): AnimationAction;
    to2D(properties?: Partial<CameraState>): AnimationAction;
  };
}

export type ViewContext = Omit<SceneContext, "view">;

export interface SceneSource { id: string; source: string }
export type Submission =
  | { type: "load"; scenes: SceneSource[] }
  | { type: "replace"; scene: string; source: string }
  | { type: "insert"; after: string | null; scenes: SceneSource[] };

export interface Diagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  scene?: string;
  line?: number;
  column?: number;
  hint?: string;
}
export type SubmitResult =
  | { ok: true; revision: number; diagnostics: Diagnostic[] }
  | { ok: false; revision: number; diagnostics: Diagnostic[] };

export interface PlayerState {
  revision: number;
  scene: string | null;
  time: number;
  duration: number;
  status: "empty" | "paused" | "playing" | "ended" | "blocked";
  scenes: { id: string; duration: number }[];
  controls: ControlDefinition[];
  orbitEnabled: boolean;
  views: { id: string; rect: ViewState["rect"]; orbitEnabled: boolean }[];
  error?: string;
}

export interface CompileInput {
  previous?: Frame;
  controls?: Record<string, ControlValue>;
  seed?: number;
}

export interface Asset { kind: "audio"; url: string }
export interface PlayerOptions {
  canvas: HTMLCanvasElement;
  /** Defaults to an overlay on the canvas parent. false leaves controls headless. */
  controlsRoot?: HTMLElement | false;
  assets?: Record<string, Asset>;
  seed?: number;
  executionLimitMs?: number;
}
