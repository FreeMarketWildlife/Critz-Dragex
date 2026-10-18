import test from 'node:test';
import assert from 'node:assert/strict';
import {signedShoreDistance} from '../src/water-loop.js';
import {signedShoreDistance as reference} from './fixtures/water-loop-baseline.js';

test('optimized sweeps retain every baseline float on narrow, polar, wrapped, clipped and mixed-alpha masks',()=>{
 let seed=7919;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(const [width,height] of [[1,1],[1,13],[17,1],[2,3],[7,11],[32,19],[97,61]])for(let run=0;run<8;run++){
  const mask=Uint8Array.from({length:width*height},()=>[0,120,127,128,200,255][Math.floor(random()*6)]);
  for(const options of [{},{wrapLongitude:false},{wrapLongitude:false,pixelKm:.0078125},{pixelKm:1.25}]){
   assert.deepEqual(signedShoreDistance(mask,width,height,364.376984409,options),reference(mask,width,height,364.376984409,options));
  }
 }
});
