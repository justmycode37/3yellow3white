import { describe, expect, it } from "vitest";
import { Color, compileSource, evaluateScene, SceneSequence, THREE_BLUE_ONE_BROWN_PALETTE } from "../src/core.js";
import { PaletteResolver, parseColor } from "../src/palette.js";
import type { ColorPalette, ColorValue, ElementStyle, SceneContext, SceneOptions } from "../src/types.js";

const monochrome: ColorPalette = {
  colors: { BLACK: "#222222", WHITE: "#dddddd" }, background: Color.WHITE, foreground: Color.BLACK,
};

// These assertions run under tsc. Broadening any authoring field to string must fail CI.
function authoringTypes(s: SceneContext, arbitrary: string) {
  s.circle("valid", { fill: Color.BLUE, stroke: Color.NONE });
  s.circle("alpha", { fill: { color: Color.BLUE, opacity: 0.4 } });
  const style: ElementStyle = { fill: "BLUE" };
  const options: SceneOptions = { background: Color.BLACK };
  // @ts-expect-error CSS literals are not Color tokens.
  s.circle("hex", { fill: "#58c4dd" });
  // @ts-expect-error Arbitrary strings are not Color tokens.
  s.circle("dynamic", { stroke: arbitrary });
  // @ts-expect-error Animated colors have the same restriction.
  s.circle("animated").animate({ fill: "red" });
  // @ts-expect-error Backgrounds must use opaque Color tokens.
  const badBackground: SceneOptions = { background: "#000000" };
  // @ts-expect-error Wrapping CSS in an opacity object cannot bypass the type.
  const badAlpha: ColorValue = { color: "#58c4dd", opacity: 0.4 };
  return { style, options, badBackground, badAlpha };
}
void authoringTypes;

