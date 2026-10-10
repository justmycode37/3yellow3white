export const materialSource = (material: string, shading = 'sphere') => `export default scene({},s=>{
  ${shading === 'sphere' ? "s.sphere('body',{radius:1.6,fill:'GOLD',material:"+material+"})" :
  "s.mesh('body',{vertices:[[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]],triangles:[[0,1,2],[0,2,3]],fill:'BLACK',material:"+material+"})"};
  s.wait(1);
});`;

export const materialCases = [
  { name:'metalness', a:'{metalness:0,roughness:0.3}', b:'{metalness:1,roughness:0.3}' },
  { name:'roughness', a:'{metalness:1,roughness:0.05}', b:'{metalness:1,roughness:1}' },
  { name:'specular', a:'{specular:0,roughness:0.3}', b:'{specular:1,roughness:0.3}' },
  { name:'emission', a:'{emissive:"PURE_BLUE",emissiveIntensity:0}', b:'{emissive:"PURE_BLUE",emissiveIntensity:1}' },
];

// Identical texture colors isolate changes caused by the lighting normal.
export const bumpSource = (strength: number | undefined, unlit = false, metal = false) => `export default scene({},s=>{
  s.mesh('sheet',{vertices:[[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]],triangles:[[0,1,2],[0,2,3]],
    shading:'${unlit ? 'unlit' : 'smooth'}',fill:'GREY_B',
    ${metal ? 'material:{metalness:1,roughness:0.25},' : ''}
    texture:{pattern:'noise',color:'GREY_B',scale:3,seed:17${strength === undefined ? '' : ',bumpStrength:'+strength}}});
  s.wait(1);
});`;
