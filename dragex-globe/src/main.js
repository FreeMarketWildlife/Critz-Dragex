import {renderLoop} from './loop-export.js';
import {LOOP_SECONDS} from './water-loop.js';
import {namedPlaces,placeAt} from './authored-geography.js';
import {searchPlaces} from './search.js';
import {edenIsle,EDEN_CENTER,paintBiomes} from './coast-design.js';
import './style.css';
import {installAnnotations} from './annotation-ui.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoContains,geoPath,geoEquirectangular } from 'd3-geo';
import { AGES,timelineState,FRAME_COUNT,LAKE,DROUGHT_EDGE,MOUNTAIN_START,MOUNTAIN_END,destination,lakeField } from './ages.js';
import { RIVER_MOUTHS,ISLAND_CENTER,islandField,poolDistance,POOL_DIAMETER_KM } from './hydrology.js';
import { polarIce } from './polar.js';
import { otherLandmasses,geometryPolygons } from './landmasses.js';
import { installAgeRendering } from './age-renderer.js';
import { HOKKAIDO_AREA,SURFACE_AREA,RADIUS,EARTH_RADIUS,planet,rad,distance,toVector,fromVector,makeHokkaido,newProject,validateProject } from './model.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(n,d=2)=>n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const coords=p=>`${fmt(Math.abs(p.lat))}° ${p.lat>=0?'N':'S'} · ${fmt(Math.abs(p.lon))}° ${p.lon>=0?'E':'W'}`;
const STORAGE='dragex-globe-project-v1';
let annotationUI=null;
let project=newProject(),storageOK=true,mode='atlas',tool=null,measurePoints=[],pendingPin=null,selectedBody='libriam',fly=null;
try{const saved=localStorage.getItem(STORAGE);if(saved)project=validateProject(JSON.parse(saved));}catch{storageOK=false;}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(project));storageOK=true;$('#save-state').textContent='● Saved on this device · export to keep a copy';}catch{storageOK=false;$('#save-state').textContent='Local storage unavailable · export your project to save';toast('Export your project to keep these changes. Local storage is unavailable.');}}
$('#terrain-exaggeration').value=project.terrain.exaggeration;
function terrainReadout(){$('#terrain-value').textContent=Number($('#terrain-exaggeration').value).toFixed(1)+'×';$('#terrain-exaggeration').disabled=!$('#relief').checked;}terrainReadout();
$('#terrain-exaggeration').oninput=()=>{project.terrain.exaggeration=Number($('#terrain-exaggeration').value);terrainReadout();save();};
let currentFrame=project.timeline.frame,targetFrame=currentFrame,historyPlaying=false,selectedCoordinate=null;
if(!storageOK)$('#save-state').textContent='Previous save could not be loaded · export changes to keep a copy';
const outline=await fetch('./data/hokkaido.geojson').then(r=>{if(!r.ok)throw Error('Coastline data unavailable');return r.json();}).catch(e=>{$('#scene-error').hidden=false;$('#scene-error').textContent=e.message;throw e;});
let hokkaido=makeHokkaido(outline,project.placement);
const host=$('#scene'),scene=new THREE.Scene();
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{ $('#scene-error').hidden=false;$('#scene-error').textContent='The atlas needs WebGL. Enable hardware acceleration or use a browser with WebGL support. Your scale reference and saved project are still available.';throw Error('WebGL unavailable'); }
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Libriam globe. Drag to rotate, scroll to zoom. Use Search to find continents and places.');renderer.domElement.tabIndex=0;
const camera=new THREE.PerspectiveCamera(40,1,.001,200);camera.position.set(0,1.2,3.5);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=1.06;controls.maxDistance=7;controls.rotateSpeed=.5;controls.enableRotate=false;controls.zoomSpeed=.65;
const atlas=new THREE.Group(),system=new THREE.Group();scene.add(atlas,system);system.visible=false;
const ambient=new THREE.AmbientLight('#ffffff',2.8),sun=new THREE.DirectionalLight('#fffaf2',.65);sun.position.set(-3,3,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1.35,right:1.35,top:1.35,bottom:-1.35,near:1,far:12});sun.shadow.intensity=.10;sun.shadow.bias=-.0003;sun.shadow.normalBias=.001;const fill=new THREE.HemisphereLight('#f5f9ff','#dce7eb',.7);scene.add(ambient,sun,fill);
// Relative moon size and orbital animation are visual proposals.
const moon=new THREE.Mesh(new THREE.SphereGeometry(.32,64,40),new THREE.MeshStandardMaterial({color:'#c6c9cd',roughness:1,metalness:0}));scene.add(moon);
function updateMoon(seconds){const phase=seconds/LOOP_SECONDS*Math.PI*2+.65;moon.position.set(2.15*Math.cos(phase),.48*Math.sin(phase),2.15*Math.sin(phase));moon.rotation.y=-phase;moon.visible=mode==='atlas';}
const surfaceGeometry=new THREE.SphereGeometry(1,512,320);surfaceGeometry.rotateY(-Math.PI/2);
const material=new THREE.MeshStandardMaterial({roughness:.92,metalness:.05});
const globe=new THREE.Mesh(surfaceGeometry,material);globe.receiveShadow=true;atlas.add(globe);
const atmos=new THREE.Mesh(new THREE.SphereGeometry(1.025,80,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{glow:{value:new THREE.Color('#609edb')}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 glow;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(glow,a*.32);}'}));atlas.add(atmos);
function texture(relief){
 const W=4096,H=2048,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#0e2636');grad.addColorStop(.45,'#174254');grad.addColorStop(.7,'#173c4c');grad.addColorStop(1,'#0d2938');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 // Subtle bathymetry-like color is illustrative, not a mapped seabed.
 let seed=54321;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<1600;i++){let x=random()*W,y=random()*H,r=10+random()*85;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(103,160,168,0.025)');g.addColorStop(1,'rgba(103,160,168,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
 const ring=hokkaido.geometry.coordinates[0],path=new Path2D();ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*W,y=(90-lat)/180*H;if(i===0)path.moveTo(x,y);else path.lineTo(x,y);});path.closePath();
 const projection=geoEquirectangular().scale(W/(2*Math.PI)).translate([W/2,H/2]).precision(.1),draw=geoPath(projection).context(ctx);
 for(const feature of [...otherLandmasses,edenIsle]){ctx.beginPath();draw(feature);ctx.strokeStyle='#416d72';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle=feature===edenIsle?'#309359':'#769567';ctx.fill();ctx.strokeStyle='#b6c8a0';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.strokeStyle='#3c7079';ctx.lineWidth=17;ctx.stroke(path);ctx.strokeStyle='#5a9690';ctx.lineWidth=5;ctx.stroke(path);
 ctx.save();ctx.clip(path);ctx.fillStyle=relief?'#647e5c':'#8fba90';ctx.fillRect(0,0,W,H);
 if(relief){
  const img=ctx.getImageData(0,0,W,H),d=img.data;
  const bounds=ring.reduce((b,[lo,la])=>[Math.min(b[0],lo),Math.min(b[1],la),Math.max(b[2],lo),Math.max(b[3],la)],[180,90,-180,-90]);
  const x1=Math.max(0,Math.floor((bounds[0]+180)/360*W)),x2=Math.min(W,Math.ceil((bounds[2]+180)/360*W)),y1=Math.max(0,Math.floor((90-bounds[3])/180*H)),y2=Math.min(H,Math.ceil((90-bounds[1])/180*H));
  const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453123;return v-Math.floor(v);};
  const noise2=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;};
  const noise=(x,y)=>noise2(x*.014,y*.014)*.32+noise2(x*.035,y*.035)*.16+noise2(x*.085,y*.085)*.09+noise2(x*.19,y*.19)*.045-.3;
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){
   const n=noise(x,y);
   const h=n,v=noise(x-2,y-2)-n,j=(y*W+x)*4;
   let color=h>.51?[171,173,151]:h>.31?[132,142,112]:h>.12?[103,130,91]:[78,116,77];
   const shade=1+v*3;for(let k=0;k<3;k++)d[j+k]=Math.min(255,color[k]*shade);
  }
  const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;tmp.getContext('2d').putImageData(img,0,0);ctx.drawImage(tmp,0,0);
 }
 paintBiomes(ctx,draw,W,H);
 ctx.restore();ctx.strokeStyle='rgba(218,233,186,.55)';ctx.lineWidth=1.1;ctx.stroke(path);
 // Paint pack ice and fractured leads at both poles, preserving the land mask
 // underneath. The spherical coastline projection handles all date-line cuts.
 const iceImage=ctx.getImageData(0,0,W,H),icePixels=iceImage.data;
 for(let y=0;y<H;y++){const lat=90-(y+.5)/H*180;if(Math.abs(lat)<68)continue;for(let x=0;x<W;x++){const lon=(x+.5)/W*360-180,ice=polarIce(lat,lon),i=(y*W+x)*4,grain=Math.sin(x*.073+y*.19)*Math.cos(x*.041-y*.23)*5;const tint=[194+grain,215+grain,222+grain];for(let k=0;k<3;k++)icePixels[i+k]=icePixels[i+k]*(1-ice)+tint[k]*ice;}}
 ctx.putImageData(iceImage,0,0);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
