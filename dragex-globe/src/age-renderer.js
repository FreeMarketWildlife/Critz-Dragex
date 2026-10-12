import {terrainRadius} from './terrain.js';
import * as THREE from 'three';
import { RIVER_MOUTHS,makeRiverRoute,ISLAND_CENTER,ISLAND_AXIS,ISLAND_HALF_LENGTH_KM,ISLAND_HALF_WIDTH_KM,POOL_DIAMETER_KM } from './hydrology.js';
import { lakeField,mountainField,droughtCost,timelineState } from './ages.js';
const W=2048,H=1024;
const xy=p=>[(p.lon+180)/360*W,(90-p.lat)/180*H];
function pathFor(feature){const p=new Path2D();feature.geometry.coordinates[0].forEach(([lon,lat],i)=>{const [x,y]=xy({lon,lat});i?p.lineTo(x,y):p.moveTo(x,y);});p.closePath();return p;}
export function makeAgeMaps(hokkaido){
 const mask=document.createElement('canvas');mask.width=W;mask.height=H;const ctx=mask.getContext('2d',{willReadFrequently:true}),landPath=pathFor(hokkaido);ctx.fillStyle='white';ctx.fill(landPath);const image=ctx.getImageData(0,0,W,H),data=image.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(!data[i]){data[i+3]=0;continue;}const p={lon:(x+.5)/W*360-180,lat:90-(y+.5)/H*180};data[i]=255;data[i+1]=Math.round(Math.min(1,droughtCost(p)/3)*255);data[i+2]=Math.round(Math.max(0,Math.min(1,(1.08-lakeField(p))/.16))*255);data[i+3]=Math.round(mountainField(p)*255);}
 ctx.putImageData(image,0,0);
 const flipped=new Uint8Array(data.length);for(let y=0;y<H;y++)flipped.set(data.subarray(y*W*4,(y+1)*W*4),(H-1-y)*W*4);
 const features=new THREE.DataTexture(flipped,W,H,THREE.RGBAFormat);features.minFilter=THREE.LinearFilter;features.magFilter=THREE.LinearFilter;features.needsUpdate=true;features.colorSpace=THREE.NoColorSpace;
 const rivers=document.createElement('canvas');rivers.width=W;rivers.height=H;const r=rivers.getContext('2d');r.save();r.strokeStyle='white';r.lineWidth=1.6;r.lineCap='round';r.lineJoin='round';
 const routes=[];
 for(let j=0;j<RIVER_MOUTHS.length;j++){const points=makeRiverRoute(RIVER_MOUTHS[j],j,hokkaido);routes.push(points);r.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p);i?r.lineTo(x,y):r.moveTo(x,y);});r.stroke();}
 r.restore();const riverTexture=new THREE.CanvasTexture(rivers);riverTexture.colorSpace=THREE.NoColorSpace;return {features,riverTexture,routes};
}
export function installAgeRendering(material,hokkaido,geometry){
 let maps=makeAgeMaps(hokkaido);
 const basePositions=geometry.attributes.position.array.slice(),uvs=geometry.attributes.uv;
 let surfaceState={...timelineState(2900),frame:2900},surfaceExaggeration=1,surfaceRelief=true,lastSurfaceKey='',maxRadius=1;
 function sample(u,v){const data=maps.features.image.data,x=Math.max(0,Math.min(W-1,u*W-.5)),y=Math.max(0,Math.min(H-1,v*H-.5)),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(W-1,x0+1),y1=Math.min(H-1,y0+1),fx=x-x0,fy=y-y0;const get=channel=>((data[(y0*W+x0)*4+channel]*(1-fx)+data[(y0*W+x1)*4+channel]*fx)*(1-fy)+(data[(y1*W+x0)*4+channel]*(1-fx)+data[(y1*W+x1)*4+channel]*fx)*fy)/255;return [get(0),get(3)];}
 function radiusUV(u,v){const [land,mountain]=sample(u,v);return terrainRadius(u,v,land,mountain,surfaceState,surfaceExaggeration,surfaceRelief);}
 function updateSurface(frame,exaggeration,relief){surfaceState={...timelineState(frame),frame};surfaceExaggeration=exaggeration;surfaceRelief=relief;const key=`${Math.round(frame)}:${exaggeration}:${relief}`;if(key===lastSurfaceKey)return;lastSurfaceKey=key;maxRadius=0;
  const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const radius=radiusUV(uvs.getX(i),uvs.getY(i));maxRadius=Math.max(maxRadius,radius);positions.setXYZ(i,basePositions[i*3]*radius,basePositions[i*3+1]*radius,basePositions[i*3+2]*radius);}
  positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }

 const uniforms={uAgeMap:{value:maps.features},uRiverMap:{value:maps.riverTexture},uEmergence:{value:1},uLava:{value:0},uLake:{value:0},uDrought:{value:0},uFallout:{value:0},uSubmersion:{value:0},uPeace:{value:0},uWorldPhase:{value:0},uRelief:{value:1},uSeconds:{value:0}};
 material.transparent=true;
 material.onBeforeCompile=shader=>{
 Object.assign(shader.uniforms,uniforms);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform sampler2D uAgeMap;uniform sampler2D uRiverMap;uniform float uEmergence;uniform float uLava;uniform float uLake;uniform float uDrought;uniform float uFallout;uniform float uSubmersion;uniform float uPeace;uniform float uWorldPhase;uniform float uSeconds;
 float ageHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float ageNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(ageHash(i),ageHash(i+vec2(1.,0.)),u.x),mix(ageHash(i+vec2(0.,1.)),ageHash(i+vec2(1.,1.)),u.x),u.y);}
 float ageFbm(vec2 p){return ageNoise(p)*.57+ageNoise(p*2.03+11.)*.28+ageNoise(p*4.17-3.)*.15;}
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec4 age=texture2D(uAgeMap,vMapUv);float river=texture2D(uRiverMap,vMapUv).r;float land=age.r;
 vec2 islandKm=vec2((vMapUv.x*360.0-180.0-${ISLAND_CENTER.lon})*0.01745329252*364.376984409*cos(${ISLAND_CENTER.lat}*0.01745329252),(vMapUv.y*180.0-90.0-${ISLAND_CENTER.lat})*0.01745329252*364.376984409);
 vec2 islandAxes=vec2(dot(islandKm,vec2(${ISLAND_AXIS.x},${ISLAND_AXIS.y}))/${ISLAND_HALF_LENGTH_KM},dot(islandKm,vec2(${-ISLAND_AXIS.y},${ISLAND_AXIS.x}))/${ISLAND_HALF_WIDTH_KM});
 float islandAngle=atan(islandAxes.y,islandAxes.x);float islandShape=1.0+.075*sin(islandAngle*3.0+.2)*pow(sin(islandAngle),2.0);
 float island=1.0-smoothstep(.97,1.03,length(islandAxes)/islandShape);float pool=1.0-smoothstep(${POOL_DIAMETER_KM/2-.035},${POOL_DIAMETER_KM/2+.035},length(islandKm));

 float arrival=age.g*3.0;float front=0.38+uDrought*0.62;float dry=(1.0-smoothstep(front-0.065,front+0.065,arrival))*uDrought*land;
 float grain=sin(vMapUv.x*179.0+sin(vMapUv.y*141.0)*2.0)*sin(vMapUv.y*163.0)*0.023;
 vec3 desert=vec3(0.65,0.40,0.16)+grain;diffuseColor.rgb=mix(diffuseColor.rgb,desert,dry*.92);
 vec3 ridgeColor=vec3(.29,.31,.25)+grain;diffuseColor.rgb=mix(diffuseColor.rgb,ridgeColor,age.a*.65*(1.0-dry*.3));
 float wet=max(age.b*land,river*.9)*uLake*(1.0-island);vec3 lakeColor=vec3(.025,.36,.43)+grain*.25;diffuseColor.rgb=mix(diffuseColor.rgb,lakeColor,wet);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.59,.36,.13)+grain,age.b*(1.0-uLake)*land*(1.0-uFallout));
 float scar=ageFbm(vMapUv*vec2(110.,70.));vec3 poison=mix(vec3(.022,.035,.02),vec3(.10,.085,.05),scar)+diffuseColor.rgb*.06;diffuseColor.rgb=mix(diffuseColor.rgb,poison,uFallout*land*.94);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.28,.065),wet*uFallout*.85);
 vec3 abundant=mix(diffuseColor.rgb*vec3(.91,1.35,.83),vec3(.15,.46,.24),.28);diffuseColor.rgb=mix(diffuseColor.rgb,abundant,uPeace*land*(1.0-wet));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.05,.47,.51),wet*uPeace*.5);
 float northSnow=smoothstep(50.0,58.0,vMapUv.y*180.0-90.0)*land;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.89,.90),northSnow*(1.0-uLava)*(1.0-uFallout*.8));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.14,.22),uSubmersion*land);
 vec3 islandColor=mix(vec3(.23,.40,.17)+grain,vec3(.59,.36,.13)+grain,1.0-uLake);islandColor=mix(islandColor,islandColor*.3,uFallout);islandColor=mix(islandColor,vec3(.24,.52,.20)+grain,uPeace);
 diffuseColor.rgb=mix(diffuseColor.rgb,islandColor,island);vec3 poolColor=mix(vec3(.015,.27,.35),vec3(.13,.19,.055),uFallout);diffuseColor.rgb=mix(diffuseColor.rgb,poolColor,pool*island*uLake);
 float volcanic=ageFbm(vMapUv*vec2(65.,35.)+vec2(uSeconds*.008,0.));float magma=pow(1.0-smoothstep(.025,.105,abs(volcanic-.48)),1.5);float soup=smoothstep(.59,.67,volcanic);vec3 fire=mix(vec3(.04,.025,.024),vec3(1.0,.19,.012),magma);fire=mix(fire,vec3(.025,.15,.21),soup);magma*=1.-soup;diffuseColor.rgb=mix(diffuseColor.rgb,fire,uLava*(.65+.35*land));
 diffuseColor.a*=uEmergence;
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,.12,.006)*magma*uLava*.75;`);
 };material.customProgramCacheKey=()=> 'libriam-terrain-geometry-v4';material.needsUpdate=true;
 const clouds=new THREE.Mesh(new THREE.SphereGeometry(1.035,80,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uSeconds:{value:0},uCloudAmount:{value:.2},uEmergence:{value:1}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 p;uniform float uSeconds;uniform float uCloudAmount;uniform float uEmergence;float ch(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}float cn(vec3 q){vec3 i=floor(q),f=fract(q),u=f*f*(3.-2.*f);return mix(mix(mix(ch(i),ch(i+vec3(1,0,0)),u.x),mix(ch(i+vec3(0,1,0)),ch(i+vec3(1,1,0)),u.x),u.y),mix(mix(ch(i+vec3(0,0,1)),ch(i+vec3(1,0,1)),u.x),mix(ch(i+vec3(0,1,1)),ch(i+vec3(1,1,1)),u.x),u.y),u.z);}void main(){vec3 q=p*11.+vec3(uSeconds*.01,0,0);float n=cn(q)*.6+cn(q*2.1)*.28+cn(q*4.2)*.12;float a=smoothstep(.48,.7,n)*uCloudAmount*uEmergence;gl_FragColor=vec4(vec3(.81,.87,.87),a);}`}));
 return {clouds,get routes(){return maps.routes;},get maxRadius(){return maxRadius;},radiusAt(p){return radiusUV((p.lon+180)/360,(p.lat+90)/180);},update(frame,seconds,relief=true,exaggeration=1){updateSurface(frame,exaggeration,relief);const s=timelineState(frame);uniforms.uEmergence.value=s.emergence;uniforms.uLava.value=s.lava;uniforms.uLake.value=s.lake;uniforms.uDrought.value=s.drought;uniforms.uFallout.value=s.fallout;uniforms.uSubmersion.value=s.submersion;uniforms.uPeace.value=s.peace;uniforms.uWorldPhase.value=frame/1700;uniforms.uRelief.value=relief?1:0;uniforms.uSeconds.value=seconds;clouds.material.uniforms.uSeconds.value=seconds;clouds.material.uniforms.uCloudAmount.value=s.clouds;clouds.material.uniforms.uEmergence.value=s.emergence;},replaceMap(h){lastSurfaceKey='';maps.features.dispose();maps.riverTexture.dispose();maps=makeAgeMaps(h);uniforms.uAgeMap.value=maps.features;uniforms.uRiverMap.value=maps.riverTexture;},dispose(){maps.features.dispose();maps.riverTexture.dispose();clouds.geometry.dispose();clouds.material.dispose();}};
}
