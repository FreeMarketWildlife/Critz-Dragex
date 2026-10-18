import * as THREE from 'three';
import {SYSTEM_BODIES,BODY_BY_ID,LIBRIAM_RADIUS as UNIT,AU,systemPositions,keplerPosition,encounterState,COMETS,cometPosition} from './orbital-model.js';
const vector=a=>new THREE.Vector3(...a).divideScalar(UNIT);
function gasTexture(color){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),base=new THREE.Color(color);
 for(let y=0;y<512;y++){const band=.80+.13*Math.sin(y*.135)+.06*Math.sin(y*.47)+.04*Math.sin(y*.91);x.fillStyle=`rgb(${base.r*255*band},${base.g*255*band},${base.b*255*band})`;x.fillRect(0,y,1024,1);}
 for(let i=0;i<38;i++){const y=(i*137)%512,g=x.createRadialGradient((i*173)%1024,y,0,(i*173)%1024,y,16);g.addColorStop(0,'rgba(245,237,224,.13)');g.addColorStop(1,'rgba(245,237,224,0)');x.fillStyle=g;x.fillRect(0,y-16,1024,32);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function litMaterial(color,map=null){return new THREE.ShaderMaterial({uniforms:{base:{value:new THREE.Color(color)},map:{value:map},useMap:{value:map?1:0},lightDirection:{value:new THREE.Vector3(-1,.4,.5).normalize()}},vertexShader:`varying vec2 vUv;varying vec3 n;void main(){vUv=uv;n=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);#include <logdepthbuf_vertex>\n}`.replace('#include','\n#include'),fragmentShader:`uniform vec3 base;uniform sampler2D map;uniform float useMap;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 n;void main(){vec3 c=base;if(useMap>.5)c=texture2D(map,vUv).rgb;float l=max(0.,dot(normalize(n),lightDirection));gl_FragColor=vec4(c*(.12+.88*l),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});}
// GLSL chunks are supplied explicitly, including logarithmic depth for AU scales.
function logDepth(material){material.vertexShader='#include <common>\n#include <logdepthbuf_pars_vertex>\n'+material.vertexShader;material.fragmentShader='#include <logdepthbuf_pars_fragment>\n'+material.fragmentShader.replace('void main(){','void main(){\n#include <logdepthbuf_fragment>\n');return material;}
function rings(body){
 const group=new THREE.Group(),[inner,outer]=body.rings;
 const c=document.createElement('canvas');c.width=512;c.height=1;const ctx=c.getContext('2d');
 for(let x=0;x<512;x++){const t=x/512,gap=t>.58&&t<.64;ctx.fillStyle=`rgba(${body.id==='kronos'?'227,200,160':'149,172,227'},${gap?.04:.25+.45*Math.abs(Math.sin(x*.31))})`;ctx.fillRect(x,0,1,1);}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const geo=new THREE.RingGeometry(inner/UNIT,outer/UNIT,256,8),uv=geo.attributes.uv,pos=geo.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.hypot(pos.getX(i),pos.getY(i))-inner/UNIT)/((outer-inner)/UNIT),.5);
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:.9}));mesh.rotation.x=-Math.PI/2;group.add(mesh);return group;
}
export function installSpace({group,camera,host,globeMap,moonMap,globe,onFocus}){
 const meshes={},paths={},labels={},positionCache={};let origin=new THREE.Vector3(),focus='libriam',lastYear=NaN;
 const labelLayer=document.createElement('div');labelLayer.id='space-labels';host.parentElement.append(labelLayer);
 const centerLines=new THREE.Group();group.add(centerLines);
 for(const b of SYSTEM_BODIES){
  const texture=b.rings?gasTexture(b.color):b.id==='libriam'?globeMap:b.type==='moon'?moonMap:null;
  const material=b.type==='star'?new THREE.MeshBasicMaterial({color:b.color}):logDepth(litMaterial(b.color,texture));
  const mesh=new THREE.Mesh(b.id==='libriam'?globe.geometry:new THREE.SphereGeometry(b.radiusKm/UNIT,96,64),b.id==='libriam'?globe.material:material);if(b.rings){mesh.scale.y=.90;const ring=rings(b);const root=new THREE.Group();root.add(mesh,ring);root.rotation.z=b.tilt;meshes[b.id]=root;group.add(root);}else{meshes[b.id]=mesh;group.add(mesh);}
  meshes[b.id].userData.bodyId=b.id;
  const label=document.createElement('button');label.className='space-body-label';label.textContent=b.name;label.style.setProperty('--body-color',b.color);label.onclick=()=>onFocus(b.id);labelLayer.append(label);labels[b.id]=label;
  if(b.parentId){const points=[];const parent=BODY_BY_ID[b.parentId];for(let i=0;i<=360;i++)points.push(vector(keplerPosition({...b,phase:i/360*Math.PI*2},0)));
   const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:b.id==='libriam'?'#77dcc1':b.color,transparent:true,opacity:.18}));centerLines.add(path);paths[b.id]=path;}
 }
 // A halo drawn in true units, not a rescaled stellar body.
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),grad=gc.createRadialGradient(64,64,4,64,64,64);grad.addColorStop(0,'rgba(255,186,104,.5)');grad.addColorStop(.4,'rgba(255,144,64,.12)');grad.addColorStop(1,'rgba(255,130,60,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,128);
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.setScalar(BODY_BY_ID.sun.radiusKm/UNIT*8);group.add(glow);
 // Rock/dust points represent an extremely sparse outer annulus. A scheduled
 // dense episode is intentionally authored; no claimed N-body replenishment.
 const dustPositions=[];for(let i=0;i<1800;i++){const a=i*2.399963,r=(1930000+140000*((i*73)%1800)/1800)/UNIT;dustPositions.push(Math.cos(a)*r,Math.sin(i*15.73)*1000/UNIT,Math.sin(a)*r);}
 const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3)),new THREE.PointsMaterial({color:'#e7cda6',size:3,transparent:true,opacity:.08,sizeAttenuation:false,depthWrite:false}));group.add(dust);
 const comets=COMETS.map(()=>{const root=new THREE.Group(),head=new THREE.Mesh(new THREE.SphereGeometry(5/UNIT,12,8),new THREE.MeshBasicMaterial({color:'#c5edf3'})),tail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(1000000/UNIT,0,0)]),new THREE.LineBasicMaterial({color:'#76b5cd',transparent:true,opacity:.65}));root.add(head,tail);group.add(root);return root;});
 const background=new THREE.Group(),stars=[];for(let i=0;i<1600;i++){const v=new THREE.Vector3(Math.sin(i*78.13),Math.sin(i*43.52),Math.cos(i*92.21)).normalize().multiplyScalar(8*AU/UNIT);stars.push(v.x,v.y,v.z);}
 background.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(stars,3)),new THREE.PointsMaterial({color:'#adc6db',size:1.3,sizeAttenuation:false,transparent:true,opacity:.7})));group.add(background);
 function update(year,focusId,visible,atlasMode=false){
  focus=focusId;group.visible=visible;labelLayer.hidden=!visible||atlasMode;if(!visible)return;
  const p=systemPositions(year);origin=vector(p[focusId]??p.sun);lastYear=year;
  for(const b of SYSTEM_BODIES){const v=vector(p[b.id]).sub(origin);positionCache[b.id]=v;meshes[b.id].position.copy(v);meshes[b.id].visible=!(atlasMode&&b.id==='libriam');const material=meshes[b.id].isMesh?meshes[b.id].material:meshes[b.id].children[0].material;if(material.uniforms?.lightDirection)material.uniforms.lightDirection.value.copy(vector(p.sun).sub(vector(p[b.id])).normalize());
   if(paths[b.id]){paths[b.id].position.copy(vector(p[b.parentId]).sub(origin));const distance=camera.position.distanceTo(paths[b.id].position);paths[b.id].visible=!atlasMode&&distance<b.aKm/UNIT*30;}
  }
  glow.position.copy(positionCache.sun);dust.position.copy(positionCache.kronos);dust.material.opacity=.055+encounterState(year).temporal*.72;
  comets.forEach((c,i)=>{const point=vector(cometPosition(COMETS[i],year));c.position.copy(point.clone().sub(origin));c.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),point.normalize());c.visible=camera.position.length()>20000;});
  background.position.copy(camera.position);
 }
 function updateLabels(){
  if(!group.visible)return;camera.updateMatrixWorld();const occupied=[];
  for(const b of [...SYSTEM_BODIES].sort((a,b)=>(a.id===focus?-1:b.id===focus?1:0))){const label=labels[b.id],v=positionCache[b.id];if(!v){label.hidden=true;continue;}
   const relative=v.clone().sub(camera.position),front=relative.dot(camera.getWorldDirection(new THREE.Vector3()))>0,point=v.clone().project(camera),x=(point.x+1)*host.clientWidth/2,y=(1-point.y)*host.clientHeight/2;
   const separated=!occupied.some(q=>Math.hypot(q[0]-x,q[1]-y)<65),show=front&&point.z<=1&&Math.abs(point.x)<.94&&Math.abs(point.y)<.88&&separated;
   label.hidden=!show;if(show){occupied.push([x,y]);label.style.left=`${x}px`;label.style.top=`${y+14}px`;label.classList.toggle('focused',b.id===focus);}
  }
 }
 return {update,updateLabels,meshes,positionCache,get origin(){return origin;},get year(){return lastYear;}};
}
