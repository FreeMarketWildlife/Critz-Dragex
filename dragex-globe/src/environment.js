import * as THREE from 'three';
import {geoPath,geoEquirectangular} from 'd3-geo';
import {RADIUS} from './model.js';
import {LAKE,LAKE_RADIUS_KM} from './ages.js';
import {polarIce} from './polar.js';
import {bakeWaveAtlas,loopPhase,signedShoreDistance,LOOP_SECONDS} from './water-loop.js';

const WIDTH=4096,HEIGHT=2048,SHORE_RANGE_KM=16;
export function makeShoreTexture(features){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const draw=geoPath(geoEquirectangular().scale(WIDTH/(2*Math.PI)).translate([WIDTH/2,HEIGHT/2]).precision(.05)).context(ctx);
 ctx.fillStyle='white';for(const feature of features){ctx.beginPath();draw(feature);ctx.fill();}
 const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data,mask=new Uint8Array(WIDTH*HEIGHT);
 for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3];
 const distance=signedShoreDistance(mask,WIDTH,HEIGHT,RADIUS),data=new Uint8Array(pixels.length);
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  const source=y*WIDTH+x,target=((HEIGHT-1-y)*WIDTH+x)*4;
  const encoded=Math.round(Math.max(0,Math.min(1,.5+distance[source]/(2*SHORE_RANGE_KM)))*65535);
  data[target]=encoded>>>8;
  data[target+1]=mask[source];data[target+2]=Math.round(polarIce(90-(y+.5)/HEIGHT*180,(x+.5)/WIDTH*360-180)*255);data[target+3]=encoded&255;
 }
 const texture=new THREE.DataTexture(data,WIDTH,HEIGHT);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;return texture;
}

// Camera-local coast tile: 8 km / 1024 pixels = about 7.8 m per texel.
// Regenerated only when crossing a tile or changing the source geography.
export function makeLocalShore(features,center,spanKm=12){
 const size=1024,cosLat=Math.max(.08,Math.cos(center.lat*Math.PI/180));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const projection=geoEquirectangular().rotate([-center.lon,0]).center([0,center.lat]).scale(RADIUS*size/spanKm).translate([size/(2*cosLat),size/2]).clipExtent([[0,0],[size/cosLat,size]]).precision(.02);
 const draw=geoPath(projection).context(ctx);ctx.scale(cosLat,1);ctx.fillStyle='white';
 for(const feature of features){ctx.beginPath();draw(feature);ctx.fill();}
 const pixels=ctx.getImageData(0,0,size,size).data,mask=new Uint8Array(size*size);
 for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3];
 const distance=signedShoreDistance(mask,size,size,RADIUS,{wrapLongitude:false,pixelKm:spanKm/size}),data=new Uint8Array(pixels.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,j=((size-1-y)*size+x)*4;
  const encoded=Math.round(Math.max(0,Math.min(1,.5+distance[i]/4))*65535);data[j]=encoded>>>8;data[j+1]=mask[i];data[j+2]=0;data[j+3]=encoded&255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
 return texture;
}

// Cloud meshes removed: atmospheric appearance is handled by the globe's
// continuous limb shader. Preserve the environment interface for loop exports.
export function makeClouds(){
 const group=new THREE.Group();group.name='Clouds removed';group.visible=false;
 return {group,count:0,update(){group.visible=false;},dispose(){}};
}

export function makeEnvironment(features){
 let shore=makeShoreTexture(features),local=null,localCenter=null,localSpan=0;
 const baked=bakeWaveAtlas(),wave=new THREE.DataTexture(baked.data,baked.width,baked.height);wave.minFilter=wave.magFilter=THREE.LinearFilter;wave.needsUpdate=true;
 const clouds=makeClouds();
 const uniforms={uLocalShoreMap:{value:shore},uLocalCenter:{value:new THREE.Vector2()},uLocalSpan:{value:12},uLocalWeight:{value:0},uShoreMap:{value:shore},uWaveAtlas:{value:wave},uLoopPhase:{value:0},uWaterEnabled:{value:1}};
 return {uniforms,clouds,loopSeconds:LOOP_SECONDS,update(seconds,state,cameraRadius,maxRadius,cameraCoordinate){
   const altitude=(cameraRadius-1)*RADIUS;
   const weight=1-THREE.MathUtils.smoothstep(altitude,8,25);
   uniforms.uLocalWeight.value=weight;
   if(weight>0&&cameraCoordinate&&Math.abs(cameraCoordinate.lat)<82){
    const span=Math.max(8,Math.min(72,altitude*5)),c=cameraCoordinate;
    const lonDelta=localCenter?((c.lon-localCenter.lon+540)%360)-180:180;
    const drift=localCenter?Math.hypot(lonDelta*Math.cos(c.lat*Math.PI/180),c.lat-localCenter.lat)*Math.PI/180*RADIUS:Infinity;
    if(!local||drift>localSpan*.2||span>localSpan*1.5||span<localSpan*.65){
     const next=makeLocalShore(features,c,span);local?.dispose();local=next;localCenter={...c};localSpan=span;
     uniforms.uLocalShoreMap.value=local;uniforms.uLocalCenter.value.set(c.lon,c.lat);uniforms.uLocalSpan.value=span;
    }
   }else uniforms.uLocalWeight.value=0;
uniforms.uLoopPhase.value=loopPhase(seconds);clouds.update(seconds,state.clouds,state.emergence,cameraRadius,maxRadius);},replaceMap(nextFeatures){features=nextFeatures;local?.dispose();local=null;localCenter=null;uniforms.uLocalWeight.value=0;const next=makeShoreTexture(features);shore.dispose();shore=next;uniforms.uShoreMap.value=shore;uniforms.uLocalShoreMap.value=shore;},dispose(){local?.dispose();shore.dispose();wave.dispose();clouds.dispose();}};
}

