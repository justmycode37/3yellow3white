// A compact studio-style material model: diffuse, tinted metallic reflection,
// roughness-controlled highlights, and emission. No environment assets or shadows.
export const materialWGSL = `
fn materialColor(base:vec3f,n:vec3f,view:vec3f,material:vec3f)->vec3f {
  let metal=material.x;let rough=material.y;let strength=material.z;
  let light=normalize(vec3f(-0.4,0.65,1.));
  let halfVector=normalize(light+view);
  let ndl=max(dot(n,light),0.);
  let f0=mix(vec3f(0.04*strength*2.),base,metal);
  let fresnel=f0+(vec3f(1.)-f0)*pow(1.-max(dot(n,view),0.),5.);
  let exponent=mix(256.,2.,rough*rough);
  let highlight=pow(max(dot(n,halfVector),0.),exponent)*ndl*(1.-0.5*rough);
  let reflected=reflect(-view,n);
  let studio=0.35+0.35*max(reflected.y,0.)+0.7*pow(max(dot(reflected,light),0.),mix(80.,2.,rough));
  return base*(0.18+0.72*ndl)*(1.-metal)+fresnel*(highlight*3.+studio*metal);
}
`;
export const materialGLSL = `
vec3 materialColor(vec3 base,vec3 n,vec3 view,vec3 material) {
  float metal=material.x,rough=material.y,strength=material.z;
  vec3 light=normalize(vec3(-0.4,0.65,1.));
  vec3 halfVector=normalize(light+view);
  float ndl=max(dot(n,light),0.);
  vec3 f0=mix(vec3(0.04*strength*2.),base,metal);
  vec3 fresnel=f0+(vec3(1.)-f0)*pow(1.-max(dot(n,view),0.),5.);
  float exponent=mix(256.,2.,rough*rough);
  float highlight=pow(max(dot(n,halfVector),0.),exponent)*ndl*(1.-0.5*rough);
  vec3 reflected=reflect(-view,n);
  float studio=0.35+0.35*max(reflected.y,0.)+0.7*pow(max(dot(reflected,light),0.),mix(80.,2.,rough));
  return base*(0.18+0.72*ndl)*(1.-metal)+fresnel*(highlight*3.+studio*metal);
}
`;
