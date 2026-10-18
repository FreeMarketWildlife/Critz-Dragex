import assert from 'node:assert/strict';
import {mkdir,readdir,writeFile,stat,readFile,rename} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {openTestPage} from './cdp.mjs';
const run=promisify(execFile),output=process.env.GLOBE_SECOND_PASS_OUTPUT||'/Users/tanoshi/Documents/Codex/2026-10-13/task/globe-integration';
await mkdir(output+'/exports',{recursive:true});
const page=await openTestPage(process.argv[2]||'http://127.0.0.1:5188/',{reducedMotion:true});
const samples=[],checks=[],archives=[];
let phase='loaded',browserId;
const gpu=await page.browserSend('SystemInfo.getInfo'),processes=await page.browserSend('SystemInfo.getProcessInfo');
browserId=processes.processInfo.find(p=>p.type==='browser').id;
async function rss(){
 const {stdout}=await run('ps',['-axo','pid=,ppid=,rss=']);
 const rows=stdout.trim().split('\n').map(s=>s.trim().split(/\s+/).map(Number)),ids=new Set([browserId]);let added;
 do{added=false;for(const [pid,ppid] of rows)if(ids.has(ppid)&&!ids.has(pid)){ids.add(pid);added=true;}}while(added);
 const own=rows.filter(([pid])=>ids.has(pid));return {processRssBytes:own.reduce((n,r)=>n+r[2]*1024,0),processes:own.map(([pid,ppid,kib])=>({pid,ppid,rssBytes:kib*1024}))};
}
async function sample(){
 const [heap,app,memory]=await Promise.all([page.send('Runtime.getHeapUsage'),page.evaluate('({frame:Number(document.querySelector("#loop-render-progress").value),open:document.querySelector("#loop-render-dialog").open,gpu:dragexDiagnostics().renderer.memory,surfaceTextureVariants:dragexDiagnostics().renderer.surfaceTextureVariants})'),rss()]);
 const result={timeMs:Date.now(),phase,heap,...app,...memory};samples.push(result);return result;
}
async function rendered(){await page.send('Page.bringToFront');const frame=await page.evaluate('dragexDiagnostics().renderer.render.frame');await page.waitFor(`dragexDiagnostics().renderer.render.frame>${frame}`);}
async function exportLoop(name,cancelAt=null){
 phase=name;const eventStart=page.browserEvents.length,start=Date.now();let cancelled=false,lastReport=0;
 await page.evaluate('document.querySelector("#settings").click();document.querySelector("#render-loop").click()');
 while(Date.now()-start<240000){
  const s=await sample();
  if(s.frame>=lastReport+60){lastReport=s.frame;console.log(JSON.stringify({phase,frame:s.frame,rssMiB:Math.round(s.processRssBytes/2**20),backingMiB:Math.round((s.heap.backingStorageSize||0)/2**20)}));}
  if(cancelAt!==null&&!cancelled&&s.frame>=cancelAt){await page.evaluate('document.querySelector("#cancel-loop-render").click()');cancelled=true;}
  if(!s.open)break;
  await page.delay(250);
 }
 assert.equal(await page.evaluate('document.querySelector("#loop-render-dialog").open'),false,'Export did not terminate');
 if(cancelAt!==null){assert.ok(cancelled);assert.ok((await page.evaluate('document.querySelector("#toast").textContent')).includes('cancelled'));await rendered();await sample();checks.push({name,framesBeforeCancellation:await page.evaluate('document.querySelector("#loop-render-progress").value'),elapsedMs:Date.now()-start});return;}
 assert.equal(await page.evaluate('document.querySelector("#loop-render-progress").value'),360);
 const end=Date.now()+30000;let completed,begin;
 while(Date.now()<end){
  const events=page.browserEvents.slice(eventStart);begin=events.find(e=>e.method==='Browser.downloadWillBegin');
  completed=events.find(e=>e.method==='Browser.downloadProgress'&&e.params.guid===begin?.params.guid&&e.params.state==='completed');
  if(completed)break;await page.delay(100);
 }
 assert.ok(completed,'Archive download must complete');
 const filename=output+'/exports/'+name+'.zip';await rename(completed.params.filePath||output+'/exports/'+begin.params.guid,filename);
 const bytes=await readFile(filename),hash=createHash('sha256').update(bytes).digest('hex');
 archives.push({name,path:filename,bytes:bytes.length,sha256:hash,elapsedMs:Date.now()-start});await rendered();await sample();console.log(JSON.stringify({phase,archiveBytes:bytes.length,elapsedMs:Date.now()-start}));
}
try{
 await page.browserSend('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:output+'/exports',browserContextId:page.browserContextId,eventsEnabled:true});
 await rendered();await page.evaluate('document.querySelector("#age-slider").value=6999;document.querySelector("#age-slider").dispatchEvent(new Event("input"));document.querySelector("#environment-motion").checked=false;document.querySelector("#loop-phase").value=0;document.querySelector("#loop-phase").dispatchEvent(new Event("input"));');await rendered();
 await sample();
 await exportLoop('cancel-then-restart',5);
 await exportLoop('complete-360-first');
 await exportLoop('cancel-second',12);
 await exportLoop('complete-360-restart');
 phase='space-navigation';const navigation=[];
 for(let cycle=0;cycle<3;cycle++){
  for(let body=0;body<7;body++){
   await page.evaluate(`document.querySelector('[data-mode=system]').click();document.querySelectorAll('#bodies .body-row')[${body}].click();`);await page.delay(1250);await rendered();
   assert.equal(await page.evaluate('dragexDiagnostics().mode'),'system');
   await page.evaluate('document.querySelector("[data-mode=atlas]").click()');await rendered();assert.equal(await page.evaluate('dragexDiagnostics().mode'),'atlas');
   assert.ok((await page.evaluate('document.querySelector("#cursor").textContent')).includes('20.00° N'));await sample();
  }
  navigation.push(await page.evaluate('dragexDiagnostics().renderer.memory'));
 }
 assert.deepEqual(navigation[2],navigation[1]);checks.push({name:'21 space-to-globe round trips retain geographic readout and stable warmed resources',navigation});
 phase='map-replacement';const mapCycles=[];
 for(let cycle=0;cycle<3;cycle++){
  for(const [lat,lon] of [[-25,60],[20,0]]){
   await page.evaluate(`document.querySelector('#settings').click();{const form=document.querySelector('#placement-form');form.elements.lat.value=${lat};form.elements.lon.value=${lon};form.requestSubmit();}document.querySelector('#settings-dialog').close();`);await rendered();
   assert.deepEqual(await page.evaluate('JSON.parse(localStorage.getItem("dragex-globe-project-v1")).placement'),{lat,lon});await sample();
  }
  mapCycles.push(await page.evaluate('dragexDiagnostics().renderer.memory'));
 }
 assert.deepEqual(mapCycles[2],mapCycles[1]);checks.push({name:'Six large source-placement changes invalidate maps and stabilize GPU counters',mapCycles});
 phase='surface-variants';
 const selectRelief=async value=>{await page.evaluate(`document.querySelector('#relief').checked=${value};document.querySelector('#relief').dispatchEvent(new Event('change'));`);await rendered();};
 assert.equal(await page.evaluate('dragexDiagnostics().renderer.surfaceTextureVariants'),1);
 await selectRelief(false);assert.equal(await page.evaluate('dragexDiagnostics().renderer.surfaceTextureVariants'),2);
 for(const [lat,lon] of [[18,-7],[20,0]]){
  await page.evaluate(`document.querySelector('#settings').click();{const form=document.querySelector('#placement-form');form.elements.lat.value=${lat};form.elements.lon.value=${lon};form.requestSubmit();}document.querySelector('#settings-dialog').close();`);await rendered();
  assert.equal(await page.evaluate('dragexDiagnostics().renderer.surfaceTextureVariants'),1);
 }
 await selectRelief(true);assert.equal(await page.evaluate('dragexDiagnostics().renderer.surfaceTextureVariants'),2);await sample();
 checks.push({name:'Lazy flat presentation builds on selection, invalidates on source edits and restores relief'});
 const screen=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(output+'/hardware-release.png',Buffer.from(screen.data,'base64'));
 phase='idle-after';for(let i=0;i<8;i++){await page.delay(250);await sample();}
 assert.deepEqual(page.errors(),[]);
 const maxima={processRssBytes:Math.max(...samples.map(s=>s.processRssBytes)),usedHeapBytes:Math.max(...samples.map(s=>s.heap.usedSize)),backingStorageBytes:Math.max(...samples.map(s=>s.heap.backingStorageSize||0))};
 const report={readyMs:page.readyMs,processRoles:processes.processInfo,url:process.argv[2]||'http://127.0.0.1:5188/',gpu:{devices:gpu.gpu.devices,backend:gpu.gpu.auxAttributes.glRenderer,webgl:gpu.gpu.featureStatus.webgl},checks,archives,maxima,samples,errors:page.errors(),warnings:page.warnings(),memoryMethod:'Runtime.getHeapUsage plus sum of resident bytes in the owned Chrome process tree, sampled approximately every 250 ms during exports; RSS includes browser/GPU overhead and can count shared pages more than once.'};
 await writeFile(output+'/second-pass-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks,archives,maxima,errors:report.errors},null,2));
}catch(error){await writeFile(output+'/partial-browser-report.json',JSON.stringify({phase,checks,archives,samples,error:String(error)},null,2)+'\n');throw error;}finally{await page.close();}
