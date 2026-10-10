import { afterEach, describe, expect, it, vi } from "vitest";
import { initialSources } from "../demo/scenes.js";
import { CanvasRenderer } from "../src/renderer.js";
import { SceneSequence } from "../src/sequence.js";

afterEach(() => vi.unstubAllGlobals());

describe("browser host preparation contract", () => {
  it("prepares the production demo's new geometry before reporting an unavailable GPU", async () => {
    // This is a CPU preparation check, not a simulated GPU or visual validation.
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const getContext = vi.fn(() => { throw new Error("WebGL2 is unavailable"); });
    const renderer = new CanvasRenderer({
      width: 640, height: 480, style: {}, getContext,
      getBoundingClientRect: () => ({ width: 640, height: 480 }),
      addEventListener() {}, removeEventListener() {},
    } as unknown as HTMLCanvasElement);
    const sequence = new SceneSequence({ prepare: scenes => renderer.prepare(scenes) });
    try {
      const result = await sequence.submit({ type: "load", scenes: initialSources });
      expect(result.ok).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].message).toMatch(/^Neither WebGPU nor WebGL2/);
      expect(getContext).toHaveBeenCalledWith('webgl2', expect.any(Object));
      expect(sequence.revision).toBe(0);
      expect(sequence.compiled).toEqual([]);
    } finally {
      sequence.dispose();
      renderer.dispose();
    }
  });
});
