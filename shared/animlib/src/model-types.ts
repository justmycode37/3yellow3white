import type { AnimationAction, ColorValue, Bounds3D, ElementHandle, ElementStyle, Vec3 } from './types.js';

/** Serializable inventory. Mesh/image bytes never enter the scene VM. */
export interface ModelMetadata {
  version: 1;
  parts: { id: string; name: string; parent?: string; position: Vec3; primitives: number[] }[];
  primitives: { bounds: Bounds3D; triangles: number }[];
  bounds: Bounds3D;
  triangles: number;
  materials: string[];
}
export interface ModelAsset {
  kind: 'model';
  url: string;
  /** SHA-256 of the immutable GLB; verified by the browser when supplied. */
  sha256?: string;
  metadata: ModelMetadata;
}
export interface ModelProps extends Pick<ElementStyle, "position" | "rotation" | "scale" | "opacity" | "castShadow"> { asset: string; tint?: ColorValue }
export interface ModelPartHandle extends ElementHandle {
  /** Multiply imported colors by a palette color. WHITE restores the original. */
  tintTo(color: ColorValue): AnimationAction;
}
export interface ModelHandle extends ModelPartHandle {
  /** Stable node ID or an unambiguous node name. */
  part(id: string): ModelPartHandle;
}
export interface ModelReference { asset: string; primitive: number; bounds: Bounds3D }
