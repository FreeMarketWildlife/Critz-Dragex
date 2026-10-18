import test from 'node:test';
import assert from 'node:assert/strict';
import {installRenderLifecycle} from '../src/render-lifecycle.js';
function fixture(){
 const window=new EventTarget(),document=new EventTarget(),frames=new Map(),calls={render:0,resume:0,save:0,dispose:0};let serial=0;document.hidden=false;
 window.requestAnimationFrame=fn=>{const id=serial++;frames.set(id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);
 const lifecycle=installRenderLifecycle({window,document,render:()=>calls.render++,onResume:()=>calls.resume++,onPageHide:()=>calls.save++,dispose:()=>calls.dispose++});
 const tick=()=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback(100);};
 const hide=persisted=>{const e=new Event('pagehide');e.persisted=persisted;window.dispatchEvent(e);};
 return {window,document,frames,calls,lifecycle,tick,hide};
}
test('back-forward restoration retains resources, saves on suspension and resumes exactly one loop',()=>{
 const f=fixture();assert.equal(f.frames.size,1);f.tick();assert.equal(f.frames.size,1);
 f.hide(true);assert.equal(f.calls.save,1);assert.equal(f.frames.size,0);assert.equal(f.calls.dispose,0);
 f.window.dispatchEvent(new Event('pageshow'));f.window.dispatchEvent(new Event('pageshow'));assert.equal(f.frames.size,1);f.tick();assert.equal(f.calls.render,2);
 f.hide(true);f.window.dispatchEvent(new Event('pageshow'));assert.equal(f.frames.size,1);assert.equal(f.calls.dispose,0);
 f.lifecycle.dispose();assert.equal(f.calls.dispose,1);assert.equal(f.frames.size,0);
});
test('hidden pages stop rendering and resume without elapsed hidden simulation time',()=>{
 const f=fixture();f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,0);
 f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.calls.resume,1);assert.equal(f.frames.size,1);
 f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,1);f.tick();assert.equal(f.calls.render,1);f.lifecycle.dispose();
});
test('permanent navigation disposes once and cannot restart through later visibility/pageshow events',()=>{
 const f=fixture();f.hide(false);assert.equal(f.calls.dispose,1);assert.equal(f.frames.size,0);
 f.window.dispatchEvent(new Event('pageshow'));f.document.dispatchEvent(new Event('visibilitychange'));f.lifecycle.dispose();assert.equal(f.calls.dispose,1);assert.equal(f.frames.size,0);
});
