// Rebuild just the two existing film chapters from the preserved original sources.
// No renderer, palette, caption, manifest, camera, or timing changes are made here.
import {readFileSync,writeFileSync} from 'node:fs';
import {rotate} from '../../../shared/animlib/dist/geometry.js';
const root='docs/demos/dna-protein/';
const assetRoot='shared/animlib/demo/assets/molecules/';
const baseline=root+'smooth-integration-baseline/';
const assets=Object.fromEntries(['1jj2','1crn'].map(id=>[id,JSON.parse(readFileSync(assetRoot+id+'-envelope.json','utf8'))]));
const bounds=(vertices)=>({min:[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k])))});
const geometry=(asset)=>{const {kind,...g}=asset.geometry;return g;};
const rotations={ribosome:[0,0,Math.PI/2],protein:[0,0,Math.PI/2]};
const rb=bounds(assets['1jj2'].geometry.vertices.map(p=>rotate(p,rotations.ribosome)));
const pb=bounds(assets['1crn'].geometry.vertices.map(p=>rotate(p,rotations.protein)));
// Fit only with a uniform scale. The large subunit is deeper than the schematic;
// translate it rearward until its front stays at least .85 behind the RNA plane.
const ribosomeScale=7.2/(rb.max[1]-rb.min[1]);
const proteinScale=2.15/(pb.max[1]-pb.min[1]);
const cfg={
  ribosome:{scale:ribosomeScale,rotation:rotations.ribosome,position:[0,1.65,-.85-rb.max[2]*ribosomeScale]},
  protein:{scale:proteinScale,rotation:rotations.protein,position:[-.25,6.75,.65]},
};
// Optional rigid-placement repairs are recorded in a small, reviewable config.
try{const overrides=JSON.parse(readFileSync(root+'smooth-placement.json','utf8'));for(const key of ['ribosome','protein'])Object.assign(cfg[key],overrides[key]??{});}catch(error){if(error.code!=='ENOENT')throw error;}
const gold="{fill:Color.GOLD_D,texture:{pattern:'noise',color:Color.GOLD_D,scale:3.2,seed:51,bumpStrength:.002},material:{roughness:.68,specular:.38,metalness:.06}}";
const meshConst=(name,asset)=>`  const ${name}=JSON.parse(${JSON.stringify(JSON.stringify(geometry(asset)))});\n`;
const largeHelper=meshConst('DEPOSITED_LARGE',assets['1jj2'])+
  `  // Smoothed full-site 1JJ2 large-subunit envelope. Small subunit stays schematic.\n`+
  `  function depositedLarge(id,xOffset=0){return s.mesh(id,{...DEPOSITED_LARGE,position:[${cfg.ribosome.position[0]}+xOffset,${cfg.ribosome.position[1]},${cfg.ribosome.position[2]}],rotation:${JSON.stringify(cfg.ribosome.rotation)},scale:${cfg.ribosome.scale},...${gold}});}\n`;
let tr=readFileSync(baseline+'translation.js','utf8');
tr=tr.replace('  function domain(',largeHelper+'  function domain(');
tr=tr.replace(/  const ribosome=s\.group\('translation-ribosome',\[[\s\S]*?\n  \]\);/,
  `  const ribosome=s.group('translation-ribosome',[\n`+
  `    depositedLarge('translation-large-subunit'),\n`+
  `    domain('translation-small-subunit',[-.35,-3.35,-1.85],[4.1,1.75,1.85],2.1,.10),\n`+
  `    domain('translation-small-left-domain',[-2.8,-3.65,-.9],[1.6,1.0,1.05],2.4,.15),\n`+
  `    domain('translation-small-right-domain',[.2,-3.8,-.85],[2,1.05,1],3.6,-.1),\n  ]);`);
tr=tr.replace(/  \/\/ The continuously folded skeleton[\s\S]*?  s\.play\(\[foldedEnvelope\.fadeIn\(\),peptide\.animate\(\{opacity:0\}\)\],\{duration:1\.1,ease:'smooth'\}\);/,
  `  // Representation blend: the nine-bead schematic is followed by deposited\n`+
  `  // crambin (1CRN), an example folded protein, not the schematic chain's sequence.\n`+
  meshConst('DEPOSITED_PROTEIN',assets['1crn'])+
  `  const foldedSchematic=s.group('translation-folded-schematic-display',[peptide],{isolated:true});\n`+
  `  const foldedEnvelope=s.group('translation-protein-envelope',[s.mesh('translation-protein-envelope-surface',{...DEPOSITED_PROTEIN,position:${JSON.stringify(cfg.protein.position)},rotation:${JSON.stringify(cfg.protein.rotation)},scale:${cfg.protein.scale},...${gold}})],{isolated:true});\n`+
  `  // Nonoverlapping display fades avoid intersecting translucent molecular surfaces.\n`+
  `  s.play(foldedEnvelope.animate({opacity:0}),{duration:0});\n`+
  `  s.play(foldedSchematic.fadeOut(),{duration:.45,ease:'smooth'});\n`+
  `  s.play(foldedEnvelope.fadeIn(),{duration:.65,ease:'smooth'});`);
let ex=readFileSync(baseline+'rna-export.js','utf8');
const encoded=ex.match(/  const DOMAIN_MESHES=JSON\.parse\(("(?:[^"\\]|\\.)*")\);/);
if(!encoded)throw Error('Cannot find preserved export geometry');
const oldDomains=JSON.parse(JSON.parse(encoded[1]));
for(const key of ['ribosome-large','ribosome-large-left','ribosome-large-right','ribosome-cleft-left','ribosome-cleft-center','ribosome-cleft-right'])delete oldDomains[key];
ex=ex.replace(encoded[0],`  const DOMAIN_MESHES=JSON.parse(${JSON.stringify(JSON.stringify(oldDomains))});\n`+largeHelper);
ex=ex.replace(/  const largeParts=\[.*?\];/,"  const largeParts=[depositedLarge('ribosome-large-envelope',20)];");
for(const [name,source] of [['translation.js',tr],['rna-export.js',ex]]){
  if(source.length>256000)throw Error(name+' exceeds the unchanged compiler source limit');
  if(!source.includes('depositedLarge('))throw Error(name+' integration failed');
  writeFileSync(root+name,source);
}
writeFileSync(root+'smooth-integration-placement.json',JSON.stringify({transforms:cfg,rotatedInputBounds:{ribosome:rb,protein:pb},sourceCharacters:{translation:tr.length,export:ex.length},assetParameters:Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,v.parameters])),provenance:Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,v.provenance]))},null,2));
console.log(JSON.stringify({transforms:cfg,sourceCharacters:{translation:tr.length,export:ex.length}}));
