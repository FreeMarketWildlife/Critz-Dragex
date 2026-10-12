import { geoInterpolate,geoContains } from 'd3-geo';
import { RADIUS,rad,distance } from './model.js';
import { LAKE,localKm,smooth } from './ages.js';
export const RIVER_MOUTHS=[
 {id:'river-east',name:'Eastern great river',lat:11.37192,lon:31.43740},
 {id:'river-west',name:'Western great river',lat:14.78480,lon:-18.33008},
 {id:'river-northwest',name:'Northwestern great river',lat:36.54197,lon:-13.66136}
];
export const ISLAND_EDGES=[{lat:19.95031,lon:9.15032},{lat:19.25278,lon:11.37802}];
export const ISLAND_CENTER={lat:(ISLAND_EDGES[0].lat+ISLAND_EDGES[1].lat)/2,lon:(ISLAND_EDGES[0].lon+ISLAND_EDGES[1].lon)/2};
export const POOL_CENTER={...ISLAND_CENTER};
export const POOL_DIAMETER_KM=1;
export const ISLAND_HALF_WIDTH_KM=1.6; // Proposed narrow width; the two opposite edges are author inputs.
const ends=ISLAND_EDGES.map(p=>localKm(p,ISLAND_CENTER)),dx=ends[1].x-ends[0].x,dy=ends[1].y-ends[0].y,length=Math.hypot(dx,dy);
export const ISLAND_HALF_LENGTH_KM=length/2;
export const ISLAND_AXIS={x:dx/length,y:dy/length};
export function islandField(p){const q=localKm(p,ISLAND_CENTER),u=(q.x*ISLAND_AXIS.x+q.y*ISLAND_AXIS.y)/ISLAND_HALF_LENGTH_KM,v=(-q.x*ISLAND_AXIS.y+q.y*ISLAND_AXIS.x)/ISLAND_HALF_WIDTH_KM,a=Math.atan2(v,u),shape=1+.075*Math.sin(a*3+.2)*Math.sin(a)**2;return Math.hypot(u,v)/shape;}
export function poolDistance(p){return distance(POOL_CENTER,p);}
const offsets=[ [0,.5,-.85,.4,.95,-.6,.3,0], [0,-.75,.3,.9,-.5,.65,-.2,0], [0,.9,.2,-.65,.35,-.8,.4,0] ];
const stops=[0,.12,.27,.43,.61,.76,.9,1];
function bend(t,index){let i=0;while(i<stops.length-2&&t>stops[i+1])i++;const u=smooth(stops[i],stops[i+1],t),a=offsets[index%3];return a[i]*(1-u)+a[i+1]*u;}
export function makeRiverRoute(mouth,index=0,land=null){
 const interpolate=geoInterpolate([LAKE.lon,LAKE.lat],[mouth.lon,mouth.lat]),end=localKm(mouth),length=Math.hypot(end.x,end.y),nx=-end.y/length,ny=end.x/length,points=[];
 for(let i=0;i<=320;i++){const t=i/320,[lon,lat]=interpolate(t),displacement=(bend(t,index)*length*.045+Math.sin(t*Math.PI*13+index*.8)*length*.004)*Math.sin(Math.PI*t);let selected={lat,lon};
  for(const scale of [1,.65,.3,0]){const x=displacement*nx*scale,y=displacement*ny*scale,p={lat:lat+y/(rad*RADIUS),lon:lon+x/(rad*RADIUS*Math.cos(LAKE.lat*rad))};if(!land||geoContains(land,[p.lon,p.lat])||t>.98){selected=p;break;}}
  points.push(selected);
 }
 points[0]={...LAKE};points[points.length-1]={lat:mouth.lat,lon:mouth.lon};return points;
}
export const ISLAND_LENGTH_KM=distance(...ISLAND_EDGES);
