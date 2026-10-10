// The yellow focus frame must hug what it highlights. A scene author cannot measure text
// while writing a scene, so frames are sized from estimates; this checks every frame
// against the real bounds of the text it surrounds (animlib's getWorldBounds) and, when a
// frame is off, tells the model the exact position and size to use.
import { evaluateScene, getWorldBounds } from "animlib/core";
import type { CompiledScene } from "animlib/core";

interface Box { id: string; left: number; right: number; bottom: number; top: number }
interface FrameElement {
  id: string; view?: string; opacity: number; stroke?: string; billboard?: boolean; space?: string;
  geometry: { kind: string };
}
interface SceneFrame { camera: { yaw: number; pitch: number }; elements: FrameElement[] }

const PADDING = 0.15;      // what a frame should leave around its text, in scene units
const MIN_PADDING = 0.04;  // closer than this and the frame touches the glyphs
const MAX_PADDING = 0.4;   // further than this and the frame no longer reads as "this term"
const STEP = 0.25;         // seconds between samples: frames are only up for a second or two

function box(frame: SceneFrame, id: string): Box | undefined {
  try {
    const bounds = getWorldBounds(frame as never, id);
    return bounds && { id, left: bounds.min[0], right: bounds.max[0], bottom: bounds.min[1], top: bounds.max[1] };
  } catch { return undefined; }
}
const round = (value: number) => Math.round(value * 100) / 100;

/** One message per focus frame that does not sit tight and centred on its text. */
export function focusFrameProblems(compiled: CompiledScene): string[] {
  const worst = new Map<string, { error: number; message: string }>();
  for (let time = 0; time <= compiled.duration; time += STEP) {
    const frame = evaluateScene(compiled, time) as unknown as SceneFrame;
    if (Math.abs(frame.camera.yaw) > 1e-3 || Math.abs(frame.camera.pitch) > 1e-3) continue;
    const flat = frame.elements.filter(element => !element.view && !element.billboard && element.space !== "screen");
    const frames = flat.filter(element => element.geometry.kind === "rectangle" && element.stroke === "YELLOW" && element.opacity > 0.8);
    if (!frames.length) continue;
    const texts = flat.filter(element => (element.geometry.kind === "latex" || element.geometry.kind === "text") && element.opacity > 0.3)
      .map(element => box(frame, element.id)).filter((text): text is Box => !!text);
    for (const element of frames) {
      const outline = box(frame, element.id); // an unfilled rectangle paints only its thin stroke
      if (!outline) continue;
      // The frame's text is whatever lies mostly inside it. Text that merely reaches into the frame, such as a
      // matrix's brackets around one framed column, is a neighbour and not the target.
      const share = (text: Box) => {
        const w = Math.min(text.right, outline.right) - Math.max(text.left, outline.left), h = Math.min(text.top, outline.top) - Math.max(text.bottom, outline.bottom);
        const area = (text.right - text.left) * (text.top - text.bottom);
        return w > 0 && h > 0 && area > 0 ? w * h / area : 0;
      };
      const whole = texts.filter(text => share(text) >= 0.9);
      const inside = whole.length ? whole : texts.filter(text => share(text) >= 0.45); // a frame half off its text is still aimed at it
      if (!inside.length) continue; // a frame around a shape, not around text
      const target = { left: Math.min(...inside.map(t => t.left)), right: Math.max(...inside.map(t => t.right)),
        bottom: Math.min(...inside.map(t => t.bottom)), top: Math.max(...inside.map(t => t.top)) };
      const pads = [target.left - outline.left, outline.right - target.right, target.bottom - outline.bottom, outline.top - target.top];
      const error = Math.max(...pads.map(pad => pad < MIN_PADDING ? MIN_PADDING - pad : pad > MAX_PADDING ? pad - MAX_PADDING : 0));
      if (error <= 0 || error <= (worst.get(element.id)?.error ?? 0)) continue;
      const names = inside.map(text => text.id).join(", ");
      worst.set(element.id, { error, message:
        `${element.id} around ${names}: use position [${round((target.left + target.right) / 2)}, ${round((target.bottom + target.top) / 2)}], ` +
        `width ${round(target.right - target.left + 2 * PADDING)}, height ${round(target.top - target.bottom + 2 * PADDING)}` +
        ` (the text measures ${round(target.right - target.left)} x ${round(target.top - target.bottom)})` });
    }
  }
  if (!worst.size) return [];
  return [`Focus frames that do not fit their text (measured from the rendered bounds):\n${[...worst.values()].map(entry => `- ${entry.message}`).join("\n")}\n` +
    "A focus frame is centred on its text with about 0.15 of space on every side. Use exactly these numbers."];
}