describe("typed palette colors", () => {
  it("exposes Color constants and palette tokens inside scene code", async () => {
    const scene = await compileSource(`export default scene({}, s => {
      s.circle('default'); s.circle('blue', {fill: Color.BLUE,stroke:Color.NONE});
      s.line('line', {points:[[0,0],[1,1]],stroke:palette.colors.GREEN});
    });`);
    expect(scene.options.background).toBe(Color.BLACK);
    expect(evaluateScene(scene, 0).elements.map(e => e.fill)).toEqual([Color.WHITE, Color.BLUE, Color.NONE]);
    expect(evaluateScene(scene, 0).elements[2].stroke).toBe(Color.GREEN);
    expect(new PaletteResolver().resolve(Color.BLUE)).toBe("#58c4dd");
    expect(THREE_BLUE_ONE_BROWN_PALETTE.colors).toMatchObject({ BLUE: "#58C4DD", GREEN: "#83C167", RED: "#FC6255" });
    expect(Object.isFrozen(Color)).toBe(true);
  });

  it.each(["#58c4dd", "#59c3dc", "rgb(88,196,221)", "rgba(88,196,221,0.4)", "blue", "transparent", "UNKNOWN"])(
    "rejects %s in fills, strokes, animation targets and backgrounds", async color => {
      for (const source of [
        `export default scene({},s=>s.circle('a',{fill:${JSON.stringify(color)}}));`,
        `export default scene({},s=>s.line('a',{stroke:${JSON.stringify(color)}}));`,
        `export default scene({},s=>{const a=s.circle('a');s.play(a.animate({fill:${JSON.stringify(color)}}),{duration:1});});`,
        `export default scene({background:${JSON.stringify(color)}},s=>{});`,
      ]) await expect(compileSource(source)).rejects.toThrow(/Color|palette color/);
    },
  );

  it("reports misspelled enum members and missing active palette members", async () => {
    await expect(compileSource("export default scene({},s=>s.circle('a',{fill:Color.BLEU}));")).rejects.toThrow("Unknown palette color token: BLEU");
    await expect(compileSource("export default scene({},s=>s.circle('a',{fill:palette.colors.BLUE}));", {palette:monochrome})).rejects.toThrow("Unknown palette color token: BLUE");
    await expect(compileSource("export default scene({},s=>s.circle('a',{fill:null}));")).rejects.toThrow("Color token");
  });

  it("preserves token identity, transparency, and deterministic seeking through color animations", async () => {
    const scene = await compileSource(`export default scene({},s=>{
      const a=s.circle('a',{fill:Color.NONE,stroke:Color.BLACK});
      s.play(a.animate({fill:{color:Color.WHITE,opacity:0.6},stroke:Color.WHITE}),{duration:2,ease:'linear'});
    });`, { palette: monochrome });
    const middle = evaluateScene(scene, 1);
    expect(middle.elements[0].fill).toEqual({ color: Color.WHITE, opacity: 0.3 });
    expect([Color.BLACK, Color.WHITE]).toContain(middle.elements[0].stroke);
    expect(evaluateScene(scene, 0).elements[0].fill).toBe(Color.NONE);
    expect(evaluateScene(scene, 2).elements[0].fill).toEqual({ color: Color.WHITE, opacity: 0.6 });
    expect(evaluateScene(scene, 1)).toEqual(middle);
    expect(evaluateScene(JSON.parse(JSON.stringify(scene)), 1)).toEqual(middle);
    expect(parseColor(new PaletteResolver(monochrome).resolve(middle.elements[0].fill))).toEqual([221/255,221/255,221/255,0.3]);
  });

  it.each([8.087694351666065e-7, 1e-8, Number.MIN_VALUE, 0, 0.4, 1])(
    "round-trips palette opacity %s without rounding away tiny fade values", opacity => {
      const resolver = new PaletteResolver();
      expect(parseColor(resolver.resolve({ color: Color.BLUE, opacity }))).toEqual([88 / 255, 196 / 255, 221 / 255, opacity]);
    },
  );

  it("parses an evaluated color fade immediately after its transparent endpoint", async () => {
    const scene = await compileSource(`export default scene({},s=>{
      const square=s.circle('square',{fill:Color.NONE});
      s.play(square.animate({fill:Color.BLUE}),{duration:1,ease:'linear'});
    });`);
    const frame = evaluateScene(scene, 8.087694351666065e-7);
    expect(parseColor(new PaletteResolver().resolve(frame.elements[0].fill))).toEqual([88 / 255, 196 / 255, 221 / 255, 8.087694351666065e-7]);
  });

  it.each(["rgba(88,196,221,1e-)", "rgba(88,196,221,1e--7)", "rgba(88,196,221,Infinity)"])(
    "still rejects malformed alpha in %s", source => { expect(() => parseColor(source)).toThrow("Unsupported CSS color"); },
  );
  it("lets custom palettes remap slots and rejects slots absent from the active palette", async () => {
    const scene = await compileSource(`export default scene({},s=>{s.circle('a');s.circle('b',{fill:Color.WHITE});});`, { palette: monochrome });
    expect(scene.options.background).toBe(Color.WHITE);
    expect(evaluateScene(scene, 0).elements[0].fill).toBe(Color.BLACK);
    expect(new PaletteResolver(monochrome).resolve(Color.WHITE)).toBe("#dddddd");
    await expect(compileSource(`export default scene({},s=>s.circle('a',{fill:Color.BLUE}));`, { palette: monochrome })).rejects.toThrow("not defined in the active palette");
  });

  it("cannot bypass the host palette using scene options, mutation, or forged compiled data", async () => {
    const scene = await compileSource(`Color.WHITE='#123456';palette.colors.WHITE='#123456';
      export default scene({palette:false},s=>s.circle('a',{fill:Color.WHITE}));`, { palette: monochrome });
    expect(evaluateScene(scene, 0).elements[0].fill).toBe(Color.WHITE);
    const forged = JSON.parse(JSON.stringify(scene));
    forged.lifecycle[0].elements[0].fill = "#ffffff";
    await expect(compileSource(`export default ${JSON.stringify(forged)};`)).rejects.toThrow("Color token");
  });

  it("carries tokens through handoffs and resolves them against the receiving palette", async () => {
    const first = await compileSource(`export default scene({},s=>{s.keep(s.circle('kept',{fill:Color.BLUE}));s.circle('leaving',{fill:Color.RED});});`);
    const previous = evaluateScene(first, 0), before = structuredClone(previous);
    const palette: ColorPalette = { colors: { BLUE: "#112233", RED: "#445566", WHITE: "#fff", BLACK: "#000" }, background: Color.BLACK, foreground: Color.WHITE };
    const second = await compileSource(`export default scene({},s=>{
      s.play([s.previous.get('kept').animate({fill:Color.RED}),s.previous.exiting().fadeOut()],{duration:1});
    });`, { previous, palette });
    expect(evaluateScene(second, 0).elements.find(e => e.id === "kept")!.fill).toBe(Color.BLUE);
    expect(evaluateScene(second, 1).elements.find(e => e.id === "kept")!.fill).toBe(Color.RED);
    expect(previous).toEqual(before);
  });

  it("keeps the valid sequence when a color edit fails and validates after controls change", async () => {
    const sequence = new SceneSequence({ palette: monochrome });
    try {
      const source = `export default scene({},s=>{const light=s.toggle('light',{default:false});s.keep(s.circle('dot',{fill:light?Color.WHITE:Color.BLACK}));});`;
      expect((await sequence.submit({ type: "load", scenes: [{ id: "a", source }, { id: "b", source: "export default scene({},s=>s.wait(1));" }] })).ok).toBe(true);
      expect(sequence.frame(1, 0).elements[0].fill).toBe(Color.BLACK);
      await sequence.setControl("a", "light", true);
      expect(sequence.frame(1, 0).elements[0].fill).toBe(Color.WHITE);
      const before = sequence.frame(1, 0), revision = sequence.revision;
      const result = await sequence.submit({ type: "replace", scene: "a", source: "export default scene({},s=>s.circle('dot',{fill:'#fff'}));" });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({ code: "SCENE_VALIDATION", scene: "a" });
      expect(result.diagnostics[0].message).toContain("dot fill");
      expect(sequence.revision).toBe(revision);expect(sequence.frame(1, 0)).toEqual(before);
    } finally { sequence.dispose(); }
  });

  it.each([null, 2, {color:"#58c4dd",opacity:0.5}, {color:"BLUE",opacity:-1}, {color:"BLUE",opacity:2}, {color:"BLUE"}, {color:"BLUE",opacity:0.5,css:"red"}])("rejects malformed color values %j", async value => {
    // Raw compiled data also goes through the same boundary validation.
    const compiled = await compileSource("export default scene({},s=>s.circle('a')); ");
    const forged = JSON.parse(JSON.stringify(compiled));forged.lifecycle[0].elements[0].fill = value;
    await expect(compileSource(`export default ${JSON.stringify(forged)};`)).rejects.toThrow();
  });

  it.each([
    { ...monochrome, colors: {} }, { ...monochrome, colors: { UNKNOWN: "#000" } },
    { ...monochrome, colors: { BLACK: "none" } }, { ...monochrome, colors: { BLACK: "rgba(0,0,0,0.5)" } },
    { ...monochrome, background: "#000" }, { ...monochrome, foreground: "BLUE" },
  ])("rejects invalid host palette configuration", async palette => {
    await expect(compileSource("export default scene({},s=>{});", { palette: palette as unknown as ColorPalette })).rejects.toThrow(/palette/i);
  });
});
