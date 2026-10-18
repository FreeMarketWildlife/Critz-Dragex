// Artistic wave motion: periodic harmonics, not measured Libriam physics.
// The baked atlas is independent of map geometry and can be reused after edits.
export const LOOP_SECONDS=12;
export const WAVE_FRAMES=96;
export const WAVE_SIZE=64;
export const WAVE_COLUMNS=12;
export const WAVE_ROWS=8;
export const WAVE_STRIDE=WAVE_SIZE+2; // A wrapped gutter prevents tile bleeding.
const TAU=2*Math.PI;
const WAVES=[ [1,2,1,.48], [3,-1,2,.24], [2,5,3,.16], [-5,3,4,.08] ];
export function loopPhase(seconds){return ((seconds%LOOP_SECONDS)+LOOP_SECONDS)%LOOP_SECONDS/LOOP_SECONDS;}
export function waveSample(x,y,phase){
 let height=0,dx=0,dy=0;
 for(const [kx,ky,speed,amplitude] of WAVES){const a=TAU*(kx*x+ky*y-speed*phase);height+=Math.sin(a)*amplitude;dx+=Math.cos(a)*amplitude*kx;dy+=Math.cos(a)*amplitude*ky;}
 return {height,dx:dx/4,dy:dy/4};
}
export function bakeWaveAtlas(){
 const width=WAVE_COLUMNS*WAVE_STRIDE,height=WAVE_ROWS*WAVE_STRIDE,data=new Uint8Array(width*height*4);
 const encode=v=>Math.round(Math.max(0,Math.min(1,v*.5+.5))*255);
 for(let frame=0;frame<WAVE_FRAMES;frame++)for(let y=0;y<WAVE_STRIDE;y++)for(let x=0;x<WAVE_STRIDE;x++){
  const s=waveSample((x-1+.5)/WAVE_SIZE,(y-1+.5)/WAVE_SIZE,frame/WAVE_FRAMES);
  const i=(((Math.floor(frame/WAVE_COLUMNS)*WAVE_STRIDE+y)*width)+(frame%WAVE_COLUMNS)*WAVE_STRIDE+x)*4;
  data[i]=encode(s.dx);data[i+1]=encode(s.dy);data[i+2]=encode(s.height);data[i+3]=255;
 }
 return {data,width,height};
}

// Two-pass distance transform on a wrapped equirectangular grid. Values are
// approximate kilometers to the coastline; east/west cost follows latitude.
export function signedShoreDistance(mask,width,height,radiusKm,options={}){
 if(mask.length!==width*height)throw Error('Coast mask dimensions do not match.');
 const distances=new Float32Array(mask.length);distances.fill(1e6);
 const dy=options.pixelKm??Math.PI*radiusKm/height;
 const wrap=options.wrapLongitude!==false;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const row=y*width,i=row+x,v=mask[i]>127;
  const left=x>0?i-1:wrap?row+width-1:i,right=x<width-1?i+1:wrap?row:i;
  if(v!==(mask[left]>127)||v!==(mask[right]>127)||(y>0&&v!==(mask[i-width]>127))||(y<height-1&&v!==(mask[i+width]>127)))distances[i]=dy*.5;
 }
 // Repeat to propagate across the seam in either direction.
 for(let pass=0;pass<2;pass++)for(const forward of [true,false]){
  for(let k=0;k<height;k++){
   const y=forward?k:height-1-k,dx=options.pixelKm??2*Math.PI*radiusKm/width*Math.max(.01,Math.cos((y+.5)/height*Math.PI-Math.PI/2)),diagonal=Math.hypot(dx,dy);
   for(let j=0;j<width;j++){
    const x=forward?j:width-1-j,row=y*width,i=row+x;
    const left=x>0?i-1:wrap?row+width-1:i,right=x<width-1?i+1:wrap?row:i;
    const previous=forward?left:right;
    let best=Math.min(distances[i],distances[previous]+dx);
    const py=y+(forward?-1:1);
    if(py>=0&&py<height){const vertical=forward?-width:width;best=Math.min(best,distances[i+vertical]+dy,distances[left+vertical]+diagonal,distances[right+vertical]+diagonal);}
    distances[i]=best;
   }
  }
 }
 for(let i=0;i<distances.length;i++)if(mask[i]>127)distances[i]*=-1;
 return distances;
}
