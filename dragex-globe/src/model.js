import { geoArea } from 'd3-geo';
export const HOKKAIDO_AREA = 83422.22;
export const SURFACE_AREA = HOKKAIDO_AREA / 0.05;
export const RADIUS = Math.sqrt(SURFACE_AREA / (4 * Math.PI));
export const EARTH_RADIUS = 6371;
export const rad = Math.PI / 180;
export const planet = { id: 'libriam', name: 'Libriam', type: 'planet', radiusKm: RADIUS, orbitAU: null, parentId: null, color: '#64c7bd', status: 'author-confirmed dimensions; spherical model' };
export function distance(a, b, radius = RADIUS) {
 const p=a.lat*rad,q=b.lat*rad,dl=(b.lon-a.lon)*rad;
 const h=Math.sin((q-p)/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(dl/2)**2;
 return 2*radius*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function toVector(lat,lon,r=1){const p=lat*rad,l=lon*rad;return [r*Math.cos(p)*Math.sin(l),r*Math.sin(p),r*Math.cos(p)*Math.cos(l)];}
export function fromVector(x,y,z){return {lat:Math.asin(y/Math.hypot(x,y,z))/rad,lon:Math.atan2(x,z)/rad};}
// Lambert azimuthal equal-area: project Earth reference into a local plane,
// then inverse-project onto Libriam. Normalize polygon area on the sphere.
export function makeHokkaido(feature, center={lat:20,lon:0}) {
 const cLat=43.4*rad,cLon=142.5*rad;
 const plane=feature.geometry.coordinates[0].map(([lo,la])=>{
  const p=la*rad,l=lo*rad-cLon,k=Math.sqrt(2/(1+Math.sin(cLat)*Math.sin(p)+Math.cos(cLat)*Math.cos(p)*Math.cos(l)));
  return [EARTH_RADIUS*k*Math.cos(p)*Math.sin(l),EARTH_RADIUS*k*(Math.cos(cLat)*Math.sin(p)-Math.sin(cLat)*Math.cos(p)*Math.cos(l))];
 });
 function ring(scale){return plane.map(([x0,y0])=>{
  const x=x0*scale,y=y0*scale,rho=Math.hypot(x,y),c=2*Math.asin(Math.min(1,rho/(2*RADIUS))),p=center.lat*rad,l=center.lon*rad;
  if(rho<1e-10)return [center.lon,center.lat];
  return [(l+Math.atan2(x*Math.sin(c),rho*Math.cos(p)*Math.cos(c)-y*Math.sin(p)*Math.sin(c)))/rad,Math.asin(Math.cos(c)*Math.sin(p)+y*Math.sin(c)*Math.cos(p)/rho)/rad];
 });}
 function area(r){const a=geoArea({type:'Polygon',coordinates:[r]});return Math.min(a,4*Math.PI-a)*RADIUS**2;}
 let lo=0,hi=2;for(let i=0;i<55;i++){const m=(lo+hi)/2;if(area(ring(m))<HOKKAIDO_AREA)lo=m;else hi=m;}
 let r=ring((lo+hi)/2); if(geoArea({type:'Polygon',coordinates:[r]})>2*Math.PI)r=r.reverse();
 return {type:'Feature',properties:{name:'Hokkaido',areaKm2:HOKKAIDO_AREA,center,status:'reference coastline; provisional globe placement'},geometry:{type:'Polygon',coordinates:[r]}};
}
export function newProject(){return {schemaVersion:1,name:'Libriam atlas',pins:[],bodies:[{...planet}],placement:{lat:20,lon:0},timeline:{frame:2900}};}
export function validateProject(value){
 if(!value||value.schemaVersion!==1||!Array.isArray(value.pins)||!Array.isArray(value.bodies)||value.pins.length>500||value.bodies.length>50)throw new Error('Use a Dragex Globe project file (version 1, up to 500 pins / 50 bodies).');
 const str=(s,n=80)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
 const coord=(p)=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;
 if(!coord(value.placement)||Math.abs(value.placement.lat)>40||Math.abs(value.placement.lon)>100)throw new Error('Hokkaido placement must be within ±40° latitude and ±100° longitude in this version.');
 for(const p of value.pins)if(!str(p.id)||!str(p.name)||!coord(p))throw new Error('Invalid location pin.');
 const ids=new Set();for(const b of value.bodies){
  if(!str(b.id)||ids.has(b.id)||!str(b.name)||!['planet','moon','star'].includes(b.type)||!Number.isFinite(b.radiusKm)||b.radiusKm<=0||b.radiusKm>1e8||!(b.orbitAU===null||(Number.isFinite(b.orbitAU)&&b.orbitAU>0&&b.orbitAU<=10000))||!/^#[0-9a-f]{6}$/i.test(b.color))throw new Error('Invalid celestial body.');ids.add(b.id);
 }
 const lib=value.bodies.find(b=>b.id==='libriam');if(!lib||Math.abs(lib.radiusKm-RADIUS)>1e-6||lib.type!=='planet')throw new Error('Libriam’s radius must match the confirmed surface area.');
 for(const b of value.bodies){if(b.parentId!==null&&!ids.has(b.parentId))throw new Error('Unknown orbital parent.');let id=b.parentId,seen=new Set([b.id]);while(id!==null){if(seen.has(id))throw new Error('Orbital parents cannot form a cycle.');seen.add(id);id=value.bodies.find(p=>p.id===id)?.parentId??null;}}
 if(value.timeline!==undefined&&(!value.timeline||!Number.isInteger(value.timeline.frame)||value.timeline.frame<0||value.timeline.frame>6999))throw new Error('Timeline must use an integer design unit from 0 to 6999.');
 return {schemaVersion:1,timeline:{frame:value.timeline?.frame??2900},name:typeof value.name==='string'?value.name.slice(0,80):'Libriam atlas',placement:{...value.placement},pins:value.pins.map(p=>({id:p.id,name:p.name,lat:p.lat,lon:p.lon})),bodies:value.bodies.map(b=>({id:b.id,name:b.name,type:b.type,radiusKm:b.radiusKm,orbitAU:b.orbitAU,parentId:b.parentId,color:b.color,status:b.id==='libriam'?planet.status:'design proposal'}))};
}
