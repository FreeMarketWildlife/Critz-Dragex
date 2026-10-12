import { geoArea } from 'd3-geo';
import { SURFACE_AREA,RADIUS } from './model.js';
import { destination } from './ages.js';
export const LANDMASS_DESIGNS=[
 {id:'landmass-ii',name:'Landmass II',center:{lat:-24,lon:124},fraction:.011,seed:2.7,status:'author-requested position; generated draft coastline'},
 {id:'landmass-iii',name:'Landmass III',center:{lat:46,lon:-96},fraction:.009,seed:5.2,status:'author-requested position; generated draft coastline'}
];
export function makeLandmass(design){
 const target=SURFACE_AREA*design.fraction;
 function ring(radius){const r=[];for(let i=0;i<180;i++){const a=i/180*Math.PI*2,s=design.seed,shape=1+.2*Math.sin(3*a+s)+.12*Math.cos(5*a-s)+.065*Math.sin(9*a+s*2)+.025*Math.sin(17*a);const p=destination(design.center,i*2,radius*shape);r.push([p.lon,p.lat]);}r.push([...r[0]]);return r;}
 let lo=0,hi=150;for(let i=0;i<50;i++){const r=ring((lo+hi)/2),a=geoArea({type:'Polygon',coordinates:[r]});if(Math.min(a,4*Math.PI-a)*RADIUS**2<target)lo=(lo+hi)/2;else hi=(lo+hi)/2;}
 let r=ring((lo+hi)/2);if(geoArea({type:'Polygon',coordinates:[r]})>2*Math.PI)r.reverse();return {type:'Feature',properties:{...design,areaKm2:target},geometry:{type:'Polygon',coordinates:[r]}};
}
export const otherLandmasses=LANDMASS_DESIGNS.map(makeLandmass);
