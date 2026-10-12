import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,validateProject} from '../src/model.js';
import {annotationGeometry,annotationText,cutAnnotationGroup,screenBox,emptyAnnotations,validateAnnotations} from '../src/annotations.js';
const sample=(id='area',note='Keep this forest')=>({id,type:'box',points:[{lat:20,lon:8},{lat:20,lon:12},{lat:18,lon:12},{lat:18,lon:8}],note,frame:6999});
test('geographic areas have small spherical areas, stable winding and precise outline exports',()=>{
 const a=sample(),g=annotationGeometry(a),reverse=annotationGeometry({...a,points:[...a.points].reverse()});assert.ok(g.areaKm2>290&&g.areaKm2<320);assert.ok(Math.abs(g.areaKm2-reverse.areaKm2)<1e-8);assert.ok(g.center.lat>18&&g.center.lat<20);assert.ok(Math.abs(g.center.lon-10)<1e-8);
 const text=annotationText([a]);assert.match(text,/Age 7, design unit 6999/);assert.match(text,/Keep this forest/);assert.match(text,/\[\[20,8\],\[20,12\],\[18,12\],\[18,8\]\]/);
});
test('areas crossing the date line retain narrow bounds and signed coordinates',()=>{
 const a={...sample(),type:'freehand',points:[{lat:5,lon:179},{lat:5,lon:-179},{lat:3,lon:-179},{lat:3,lon:179}]},g=annotationGeometry(a);assert.ok(g.bounds[0][0]>g.bounds[1][0]);assert.ok(g.areaKm2<200);assert.match(annotationText([a]),/crosses ±180°/);assert.match(annotationText([a]),/-179/);
});
test('sampled boxes follow every edge of a curved geographic projection and reject off-globe borders',()=>{
 const project=p=>({lat:30-p.y/20,lon:p.x/10+p.y*p.y/10000}),points=screenBox({x:20,y:20},{x:100,y:80},project);assert.ok(points.length>20);assert.deepEqual(points[0],project({x:20,y:20}));assert.ok(points.some(p=>Math.abs(p.lon-project({x:100,y:50}).lon)<1e-8));assert.equal(screenBox({x:0,y:0},{x:100,y:100},p=>p.x>50?null:project(p)),null);assert.deepEqual(screenBox({x:0,y:0},{x:1,y:1},project),[]);
});
test('a successful cut clears captured entries, retains independent history and caps it at ten groups',()=>{
 let state={active:[sample('one'),sample('two')],history:[]};const snapshot=structuredClone(state.active);state=cutAnnotationGroup(state,snapshot,{id:'group',cutAt:'2026-10-12T20:00:00Z'});assert.equal(state.active.length,0);assert.equal(state.history[0].annotations.length,2);snapshot[0].note='changed outside';assert.equal(state.history[0].annotations[0].note,'Keep this forest');
 for(let i=0;i<12;i++){state.active=[sample(String(i))];state=cutAnnotationGroup(state,structuredClone(state.active),{id:String(i),cutAt:'2026-10-12T20:00:00Z'});}assert.equal(state.history.length,10);assert.equal(state.history[0].id,'11');assert.equal(state.history.at(-1).id,'2');
});
test('pending clipboard snapshots do not remove edits or annotations created while copying',()=>{
 const a=sample('one'),state={active:[a],history:[]},snapshot=structuredClone(state.active);a.note='Changed after clicking Cut';state.active.push(sample('new'));const cut=cutAnnotationGroup(state,snapshot,{id:'group',cutAt:'2026-10-12T20:00:00Z'});assert.equal(cut.active.length,2);assert.equal(cut.history[0].annotations[0].note,'Keep this forest');
});
test('project import migrates old files and preserves notes, age anchors, contours and cut history',()=>{
 const p=newProject();delete p.annotations;assert.deepEqual(validateProject(p).annotations,emptyAnnotations());p.annotations={active:[sample()],history:[{id:'last',cutAt:'2026-10-12T20:00:00Z',annotations:[sample('old')]}]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))).annotations,validateAnnotations(p.annotations));
 for(const broken of [{...sample(),frame:7000},{...sample(),points:[{lat:91,lon:0},{lat:2,lon:0},{lat:1,lon:2}]},{...sample(),note:'a'.repeat(4001)}])assert.throws(()=>validateAnnotations({active:[broken],history:[]}));assert.throws(()=>validateAnnotations({active:[],history:Array(11).fill(p.annotations.history[0])}));
});
test('freehand circular outlines enclose their center independently of draw direction',()=>{
 const points=Array.from({length:100},(_,i)=>{const angle=i/100*Math.PI*2;return {lat:20+Math.sin(angle),lon:10+Math.cos(angle)}}),a={...sample(),type:'freehand',points},g=annotationGeometry(a);assert.ok(g.areaKm2>110&&g.areaKm2<130);assert.ok(Math.abs(g.center.lat-20)<.02);assert.ok(Math.abs(g.center.lon-10)<.01);assert.ok(Math.abs(annotationGeometry({...a,points:points.reverse()}).areaKm2-g.areaKm2)<1e-7);
});
