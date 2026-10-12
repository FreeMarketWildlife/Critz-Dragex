import {geoArea,geoBounds,geoCentroid} from 'd3-geo';
const SPHERE_RADIUS=Math.sqrt(1668444.4/(4*Math.PI));
export const MAX_ANNOTATIONS=100,MAX_VERTICES=256;
export const emptyAnnotations=()=>({active:[],history:[]});
const coordinate=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;
export function validateAnnotations(value){
 if(value===undefined)return emptyAnnotations();
 const validEntry=a=>a&&typeof a.id==='string'&&a.id.length>0&&a.id.length<=80&&['box','freehand'].includes(a.type)&&typeof a.note==='string'&&a.note.length<=4000&&Number.isInteger(a.frame)&&a.frame>=0&&a.frame<=6999&&Array.isArray(a.points)&&a.points.length>=3&&a.points.length<=MAX_VERTICES&&a.points.every(coordinate);
 const validList=a=>Array.isArray(a)&&a.length<=MAX_ANNOTATIONS&&a.every(validEntry)&&new Set(a.map(x=>x.id)).size===a.length;
 if(!value||!validList(value.active)||!Array.isArray(value.history)||value.history.length>10||value.history.some(g=>!g||typeof g.id!=='string'||g.id.length>80||typeof g.cutAt!=='string'||!Number.isFinite(Date.parse(g.cutAt))||!validList(g.annotations)||g.annotations.length===0))throw Error('Invalid globe annotations or cut history.');
 const copy=a=>({id:a.id,type:a.type,note:a.note,frame:a.frame,points:a.points.map(p=>({lat:p.lat,lon:p.lon}))});
 return {active:value.active.map(copy),history:value.history.map(g=>({id:g.id,cutAt:g.cutAt,annotations:g.annotations.map(copy)}))};
}
export function annotationGeometry(annotation){
 let ring=annotation.points.map(p=>[p.lon,p.lat]);ring.push([...ring[0]]);let polygon={type:'Polygon',coordinates:[ring]};
 if(geoArea(polygon)>2*Math.PI){ring=ring.reverse();polygon={type:'Polygon',coordinates:[ring]};}
 const [lon,lat]=geoCentroid(polygon),bounds=geoBounds(polygon);
 return {polygon,center:{lat,lon},bounds,areaKm2:geoArea(polygon)*SPHERE_RADIUS**2};
}
export function annotationText(annotations){
 const n=x=>Number(x.toFixed(6)),p=x=>`latitude ${n(x.lat)}, longitude ${n(x.lon)}`;
 return ['LIBRIAM GLOBE — LIBRIAM ANNOTATIONS','Coordinates: decimal degrees; north/east positive, south/west negative. Outlines are closed geographic areas on spherical Libriam. Notes are design requests, not established canon.',...annotations.map((a,i)=>{
  const g=annotationGeometry(a),[[west,south],[east,north]]=g.bounds;
  return `\nAnnotation ${i+1} — ${a.type==='box'?'Box':'Freehand outline'}\nAge ${Math.floor(a.frame/1000)+1}, design unit ${a.frame} (age viewing unit ${a.frame%1000+1}/1000)\nNote: ${a.note||'(No note)'}\nCenter: ${p(g.center)}\nApproximate spherical area: ${g.areaKm2.toFixed(3)} km²\nBounds: south ${n(south)}, north ${n(north)}, west ${n(west)}, east ${n(east)}${west>east?' (crosses ±180° longitude)':''}\nExact outline vertices [latitude, longitude], in drawing order; join last to first:\n${JSON.stringify(a.points.map(x=>[n(x.lat),n(x.lon)]))}`;
 })].join('\n');
}
// A clipboard operation uses a snapshot. Preserve anything edited or added while it was pending.
export function cutAnnotationGroup(state,snapshot,{id,cutAt}){
 if(!snapshot.length)return state;
 const frozen=validateAnnotations({active:snapshot,history:[]}).active;
 const removed=new Map(snapshot.map(a=>[a.id,JSON.stringify(a)]));
 return {active:state.active.filter(a=>removed.get(a.id)!==JSON.stringify(a)),history:[{id,cutAt,annotations:frozen},...state.history].slice(0,10)};
}
export function screenBox(start,end,projectPoint){
 const x1=Math.min(start.x,end.x),x2=Math.max(start.x,end.x),y1=Math.min(start.y,end.y),y2=Math.max(start.y,end.y);
 if(x2-x1<6||y2-y1<6)return [];
 const corners=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}],points=[];
 for(let side=0;side<4;side++){const a=corners[side],b=corners[(side+1)%4],count=Math.min(64,Math.max(4,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8)));
  for(let j=0;j<count;j++){const t=j/count,p=projectPoint({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});if(!p)return null;points.push(p);}
 }
 return points;
}