let textured=texture(true),flat=texture(false);material.map=textured;
const ageRendering=installAgeRendering(material,hokkaido,surfaceGeometry,[...otherLandmasses,edenIsle]);atlas.add(ageRendering.clouds);
const gridGroup=new THREE.Group();atlas.add(gridGroup);
let surfaceEpoch=0;
function line(points,color,opacity=.25){surfaceEpoch++;return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));}
for(let lat=-75;lat<=75;lat+=15){let pts=[];for(let lon=-180;lon<=180;lon+=2)pts.push(new THREE.Vector3(...toVector(lat,lon,1.003)));gridGroup.add(line(pts,'#81b8c2',lat===0?.3:.12));}
for(let lon=-180;lon<180;lon+=30){let pts=[];for(let lat=-90;lat<=90;lat+=2)pts.push(new THREE.Vector3(...toVector(lat,lon,1.003)));gridGroup.add(line(pts,'#81b8c2',.12));}
const coastGroup=new THREE.Group();atlas.add(coastGroup);function updateCoast(){coastGroup.children.slice().forEach(disposeObject);for(const f of [hokkaido,...otherLandmasses,edenIsle])for(const poly of geometryPolygons(f))for(const ring of poly)coastGroup.add(line(ring.map(([lo,la])=>new THREE.Vector3(...toVector(la,lo,1.004))),'#d0dcb2',.5));}updateCoast();
const pinGroup=new THREE.Group(),measureGroup=new THREE.Group(),historyFeatures=new THREE.Group(),selectionGroup=new THREE.Group();atlas.add(pinGroup,measureGroup,historyFeatures,selectionGroup);
// Mountain spines now appear as real terrain rather than drawn map lines.
const lakeRing=[];for(let i=0;i<=120;i++){const p=destination(LAKE,i*3,27);lakeRing.push(new THREE.Vector3(...toVector(p.lat,p.lon,1.01)));}historyFeatures.add(line(lakeRing,'#aadfe3',.38));
const starGeo=new THREE.BufferGeometry(),starPos=[];for(let i=0;i<850;i++){let v=new THREE.Vector3(Math.sin(i*78.123),Math.sin(i*43.52),Math.cos(i*92.21)).normalize().multiplyScalar(35);starPos.push(v.x,v.y,v.z);}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#9cb2c1',size:.027,transparent:true,opacity:.55}));scene.add(stars);
function disposeObject(obj){obj.parent?.remove(obj);obj.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}
function pinMarker(p,color='#e6bc79',size=.009){surfaceEpoch++;const v=new THREE.Vector3(...toVector(p.lat,p.lon));const dot=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshBasicMaterial({color}));dot.position.copy(v.multiplyScalar(1.013));dot.userData.surfaceCoordinate={...p};return dot;}
function renderPins(){pinGroup.children.slice().forEach(disposeObject);const box=$('#pins');box.replaceChildren();if(!project.pins.length){const p=document.createElement('p');p.className='fine';p.textContent='Mark the places you imagine. Click the globe to set a location.';box.append(p);}for(const p of project.pins){pinGroup.add(pinMarker(p));const row=document.createElement('div');row.className='pin-row';const go=document.createElement('button');go.className='pin-go';go.textContent=`⌖ ${p.name}`;const small=document.createElement('small');small.textContent=`${coords(p)} · proposal`;go.append(small);go.onclick=()=>flyTo(p,1.6);const rm=document.createElement('button');rm.className='remove';rm.textContent='×';rm.setAttribute('aria-label',`Delete ${p.name}`);rm.onclick=()=>{project.pins=project.pins.filter(x=>x.id!==p.id);save();renderPins();};row.append(go,rm);box.append(row);}}
renderPins();
function flyTo(p,d=3.25){const start=camera.position.clone(),end=new THREE.Vector3(...toVector(p.lat,p.lon,d)),rotation=new THREE.Quaternion().setFromUnitVectors(start.clone().normalize(),end.clone().normalize());fly={start,end,rotation,startTarget:controls.target.clone(),endTarget:new THREE.Vector3(),t:performance.now(),duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:850};controls.autoRotate=false;$('#rotation').checked=false;}
controls.addEventListener('start',()=>{fly=null;});
function fitDistance(){const half=Math.atan(Math.tan(20*rad)*Math.min(1,host.clientWidth/host.clientHeight));return Math.max(4.35,1.27/Math.sin(half));}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;if(mode==='atlas')camera.setViewOffset(w,h,0,w<600?-75:-60,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();flyTo(project.placement,fitDistance());
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let mouseDown=null;
function hit(e){const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObject(globe)[0];}
// Rotate by the surface grab geometry, with no sensitivity multiplier or inertia.
let surfaceDrag=null;
renderer.domElement.addEventListener('pointerdown',e=>{
 mouseDown={x:e.clientX,y:e.clientY};
 if(mode!=='atlas'||!controls.enabled||e.button!==0)return;
 const h=hit(e);if(!h)return;
 fly=null;controls.autoRotate=false;$('#rotation').checked=false;
 surfaceDrag={id:e.pointerId,anchor:h.point.clone(),radius:h.point.length()};
 renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!surfaceDrag||e.pointerId!==surfaceDrag.id)return;
 if(mode!=='atlas'||!controls.enabled){surfaceDrag=null;return;}
 const b=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);
 camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);
 const sphere=new THREE.Sphere(new THREE.Vector3(),surfaceDrag.radius);
 const destination=ray.ray.intersectSphere(sphere,new THREE.Vector3());
 // Outside the globe, clamp to its limb until the pointer returns.
 const point=destination??ray.ray.closestPointToPoint(sphere.center,new THREE.Vector3()).setLength(surfaceDrag.radius);
 const correction=new THREE.Quaternion().setFromUnitVectors(point.normalize(),surfaceDrag.anchor.clone().normalize());
 camera.position.applyQuaternion(correction);camera.up.applyQuaternion(correction);
 camera.lookAt(controls.target);camera.updateMatrixWorld();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{if(surfaceDrag?.id===e.pointerId)surfaceDrag=null;});
