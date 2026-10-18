import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleTerrain,makeTerrainSurface} from '../src/terrain-surface.js';
import {terrainRadius} from '../src/terrain.js';
import {timelineState} from '../src/ages.js';

const fixture=(width=12,height=8)=>{
 const image=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x>2&&x<8&&y>1&&y<6){const i=(y*width+x)*4;image[i]=255;image[i+3]=(x*41+y*29)%256;}
 return {image,width,height};
};
function referenceSurface(geometry,image,width,height,frame,exaggeration,relief){
 const state={...timelineState(frame),frame},position=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<position.count;i++){
  const [land,mountain]=sampleTerrain(image,width,height,uv.getX(i),uv.getY(i)),radius=terrainRadius(uv.getX(i),uv.getY(i),land,mountain,state,exaggeration,relief);
  position.setXYZ(i,position.getX(i)*radius,position.getY(i)*radius,position.getZ(i)*radius);
 }
 geometry.computeVertexNormals();
 return geometry;
}
test('bilinear terrain samples use the documented land/mountain channels and clamp texture edges',()=>{
 const data=new Uint8Array([0,0,0,255,255,0,0,0,255,0,0,0,0,0,0,255]);
 assert.deepEqual(sampleTerrain(data,2,2,.5,.5),[.5,.5]);
 assert.deepEqual(sampleTerrain(data,2,2,-1,-1),[0,1]);
 assert.deepEqual(sampleTerrain(data,2,2,1,0),[1,0]);
 assert.deepEqual(sampleTerrain(data,2,2,.25,.75),[1,0]);
});
test('cached surface matches complete uncached vertex and normal arrays across history, relief and exaggeration',()=>{
 const {image,width,height}=fixture(),geometry=new THREE.SphereGeometry(1,64,40),surface=makeTerrainSurface(geometry,image,width,height);
 for(const frame of [0,99.3,730,1800,2999,5000,5160,5700,6999,1800])for(const [exaggeration,relief] of [[1,true],[10,true],[0,true],[3,false]]){
  assert.equal(surface.update(frame,exaggeration,relief),true);
  const expected=referenceSurface(new THREE.SphereGeometry(1,64,40),image,width,height,frame,exaggeration,relief);
  assert.deepEqual(geometry.attributes.position.array,expected.attributes.position.array);
  assert.deepEqual(geometry.attributes.normal.array,expected.attributes.normal.array);
  const sphere=geometry.boundingSphere,positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++)assert.ok(sphere.containsPoint(new THREE.Vector3().fromBufferAttribute(positions,i)),`vertex ${i} escaped raycast bound`);
  expected.dispose();
 }
 assert.ok(surface.cachedBytes<geometry.attributes.position.count*20);
 geometry.dispose();
});
test('same design unit does not re-upload geometry or move draped points independently of the mesh',()=>{
 const {image,width,height}=fixture(),geometry=new THREE.SphereGeometry(1,32,20),surface=makeTerrainSurface(geometry,image,width,height);
 surface.update(2010.1,1,true);const before=surface.radiusAt({lat:10,lon:-10}),version=geometry.attributes.position.version;
 assert.equal(surface.update(2010.2,1,true),false);assert.equal(geometry.attributes.position.version,version);assert.equal(surface.radiusAt({lat:10,lon:-10}),before);
 assert.equal(surface.update(2011,1,true),true);assert.equal(geometry.attributes.position.version,version+1);
 geometry.dispose();
});
test('map replacement invalidates sparse samples and raises newly mapped terrain without retaining old relief',()=>{
 const {image,width,height}=fixture(),geometry=new THREE.SphereGeometry(1,64,40),surface=makeTerrainSurface(geometry,image,width,height);
 surface.update(3000,10,true);const previous=geometry.attributes.position.array.slice();
 const next=new Uint8Array(image.length);for(let i=0;i<next.length;i+=4)if(image[i]===0){next[i]=255;next[i+3]=170;}
 surface.replaceMap(next);assert.equal(surface.update(3000,10,true),true);assert.notDeepEqual(geometry.attributes.position.array,previous);
 const expected=referenceSurface(new THREE.SphereGeometry(1,64,40),next,width,height,3000,10,true);
 assert.deepEqual(geometry.attributes.position.array,expected.attributes.position.array);assert.deepEqual(geometry.attributes.normal.array,expected.attributes.normal.array);
 expected.dispose();geometry.dispose();
});
