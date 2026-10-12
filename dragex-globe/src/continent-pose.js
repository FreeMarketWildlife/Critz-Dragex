import {geoCentroid,geoDistance,geoInterpolate,geoArea} from 'd3-geo';
import {normalizeLandmass} from './coast-design.js';
import {RADIUS,toVector,fromVector} from './model.js';
export const ALASKA_ISLAND_ARC=[[67.461353,-31.4438],[68.360195,-32.789879],[68.978301,-34.728459],[69.586958,-37.381621],[69.967112,-39.955943],[70.389731,-43.484797],[70.794701,-46.931657],[71.124606,-50.018294],[71.399166,-52.933399],[71.730035,-56.242269],[72.041618,-59.071803],[72.309368,-61.99753],[72.520622,-65.475533],[72.682837,-68.83993],[72.887805,-71.911542],[73.106985,-74.938317],[73.374335,-78.900115],[73.38723,-82.62791],[73.314711,-86.660608],[73.128597,-90.146061],[72.669741,-93.744536],[72.157704,-97.139625],[71.728349,-100.495639],[71.354281,-103.754351],[71.040353,-105.735852]];
const vector=p=>toVector(p[1],p[0]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),unit=a=>a.map(x=>x/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function basis(a,b){const x=vector(a),v=vector(b),y=unit(v.map((z,i)=>z-dot(v,x)*x[i]));return [x,y,cross(x,y)];}
export function frameRotation(sourceA,sourceB,targetA,targetB){const source=basis(sourceA,sourceB),target=basis(targetA,targetB);return p=>{const v=vector(p),coeff=source.map(b=>dot(v,b)),q=target[0].map((_,i)=>target.reduce((sum,b,j)=>sum+b[i]*coeff[j],0)),c=fromVector(...q);return [c.lon,c.lat];};}
export function pointRotation(from,to){const a=vector(from),b=vector(to),angle=Math.acos(Math.max(-1,Math.min(1,dot(a,b)))),axis=cross(a,b),length=Math.hypot(...axis);if(length<1e-12)return p=>[...p];const n=unit(axis);return p=>{const v=vector(p),nv=cross(n,v),d=dot(n,v),q=v.map((x,i)=>x*Math.cos(angle)+nv[i]*Math.sin(angle)+n[i]*d*(1-Math.cos(angle))),c=fromVector(...q);return [c.lon,c.lat];};}
export const rotateGeometry=(g,rotate)=>({type:'MultiPolygon',coordinates:g.coordinates.map(poly=>poly.map(ring=>ring.map(rotate)))});
const arc=ALASKA_ISLAND_ARC.toReversed().map(([lat,lon])=>[lon,lat]),arcDistances=[0];for(let i=1;i<arc.length;i++)arcDistances[i]=arcDistances[i-1]+geoDistance(arc[i-1],arc[i]);
export function islandArcPoint(t){const d=Math.max(0,Math.min(1,t))*arcDistances.at(-1);let i=1;while(i<arc.length-1&&arcDistances[i]<d)i++;return geoInterpolate(arc[i-1],arc[i])((d-arcDistances[i-1])/(arcDistances[i]-arcDistances[i-1]));}
export const ALASKA_CHAIN_INDICES=[43,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61];
const centroid=poly=>geoCentroid({type:'Polygon',coordinates:poly});
export function poseAlaska(geometry){
 const root=centroid(geometry.coordinates[43]),tip=centroid(geometry.coordinates[59]),rotate=frameRotation(root,tip,[-115,67],arc.at(-1)),posed=rotateGeometry(geometry,rotate),span=geoDistance(root,tip);
 const originalArea=geoArea(posed)*RADIUS**2,sourceNormal=unit(cross(vector(root),vector(tip)));
 for(const i of ALASKA_CHAIN_INDICES){const sourceCenter=centroid(geometry.coordinates[i]),t=Math.min(1,geoDistance(root,sourceCenter)/span),arcCenter=islandArcPoint(t),previous=islandArcPoint(Math.max(0,t-.02)),next=islandArcPoint(Math.min(1,t+.02)),normal=unit(cross(vector(previous),vector(next))),offset=Math.asin(Math.max(-1,Math.min(1,dot(vector(sourceCenter),sourceNormal))))*.65,v=vector(arcCenter),targetVector=v.map((x,j)=>x*Math.cos(offset)+normal[j]*Math.sin(offset)),targetCoord=fromVector(...targetVector),target=[targetCoord.lon,targetCoord.lat],current=centroid(posed.coordinates[i]),island={type:'MultiPolygon',coordinates:[posed.coordinates[i]]},smaller=normalizeLandmass(island,{lat:current[1],lon:current[0]},geoArea(island)*RADIUS**2*.4225),relocate=pointRotation(current,target);posed.coordinates[i]=smaller.coordinates[0].map(r=>r.map(relocate));}
 // Keep the author's total continental area exact after fitting smaller, separated chain islands.
 const missing=originalArea-geoArea(posed)*RADIUS**2,mainland={type:'MultiPolygon',coordinates:[posed.coordinates[0]]},mainCenter=centroid(posed.coordinates[0]);posed.coordinates[0]=normalizeLandmass(mainland,{lat:mainCenter[1],lon:mainCenter[0]},geoArea(mainland)*RADIUS**2+missing).coordinates[0];
 return posed;
}
