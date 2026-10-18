import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile,rename} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {connect} from './cdp.mjs';
const run=promisify(execFile),port=process.env.GLOBE_CDP_PORT||9289,output=process.env.GLOBE_MEMORY_OUTPUT||'/Users/tanoshi/Documents/Codex/2026-10-13/task/globe-integration/memory-attribution';
await mkdir(output,{recursive:true});
const version=await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json()),browser=await connect(version.webSocketDebuggerUrl),targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
const target=targets.find(t=>t.type==='page'&&t.url==='about:blank');assert.ok(target,'Use a fresh isolated browser with one blank page');const page=await connect(target.webSocketDebuggerUrl);
await page.send('Page.enable');await page.send('Runtime.enable');await page.send('Log.enable');await page.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeCreate=URL.createObjectURL.bind(URL),nativeRevoke=URL.revokeObjectURL.bind(URL),urls=new Map();URL.createObjectURL=value=>{const url=nativeCreate(value);urls.set(url,{size:value.size||0,type:value.type,created:performance.now()});return url;};URL.revokeObjectURL=url=>{nativeRevoke(url);urls.delete(url);};window.__memoryURLLedger=()=>({count:urls.size,bytes:[...urls.values()].reduce((n,x)=>n+x.size,0),entries:[...urls.values()]});`});
const evaluate=async expression=>{const r=await page.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const delay=ms=>new Promise(r=>setTimeout(r,ms)),snapshots=[],dumps=[],timed=[];let tracing=false;
async function wait(expression){const end=Date.now()+120000;while(Date.now()<end){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout: '+expression);}
async function snapshot(label){
 const info=await browser.send('SystemInfo.getProcessInfo'),roles=new Map(info.processInfo.map(x=>[x.id,x.type]));const {stdout}=await run('ps',['-axo','pid=,ppid=,rss=']);const rows=stdout.trim().split('\n').map(x=>x.trim().split(/\s+/).map(Number));
 const root=info.processInfo.find(x=>x.type==='browser').id,ids=new Set([root]);let changed;do{changed=false;for(const [pid,ppid] of rows)if(ids.has(ppid)&&!ids.has(pid)){ids.add(pid);changed=true;}}while(changed);
 const own=rows.filter(([pid])=>ids.has(pid)).map(([pid,ppid,kib])=>({pid,ppid,role:roles.get(pid)||'utility/other',rssBytes:kib*1024})),byRole={};for(const r of own)byRole[r.role]=(byRole[r.role]||0)+r.rssBytes;
 const heap=await page.send('Runtime.getHeapUsage'),dom=await page.send('Memory.getDOMCounters'),app=await evaluate('({url:location.href,urls:window.__memoryURLLedger?.(),diagnostics:window.dragexDiagnostics?(()=>{const d=dragexDiagnostics();delete d.coastline;return d;})():null})');
 const result={label,timeMs:Date.now(),heap,dom,byRole,processes:own,...app};snapshots.push(result);console.log(JSON.stringify({label,rssMiB:Object.fromEntries(Object.entries(byRole).map(([k,v])=>[k,Math.round(v/2**20)])),backingMiB:Math.round((heap.backingStorageSize||0)/2**20),urls:app.urls}));return result;
}
async function dump(label,deterministic=false){
 const eventStart=browser.events.length;
 await browser.send('Tracing.start',{transferMode:'ReturnAsStream',traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:8192,includedCategories:['disabled-by-default-memory-infra','devtools.timeline'],memoryDumpConfig:{triggers:[]}}});tracing=true;
 const result=await browser.send('Tracing.requestMemoryDump',{deterministic,levelOfDetail:'detailed'});assert.equal(result.success,true);
 await browser.send('Tracing.end');tracing=false;
 const end=Date.now()+30000;let finished;while(Date.now()<end){finished=browser.events.slice(eventStart).find(e=>e.method==='Tracing.tracingComplete');if(finished)break;await delay(50);}assert.ok(finished?.params.stream);
 let data='';while(true){const chunk=await browser.send('IO.read',{handle:finished.params.stream});data+=chunk.base64Encoded?Buffer.from(chunk.data,'base64').toString():chunk.data;if(chunk.eof)break;}await browser.send('IO.close',{handle:finished.params.stream});
 await writeFile(output+'/'+label+'.trace.json',data);dumps.push({label,deterministic,dumpGuid:result.dumpGuid,traceBytes:Buffer.byteLength(data)});
}
async function measuredExport(label,cancelAt){
 const eventStart=browser.events.length,start=Date.now();await evaluate('document.querySelector("#settings").click();document.querySelector("#render-loop").click()');let cancelled=false;
 while(Date.now()-start<120000){const state=await evaluate('({open:document.querySelector("#loop-render-dialog").open,frame:document.querySelector("#loop-render-progress").value})');const heap=await page.send('Runtime.getHeapUsage');timed.push({label,timeMs:Date.now(),...state,heap});if(cancelAt&&!cancelled&&state.frame>=cancelAt){await evaluate('document.querySelector("#cancel-loop-render").click()');cancelled=true;}if(!state.open)break;await delay(250);}
 assert.equal(await evaluate('document.querySelector("#loop-render-dialog").open'),false);
 if(cancelAt){assert.ok(cancelled);assert.ok((await evaluate('document.querySelector("#toast").textContent')).includes('cancelled'));return;}
 assert.equal(await evaluate('document.querySelector("#loop-render-progress").value'),360);const end=Date.now()+30000;let begin,done;while(Date.now()<end){const events=browser.events.slice(eventStart);begin=events.find(e=>e.method==='Browser.downloadWillBegin');done=events.find(e=>e.method==='Browser.downloadProgress'&&e.params.guid===begin?.params.guid&&e.params.state==='completed');if(done)break;await delay(100);}assert.ok(done);await rename(done.params.filePath||output+'/'+begin.params.guid,output+'/'+label+'.zip');
}
try{
 await browser.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:output,eventsEnabled:true});
 await snapshot('blank-browser');await dump('blank-browser');
 await page.send('Memory.startSampling',{samplingInterval:262144,suppressRandomness:true});await page.send('HeapProfiler.startSampling',{samplingInterval:65536});
 await page.send('Page.navigate',{url:process.argv[2]||'http://127.0.0.1:5189/'});await wait('Boolean(window.dragexDiagnostics)');await delay(3000);await evaluate('document.querySelector("#environment-motion").checked=false;document.querySelector("#age-slider").value=6999;document.querySelector("#age-slider").dispatchEvent(new Event("input"));');await delay(1000);
 await snapshot('idle-loaded');await dump('idle-loaded');
 for(let i=0;i<7;i++){await evaluate(`document.querySelector('[data-mode=system]').click();document.querySelectorAll('#bodies .body-row')[${i}].click();`);await delay(1250);await evaluate('document.querySelector("[data-mode=atlas]").click()');await delay(100);}
 await snapshot('after-navigation');await dump('after-navigation');
 await evaluate('document.querySelector("#relief").checked=false;document.querySelector("#relief").dispatchEvent(new Event("change"));');await delay(200);await evaluate('document.querySelector("#relief").checked=true;document.querySelector("#relief").dispatchEvent(new Event("change"));');await delay(200);
 await snapshot('after-flat-toggle');await dump('after-flat-toggle');
 await measuredExport('cancelled-export',12);await delay(2000);await snapshot('after-cancellation');await dump('after-cancellation');
 await measuredExport('complete-export');await delay(2000);await snapshot('after-complete-export');await dump('after-complete-export');
 for(let i=0;i<13;i++){await delay(5000);await snapshot('cleanup-wait-'+(i+1));}
 assert.equal(await evaluate('__memoryURLLedger().count'),0);await dump('after-natural-cleanup');
 await writeFile(output+'/native-renderer-sampling.json',JSON.stringify(await page.send('Memory.getSamplingProfile'),null,2));await page.send('Memory.stopSampling');await writeFile(output+'/js-live-sampling.json',JSON.stringify(await page.send('HeapProfiler.stopSampling'),null,2));
 await dump('after-diagnostic-GC',true);await snapshot('after-diagnostic-GC');
 const errors=page.events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Log.entryAdded'&&e.params.entry.level==='error'&&!e.params.entry.url?.endsWith('/favicon.ico'));assert.deepEqual(errors,[]);
 const report={url:process.argv[2]||'http://127.0.0.1:5189/',browser:version.Browser,snapshots,dumps,timed,errors};await writeFile(output+'/memory-attribution.json',JSON.stringify(report,null,2)+'\n');
}catch(error){await writeFile(output+'/partial.json',JSON.stringify({snapshots,dumps,timed,error:String(error)},null,2));throw error;}finally{if(tracing)await browser.send('Tracing.end');page.close();browser.close();}
