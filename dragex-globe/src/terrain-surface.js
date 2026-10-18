import * as THREE from 'three';
import {timelineState} from './ages.js';
import {terrainRadius} from './terrain.js';

// Match the texture's bilinear sample, including its clamped polar/seam edges.
export function sampleTerrain(image,width,height,u,v){
 const x=Math.max(0,Math.min(width-1,u*width-.5)),y=Math.max(0,Math.min(height-1,v*height-.5));
 const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=x-x0,fy=y-y0;
 const get=channel=>((image[(y0*width+x0)*4+channel]*(1-fx)+image[(y0*width+x1)*4+channel]*fx)*(1-fy)+(image[(y1*width+x0)*4+channel]*(1-fx)+image[(y1*width+x1)*4+channel]*fx)*fy)/255;
 return [get(0),get(3)];
}

export function makeTerrainSurface(geometry,image,width,height){
 const positions=geometry.attributes.position,uvs=geometry.attributes.uv,base=positions.array.slice();
 let state={...timelineState(2900),frame:2900},exaggeration=1,relief=true,lastKey='',maxRadius=1,active,land,mountain;
 let maxBaseRadius=0;
 for(let i=0;i<base.length;i+=3)maxBaseRadius=Math.max(maxBaseRadius,Math.hypot(base[i],base[i+1],base[i+2]));
 function replaceMap(nextImage){
  image=nextImage;lastKey='';
  const indices=[],lands=[],mountains=[];
  for(let i=0;i<positions.count;i++){
   const [l,m]=sampleTerrain(image,width,height,uvs.getX(i),uvs.getY(i));
   if(l!==0||m!==0){indices.push(i);lands.push(l);mountains.push(m);}
  }
  active=Uint32Array.from(indices);land=Float64Array.from(lands);mountain=Float64Array.from(mountains);
 }
 replaceMap(image);
 return {
  replaceMap,
  get maxRadius(){return maxRadius;},
  get cachedBytes(){return active.byteLength+land.byteLength+mountain.byteLength;},
  radiusAt(p){const u=(p.lon+180)/360,v=(p.lat+90)/180,[l,m]=sampleTerrain(image,width,height,u,v);return terrainRadius(u,v,l,m,state,exaggeration,relief);},
  update(frame,nextExaggeration,nextRelief){
   const key=`${Math.round(frame)}:${nextExaggeration}:${nextRelief}`;
   if(key===lastKey)return false;
   lastKey=key;state={...timelineState(frame),frame};exaggeration=nextExaggeration;relief=nextRelief;
   const uniformRadius=.94+.06*state.emergence;maxRadius=uniformRadius;
   // Ocean vertices have no relief. Only land/mountain vertices need texture
   // samples and trigonometry; those samples change only when the map does.
   const data=positions.array;
   for(let i=0;i<base.length;i++)data[i]=base[i]*uniformRadius;
   if(relief&&exaggeration!==0)for(let j=0;j<active.length;j++){
    const i=active[j],r=terrainRadius(uvs.getX(i),uvs.getY(i),land[j],mountain[j],state,exaggeration,relief),offset=i*3;
    maxRadius=Math.max(maxRadius,r);data[offset]=base[offset]*r;data[offset+1]=base[offset+1]*r;data[offset+2]=base[offset+2]*r;
   }
   positions.needsUpdate=true;geometry.computeVertexNormals();
   // A conservative sphere centered on the reference globe avoids two full
   // scans for an exact off-center sphere; picking still uses the real mesh.
   geometry.boundingSphere??=new THREE.Sphere();geometry.boundingSphere.center.set(0,0,0);
   geometry.boundingSphere.radius=maxRadius*maxBaseRadius*(1+1e-7);
   return true;
  }
 };
}
