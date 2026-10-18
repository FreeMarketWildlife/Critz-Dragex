import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTextureCache} from '../src/texture-cache.js';
test('unselected surface variants are never built and repeated toggles reuse the selected textures',()=>{
 const built=[],disposed=[];
 const cache=makeTextureCache(key=>{built.push(key);return {key,dispose(){disposed.push(key);}};});
 assert.equal(cache.count,0);const relief=cache.get(true);assert.deepEqual(built,[true]);assert.equal(cache.count,1);
 assert.equal(cache.get(true),relief);assert.deepEqual(built,[true]);const flat=cache.get(false);assert.equal(cache.count,2);assert.equal(cache.get(false),flat);assert.deepEqual(built,[true,false]);assert.deepEqual(disposed,[]);
 cache.invalidate();assert.deepEqual(disposed,[true,false]);assert.equal(cache.count,0);
});
test('source changes dispose all old variants and rebuild only the requested new geography',()=>{
 let source='old';const disposed=[];
 const cache=makeTextureCache(key=>({source,key,dispose(){disposed.push(this.source+':'+this.key);}}));
 const old=cache.get(true);cache.get(false);source='new';cache.invalidate();
 const next=cache.get(false);assert.equal(next.source,'new');assert.notEqual(next,old);assert.equal(cache.count,1);assert.deepEqual(disposed,['old:true','old:false']);cache.invalidate();cache.invalidate();assert.equal(disposed.length,3);
});

test('only the selected variant remains uploaded while exact source bitmaps and cache hits survive switches',()=>{
 const built=[],disposals=[],pixels=new Uint8Array([13,27,81,255]);
 const cache=makeTextureCache(key=>{built.push(key);return {key,pixels,dispose(){disposals.push(key);}};});
 const relief=cache.select(true);assert.equal(relief.needsUpdate,true);assert.deepEqual(disposals,[]);
 const flat=cache.select(false);assert.deepEqual(disposals,[true]);assert.equal(flat.needsUpdate,true);
 assert.equal(cache.select(false),flat);assert.deepEqual(disposals,[true]);
 assert.equal(cache.select(true),relief);assert.deepEqual(disposals,[true,false]);assert.deepEqual(built,[true,false]);assert.equal(relief.pixels,pixels);assert.deepEqual([...relief.pixels],[13,27,81,255]);
 cache.invalidate();assert.equal(cache.count,0);const regenerated=cache.select(false);assert.notEqual(regenerated,flat);assert.deepEqual(built,[true,false,false]);
});