export const WATER_COMMON=/* glsl */`
uniform sampler2D uShoreMap;
uniform sampler2D uWaveAtlas;
uniform sampler2D uLocalShoreMap;
uniform vec2 uLocalCenter;
uniform float uLocalSpan;
uniform float uLocalWeight;
uniform float uLoopPhase;
uniform float uWaterEnabled;
varying vec3 vWaterPoint;
varying vec3 vWaterEast;
varying vec3 vWaterNorth;
vec3 loopWaveFrame(vec2 uv,float frame){
 vec2 tile=vec2(mod(frame,12.),floor(frame/12.));
 vec2 atlasUV=(tile*66.+vec2(1.)+fract(uv)*64.)/vec2(792.,528.);
 return texture2D(uWaveAtlas,atlasUV).rgb*2.-1.;
}
vec3 loopWave(vec2 uv){float f=uLoopPhase*96.;return mix(loopWaveFrame(uv,floor(f)),loopWaveFrame(uv,mod(floor(f)+1.,96.)),fract(f));}
vec3 sphericalWave(vec3 p,float scale){
 vec3 weights=pow(abs(p),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
 return loopWave(p.yz*scale)*weights.x+loopWave(p.zx*scale)*weights.y+loopWave(p.xy*scale)*weights.z;
}
float waterWeight=0.;
vec2 waterSlope=vec2(0.);
`;

