import {sculptCoast,normalizeLandmass,geographyRegions} from './coast-design.js';
import { geoArea } from 'd3-geo';
import { SURFACE_AREA,RADIUS,EARTH_RADIUS,rad } from './model.js';
import alaskaReference from './data/alaska.json' with {type:'json'};
import newZealandReference from './data/new-zealand.json' with {type:'json'};
export const LANDMASS_DESIGNS=[
 {id:'landmass-ii',name:'New Zealand',center:{lat:-25,lon:124},overview:{lat:-17,lon:124},fraction:.065,rotationDeg:15,referenceCenter:{lat:-41,lon:173},reference:'new-zealand',status:'author-requested New Zealand reference; rotated and rescaled design'},
 {id:'landmass-iii',name:'Alaska',center:{lat:43,lon:-140},overview:{lat:12,lon:-110},fraction:.055,rotationDeg:65,referenceCenter:{lat:64,lon:-152},reference:'alaska',status:'author-confirmed name; rotated/rescaled Alaska coastline; proposed exact placement'}
];
export const geometryPolygons=feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
export function makeLandmass(design){
 const source=design.reference==='alaska'?alaskaReference:newZealandReference;
 const p0=design.referenceCenter.lat*rad,l0=design.referenceCenter.lon*rad,angle=design.rotationDeg*rad;
 const plane=geometryPolygons(source).map(p=>p.map(r=>r.map(([lon,lat])=>{
  const p=lat*rad,l=lon*rad-l0,k=Math.sqrt(2/(1+Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l)));
  const x=EARTH_RADIUS*k*Math.cos(p)*Math.sin(l),y=EARTH_RADIUS*k*(Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l));
  return [x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];
 })));
 const rhoMax=Math.max(...plane.flat(2).map(([x,y])=>Math.hypot(x,y)));
 function mapped(scale){
  const p0=design.center.lat*rad,l0=design.center.lon*rad;
  return plane.map(poly=>{
   let rings=poly.map(r=>r.map(([xx,yy])=>{const x=xx*scale,y=yy*scale,rho=Math.hypot(x,y),c=2*Math.asin(Math.min(1,rho/(2*RADIUS)));if(rho<1e-9)return [design.center.lon,design.center.lat];const lat=Math.asin(Math.cos(c)*Math.sin(p0)+y*Math.sin(c)*Math.cos(p0)/rho),lon=l0+Math.atan2(x*Math.sin(c),rho*Math.cos(p0)*Math.cos(c)-y*Math.sin(p0)*Math.sin(c));return [((lon/rad+540)%360)-180,lat/rad];}));
   if(geoArea({type:'Polygon',coordinates:rings})>2*Math.PI)rings=rings.map(r=>r.toReversed());
   return rings;
  });
 }
 const target=SURFACE_AREA*design.fraction;let lo=0,hi=1.999*RADIUS/rhoMax;
 if(geoArea({type:'MultiPolygon',coordinates:mapped(hi)})*RADIUS**2<target)throw Error('Reference silhouette cannot reach the requested area without exceeding its spherical projection.');
 for(let i=0;i<55;i++){const m=(lo+hi)/2,area=geoArea({type:'MultiPolygon',coordinates:mapped(m)})*RADIUS**2;if(area<target)lo=m;else hi=m;}
 return {type:'Feature',properties:{...design,areaKm2:target,source:source.properties.source,sourceUrl:source.properties.url},geometry:normalizeLandmass(sculptCoast({type:'MultiPolygon',coordinates:mapped((lo+hi)/2)},geographyRegions[design.reference==='alaska'?1:0],design.reference==='alaska'?2:1),design.center,target)};
}
export const otherLandmasses=LANDMASS_DESIGNS.map(makeLandmass);
