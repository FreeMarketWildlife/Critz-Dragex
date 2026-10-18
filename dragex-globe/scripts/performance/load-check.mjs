import {openTestPage} from './cdp.mjs';
const results=[];
for(let i=0;i<3;i++){
 const page=await openTestPage(process.argv[2]||'http://127.0.0.1:5186/',{pauseAnimation:true});
 try{results.push({readyMs:page.readyMs,heap:await page.send('Runtime.getHeapUsage'),errors:page.errors()});}finally{await page.close();}
}
console.log(JSON.stringify({url:process.argv[2]||'http://127.0.0.1:5186/',results,medianReadyMs:results.map(r=>r.readyMs).toSorted((a,b)=>a-b)[1]},null,2));
