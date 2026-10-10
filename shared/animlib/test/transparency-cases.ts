/** A red sheet inside a half-transparent blue solid must be attenuated by its
 * front surface, regardless of tessellation order. Blue lighting is incidental.
 * Pixel oracles are shared by real WebGPU and WebGL2 tests (640 x 480).
 */
export const transparencyCases = [
  { name: 'sphere', geometry: `s.sphere('solid',{radius:1,fill:'PURE_BLUE',stroke:'none',opacity:0.5});`, sheetDepth: 0, x: 325 },
  { name: 'tube', geometry: `s.line3D('solid',{points:[[-2,0,0],[2,0,0]],strokeWidth:1.2,stroke:'PURE_BLUE',opacity:0.5});`, sheetDepth: 0, x: 325 },
  { name: 'cone', geometry: `s.arrow3D('solid',{points:[[0,0,-2],[0,0,2]],strokeWidth:0.4,stroke:'PURE_BLUE',opacity:0.5});`, sheetDepth: 0.7, x: 335 },
].map(({ name, geometry, sheetDepth, x }) => ({
  name: `translucent ${name} sorts surfaces around an internal sheet`,
  source: `export default scene({},s=>{${geometry}
    s.rectangle('sheet',{width:4,height:4,position:[0,0,${sheetDepth}],fill:'PURE_RED',stroke:'none',opacity:0.5});s.wait(1);});`,
  x, y: 239, red: 64,
}));
