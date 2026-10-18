import assert from 'node:assert/strict';
import {openTestPage} from './cdp.mjs';
const report={browser:'headless Chrome, animation paused during CPU measurement',before:[],after:[]};
for(let run=0;run<3;run++)for(const tag of (run%2?['after','before']:['before','after'])){
 const page=await openTestPage(tag==='before'?(process.argv[2]||'http://127.0.0.1:5187/'):(process.argv[3]||'http://127.0.0.1:5186/'),{pauseAnimation:true});
 try{
  const measured=await page.evaluate(`(async()=>{
   const THREE=await import('/node_modules/.vite/deps/three.js'),{installAgeRendering}=await import('/src/age-renderer.js'),{makeHokkaido}=await import('/src/model.js');
   const feature=makeHokkaido(await fetch('/data/hokkaido.geojson').then(r=>r.json())),geometry=new THREE.SphereGeometry(1,512,320);geometry.rotateY(-Math.PI/2);
   const material=new THREE.MeshStandardMaterial(),start=performance.now(),age=installAgeRendering(material,feature,geometry),setupMs=performance.now()-start,samples=[];
   for(let j=0;j<24;j++){const t=performance.now();age.update(2000+j*7,0,true,1);if(j>1)samples.push(performance.now()-t);}
   const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',array.buffer)),v=>v.toString(16).padStart(2,'0')).join('');
   const hashes={positions:await hash(geometry.attributes.position.array),normals:await hash(geometry.attributes.normal.array)},values=geometry.attributes.position.array.length;
   const radii=[age.radiusAt({lat:20,lon:0}),age.radiusAt({lat:9.19,lon:-18.75})];age.dispose();geometry.dispose();material.dispose();return {setupMs,samples,hashes,values,radii};})()`);
  assert.deepEqual(page.errors(),[]);report[tag].push({...measured,readyMs:page.readyMs,expectedDevWarnings:page.warnings()});
 }finally{await page.close();}
}
const median=v=>v.toSorted((a,b)=>a-b)[Math.floor(v.length/2)];
report.summary={};for(const tag of ['before','after'])report.summary[tag]={surfaceUpdateMedianMs:median(report[tag].flatMap(r=>r.samples)),setupMedianMs:median(report[tag].map(r=>r.setupMs)),appCPUReadyMedianMs:median(report[tag].map(r=>r.readyMs))};
for(const result of [...report.before,...report.after])assert.deepEqual(result.hashes,report.before[0].hashes);
report.summary.speedup=report.summary.before.surfaceUpdateMedianMs/report.summary.after.surfaceUpdateMedianMs;
console.log(JSON.stringify(report,null,2));
