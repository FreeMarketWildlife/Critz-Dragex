// Keep a single render loop and retain GPU/input resources for back-forward
// cache restores. Hidden time must not advance the simulation on resume.
export function installRenderLifecycle({render,onResume=()=>{},onPageHide=()=>{},dispose,window=globalThis.window,document=globalThis.document}){
 let pending=null,suspended=false,disposed=false;
 function stop(){if(pending!==null){window.cancelAnimationFrame(pending);pending=null;}}
 function start(){if(pending===null&&!disposed&&!suspended&&!document.hidden)pending=window.requestAnimationFrame(frame);}
 function frame(now){pending=null;if(disposed||suspended||document.hidden)return;try{render(now);}finally{start();}}
 function visibility(){if(document.hidden)stop();else if(!suspended&&!disposed){onResume();start();}}
 function pagehide(event){suspended=true;stop();try{onPageHide(event);}finally{if(!event.persisted)cleanup();}}
 function pageshow(){if(disposed)return;suspended=false;onResume();start();}
 function cleanup(){if(disposed)return;disposed=true;stop();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);dispose();}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
 start();return {dispose:cleanup};
}
