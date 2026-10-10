/** Scene compilation and state evaluation without browser rendering dependencies. */
export { compileSource, SceneCompileError } from "./compiler.js";
export { SceneSequence } from "./sequence.js";
export { evaluateScene } from "./timeline.js";
export { detectOverlaps, detectSceneOverlaps } from "./overlap.js";
export { getLocalBounds, getWorldBounds, getCameraBounds, getScreenBounds } from "./bounds.js";
export { Color, THREE_BLUE_ONE_BROWN_PALETTE } from "./palette.js";
export type * from "./types.js";

export { parseModelGLB, MODEL_LIMITS } from "./models.js";
export { validateModelMetadata } from "./model-metadata.js";
export { createModelGLB } from './model-export.js';
export type { GeneratedModel } from './model-export.js';
