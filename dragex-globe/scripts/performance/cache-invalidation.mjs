import assert from 'node:assert/strict';
import {openTestPage} from './cdp.mjs';
const page=await openTestPage(process.argv[2]||'http://127.0.0.1:5186/',{pauseAnimation:true});
try{
 const report=await page.evaluate(`(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js'),{installAgeRendering}=await import('/src/age-renderer.js'),{makeHokkaido}=await import('/src/model.js'),{otherLandmasses}=await import('/src/landmasses.js'),{edenIsle}=await import('/src/coast-design.js');
  const outline=await fetch('/data/hokkaido.geojson').then(r=>r.json()),a=makeHokkaido(outline,{lat:20,lon:0}),b=makeHokkaido(outline,{lat:-25,lon:60}),extras=[...otherLandmasses,edenIsle];
  const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',array.buffer)),v=>v.toString(16).padStart(2,'0')).join('');
  const build=feature=>{const geometry=new THREE.SphereGeometry(1,512,320);geometry.rotateY(-Math.PI/2);const material=new THREE.MeshStandardMaterial(),age=installAgeRendering(material,feature,geometry,extras);return {geometry,material,age};};
  const frame=2888.25,model=build(a);model.age.update(frame,0,true,10,1.006,{lat:20,lon:0});
  const oldLocal=model.age.environment.uniforms.uLocalShoreMap.value,oldGlobal=model.age.environment.uniforms.uShoreMap.value,oldPositions=await hash(model.geometry.attributes.position.array),oldShore=await hash(oldGlobal.image.data);
  let localDisposals=0,globalDisposals=0;oldLocal.addEventListener('dispose',()=>localDisposals++);oldGlobal.addEventListener('dispose',()=>globalDisposals++);
  model.age.replaceMap(b);
  const localInvalidated=model.age.environment.uniforms.uLocalShoreMap.value!==oldLocal;
  model.age.update(frame,0,true,10,1.006,{lat:-25,lon:60});const freshB=build(b);freshB.age.update(frame,0,true,10,1.006,{lat:-25,lon:60});
  const replaced={positions:await hash(model.geometry.attributes.position.array),normals:await hash(model.geometry.attributes.normal.array),shore:await hash(model.age.environment.uniforms.uShoreMap.value.image.data),local:await hash(model.age.environment.uniforms.uLocalShoreMap.value.image.data)};
  const fresh={positions:await hash(freshB.geometry.attributes.position.array),normals:await hash(freshB.geometry.attributes.normal.array),shore:await hash(freshB.age.environment.uniforms.uShoreMap.value.image.data),local:await hash(freshB.age.environment.uniforms.uLocalShoreMap.value.image.data)};
  const radii=[{lat:20,lon:0},{lat:-25,lon:60},{lat:9.19,lon:-18.75}].map(p=>({p,replaced:model.age.radiusAt(p),fresh:freshB.age.radiusAt(p)}));
  model.age.replaceMap(a);model.age.update(frame,0,true,10);const restored=await hash(model.geometry.attributes.position.array);
  const report={frame,vertexValues:model.geometry.attributes.position.array.length,oldPositions,oldShore,replaced,fresh,restored,radii,localInvalidated,localDisposals,globalDisposals};
  for(const object of [model,freshB]){object.age.dispose();object.geometry.dispose();object.material.dispose();}return report;
 })()`);
 assert.equal(report.localInvalidated,true);assert.equal(report.localDisposals,1);assert.equal(report.globalDisposals,1);
 assert.notEqual(report.oldPositions,report.replaced.positions);assert.notEqual(report.oldShore,report.replaced.shore);
 assert.deepEqual(report.replaced,report.fresh);assert.equal(report.restored,report.oldPositions);for(const row of report.radii)assert.equal(row.replaced,row.fresh);
 assert.deepEqual(page.errors(),[]);console.log(JSON.stringify({url:process.argv[2]||'http://127.0.0.1:5186/',...report,errors:page.errors()},null,2));
}finally{await page.close();}
