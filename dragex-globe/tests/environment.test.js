import test from 'node:test';
import assert from 'node:assert/strict';
import {waveSample,loopPhase,bakeWaveAtlas,signedShoreDistance,WAVE_STRIDE,WAVE_SIZE,WAVE_COLUMNS} from '../src/water-loop.js';
import {zipFrames,crc32} from '../src/loop-export.js';

test('wave height and slopes have matching endpoints and velocities over a 12-second loop',()=>{
 for(const [x,y] of [[0,0],[.15,.87],[.99,.4]]){
  const start=waveSample(x,y,0),end=waveSample(x,y,1);
  for(const key of ['height','dx','dy'])assert.ok(Math.abs(start[key]-end[key])<1e-12);
  const eps=1e-5;
  const left=(waveSample(x,y,0).height-waveSample(x,y,-eps).height)/eps,right=(waveSample(x,y,1+eps).height-waveSample(x,y,1).height)/eps;
  assert.ok(Math.abs(left-right)<.015);
 }
 assert.equal(loopPhase(12),0);assert.equal(loopPhase(-3),.75);
});
test('baked wave tiles wrap their gutters without leaking neighboring frames',()=>{
 const atlas=bakeWaveAtlas();assert.equal(atlas.data.length,atlas.width*atlas.height*4);
 const pixel=(frame,x,y)=>{const i=((Math.floor(frame/WAVE_COLUMNS)*WAVE_STRIDE+y)*atlas.width+(frame%WAVE_COLUMNS)*WAVE_STRIDE+x)*4;return [...atlas.data.slice(i,i+4)];};
 for(const frame of [0,11,12,95])for(const y of [1,17,WAVE_SIZE]){
  assert.deepEqual(pixel(frame,0,y),pixel(frame,WAVE_SIZE,y));assert.deepEqual(pixel(frame,WAVE_SIZE+1,y),pixel(frame,1,y));
 }
});
test('shore distance preserves land/water signs, wraps the date line, and rebuilds after edits',()=>{
 const width=12,height=8,mask=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<3;x++)mask[y*width+x]=255;
 const a=signedShoreDistance(mask,width,height,364);
 assert.ok(a[4*width+1]<0);assert.ok(a[4*width+6]>a[4*width+4]);assert.ok(a[4*width+11]<a[4*width+9]);
 mask.fill(0);for(let y=0;y<height;y++)for(let x=6;x<9;x++)mask[y*width+x]=255;
 const b=signedShoreDistance(mask,width,height,364);
 assert.ok(b[4*width+1]>0);assert.ok(b[4*width+7]<0);
});
test('local beach distance uses meter-scale cells and does not connect opposite tile edges',()=>{
 const width=10,height=8,mask=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<3;x++)mask[y*width+x]=255;
 const d=signedShoreDistance(mask,width,height,364,{wrapLongitude:false,pixelKm:.008});
 assert.ok(d[4*width+9]>.04);assert.ok(d[4*width+3]<.01);assert.ok(Math.abs(d[4*width+4]-.012)<1e-6);
});
test('loop archive includes usable ZIP headers, payloads, CRCs and central directory',async()=>{
 const data=new TextEncoder().encode('123456789');assert.equal(crc32(data),0xcbf43926);
 const bytes=new Uint8Array(await zipFrames([{name:'frames/0000.png',data}]).arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(14,true),crc32(data));
 const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),1);
 const offset=view.getUint32(end+16,true);assert.equal(view.getUint32(offset,true),0x02014b50);
});

test('removed cloud layer stays empty and invisible at every loop position',async()=>{
 const {makeClouds}=await import('../src/environment.js');const clouds=makeClouds();
 for(const seconds of [0,6,12]){
  clouds.update(seconds,.26,1,3,1);
  assert.equal(clouds.count,0);assert.equal(clouds.group.children.length,0);assert.equal(clouds.group.visible,false);
 }
 clouds.dispose();
});
