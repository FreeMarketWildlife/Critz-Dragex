import * as THREE from 'three';
import {LOOP_SECONDS} from './water-loop.js';
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let b=0;b<8;b++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
// Uncompressed ZIP; PNG frames are already compressed. No external service,
// encoder, timestamps, or runtime package dependency is needed.
export function zipFrames(entries){
 let offset=0;const chunks=[],central=[];
 for(const {name,data} of entries){
  const filename=encoder.encode(name),crc=crc32(data),header=new Uint8Array(30+filename.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(10,0,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,filename.length,true);header.set(filename,30);
  const record=new Uint8Array(46+filename.length),r=new DataView(record.buffer);
  r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(14,33,true);r.setUint32(16,crc,true);r.setUint32(20,data.length,true);r.setUint32(24,data.length,true);r.setUint16(28,filename.length,true);r.setUint32(42,offset,true);record.set(filename,46);
  chunks.push(header,data);central.push(record);offset+=header.length+data.length;
 }
 const size=central.reduce((n,r)=>n+r.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'application/zip'});
}

export async function renderLoop({renderer,scene,camera,update,onProgress,signal,width=640,height=360,fps=30,metadata={}}){
 const total=LOOP_SECONDS*fps,view=camera.clone(),target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true});
 target.texture.colorSpace=THREE.SRGBColorSpace;
 view.aspect=width/height;view.clearViewOffset();view.updateProjectionMatrix();
 const previousTarget=renderer.getRenderTarget(),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d'),pixels=new Uint8Array(width*height*4),image=ctx.createImageData(width,height),entries=[];
 try{
  for(let frame=0;frame<total;frame++){
   if(signal?.aborted)throw new DOMException('Loop render cancelled.','AbortError');
   update(frame/fps);
   renderer.setRenderTarget(target);renderer.render(scene,view);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);renderer.setRenderTarget(previousTarget);
   for(let y=0;y<height;y++)image.data.set(pixels.subarray(y*width*4,(y+1)*width*4),(height-1-y)*width*4);
   ctx.putImageData(image,0,0);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not encode a loop frame.');
   entries.push({name:`frames/${String(frame).padStart(4,'0')}.png`,data:new Uint8Array(await blob.arrayBuffer())});
   onProgress(frame+1,total);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  entries.push({name:'loop.json',data:encoder.encode(JSON.stringify({version:1,width,height,fps,frames:total,durationSeconds:LOOP_SECONDS,firstPhase:0,lastPhase:(total-1)/total,repeat:true,...metadata},null,2))});
  entries.push({name:'README.txt',data:encoder.encode(`Libriam Globe: seamless ${LOOP_SECONDS}-second loop\n${total} PNG frames, ${width} x ${height}, ${fps} fps.\nPlay in numeric order and repeat. The endpoint frame is intentionally omitted.\nGeography and history are frozen at export; update the map and render again.\nStylized visual physics, not measured weather or fluid dynamics.\n\nOptional video conversion, from inside this folder:\nffmpeg -framerate ${fps} -i frames/%04d.png -c:v libx264 -pix_fmt yuv420p Libriam-loop.mp4\n`)});
  return zipFrames(entries);
 }finally{renderer.setRenderTarget(previousTarget);target.dispose();}
}
