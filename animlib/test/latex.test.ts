import {describe,it,expect} from 'vitest';
import {layoutLatex,rewriteParts,validateLatexMap} from '../src/latex.js';
describe('named LaTeX parts',()=> {
  it('retains surrounding fraction layout and tags named descendants',()=> {
    const layout=layoutLatex(String.raw`\frac{\animpart{numerator}{x+1}}{\animpart{denominator}{2}}`);
    expect(layout.parts).toEqual(new Set(['numerator','denominator']));
    expect(layout.paths.some(p=>p.part==='numerator')).toBe(true);
    expect(layout.paths.some(p=>p.part==='denominator')).toBe(true);
    expect(layout.paths.some(p=>!p.part)).toBe(true);
    expect(layout.width).toBeGreaterThan(0);expect(layout.height).toBeGreaterThan(0);
    expect(layout.paths.flatMap(p=>p.contours.flat()).every(p=>p.every(Number.isFinite))).toBe(true);
  });
  it('validates explicit part mappings without automatic symbol matches',()=> {
    const a=layoutLatex(String.raw`\animpart{a}{x}=\animpart{b}{1}`),b=layoutLatex(String.raw`\animpart{result}{y}`);
    expect(()=>validateLatexMap(a,b,{a:'result'})).not.toThrow();
    expect(()=>validateLatexMap(a,b,{missing:'result'})).toThrow('source');
    expect(()=>validateLatexMap(a,b,{a:'missing'})).toThrow('target');
    expect(()=>validateLatexMap(a,b,{a:'result',b:'result'})).toThrow('more than once');
  });
  it('rejects malformed TeX and ambiguous part markers',()=> {
    expect(()=>layoutLatex(String.raw`\unknownAnimationMacro{x}`)).toThrow('Invalid LaTeX');
    expect(()=>rewriteParts(String.raw`\animpart{a}{x}+\animpart{a}{y}`)).toThrow('Duplicate');
    expect(()=>rewriteParts(String.raw`\animpart{outer}{\animpart{inner}{x}}`)).toThrow('Nested');
    expect(()=>rewriteParts(String.raw`\animpart{a}{x`)).toThrow('Unclosed');
  });
});

it('uses bundled vector glyphs for labels and rejects missing glyphs explicitly',()=> {
  expect(layoutLatex(String.raw`\text{Bubble sort · ascending}`).paths.length).toBeGreaterThan(15);
  expect(()=>layoutLatex(String.raw`\text{emoji 😄}`)).toThrow('vector glyph');
});
