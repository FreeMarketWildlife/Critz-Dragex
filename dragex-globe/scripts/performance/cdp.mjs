// Dependency-free test transport. Use only with a separate headless Chrome
// profile: every page gets its own incognito context and synthetic storage.
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function connect(url){
 const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let sequence=0;const pending=new Map(),events=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(Error(JSON.stringify(message.error))):p.resolve(message.result);}}else events.push(message);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},120000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 return {send,events,close:()=>socket.close()};
}
export async function openTestPage(url,{pauseAnimation=false,width=1280,height=800,reducedMotion=false}={}){
 const port=process.env.GLOBE_CDP_PORT||9286,version=await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json()),browser=await connect(version.webSocketDebuggerUrl);
 const {browserContextId}=await browser.send('Target.createBrowserContext'),{targetId}=await browser.send('Target.createTarget',{url:'about:blank',browserContextId});
 const pages=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json()),page=await connect(pages.find(p=>p.id===targetId).webSocketDebuggerUrl);
 await page.send('Runtime.enable');await page.send('Log.enable');await page.send('Page.enable');
 await page.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 if(reducedMotion)await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`let diagnostics;Object.defineProperty(window,'dragexDiagnostics',{configurable:true,get(){return diagnostics;},set(fn){diagnostics=fn;window.__appReadyMs=performance.now();}});${pauseAnimation?'window.requestAnimationFrame=()=>0;':''}`});
 const evaluate=async expression=>{const r=await page.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{const end=Date.now()+120000;while(Date.now()<end){if(await evaluate(expression))return;await delay(100);}throw Error(`Timed out waiting for ${expression}`);};
 const expectedNetwork=e=>e.params.entry.source==='network'&&(e.params.entry.url?.endsWith('/favicon.ico')||e.params.entry.text.includes('Page entered Back-Forward Cache'));
 const warnings=()=>page.events.filter(e=>e.method==='Log.entryAdded'&&e.params.entry.level==='error'&&expectedNetwork(e)).map(e=>e.params.entry);
 const errors=()=>page.events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Log.entryAdded'&&e.params.entry.level==='error'&&!expectedNetwork(e)).map(e=>e.params);
 await page.send('Page.navigate',{url});await waitFor('Boolean(window.dragexDiagnostics)');
 return {send:page.send,evaluate,waitFor,errors,warnings,delay,browserSend:browser.send,browserEvents:browser.events,browserContextId,readyMs:await evaluate('__appReadyMs'),async close(){await browser.send('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}};
}
