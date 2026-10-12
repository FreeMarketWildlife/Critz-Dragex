import {geoArea,geoContains,geoInterpolate,geoDistance} from 'd3-geo';
import {RADIUS,rad,toVector,fromVector} from './model.js';
import notes from './data/geography-notes.json' with {type:'json'};
export const geographyRegions=notes.map(n=>{let ring=n.points.map(([lat,lon])=>[lon,lat]);ring.push([...ring[0]]);if(geoArea({type:'Polygon',coordinates:[ring]})>2*Math.PI)ring.reverse();return {type:'Feature',properties:{id:n.id,note:n.note},geometry:{type:'Polygon',coordinates:[ring]}};});
export function sculptCoast(geometry,region,seed=1){return {type:'MultiPolygon',coordinates:geometry.coordinates.map(poly=>poly.map((ring,index)=>{
 if(index||geoArea({type:'Polygon',coordinates:[ring]})*RADIUS**2<100)return ring;
 const points=[];for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],count=Math.max(1,Math.ceil(geoDistance(a,b)*RADIUS/1.5)),interpolate=geoInterpolate(a,b);for(let j=0;j<count;j++)points.push(interpolate(j/count));}
 const flags=points.map(p=>geoContains(region,p)?1:0),vectors=points.map(p=>toVector(p[1],p[0])),arcs=[0];for(let i=1;i<points.length;i++)arcs[i]=arcs[i-1]+geoDistance(points[i-1],points[i])*RADIUS;const perimeter=arcs.at(-1)+geoDistance(points.at(-1),points[0])*RADIUS;let along=0;
 const modified=points.map((p,i)=>{if(i)along+=geoDistance(points[i-1],p)*RADIUS;let weight=0;for(let k=-10;k<=10;k++)weight+=flags[(i+k+points.length)%points.length];weight/=21;if(!weight)return p;
 let offset=weight*(8.5*Math.sin(along/83*Math.PI*2+seed)+3.3*Math.sin(along/31*Math.PI*2+seed*2)+1.5*Math.sin(along/11*Math.PI*2-.6));
 const v=vectors[i],a=vectors[(i-8+points.length)%points.length],b=vectors[(i+8)%points.length],before=v.map((x,j)=>x-a[j]),after=b.map((x,j)=>x-v[j]),straight=before.reduce((sum,x,j)=>sum+x*after[j],0)/(Math.hypot(...before)*Math.hypot(...after));offset*=Math.max(0,Math.min(1,(straight-.88)/.1));let nearest=Infinity;for(let j=0;j<points.length;j++){const arc=Math.abs(arcs[j]-arcs[i]);if(Math.min(arc,perimeter-arc)<40)continue;nearest=Math.min(nearest,Math.hypot(...v.map((x,k)=>x-vectors[j][k]))*RADIUS);}const cap=nearest*.3;offset=Math.max(-cap,Math.min(cap,offset));const t=b.map((x,j)=>x-a[j]);let n=[v[1]*t[2]-v[2]*t[1],v[2]*t[0]-v[0]*t[2],v[0]*t[1]-v[1]*t[0]],length=Math.hypot(...n);if(length<1e-12)return p;n=n.map(x=>x/length);const angle=offset/RADIUS,q=v.map((x,j)=>x*Math.cos(angle)+n[j]*Math.sin(angle)),c=fromVector(...q);return [c.lon,c.lat];
 });modified.push([...modified[0]]);return modified;
 }))};}
export function normalizeLandmass(geometry,center,target){
 const p0=center.lat*rad,l0=center.lon*rad;
 const plane=geometry.coordinates.map(poly=>poly.map(r=>r.map(([lo,la])=>{const p=la*rad,l=lo*rad-l0,k=Math.sqrt(2/(1+Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l)));return [RADIUS*k*Math.cos(p)*Math.sin(l),RADIUS*k*(Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l))];})));
 function mapped(s){return {type:'MultiPolygon',coordinates:plane.map(poly=>poly.map(r=>r.map(([xx,yy])=>{const x=xx*s,y=yy*s,rho=Math.hypot(x,y),c=2*Math.asin(Math.min(1,rho/(2*RADIUS)));if(rho<1e-10)return [center.lon,center.lat];const lat=Math.asin(Math.cos(c)*Math.sin(p0)+y*Math.sin(c)*Math.cos(p0)/rho),lon=l0+Math.atan2(x*Math.sin(c),rho*Math.cos(p0)*Math.cos(c)-y*Math.sin(p0)*Math.sin(c));return [((lon/rad+540)%360)-180,lat/rad];}))) };}
 let low=.1,high=1.05;for(let i=0;i<48;i++){const mid=(low+high)/2;if(geoArea(mapped(mid))*RADIUS**2<target)low=mid;else high=mid;}return mapped((low+high)/2);
}
export const EDEN_CENTER={lat:.522562,lon:-46.091918};
const edenRing=Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2,shape=1+.095*Math.sin(a*3+.6)+.045*Math.cos(a*7),x=Math.cos(a)*5.2*shape,y=Math.sin(a)*6.2*shape;return [EDEN_CENTER.lon+x/(rad*RADIUS),EDEN_CENTER.lat+y/(rad*RADIUS)];});edenRing.push([...edenRing[0]]);if(geoArea({type:'Polygon',coordinates:[edenRing]})>2*Math.PI)edenRing.reverse();
export const edenIsle={type:'Feature',properties:{id:'eden-isle',name:'Eden’s Isle',center:EDEN_CENTER,areaKm2:geoArea({type:'Polygon',coordinates:[edenRing]})*RADIUS**2,status:'author-specified tropical island region; proposed shoreline'},geometry:{type:'Polygon',coordinates:[edenRing]}};
export function paintBiomes(ctx,draw,W,H){
 ctx.filter='blur(14px)';
 for(const [index,color,alpha] of [[3,'#24844b',.55],[4,'#768b8b',.38],[5,'#bea24f',.65]]){ctx.beginPath();draw(geographyRegions[index]);ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.fill();}
 ctx.filter='none';ctx.save();ctx.beginPath();draw(geographyRegions[4]);ctx.clip();const snow=ctx.createLinearGradient(0,(90-62)/180*H,0,(90-45)/180*H);snow.addColorStop(0,'rgba(239,245,241,.92)');snow.addColorStop(.4,'rgba(226,238,234,.85)');snow.addColorStop(1,'rgba(210,226,219,0)');ctx.globalAlpha=1;ctx.fillStyle=snow;ctx.fillRect(0,0,W,H);ctx.restore();ctx.globalAlpha=1;
}
