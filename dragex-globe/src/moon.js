import * as THREE from 'three';
import {toVector,RADIUS} from './model.js';

// Saturn-moon hierarchy proposal: 5,000 km separation and 60 km radius.
// Fits inside Libriam’s conservative submoon stability region.
export const MOON_DISTANCE=5000/RADIUS,MOON_RADIUS=60/RADIUS;
export function makeMoon(placement){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#a5a6a8';ctx.fillRect(0,0,2048,1024);
 let seed=71629;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 // An original illustrative surface: broad dark plains and restrained craters.
 for(let i=0;i<680;i++){
  const x=random()*2048,lat=Math.asin(random()*2-1),y=(.5-lat/Math.PI)*1024;
  const r=i<28?35+random()*100:2+random()*15,stretch=1/Math.max(.18,Math.cos(lat));
  for(const wrap of [-2048,0,2048]){
   ctx.save();ctx.translate(x+wrap,y);ctx.scale(stretch,1);
   const g=ctx.createRadialGradient(-r*.15,-r*.15,0,0,0,r);
   if(i<28){g.addColorStop(0,'rgba(49,51,58,.32)');g.addColorStop(.7,'rgba(66,68,74,.22)');g.addColorStop(1,'rgba(66,68,74,0)');}
   else{g.addColorStop(0,'rgba(67,68,72,.22)');g.addColorStop(.68,'rgba(70,71,75,.28)');g.addColorStop(.82,'rgba(215,215,211,.32)');g.addColorStop(1,'rgba(160,160,160,0)');}
   ctx.fillStyle=g;ctx.fillRect(-r,-r,2*r,2*r);ctx.restore();
  }
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;
 const material=new THREE.ShaderMaterial({uniforms:{map:{value:map},lightDirection:{value:new THREE.Vector3(-3,3,5).normalize()}},
  vertexShader:`varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 vNormal;void main(){float light=max(0.,dot(normalize(vNormal),lightDirection));vec3 surface=texture2D(map,vUv).rgb;gl_FragColor=vec4(surface*(.035+.965*light),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>}`});
 const moon=new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS,64,40),material);
 moon.name='Unnamed moon · illustrative distance and surface';
 // Fixed celestial epoch: no accelerated orbit tied to the water's 12s loop.
 // True world coordinates preserve angular size, parallax and globe occlusion.
 moon.position.set(...toVector(-placement.lat+8,placement.lon+168,MOON_DISTANCE));
 moon.rotation.y=.65;
 return moon;
}