renderer.domElement.addEventListener('pointermove',e=>{if(mode!=='atlas')return;const h=hit(e);if(h){const p=fromVector(h.point.x,h.point.y,h.point.z);$('#cursor').textContent=coords(p);renderer.domElement.style.cursor=tool?'crosshair':'grab';}else renderer.domElement.style.cursor='default';});
renderer.domElement.addEventListener('pointerup',e=>{
 if(annotationUI?.enabled||mode!=='atlas'||timelineState(currentFrame).emergence<.05||e.button!==0||!mouseDown||Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y)>5)return;mouseDown=null;const h=hit(e);if(!h)return;
 const p=fromVector(h.point.x,h.point.y,h.point.z);
 if(tool==='pin'){pendingPin=p;$('#pin-coordinates').textContent=coords(p);$('#pin-name').value='';$('#pin-dialog').showModal();setTimeout(()=>$('#pin-name').focus(),50);}
 else if(tool==='measure'){if(measurePoints.length===2)measurePoints=[];measurePoints.push(p);renderMeasurement();}
 else {selectCoordinate(p);const found=project.pins.find(q=>distance(p,q)<8);if(found)$('#selected-place').textContent=found.name;}
});
function setTool(value){annotationUI?.deactivate();controls.enabled=true;tool=value;if(tool)$('#coordinate-panel').hidden=true;measurePoints=[];measureGroup.children.slice().forEach(disposeObject);$('#measure').classList.toggle('active',tool==='measure');$('#tool-panel').hidden=!tool;if(tool==='measure')renderMeasurement();else if(tool==='pin')$('#tool-panel').innerHTML='<h3>Place a pin</h3><p>Click any point on the globe, then name your location.</p><button id="cancel-tool">Cancel</button>';if(tool)$('#cancel-tool').onclick=()=>setTool(null);}
function renderMeasurement(){measureGroup.children.slice().forEach(disposeObject);measurePoints.forEach(p=>measureGroup.add(pinMarker(p,'#f2ce8b',.01)));
 if(measurePoints.length===2){const a=new THREE.Vector3(...toVector(measurePoints[0].lat,measurePoints[0].lon)),b=new THREE.Vector3(...toVector(measurePoints[1].lat,measurePoints[1].lon)),theta=a.angleTo(b);let axis=new THREE.Vector3().crossVectors(a,b);if(axis.length()<1e-8)axis.crossVectors(a,Math.abs(a.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0));axis.normalize();const pts=[];for(let i=0;i<=160;i++)pts.push(a.clone().applyAxisAngle(axis,theta*i/160).multiplyScalar(1.008));measureGroup.add(line(pts,'#f2ce8b',1));}
 const box=$('#tool-panel');box.innerHTML=`<h3>Surface distance</h3>${measurePoints.length===2?`<strong>${fmt(distance(...measurePoints))} km</strong><p>Shortest great-circle route. Relief and roads are excluded.<br>Click again to start another route.</p>`:`<p>${measurePoints.length?'Select the destination.':'Select two points on the globe.'}<br>Distances use Libriam’s 364.38 km radius.</p>`}<button id="clear-measure">Start again</button><button id="cancel-tool">Done</button>`;
 $('#clear-measure').onclick=()=>{measurePoints=[];renderMeasurement();};$('#cancel-tool').onclick=()=>setTool(null);
}
annotationUI=installAnnotations({canvas:renderer.domElement,camera,globe,atlas,controls,surfaceRadius:p=>ageRendering.radiusAt(p),getProject:()=>project,getFrame:()=>Math.round(currentFrame),save,flyTo,toast,onActivate:()=>{setTool(null);fly=null;historyPlaying=false;controls.autoRotate=false;$('#rotation').checked=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');}});
$('#measure').onclick=()=>setTool(tool==='measure'?null:'measure');$('#add-pin').onclick=()=>{if(project.pins.length>=500){toast('This project supports up to 500 saved places.');return;}$('#settings-dialog').close();setTool('pin');toast('Click the globe to place your new location.');};
$('#pin-form').onsubmit=e=>{e.preventDefault();const name=$('#pin-name').value.trim();if(!name||!pendingPin)return;project.pins.push({id:crypto.randomUUID(),name,...pendingPin});save();renderPins();$('#pin-dialog').close();setTool(null);toast(`Saved ${name} as a design proposal.`);};
$('#home').onclick=()=>{setTool(null);if(mode==='atlas')flyTo(project.placement,fitDistance());else{controls.target.set(0,0,0);camera.position.set(0,7,12);controls.update();}};
$('#zoom-in').onclick=()=>zoom(.8);$('#zoom-out').onclick=()=>zoom(1.25);
function zoom(f){fly=null;const v=camera.position.clone().sub(controls.target);v.setLength(THREE.MathUtils.clamp(v.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();}
renderer.domElement.addEventListener('keydown',e=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Escape'].includes(e.key)){e.preventDefault();if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1.18);else if(e.key==='Home')$('#home').click();else if(e.key==='Escape')setTool(null);else{fly=null;const v=camera.position.clone().sub(controls.target);if(e.key==='ArrowLeft'||e.key==='ArrowRight')v.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-.08:.08);else {const axis=new THREE.Vector3().crossVectors(v,new THREE.Vector3(0,1,0)).normalize();v.applyAxisAngle(axis,e.key==='ArrowUp'?-.08:.08);}camera.position.copy(controls.target).add(v);controls.update();}}});
const placementForm=$('#placement-form');placementForm.elements.lat.value=project.placement.lat;placementForm.elements.lon.value=project.placement.lon;
placementForm.onsubmit=e=>{e.preventDefault();const p={lat:Number(placementForm.elements.lat.value),lon:Number(placementForm.elements.lon.value)};try{validateProject({...project,placement:p});project.placement=p;hokkaido=makeHokkaido(outline,p);textured.dispose();flat.dispose();textured=texture(true);flat=texture(false);material.map=$('#relief').checked?textured:flat;material.needsUpdate=true;ageRendering.replaceMap(hokkaido);updateCoast();setTool(null);save();flyTo(p,fitDistance());toast('Hokkaido placement saved as a proposal; area stays 5%.');}catch(e){toast(e.message);}};
$('#grid').onchange=e=>gridGroup.visible=e.target.checked;$('#relief').onchange=e=>{material.map=e.target.checked?textured:flat;material.needsUpdate=true;terrainReadout();};$('#lighting').onchange=e=>{ambient.intensity=e.target.checked?.65:2.8;sun.intensity=e.target.checked?2:.65;fill.intensity=e.target.checked?.3:.7;sun.shadow.intensity=e.target.checked?.2:.10;};$('#rotation').onchange=e=>{controls.autoRotate=e.target.checked;controls.autoRotateSpeed=.45;};
$$('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#settings').onclick=()=>$('#settings-dialog').showModal();
function renderSearch(){const q=$('#search').value,box=$('#search-results');box.replaceChildren();if(!q.trim())return;const matches=searchPlaces(q,project,otherLandmasses);if(!matches.length){const p=document.createElement('p');p.className='fine';p.textContent='No places found.';box.append(p);}for(const p of matches){const b=document.createElement('button');b.className='search-result';b.textContent=p.name;const small=document.createElement('small');small.textContent=p.category;b.append(small);b.onclick=()=>{setTool(null);flyTo(p,p.zoom);box.replaceChildren();$('#search').value='';};box.append(b);}}
$('#search').oninput=renderSearch;$('#search').onkeydown=e=>{if(e.key==='Escape'){$('#search').value='';renderSearch();}else if(e.key==='Enter'){$('#search-results button')?.click();}}

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#project-menu').onclick=()=>{$('#export-json').value=JSON.stringify(project,null,2);$('#export-dialog').showModal();};
$('#download-project').onclick=()=>{download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),'libriam-globe-project.json');toast('Download requested. Copy JSON if your browser blocks it.');};
$('#copy-project').onclick=async()=>{try{await navigator.clipboard.writeText($('#export-json').value);toast('Project JSON copied.');}catch{$('#export-json').focus();$('#export-json').select();toast('Select all and copy the project text to keep a backup.');}};
$('#import-btn').onclick=()=>{$('#import-json').value='';$('#import-dialog').showModal();};$('#choose-file').onclick=()=>$('#import-file').click();
function importProject(text){const imported=validateProject(JSON.parse(text));if(!window.confirm('Replace this device’s project? Export first to preserve your current design.'))return;const previous=project;project=imported;save();if(storageOK)location.reload();else{project=previous;throw Error('Import requires local storage. Enable it and try again.');}}
$('#import-form').onsubmit=e=>{e.preventDefault();try{if($('#import-json').value.length>32e6)throw Error('Project exceeds 32 MB.');importProject($('#import-json').value);}catch(error){toast(`Import failed: ${error.message}`);}};
$('#import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>32e6)throw Error('Project file exceeds 32 MB.');importProject(await f.text());}catch(error){toast(`Import failed: ${error.message}`);}finally{e.target.value='';}};
$('#shot').onclick=()=>{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(blob)download(blob,`dragex-${mode}-view.png`);else toast('Could not capture the view.');},'image/png');};
function populateBodies(){const box=$('#bodies');box.replaceChildren();for(const b of project.bodies){const row=document.createElement('button');row.className='body-row'+(b.id===selectedBody?' active':'');const dot=document.createElement('span');dot.className='body-dot';dot.style.background=b.color;const label=document.createElement('span');label.textContent=b.name;const sm=document.createElement('small');sm.textContent=`${b.type.toUpperCase()} · ${fmt(b.radiusKm)} km radius${b.id==='libriam'?'':' · PROPOSAL'}`;label.append(sm);row.append(dot,label);row.onclick=()=>{selectedBody=b.id;populateBodies();fillBodyForm();};box.append(row);}}
function fillBodyForm(){const b=project.bodies.find(x=>x.id===selectedBody),f=$('#body-form');f.elements.name.value=b.name;f.elements.type.value=b.type;f.elements.radiusKm.value=b.radiusKm;f.elements.orbitAU.value=b.orbitAU??'';f.elements.color.value=b.color;f.elements.parentId.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='Not decided / no parent';f.elements.parentId.append(none);for(const p of project.bodies.filter(p=>p.id!==b.id)){const op=document.createElement('option');op.value=p.id;op.textContent=p.name;f.elements.parentId.append(op);}f.elements.parentId.value=b.parentId??'';f.elements.radiusKm.readOnly=b.id==='libriam';f.elements.type.disabled=b.id==='libriam';f.elements.name.readOnly=b.id==='libriam';$('#delete-body').hidden=b.id==='libriam';}
$('#new-body').onclick=()=>{if(project.bodies.length>=50){toast('This project supports up to 50 celestial bodies.');return;}const b={id:crypto.randomUUID(),name:`New body ${project.bodies.length}`,type:'planet',radiusKm:100,orbitAU:null,parentId:null,color:'#c0a984',status:'design proposal'};project.bodies.push(b);selectedBody=b.id;save();populateBodies();fillBodyForm();rebuildSystem();$('#body-form').elements.name.focus();};
$('#body-form').onsubmit=e=>{e.preventDefault();const f=e.target,b=project.bodies.find(b=>b.id===selectedBody),next={...b,name:f.elements.name.value.trim(),type:b.id==='libriam'?'planet':f.elements.type.value,radiusKm:Number(f.elements.radiusKm.value),parentId:f.elements.parentId.value||null,orbitAU:f.elements.orbitAU.value===''?null:Number(f.elements.orbitAU.value),color:f.elements.color.value};const draft={...project,bodies:project.bodies.map(x=>x.id===b.id?next:x)};try{project=validateProject(draft);save();populateBodies();rebuildSystem();toast('Solar-system design saved.');}catch(error){toast(error.message);}};
$('#delete-body').onclick=()=>{if(selectedBody==='libriam')return;project.bodies=project.bodies.filter(b=>b.id!==selectedBody);project.bodies.forEach(b=>{if(b.parentId===selectedBody){b.parentId=null;b.orbitAU=null;}});selectedBody='libriam';save();populateBodies();fillBodyForm();rebuildSystem();};
function textSprite(text){const c=document.createElement('canvas');c.width=512;c.height=80;const x=c.getContext('2d');x.font='24px sans-serif';x.textAlign='center';x.fillStyle='#bfd5de';x.fillText(text,256,45);const tex=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(2.5,.4,1);s.userData.labelTexture=tex;return s;}
function rebuildSystem(){system.children.slice().forEach(o=>{o.traverse(p=>p.userData.labelTexture?.dispose());disposeObject(o);});const positions=new Map(),radiusFor=b=>.12+Math.log10(b.radiusKm+1)*.11;let orphan=0;
 function pos(b,depth=0){if(positions.has(b.id))return positions.get(b.id);if(depth>50)return new THREE.Vector3();let p;if(b.parentId&&b.orbitAU!==null){const parent=project.bodies.find(x=>x.id===b.parentId);const origin=pos(parent,depth+1);const r=.8+Math.log10(1+b.orbitAU*30)*2.6;const phase=project.bodies.indexOf(b)*2.39996;p=origin.clone().add(new THREE.Vector3(Math.cos(phase)*r,0,Math.sin(phase)*r));const pts=[];for(let i=0;i<=180;i++)pts.push(origin.clone().add(new THREE.Vector3(Math.cos(i/180*Math.PI*2)*r,0,Math.sin(i/180*Math.PI*2)*r)));system.add(line(pts,'#67959b',.35));}else{p=new THREE.Vector3(orphan*2.4,0,0);orphan++;}positions.set(b.id,p);return p;}
 for(const b of project.bodies){const p=pos(b),r=radiusFor(b);const mat=b.type==='star'?new THREE.MeshBasicMaterial({color:b.color}):new THREE.MeshStandardMaterial({color:b.color,roughness:.75});const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,40,24),mat);mesh.position.copy(p);system.add(mesh);const label=textSprite(`${b.name}${b.orbitAU!==null&&b.parentId?` · ${b.orbitAU} AU`:' · orbit undecided'}`);label.position.copy(p).add(new THREE.Vector3(0,r+.4,0));system.add(label);}
 if(project.bodies.length===1){const label=textSprite('Your solar system begins here.');label.position.set(0,-1,0);label.scale.multiplyScalar(1.5);system.add(label);}
 const extent=Math.max(6,...[...positions.values()].map(p=>p.length()+2));controls.maxDistance=mode==='system'?Math.max(30,extent*4):7;
}
populateBodies();fillBodyForm();rebuildSystem();
$$('[data-mode]').forEach(button=>button.onclick=()=>{
 if(mode==='atlas'){project.timeline.frame=Math.round(currentFrame);save();}mode=button.dataset.mode;setTool(null);fly=null;$('#app').classList.toggle('system-mode',mode==='system');$('#system-sidebar').hidden=mode!=='system';$$('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));atlas.visible=mode==='atlas';system.visible=mode==='system';controls.autoRotate=false;$('#rotation').checked=false;controls.minDistance=mode==='atlas'?1.06:.5;controls.maxDistance=mode==='atlas'?7:40;controls.enablePan=mode==='system';controls.enableRotate=mode==='system';controls.target.set(0,0,0);
 $('#view-kind').textContent=mode==='atlas'?'THE HOKKAIDO CHRONICLE':'SOLAR SYSTEM / DESIGN SCHEMATIC';$('#view-title').textContent=mode==='atlas'?'A new perspective.':'Room for a universe.';$('#view-subtitle').textContent=mode==='atlas'?'Drag to explore · scroll to move closer':'Drag to orbit · right-drag to pan · scroll to zoom';$('#unmapped-note').hidden=mode!=='atlas';$('#coordinate-panel').hidden=true;historyPlaying=false;lastHistoryText=-1;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');$('#hud-mode').textContent=mode==='atlas'?'LIBRIAM':'SYSTEM STUDIO';$('#scale-unit').textContent=mode==='atlas'?'1° ≈ 6.36 km at equator':'Compressed scale · proposals';
 if(mode==='atlas')flyTo(project.placement,fitDistance());else{camera.position.set(0,7,12);rebuildSystem();}controls.update();resize();
});
$('#unmapped-note').textContent='Alaska · New Zealand · polar sea ice';
function selectCoordinate(p){selectedCoordinate=p;$('#cursor').textContent=coords(p);selectionGroup.children.slice().forEach(disposeObject);selectionGroup.add(pinMarker(p,'#ffe0a6',.008));$('#selected-coords').textContent=coords(p);const land=[hokkaido,...otherLandmasses,edenIsle].find(f=>geoContains(f,[p.lon,p.lat]));const atLake=lakeField(p)<1.1,isIsland=islandField(p)<1,isPool=isIsland&&poolDistance(p)<POOL_DIAMETER_KM/2;$('#selected-place').textContent=isPool?(timelineState(currentFrame).lake>.3?'Island’s inner pool · about 1 km wide':'Island’s dry pool bed'):isIsland?'Small lake island':atLake?(timelineState(currentFrame).lake>.3?'Great freshwater lake · Moana’s Tear':'Death’s Valley · dried lake bed'):land?(land===hokkaido?'Hokkaido · surface location':land.properties.name+' · adapted coastline'):polarIce(p.lat,p.lon)>.2?(p.lat>0?'North':'South')+' polar sea ice · frozen ocean':'Ocean-colored surface';const named=placeAt(p);if(named)$('#selected-place').textContent=named.name;$('#coordinate-panel').hidden=false;$('#copy-coords-status').textContent='';}
$('#close-coords').onclick=()=>{$('#coordinate-panel').hidden=true;selectionGroup.children.slice().forEach(disposeObject);};
$('#copy-coords').onclick=async()=>{if(!selectedCoordinate)return;const p=selectedCoordinate,text=`${coords(p)} (latitude ${p.lat.toFixed(5)}, longitude ${p.lon.toFixed(5)}) · Age ${timelineState(currentFrame).age+1}, design unit ${Math.round(currentFrame)}`;try{await navigator.clipboard.writeText(text);$('#copy-coords-status').textContent='Copied. Paste these coordinates into the chat.';}catch{$('#copy-coords-status').textContent=text;}};
$('#pin-selected').onclick=()=>{if(!selectedCoordinate)return;if(project.pins.length>=500){toast('This project supports up to 500 saved places.');return;}pendingPin={...selectedCoordinate};$('#pin-coordinates').textContent=coords(pendingPin);$('#pin-name').value='';$('#pin-dialog').showModal();};
function historyTarget(frame,immediate=false){targetFrame=Math.max(0,Math.min(6999,Math.round(frame)));if(immediate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)currentFrame=targetFrame;project.timeline.frame=targetFrame;clearTimeout(historyTarget.timer);historyTarget.timer=setTimeout(save,250);updateTimelineText();}
function updateTimelineText(){const state=timelineState(currentFrame),age=AGES[state.age];$('#age-slider').value=Math.round(currentFrame);if(document.activeElement!==$('#frame-input'))$('#frame-input').value=Math.round(currentFrame);$('#age-slider').setAttribute('aria-valuetext',`Age ${state.age+1}, ${age.name}, unit ${state.unit} of 1000`);$('#timeline-readout').textContent=`AGE ${state.age+1} · UNIT ${state.unit.toLocaleString()} / 1,000`;
 $('#timeline-caption').textContent=age.title;$$('.age-button').forEach((b,i)=>{b.classList.toggle('active',state.age===i);b.setAttribute('aria-pressed',state.age===i?'true':'false');});if(mode==='atlas'){$('#view-kind').textContent=`AGE ${state.age+1} / ${age.name.toUpperCase()}`;$('#view-title').textContent=age.title;$('#view-subtitle').textContent='Click a place to share its coordinates · drag to explore';}
}
AGES.forEach((age,i)=>{const button=$$('.age-button')[i];button.setAttribute('aria-label',`Age ${i+1}: ${age.name}`);button.title=age.title;button.onclick=()=>{historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');historyTarget(age.moment);};});
$('#age-slider').oninput=e=>{historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');historyTarget(Number(e.target.value),true);};
$('#frame-input').onchange=e=>{if(!e.target.checkValidity())return;historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');historyTarget(Number(e.target.value));};
$('#frame-input').oninput=$('#frame-input').onchange;
$('#frame-input').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#frame-input').onchange(e);e.target.blur();}};
$('#history-start').onclick=()=>{historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');historyTarget(0);};
$('#play-history').onclick=()=>{historyPlaying=!historyPlaying;if(historyPlaying&&currentFrame>=6998)historyTarget(0,true);$('#play-history').textContent=historyPlaying?'Ⅱ':'▶';$('#play-history').setAttribute('aria-label',historyPlaying?'Pause history':'Play history');if(!historyPlaying)historyTarget(currentFrame,true);};
let lastTerrainOverlayKey='';
function updateTerrainOverlays(){const key=`${Math.round(currentFrame)}:${project.terrain.exaggeration}:${$('#relief').checked}:${surfaceEpoch}`;if(key===lastTerrainOverlayKey)return;lastTerrainOverlayKey=key;
 for(const group of [gridGroup,coastGroup,historyFeatures,pinGroup,selectionGroup,measureGroup])group.traverse(o=>{
  if(o.userData.surfaceCoordinate){const p=o.userData.surfaceCoordinate;o.position.set(...toVector(p.lat,p.lon,ageRendering.radiusAt(p)+.013));}
  if(!o.isLine)return;const positions=o.geometry.attributes.position;if(!o.userData.surfacePath)o.userData.surfacePath=Array.from({length:positions.count},(_,i)=>{const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);return {...fromVector(x,y,z),lift:Math.hypot(x,y,z)-1};});
  o.userData.surfacePath.forEach((p,i)=>positions.setXYZ(i,...toVector(p.lat,p.lon,ageRendering.radiusAt(p)+p.lift)));positions.needsUpdate=true;o.geometry.computeBoundingSphere();
 });
}
const authorLabels=namedPlaces.map(p=>{const e=document.createElement('div');e.id=`author-place-${p.id}`;e.className='author-place-label';e.textContent=p.name;$('#viewport').append(e);return p;});
let lastHistoryText=-1;
function projectLabel(selector,p,show=true){const element=$(selector);if(!show){element.style.display='none';return;}const point=new THREE.Vector3(...toVector(p.lat,p.lon,ageRendering.radiusAt(p)+.012)),front=point.clone().normalize().dot(camera.position.clone().sub(point).normalize())>.05,v=point.project(camera);element.style.display=front&&Math.abs(v.x)<.98&&Math.abs(v.y)<.98?'block':'none';element.style.left=`${(v.x+1)*host.clientWidth/2}px`;element.style.top=`${(1-v.y)*host.clientHeight/2}px`;element.style.transform='translate(-50%,-50%)';}
function updateHistory(dt,now){if(mode==='atlas'){
 if(historyPlaying){currentFrame=Math.min(6999,currentFrame+dt*Number($('#history-speed').value));targetFrame=currentFrame;if(currentFrame>=6999){historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');historyTarget(6999,true);}}
 else if(Math.abs(targetFrame-currentFrame)>.05){const delta=targetFrame-currentFrame;currentFrame+=delta*(1-Math.exp(-dt*13));}else currentFrame=targetFrame;
 const frame=Math.round(currentFrame);if(frame!==lastHistoryText){updateTimelineText();lastHistoryText=frame;}
 authorLabels.forEach(p=>projectLabel(`#author-place-${p.id}`,p,$('#labels').checked&&camera.position.length()<2.1&&timelineState(currentFrame).emergence>.5));
 const state=timelineState(currentFrame);ageRendering.update(currentFrame,motionSeconds,$('#relief').checked,project.terrain.exaggeration,camera.position.length(),fromVector(...camera.position.toArray()));const underCamera=fromVector(...camera.position.toArray());controls.minDistance=Math.max(1.004,ageRendering.radiusAt(underCamera)+.004);if(camera.position.length()<controls.minDistance)camera.position.setLength(controls.minDistance);updateTerrainOverlays();atlas.visible=state.emergence>.001;gridGroup.visible=$('#grid').checked&&state.emergence>.5;coastGroup.visible=state.emergence>.55&&camera.position.length()>1.25;atmos.visible=state.emergence>.05&&$('#clouds').checked&&camera.position.length()>1.04;ageRendering.clouds.visible=ageRendering.clouds.visible&&$('#clouds').checked;historyFeatures.visible=$('#features').checked&&state.emergence>.5;
 const closeIsland=camera.position.length()<1.45;$('#history-label').textContent=closeIsland?(state.lake>.3?'INNER POOL · 1 KM':'DRY POOL BED'):(state.lake>.3?'GREAT LAKE · MOANA’S TEAR':'DEATH’S VALLEY');projectLabel('#history-label',closeIsland?{lat:ISLAND_CENTER.lat+.6,lon:ISLAND_CENTER.lon}:LAKE,$('#features').checked&&state.emergence>.5);otherLandmasses.forEach(f=>projectLabel('#'+f.properties.id+'-label',f.properties.center,$('#labels').checked&&state.emergence>.5));
 projectLabel('#eden-label',EDEN_CENTER,$('#labels').checked&&state.emergence>.5);
 projectLabel('#north-pole-label',{lat:87,lon:0},$('#labels').checked&&state.emergence>.5);projectLabel('#south-pole-label',{lat:-87,lon:0},$('#labels').checked&&state.emergence>.5);
 }else{atlas.visible=false;authorLabels.forEach(p=>projectLabel(`#author-place-${p.id}`,p,false));}
}
updateTimelineText();
let motionSeconds=0,renderingLoop=false,loopAbort=null;
$('#environment-motion').checked=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#loop-phase').oninput=()=>{motionSeconds=Number($('#loop-phase').value);$('#environment-motion').checked=false;};
$('#water').onchange=()=>{ageRendering.environment.uniforms.uWaterEnabled.value=$('#water').checked?1:0;};
$('#beach-preview').onclick=()=>{if(mode!=='atlas')$('[data-mode=atlas]').click();const [lon,lat]=edenIsle.geometry.coordinates[0][0];$('#settings-dialog').close();flyTo({lat,lon},1.006);toast('Eden’s Isle beach · scroll out to return to the globe.');};
$('#cancel-loop-render').onclick=()=>loopAbort?.abort();
$('#loop-render-dialog').addEventListener('cancel',e=>{e.preventDefault();loopAbort?.abort();});
$('#render-loop').onclick=async()=>{
 if(mode!=='atlas'){toast('Open the globe to render a water loop.');return;}
 renderingLoop=true;loopAbort=new AbortController();historyPlaying=false;$('#play-history').textContent='▶';$('#play-history').setAttribute('aria-label','Play history');fly=null;
 const previousControls=controls.enabled;controls.enabled=false;
 $('#settings-dialog').close();$('#loop-render-progress').value=0;$('#loop-render-status').textContent='Preparing frames…';$('#loop-render-dialog').showModal();
 const update=seconds=>{updateMoon(seconds);ageRendering.update(currentFrame,seconds,$('#relief').checked,project.terrain.exaggeration,camera.position.length(),fromVector(...camera.position.toArray()));ageRendering.clouds.visible=ageRendering.clouds.visible&&$('#clouds').checked;};
 try{
  const blob=await renderLoop({renderer,scene,camera,update,signal:loopAbort.signal,onProgress:(frame,total)=>{$('#loop-render-progress').value=frame;$('#loop-render-status').textContent=`Frame ${frame} / ${total}`;},metadata:{historyDesignUnit:Math.round(currentFrame),camera:camera.position.toArray(),placement:project.placement,terrainExaggeration:project.terrain.exaggeration,water:$('#water').checked,atmosphere:$('#clouds').checked}});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Libriam-loop-12s-30fps.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Loop rendered: 360 PNG frames in one ZIP.');
 }catch(error){toast(error.name==='AbortError'?'Loop render cancelled.':`Loop render failed: ${error.message}`);}
 finally{renderingLoop=false;loopAbort=null;controls.enabled=previousControls;$('#loop-render-dialog').close();update(motionSeconds);}
};
let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.1,(now-last)/1000);last=now;
 if(renderingLoop)return;
 if($('#environment-motion').checked)motionSeconds=(motionSeconds+dt)%LOOP_SECONDS;
 $('#loop-phase').value=motionSeconds;$('#loop-readout').textContent=`${motionSeconds.toFixed(1)} / 12 s`;
 if(fly){const t=Math.min(1,(now-fly.t)/fly.duration),e=t*t*(3-2*t);const rotation=new THREE.Quaternion().slerp(fly.rotation,e);camera.position.copy(fly.start).normalize().applyQuaternion(rotation).multiplyScalar(THREE.MathUtils.lerp(fly.start.length(),fly.end.length(),e));controls.target.lerpVectors(fly.startTarget,fly.endTarget,e);if(t===1)fly=null;}
 updateMoon(motionSeconds);updateHistory(dt,now);annotationUI.update(mode==='atlas'&&timelineState(currentFrame).emergence>.05);controls.update(dt);renderer.render(scene,camera);
 if(mode==='atlas'){
  $('#altitude').textContent=`Altitude ${fmt((camera.position.length()-1)*RADIUS,0)} km`;
  const v=new THREE.Vector3(...toVector(project.placement.lat+12,project.placement.lon-7,1.02)),front=v.clone().normalize().dot(camera.position.clone().sub(v).normalize())>.05,screen=v.project(camera);
  $('#map-label').style.display=$('#labels').checked&&timelineState(currentFrame).emergence>.5&&front&&Math.abs(screen.x)<1&&Math.abs(screen.y)<1?'block':'none';$('#map-label').style.left=`${(screen.x+1)*host.clientWidth/2}px`;$('#map-label').style.top=`${(1-screen.y)*host.clientHeight/2}px`;$('#map-label').style.transform='translate(-50%,-50%)';
 }else{$('#altitude').textContent='Orbital geometry · schematic';$('#cursor').textContent=`${project.bodies.length} ${project.bodies.length===1?'body':'bodies'}`;}
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{project.timeline.frame=Math.round(currentFrame);try{localStorage.setItem(STORAGE,JSON.stringify(project));}catch{}ageRendering.dispose();renderer.dispose();controls.dispose();});
// Exposed read-only diagnostics for geometry verification, not application state mutation.
window.dragexDiagnostics=()=>({radiusKm:RADIUS,surfaceAreaKm2:SURFACE_AREA,hokkaidoAreaKm2:HOKKAIDO_AREA,coastline:hokkaido.geometry,mode,pins:project.pins.length,bodies:project.bodies.length,timeline:timelineState(currentFrame),landmasses:otherLandmasses.map(f=>({area:f.properties.areaKm2,center:f.properties.center})),environment:{loopSeconds:ageRendering.environment.loopSeconds,bakedWaveFrames:96,cloudPuffs:ageRendering.environment.clouds.count,shoreResolution:[4096,2048]},webgl:renderer.capabilities.isWebGL2});
