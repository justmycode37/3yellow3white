import type { ProceduralTexture } from '../src/types.js';

export const textureCases: { pattern: ProceduralTexture['pattern']; source: string }[] =
  (['checker', 'stripes', 'noise', 'marble', 'wood'] as const).map(pattern => ({
    pattern,
    // Only two triangles: variation must come from fragments, not vertex coloring.
    source: `export default scene({},s=>{
      const sheet=s.mesh('sheet',{vertices:[[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]],
        triangles:[[0,1,2],[0,2,3]],fill:'PURE_RED',
        texture:{pattern:'${pattern}',color:'PURE_BLUE',scale:2,offset:[0.25,0.25,0.5],seed:17}});
      s.play(sheet.moveTo([1,0,0]),{duration:1,ease:'linear'});
    });`,
  }));

/** The same behavioral assertions run against actual pixels on each backend. */
export function texturePixelIssues(pattern: string, at: (x: number, y: number) => number[]): string[] {
  const issues: string[] = [];
  const reds: number[] = [];
  for (let y = 150; y < 330; y += 5) for (let x = 230; x < 410; x += 5) {
    const [r,g,b] = at(x,y); reds.push(r);
    if (g > 2 || Math.abs(r+b-255) > 3) issues.push('Texture escaped the two authored colors');
  }
  if (Math.max(...reds)-Math.min(...reds) < 80) issues.push('Pattern lacks per-fragment variation');
  if (pattern === 'checker' || pattern === 'stripes') {
    if (at(335,225)[0] < 250 || at(365,225)[2] < 250) issues.push('Wrong primary/secondary cells');
  }
  return [...new Set(issues)];
}
