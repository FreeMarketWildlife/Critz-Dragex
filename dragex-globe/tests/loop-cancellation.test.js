import test from 'node:test';
import assert from 'node:assert/strict';
import {nextExportFrame,renderLoop} from '../src/loop-export.js';

test('loop cancellation rejects immediately and cancels the pending frame even if the browser never renders it',async()=>{
 const controller=new AbortController();let callback,cancelled;
 const scheduler={requestAnimationFrame:fn=>(callback=fn,42),cancelAnimationFrame:id=>cancelled=id};
 const pending=nextExportFrame(controller.signal,scheduler);controller.abort();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(cancelled,42);callback();
});
test('an already cancelled loop never requests another frame; completed yields remove the cancellation listener',async()=>{
 const controller=new AbortController();controller.abort();let scheduled=0;
 await assert.rejects(nextExportFrame(controller.signal,{requestAnimationFrame:()=>scheduled++}),{name:'AbortError'});assert.equal(scheduled,0);
 const active=new AbortController();let callback,cancelled=false;
 const pending=nextExportFrame(active.signal,{requestAnimationFrame:fn=>(callback=fn,0),cancelAnimationFrame:()=>cancelled=true});callback();await pending;active.abort();assert.equal(cancelled,false);
});
test('export encoding failure restores the previous renderer target and disposes the temporary target',async()=>{
 const originalDocument=globalThis.document;let target=null,disposed=false;
 globalThis.document={createElement:()=>({getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(16)}),putImageData(){}}),toBlob:callback=>callback(null)})};
 const previous={name:'original target'},renderer={getRenderTarget:()=>previous,setRenderTarget(value){if(value!==previous){target=value;target.addEventListener('dispose',()=>disposed=true);}this.current=value;},render(){},readRenderTargetPixels(){}};
 const camera={clone:()=>({clearViewOffset(){},updateProjectionMatrix(){}})};
 try{await assert.rejects(renderLoop({renderer,scene:{},camera,update(){},onProgress(){},width:2,height:2}),/Could not encode/);assert.equal(renderer.current,previous);assert.ok(target);assert.equal(disposed,true);}finally{globalThis.document=originalDocument;}
});

test('Blob-backed rendered frames preserve every baseline ZIP byte, CRC and metadata field',async()=>{
 const {zipFrames:baselineZip}=await import('./fixtures/zip-baseline.js');
 const original={document:globalThis.document,raf:globalThis.requestAnimationFrame,cancel:globalThis.cancelAnimationFrame};
 const payload=new Uint8Array([137,80,78,71,13,10,26,10,71,29]),progress=[];
 globalThis.document={createElement:()=>({getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(16)}),putImageData(){}}),toBlob:callback=>callback(new Blob([payload]))})};
 globalThis.requestAnimationFrame=callback=>(queueMicrotask(()=>callback(0)),1);globalThis.cancelAnimationFrame=()=>{};
 const renderer={getRenderTarget:()=>null,setRenderTarget(){},render(){},readRenderTargetPixels(){}},camera={clone:()=>({clearViewOffset(){},updateProjectionMatrix(){}})};
 try{
  const zip=await renderLoop({renderer,scene:{},camera,update(){},onProgress:(frame)=>progress.push(frame),width:2,height:2,fps:1,metadata:{fixture:true}});
  const data=new Uint8Array(await zip.arrayBuffer()),view=new DataView(data.buffer),entries=[];let offset=0;
  while(view.getUint32(offset,true)===0x04034b50){
   const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),start=offset+30+length;
   const name=new TextDecoder().decode(data.subarray(offset+30,start)),bytes=data.slice(start,start+size);
   assert.equal(view.getUint32(offset+14,true),(await import('../src/loop-export.js')).crc32(bytes));
   entries.push({name,data:name.startsWith('frames/')?payload:bytes});offset=start+size;
  }
  assert.deepEqual(progress,Array.from({length:12},(_,i)=>i+1));assert.equal(entries.length,14);
  const meta=JSON.parse(new TextDecoder().decode(entries.find(e=>e.name==='loop.json').data));
  assert.deepEqual(meta,{version:1,width:2,height:2,fps:1,frames:12,durationSeconds:12,firstPhase:0,lastPhase:11/12,repeat:true,fixture:true});
  assert.deepEqual(data,new Uint8Array(await baselineZip(entries).arrayBuffer()));
 }finally{globalThis.document=original.document;globalThis.requestAnimationFrame=original.raf;globalThis.cancelAnimationFrame=original.cancel;}
});
