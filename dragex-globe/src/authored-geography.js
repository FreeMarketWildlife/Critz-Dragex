import notes from './data/author-annotations.json' with {type:'json'};
import {geoArea,geoContains} from 'd3-geo';
const R=364.376984409,rad=Math.PI/180;
export const authorAnnotations=notes;
export const namedPlaces=notes.filter(n=>n.id>=4).map(n=>({...n,category:n.id===4?'Mountain':n.id===6?'Port':n.id===7?'Town':n.id===11?'Settlement':'Region',zoom:n.id===4?1.12:n.id===10?1.45:n.id===5?1.3:n.id===8?1.2:1.12,aliases:n.id===5?'prarie bridge prarrie flowers flower fields':n.id===9?"Kaldro's Cape":''}));
export function outlineFeature(n){let ring=n.points.map(([lat,lon])=>[lon,lat]);ring.push([...ring[0]]);if(geoArea({type:'Polygon',coordinates:[ring]})>2*Math.PI)ring.reverse();return {type:'Feature',properties:{name:n.name},geometry:{type:'Polygon',coordinates:[ring]}};}
export const regions=Object.fromEntries(notes.filter(n=>n.id>=4).map(n=>[n.id,outlineFeature(n)]));
// These thin freehand gestures trace the spine of a range, not the straight
// closing edge automatically added by the annotation exporter.
const ridges=notes.filter(n=>n.kind==='ridge').map(n=>{const cos=Math.cos(n.lat*rad),points=n.points.map(([lat,lon])=>({x:lon*rad*R*cos,y:lat*rad*R}));return {cos,points,id:n.id};});
export const YOKAI={lat:9.191537,lon:-18.750231};
export function corridorDistance(p,points){const cos=Math.cos(p.lat*rad),x=p.lon*rad*R*cos,y=p.lat*rad*R;let d=Infinity;for(let i=1;i<points.length;i++){const [la,lo]=points[i-1],[lb,lob]=points[i],ax=lo*rad*R*cos,ay=la*rad*R,dx=(lob-lo)*rad*R*cos,dy=(lb-la)*rad*R,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return d;}
export function mountainRelief(p){
 let height=0;
 for(const ridge of ridges){const x=p.lon*rad*R*ridge.cos,y=p.lat*rad*R;let closest=Infinity,along=0,total=0;
  for(let i=1;i<ridge.points.length;i++){const a=ridge.points[i-1],b=ridge.points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(length*length||1))),d=Math.hypot(x-a.x-t*dx,y-a.y-t*dy);if(d<closest){closest=d;along=total+t*length;}total+=length;}
  const width=2.8+1.2*(.5+.5*Math.sin(along*.19+ridge.id));
  const peaks=.68+.22*Math.sin(along*.31+ridge.id)**2+.1*Math.cos(along*.71)**2;
  const foothills=.075*Math.exp(-closest*closest/100);
  height=Math.max(height,.56*peaks*Math.exp(-closest*closest/(2*width*width))+foothills);
 }
 const x=(p.lon-YOKAI.lon)*rad*R*Math.cos(YOKAI.lat*rad),y=(p.lat-YOKAI.lat)*rad*R,d=Math.hypot(x,y),angle=Math.atan2(y,x);
 // One tall isolated summit with radial buttresses; the surrounding lowland
 // stays jungle. Absolute elevations and peak details are design proposals.
 const cone=Math.exp(-Math.pow(d/(4.2+.65*Math.sin(angle*5)+.35*Math.sin(angle*9)),1.25));
 const buttresses=1-.16*(1-Math.exp(-d))*Math.sin(x*1.4+y*.7)**2*Math.cos(y*1.1-x*.5)**2;
 return Math.min(1,Math.max(height,cone*buttresses));
}
export function placeAt(p){const close=namedPlaces.filter(n=>[6,7,9,11].includes(n.id)).find(n=>geoContains(regions[n.id],[p.lon,p.lat]));if(close)return close;for(const id of [4,8,10])if(geoContains(regions[id],[p.lon,p.lat]))return namedPlaces.find(n=>n.id===id);if(corridorDistance(p,notes[4].points)<2.8)return namedPlaces.find(n=>n.id===5);return null;}
export function makeBiomeCanvas(W,H){const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,W,H);const trace=points=>{ctx.beginPath();points.forEach(([lat,lon],i)=>{const x=(lon+180)/360*W,y=(90-lat)/180*H;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});};
 const layer=(color,paint)=>{ctx.globalCompositeOperation='lighter';ctx.filter=`blur(${W/2048*1.2}px)`;ctx.fillStyle=color;ctx.strokeStyle=color;paint();ctx.filter='none';};
 layer('rgb(255,0,0)',()=>{trace(notes[9].points);ctx.closePath();ctx.fill();});
 layer('rgb(0,255,0)',()=>{trace(notes[4].points);ctx.lineWidth=W/360*.9;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();});
 layer('rgb(0,0,255)',()=>{trace(notes[7].points);ctx.closePath();ctx.fill();});
 ctx.globalCompositeOperation='source-over';return c;
}
export const REGION_SHADER=String.raw`
 vec3 biome=texture2D(uBiomeMap,vMapUv).rgb*land;
 vec2 terrainKm=vec2((vMapUv.x*360.-180.)*6.3595*cos((vMapUv.y*180.-90.)*.01745329252),(vMapUv.y*180.-90.)*6.3595);
 float broad=ageFbm(terrainKm*.18),canopy=ageNoise(terrainKm*3.5),fine=ageNoise(terrainKm*22.);
 float jungle=exp(-pow(length((terrainKm-vec2(-18.750231*6.3595*cos(9.191537*.01745329252),9.191537*6.3595))/14.),2.))*land;
 vec3 jungleColor=mix(vec3(.035,.16,.07),vec3(.12,.34,.105),broad*.6+canopy*.4);
 diffuseColor.rgb=mix(diffuseColor.rgb,jungleColor,jungle*(1.-smoothstep(.28,.6,age.a)));
 vec3 groveColor=mix(vec3(.025,.085,.05),vec3(.075,.21,.11),broad*.65+canopy*.35);
 diffuseColor.rgb=mix(diffuseColor.rgb,groveColor,biome.r*.95);
 vec3 cloudForest=mix(vec3(.035,.22,.17),vec3(.21,.43,.31),canopy*.42+broad*.58);
 diffuseColor.rgb=mix(diffuseColor.rgb,cloudForest,biome.b*.95);
 vec3 meadow=mix(vec3(.25,.42,.13),vec3(.53,.62,.25),broad);
 float patches=ageNoise(terrainKm*.9),flowers=smoothstep(.50,.8,patches);
 vec3 flowerColor=mix(vec3(.77,.44,.60),vec3(.88,.74,.36),smoothstep(.45,.7,ageNoise(terrainKm*.65+42.)));
 meadow=mix(meadow,flowerColor,flowers*(.27+.33*fine));
 diffuseColor.rgb=mix(diffuseColor.rgb,meadow,biome.g*.92*(1.-biome.b));
 float rock=smoothstep(.10,.52,age.a),snow=smoothstep(.5,.88,age.a)*(1.-jungle*.85);
 vec3 crags=mix(vec3(.17,.19,.16),vec3(.47,.46,.39),ageFbm(terrainKm*3.)*.75+broad*.25);
 diffuseColor.rgb=mix(diffuseColor.rgb,crags,rock*.9);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.91,.87),snow*.85);
 float eastSlope=texture2D(uAgeMap,vMapUv+vec2(.00048828125,0.)).a-texture2D(uAgeMap,vMapUv-vec2(.00048828125,0.)).a;
 float northSlope=texture2D(uAgeMap,vMapUv+vec2(0.,.0009765625)).a-texture2D(uAgeMap,vMapUv-vec2(0.,.0009765625)).a;
 float hillshade=clamp(.80+eastSlope*3.8+northSlope*2.8,.38,1.32);
 diffuseColor.rgb*=mix(1.,hillshade,rock*uRelief);
 diffuseColor.rgb+=vec3(.04,.055,.045)*biome.b*smoothstep(.58,.75,ageNoise(terrainKm*.3));
 vec2 town6=(vMapUv*vec2(360.,180.)-vec2(180.,90.)-vec2(-23.854195,-10.871867))*vec2(6.3595*cos(-10.871867*.01745329252),6.3595);
 float townMask6=(1.-smoothstep(0.84,1.2,length(town6)))*land;
 vec2 blocks6=abs(fract(town6*5.)-.5);float roofs6=smoothstep(.12,.18,min(blocks6.x,blocks6.y));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.42,.28)*(.65+.35*roofs6),townMask6*.85);
 vec2 town7=(vMapUv*vec2(360.,180.)-vec2(180.,90.)-vec2(-23.526592,-10.1857))*vec2(6.3595*cos(-10.1857*.01745329252),6.3595);
 float townMask7=(1.-smoothstep(0.385,0.55,length(town7)))*land;
 vec2 blocks7=abs(fract(town7*5.)-.5);float roofs7=smoothstep(.12,.18,min(blocks7.x,blocks7.y));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.44,.40,.28)*(.65+.35*roofs7),townMask7*.85);
 vec2 town11=(vMapUv*vec2(360.,180.)-vec2(180.,90.)-vec2(-20.910207,15.798273))*vec2(6.3595*cos(15.798273*.01745329252),6.3595);
 float townMask11=(1.-smoothstep(1.47,2.1,length(town11)))*land;
 vec2 blocks11=abs(fract(town11*5.)-.5);float roofs11=smoothstep(.12,.18,min(blocks11.x,blocks11.y));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.58,.43)*(.65+.35*roofs11),townMask11*.85);
 float terrainDetail=(canopy*.5+fine*.2)*max(max(biome.r,biome.b),jungle)*(1.-rock)+ageNoise(terrainKm*8.)*rock*.45;
`;
