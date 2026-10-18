import assert from 'node:assert/strict';
import {openTestPage} from './cdp.mjs';
const results=[];
for(const [tag,url] of [['before',process.argv[2]||'http://127.0.0.1:5187/'],['after',process.argv[3]||'http://127.0.0.1:5186/']]){
 const page=await openTestPage(url,{reducedMotion:true});
 try{
  await page.delay(800);
  const token=await page.evaluate('window.__cacheToken=crypto.randomUUID();window.addEventListener("pageshow",e=>window.__cacheRestore=e.persisted);window.__cacheToken');
  const history=await page.send('Page.getNavigationHistory'),entry=history.entries[history.currentIndex];
  await page.send('Page.navigate',{url:'about:blank'});await page.waitFor('location.href==="about:blank"');
  await page.send('Page.navigateToHistoryEntry',{entryId:entry.id});await page.waitFor('Boolean(window.dragexDiagnostics)');await page.delay(500);
  const restore=await page.evaluate('({token:window.__cacheToken,persisted:window.__cacheRestore})');assert.equal(restore.token,token);assert.equal(restore.persisted,true);
  const before=await page.evaluate('document.querySelector("#altitude").textContent'),rect=await page.evaluate('(()=>{const r=document.querySelector("#scene canvas").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.62};})()');
  await page.send('Input.dispatchMouseEvent',{type:'mouseWheel',...rect,deltaX:0,deltaY:-120});await page.delay(800);
  const after=await page.evaluate('document.querySelector("#altitude").textContent');results.push({tag,before,after,wheelResponded:before!==after,persisted:true,errors:page.errors(),expectedDevWarnings:page.warnings()});
 }finally{await page.close();}
}
assert.equal(results[0].wheelResponded,false);assert.equal(results[1].wheelResponded,true);console.log(JSON.stringify(results,null,2));
