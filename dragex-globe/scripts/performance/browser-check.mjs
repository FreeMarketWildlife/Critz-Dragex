import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {openTestPage} from './cdp.mjs';
const url=process.argv[2]||'http://127.0.0.1:5186/',out=new URL('../../docs/performance/',import.meta.url),checks=[];
await mkdir(out,{recursive:true});
const page=await openTestPage(url,{reducedMotion:true});
const evalJS=page.evaluate,check=(name,data={})=>checks.push({name,...data});
async function rendered(){await page.send('Page.bringToFront');const frame=await evalJS('dragexDiagnostics().renderer.render.frame');await page.waitFor(`dragexDiagnostics().renderer.render.frame>${frame}`);}
async function shot(name){const result=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(name,out),Buffer.from(result.data,'base64'));}
try{
 await rendered();assert.equal((await evalJS('dragexDiagnostics().webgl')),true);check('WebGL initializes and renders');
 for(const frame of [350,1600,2900,3500,4500,5450,6999]){
  await evalJS(`{const slider=document.querySelector('#age-slider');slider.value=${frame};slider.dispatchEvent(new Event('input'));}`);await rendered();
  assert.equal(await evalJS('dragexDiagnostics().timeline.frame'),frame);assert.equal(await evalJS('document.querySelectorAll(".age-button.active").length'),1);
 }check('All seven ages scrub in forward and backward directions');
 await evalJS(`{const slider=document.querySelector('#age-slider');slider.value=2900;slider.dispatchEvent(new Event('input'));}`);await rendered();
 for(const scale of [10,0,1]){
  await evalJS(`{const slider=document.querySelector('#terrain-exaggeration');slider.value=${scale};slider.dispatchEvent(new Event('input'));}`);await rendered();
  assert.equal(await evalJS('JSON.parse(localStorage.getItem("dragex-globe-project-v1")).terrain.exaggeration'),scale);
 }check('Terrain 0×, 10× and 1× render and persist');
 const rect=await evalJS('(()=>{const r=document.querySelector("#scene canvas").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.62};})()');
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});await rendered();
 assert.equal(await evalJS('document.querySelector("#coordinate-panel").hidden'),false);check('Raised-surface picking returns coordinates');
 const memoryBefore=await evalJS('dragexDiagnostics().renderer.memory');
 for(let i=0;i<8;i++){
  await evalJS(`document.querySelector('#pin-selected').click();document.querySelector('#pin-name').value='Synthetic ${i}';document.querySelector('#pin-form').requestSubmit();`);await rendered();assert.equal(await evalJS('dragexDiagnostics().pins'),1);
  await evalJS("document.querySelector('#pins .remove').click()");await rendered();assert.equal(await evalJS('dragexDiagnostics().pins'),0);
 }
 const memoryAfter=await evalJS('dragexDiagnostics().renderer.memory');assert.deepEqual(memoryAfter,memoryBefore);check('Repeated pin creation/deletion retains stable GPU resource counts',{memoryBefore,memoryAfter});
 await evalJS("document.querySelector('#close-coords').click();document.querySelector('#project-menu').click()");
 const exported=await evalJS('JSON.parse(document.querySelector("#export-json").value)');assert.equal(exported.schemaVersion,1);assert.equal(exported.timeline.frame,2900);assert.equal(exported.bodies.length,7);
 await evalJS("document.querySelector('#export-dialog').close();document.querySelector('#import-btn').click();document.querySelector('#import-json').value='{}';document.querySelector('#import-form').requestSubmit()");
 assert.ok((await evalJS('document.querySelector("#toast").textContent')).includes('Import failed'));assert.equal(await evalJS('dragexDiagnostics().bodies'),7);await evalJS("document.querySelector('#import-dialog').close()");check('Project export preserves v1 fields and invalid import leaves the project intact');
 const mapCycles=[];
 for(let cycle=0;cycle<3;cycle++){
  for(const [lat,lon] of [[18,-7],[20,0]]){
   await evalJS(`document.querySelector('#settings').click();{const f=document.querySelector('#placement-form');f.elements.lat.value=${lat};f.elements.lon.value=${lon};f.requestSubmit();}document.querySelector('#settings-dialog').close();`);await rendered();
   assert.deepEqual(await evalJS('JSON.parse(localStorage.getItem("dragex-globe-project-v1")).placement'),{lat,lon});
  }
  mapCycles.push(await evalJS('dragexDiagnostics().renderer.memory'));
 }
 console.error('Map resource cycles:',JSON.stringify(mapCycles));
 assert.deepEqual(mapCycles[2],mapCycles[1]);check('Repeated geography replacement releases old maps and stabilizes GPU resources after visible assets warm up',{mapCycles});
 await evalJS('document.querySelector("[data-mode=system]").click()');await rendered();assert.equal(await evalJS('dragexDiagnostics().mode'),'system');
 await evalJS('document.querySelector("#space-overview").click()');await page.delay(1500);await rendered();assert.equal(await evalJS('dragexDiagnostics().solar.bodies.length'),7);await shot('browser-qa-system.png');
 await evalJS('document.querySelector("[data-mode=atlas]").click();document.querySelector("#home").click()');await rendered();assert.equal(await evalJS('dragexDiagnostics().mode'),'atlas');assert.ok((await evalJS('document.querySelector("#cursor").textContent')).includes('20.00° N'));check('Solar overview and return to surface render all seven bodies and restore geographic readout');
 // Real history navigation: retained token proves an actual cache restore,
 // and a wheel event checks that OrbitControls listeners survived it.
 const token=await evalJS('window.__cacheToken=crypto.randomUUID();window.addEventListener("pageshow",e=>window.__restoredFromCache=e.persisted);window.__cacheToken');
 const history=await page.send('Page.getNavigationHistory'),entry=history.entries[history.currentIndex];
 await page.send('Page.navigate',{url:'about:blank'});await page.waitFor('location.href==="about:blank"');
 await page.send('Page.navigateToHistoryEntry',{entryId:entry.id});await page.waitFor('Boolean(window.dragexDiagnostics)');await rendered();
 const restored=await evalJS('({token:window.__cacheToken,persisted:window.__restoredFromCache})');assert.equal(restored.token,token);assert.equal(restored.persisted,true);
 const altitudeBefore=await evalJS('document.querySelector("#altitude").textContent');
 await page.send('Input.dispatchMouseEvent',{type:'mouseWheel',...rect,deltaX:0,deltaY:-120});await page.delay(700);await rendered();
 const altitudeAfter=await evalJS('document.querySelector("#altitude").textContent');assert.notEqual(altitudeAfter,altitudeBefore);check('Actual back-forward cache restore preserves wheel zoom',{altitudeBefore,altitudeAfter,persisted:restored.persisted});
 await evalJS('document.querySelector("#home").click()');await rendered();await shot('browser-qa-desktop.png');
 await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await rendered();
 assert.equal(await evalJS('document.documentElement.scrollWidth<=innerWidth'),true);await shot('browser-qa-mobile.png');check('390×844 viewport renders without horizontal overflow');
 // Start and cancel through the real export UI. The rendering target must be
 // restored so that another ordinary globe frame can be drawn immediately.
 await evalJS('document.querySelector("#settings").click();document.querySelector("#render-loop").click()');
 await page.waitFor('document.querySelector("#loop-render-progress").value>=1');await evalJS('document.querySelector("#cancel-loop-render").click()');
 await page.waitFor('!document.querySelector("#loop-render-dialog").open');await rendered();assert.ok((await evalJS('document.querySelector("#toast").textContent')).includes('cancelled'));check('UI loop export cancellation restores the live scene');
 assert.deepEqual(page.errors(),[]);check('No JavaScript or WebGL shader errors');
 console.log(JSON.stringify({url,checks,errors:page.errors(),expectedDevWarnings:page.warnings(),diagnostics:await evalJS('(()=>{const d=dragexDiagnostics();delete d.coastline;return d;})()')},null,2));
}finally{await page.close();}
