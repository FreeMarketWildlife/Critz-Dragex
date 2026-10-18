import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {signedShoreDistance} from '../../src/water-loop.js';
import {signedShoreDistance as reference} from '../../tests/fixtures/water-loop-baseline.js';
const scenarios=[{name:'global',width:4096,height:2048,options:{}},{name:'camera-local',width:1024,height:1024,options:{wrapLongitude:false,pixelKm:12/1024}}];
const results=[];
for(const scenario of scenarios){
 const {width,height,options}=scenario,mask=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(Math.sin(x/width*23)+Math.cos(y/height*17)>.4)mask[y*width+x]=255;
 const times={reference:[],optimized:[]},hashes={};
 for(let run=0;run<6;run++)for(const [name,fn] of (run%2?[['optimized',signedShoreDistance],['reference',reference]]:[['reference',reference],['optimized',signedShoreDistance]])){
  const start=performance.now(),distance=fn(mask,width,height,364.376984409,options),ms=performance.now()-start;
  if(run>0)times[name].push(ms);
  hashes[name]=createHash('sha256').update(new Uint8Array(distance.buffer)).digest('hex');
 }
 const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
 if(hashes.reference!==hashes.optimized)throw Error(`${scenario.name} distance output differs`);
 results.push({scenario:scenario.name,width,height,times,medianMs:{reference:median(times.reference),optimized:median(times.optimized)},speedup:median(times.reference)/median(times.optimized),hash:hashes.optimized,workingBytes:mask.byteLength+mask.length*4});
}
console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,results},null,2));
