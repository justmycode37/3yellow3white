import { createHash } from "node:crypto";
import { NarrationError } from "./errors.js";

export const SAMPLE_RATE = 24000 as const;
export const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export function sampleCount(pcm: Uint8Array): number {
  if (!pcm.length || pcm.length % 2) throw new NarrationError("AUDIO_INVALID", "Expected nonempty mono 16-bit PCM audio.", 502);
  return pcm.length / 2;
}
export function silence(seconds: number): Uint8Array {
  return new Uint8Array(Math.round(seconds * SAMPLE_RATE) * 2);
}
export function joinPcm(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}
export function wav(pcm: Uint8Array): Uint8Array {
  sampleCount(pcm);
  const output = new Uint8Array(44 + pcm.length);
  const view = new DataView(output.buffer);
  const ascii = (offset: number, s: string) => output.set(new TextEncoder().encode(s), offset);
  ascii(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true); ascii(8, "WAVE"); ascii(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, pcm.length, true);
  output.set(pcm, 44); return output;
}