// Inserted after the historical land/lake treatment. Ocean masking uses all
// continents, not the Hokkaido-only history map. Inland waters keep their history.
export const WATER_COLOR=/* glsl */`
 vec4 shorePacked=texture2D(uShoreMap,vMapUv);vec3 shoreData=shorePacked.rgb;
 float shoreKm=((shorePacked.r*65280.+shorePacked.a*255.)/65535.-.5)*32.;
 vec2 localKm=vec2((mod(vMapUv.x*360.-180.-uLocalCenter.x+540.,360.)-180.)*cos(uLocalCenter.y*.01745329252),(vMapUv.y*180.-90.-uLocalCenter.y))*.01745329252*364.376984409;
 vec2 localUV=localKm/uLocalSpan+.5;
 float localBlend=uLocalWeight*(1.-smoothstep(.36,.48,max(abs(localUV.x-.5),abs(localUV.y-.5))));
 vec4 localShore=texture2D(uLocalShoreMap,clamp(localUV,0.,1.));
 shoreKm=mix(shoreKm,((localShore.r*65280.+localShore.a*255.)/65535.-.5)*4.,localBlend);
 shoreData.g=mix(shoreData.g,localShore.g,localBlend);
 float ocean=max(1.-shoreData.g,shoreData.g*land*uSubmersion)*(1.-shoreData.b)*(1.-uLava);
 float fresh=max(wet,pool*island*uLake)*(1.-uSubmersion);
 float iceFree=1.-shoreData.b;
 waterWeight=clamp(max(ocean,fresh)*(1.-uLava)*uWaterEnabled,0.,1.);
 // Signed distances around the lake island and pool are analytic at close zoom.
 vec2 lakeKm=vec2((vMapUv.x*360.-180.-${LAKE.lon})*cos(${LAKE.lat}*.01745329252),(vMapUv.y*180.-90.-${LAKE.lat}))*.01745329252*364.376984409;
 float lakeAngle=atan(lakeKm.y,lakeKm.x);
 float lakeShape=1.+.13*sin(3.*lakeAngle+.8)+.07*cos(5.*lakeAngle-.4);
 float lakeShore=${LAKE_RADIUS_KM.toFixed(1)}*lakeShape-length(lakeKm/vec2(1.15,.88));
 float islandShore=(length(islandAxes)/islandShape-1.)*${1.6};
 float poolShore=(${.5}-length(islandKm));
 float freshShore=min(lakeShore,islandShore);
 freshShore=mix(freshShore,poolShore,pool*island);
 float waterDistance=mix(max(0.,shoreKm),max(0.,freshShore),step(.1,fresh));
 vec3 waterPoint=normalize(vWaterPoint);
 vec3 swell=sphericalWave(waterPoint,32.);
 vec3 ripple=sphericalWave(waterPoint,140.);
 vec3 detailWave=sphericalWave(waterPoint,1200.);
 ripple=mix(ripple,ripple*.6+detailWave*.4,localBlend);
 float calm=mix(1.,.38,step(.1,fresh));
 waterSlope=(swell.xy*.15+ripple.xy*.075)*calm;
 float shallow=exp(-waterDistance*.38);
 vec3 sea=mix(vec3(.012,.115,.22),vec3(.075,.52,.54),shallow);
 vec3 lakeWater=mix(vec3(.025,.23,.28),vec3(.14,.53,.44),shallow);
 vec3 waterColor=mix(sea,lakeWater,step(.1,fresh));
 waterColor+=vec3(.025,.065,.065)*ripple.z*shallow;
 waterColor=mix(waterColor,vec3(.12,.20,.045),uFallout*fresh*.85);
 // Incoming fronts slow toward shore; a second pulse models withdrawing wash.
 float coastalNoise=mix(ageFbm(vMapUv*vec2(1700.,850.)),ageFbm(vMapUv*vec2(18000.,9000.)),localBlend*.65);
 float surfDistance=waterDistance*mix(1.,12.,localBlend);
 float frontPhase=surfDistance*8.5+uLoopPhase*6.28318530718*3.+coastalNoise*1.4;
 float crest=pow(.5+.5*cos(frontPhase),18.);
 float breakZone=exp(-surfDistance*.75);
 float broken=smoothstep(.24,.58,coastalNoise+ripple.z*.15);
 float foam=crest*breakZone*(.62+.38*broken)*mix(1.,.45,step(.1,fresh));
 float lace=pow(.5+.5*sin(surfDistance*18.+uLoopPhase*6.28318530718*6.+coastalNoise*3.),12.)*exp(-surfDistance*5.);
 foam=max(foam,lace*.45);
 waterColor=mix(waterColor,vec3(.82,.89,.87),foam*.66);
 diffuseColor.rgb=mix(diffuseColor.rgb,waterColor,waterWeight);
 // A narrow draft beach fringe follows every editable coast. Run-up is a
 // visual tide on the signed mask, not a change to canonical coastline area.
 float wash=.16+.11*sin(uLoopPhase*6.28318530718*3.+coastalNoise);
 float beachScale=mix(1.,.08,localBlend);
 float beach=(1.-uSubmersion*land)*(1.-smoothstep(.05*beachScale,.16*beachScale,shoreKm))*smoothstep(-.7*beachScale,-.12*beachScale,shoreKm)*iceFree*(1.-uLava);
 float coastalLand=(1.-uSubmersion*land)*shoreData.g*(1.-smoothstep(.5,1.6,-shoreKm))*localBlend*(1.-uLava)*iceFree;
 float beachGrain=ageFbm(vMapUv*vec2(23000.,11500.));
 vec3 coastalVegetation=mix(vec3(.19,.40,.22),vec3(.31,.48,.24),beachGrain);
 coastalVegetation=mix(coastalVegetation,desert,dry);coastalVegetation=mix(coastalVegetation,poison,uFallout*land);coastalVegetation=mix(coastalVegetation,vec3(.83,.89,.90),northSnow);
 diffuseColor.rgb=mix(diffuseColor.rgb,coastalVegetation,coastalLand*.9);
 vec3 sand=mix(vec3(.73,.60,.36),vec3(.39,.46,.30),smoothstep((-wash-.12)*beachScale,-wash*beachScale,shoreKm));
 sand+=(beachGrain-.5)*.065;
 diffuseColor.rgb=mix(diffuseColor.rgb,sand,beach*.95*uWaterEnabled);
 // The water reaches over the damp sand at the crest, then retreats.
 float runup=smoothstep(-wash*beachScale-.012,-wash*beachScale+.012,shoreKm)*(1.-smoothstep(0.,.045,shoreKm))*beach;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.86,.76),runup*.55*uWaterEnabled);
`;
export const WATER_NORMAL=/* glsl */`
 normal=normalize(normal-waterWeight*(normalize(vWaterEast)*waterSlope.x+normalize(vWaterNorth)*waterSlope.y));
`;
