import {describe,it,expect} from 'vitest';
import {flattenSvgPath,layoutLatex,layoutLatexGeometry,rewriteParts,validateLatexMap} from '../src/latex.js';
import type { Geometry } from '../src/types.js';
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

describe('stable formula placement and numeric slots',()=>{
  const formula:Geometry={kind:'latex',anchor:'v',numbers:{x:1,y:2},numberFormat:{digits:2,decimals:2},tex:String.raw`\animpart{v}{v}\animpart{eq}{=}\animpart{rhs}{\begin{pmatrix}\animnum{x}\\\animnum{y}\end{pmatrix}}`};
  const points=(geometry:Geometry,part:string)=>layoutLatexGeometry(geometry).paths.filter(p=>p.part===part).flatMap(p=>p.contours.flat());
  const samePoints=(a:number[][],b:number[][])=>{expect(a.length).toBe(b.length);a.forEach((p,i)=>p.forEach((v,j)=>expect(v).toBeCloseTo(b[i][j],10)));};
  it('keeps v, equals, and the complete vector stationary when a matrix symbol is prefixed',()=>{
    const prefixed={...formula,tex:String.raw`\animpart{A}{A}`+formula.tex};
    for(const part of ['v','eq','rhs'])samePoints(points(formula,part),points(prefixed,part));
    const v=points(formula,'v');
    expect((Math.min(...v.map(p=>p[0]))+Math.max(...v.map(p=>p[0])))/2).toBeCloseTo(0,10);
    expect((Math.min(...v.map(p=>p[1]))+Math.max(...v.map(p=>p[1])))/2).toBeCloseTo(0,10);
  });
  it('keeps equals and reserved vector-cell geometry unchanged as values count through zero',()=>{
    const target={...formula,numbers:{x:-9.8,y:0.02}};
    samePoints(points(formula,'eq'),points(target,'eq'));
    const a=layoutLatexGeometry(formula),b=layoutLatexGeometry(target);
    a.numericSlots.forEach((slot,i)=>{
      samePoints(slot.contours.flat(),b.numericSlots[i].contours.flat());
      expect(slot.baseline).toBeCloseTo(b.numericSlots[i].baseline,10);
    });
  });
  it('draws only the current number, without reserved minus signs or padding digits',()=>{
    const numeric=layoutLatexGeometry({kind:'latex',tex:String.raw`\animnum{x}`,numbers:{x:1},numberFormat:{digits:3,decimals:2}});
    expect(numeric.paths).toHaveLength(layoutLatex('1.00').paths.length);
    expect(numeric.numericSlots).toHaveLength(1);
    expect(layoutLatex(String.raw`\phantom{-00.00}`).paths).toHaveLength(0);
  });
  it('reports missing numeric values and missing named anchors',()=>{
    expect(()=>layoutLatexGeometry({...formula,numbers:{x:1}})).toThrow('Missing numeric');
    expect(()=>layoutLatexGeometry({...formula,anchor:'missing'})).toThrow('anchor');
  });
});

describe('SVG glyph command fidelity',()=>{
  it('retains exact short H/V/L corners instead of crossing them during uniform sampling',()=>{
    const contours=flattenSvgPath('M0 0H100V1H101V100H0Z');
    expect(contours[0]).toContainEqual([100,0,0]);
    expect(contours[0]).toContainEqual([100,1,0]);
    expect(contours[0]).toContainEqual([101,1,0]);
  });
  it('normalizes reflected quadratic controls and keeps all curve endpoints',()=>{
    const contours=flattenSvgPath('M0 0Q10 20 20 0T40 0L40 20Z');
    expect(contours[0]).toContainEqual([20,0,0]);
    expect(contours[0]).toContainEqual([40,0,0]);
    expect(Math.max(...contours[0].map(p=>p[1]))).toBeGreaterThan(8);
    expect(Math.min(...contours[0].map(p=>p[1]))).toBeLessThan(-8);
  });
});
