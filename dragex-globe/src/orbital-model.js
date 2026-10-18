// Numerical design proposal, 2026-10-13. SI masses; kilometres; Julian years.
export const AU=149597870.7,G=6.67430e-20,YEAR_SECONDS=31557600,TAU=2*Math.PI;
export const LIBRIAM_RADIUS=Math.sqrt(1668444.4/(4*Math.PI));
export const sphereMass=(radius,density)=>4*Math.PI/3*(radius*1000)**3*density;
export const periodYears=(a,mass)=>TAU*Math.sqrt(a**3/(G*mass))/YEAR_SECONDS;
export const orbitalSpeed=(a,mass,r=a)=>Math.sqrt(G*mass*(2/r-1/a));
export const hillRadius=(a,mass,parent,e=0)=>a*(1-e)*Math.cbrt(mass/(3*parent));
export const rocheRadius=(radius,parentDensity,satelliteDensity)=>2.44*radius*Math.cbrt(parentDensity/satelliteDensity);
const saturnMass=5.683e26;
// Tune the ordinary lunar period to complete 10,935 revolutions per designed
// millennium. This places each scheduled debris episode at the ascending node.
const libriamPeriod=1000/10935;
const libriamA=Math.cbrt(G*(saturnMass+sphereMass(LIBRIAM_RADIUS,5500))*(libriamPeriod*YEAR_SECONDS/TAU)**2);
export const SYSTEM_BODIES=[
 {id:'sun',name:'Sun',type:'star',parentId:null,radiusKm:574698,massKg:1.4913525e30,color:'#ffba72',aKm:0,e:0,inclination:0,node:0,phase:0,luminositySolar:.30,temperatureK:4700},
 {id:'kronos',name:'Kronos',type:'planet',parentId:'sun',radiusKm:60268,massKg:saturnMass,color:'#e6b875',aKm:.72*AU,e:.02,inclination:0,node:0,phase:.5,rings:[74000,140000],tilt:.14},
 {id:'zuhal',name:'Zuhal',type:'planet',parentId:'sun',radiusKm:55000,massKg:.8*saturnMass,color:'#799ce6',aKm:2.4*AU,e:.035,inclination:.045,node:1.4,phase:3.4,rings:[68000,128000],tilt:.42},
 {id:'libriam',name:'Libriam',type:'moon',parentId:'kronos',radiusKm:LIBRIAM_RADIUS,massKg:sphereMass(LIBRIAM_RADIUS,5500),color:'#64c7bd',aKm:libriamA,e:.025,inclination:.14,node:.4,phase:0},
 {id:'moon',name:'Moon',type:'moon',parentId:'libriam',radiusKm:60,massKg:sphereMass(60,3300),color:'#b9b9ba',aKm:5000,e:.02,inclination:.025,node:.2,phase:1.4},
 {id:'zuhal-moon',name:'Zuhal’s moon',type:'moon',parentId:'zuhal',radiusKm:1800,massKg:sphereMass(1800,3300),color:'#beb4cf',aKm:2000000,e:.02,inclination:.055,node:2.1,phase:1.9},
 {id:'zuhal-submoon',name:'Zuhal’s submoon',type:'moon',parentId:'zuhal-moon',radiusKm:100,massKg:sphereMass(100,3000),color:'#b6c3cd',aKm:18000,e:.015,inclination:.04,node:.5,phase:.8}
];
export const BODY_BY_ID=Object.fromEntries(SYSTEM_BODIES.map(b=>[b.id,b]));
export function keplerPosition(body,year){
 if(!body.parentId)return [0,0,0];
 const parent=BODY_BY_ID[body.parentId],period=periodYears(body.aKm,parent.massKg+body.massKg);
 const mean=((year/period*TAU+body.phase)%TAU+TAU)%TAU;
 let E=mean;for(let i=0;i<12;i++)E-=(E-body.e*Math.sin(E)-mean)/(1-body.e*Math.cos(E));
 const x=body.aKm*(Math.cos(E)-body.e),z=body.aKm*Math.sqrt(1-body.e**2)*Math.sin(E);
 const y=z*Math.sin(body.inclination),flatZ=z*Math.cos(body.inclination),c=Math.cos(body.node),s=Math.sin(body.node);
 return [x*c-flatZ*s,y,x*s+flatZ*c];
}
export function systemPositions(year){
 const positions={};function resolve(b){if(positions[b.id])return positions[b.id];const local=keplerPosition(b,year),parent=b.parentId?resolve(BODY_BY_ID[b.parentId]):[0,0,0];return positions[b.id]=local.map((v,i)=>v+parent[i]);}
 SYSTEM_BODIES.forEach(resolve);return positions;
}
export function encounterState(year){
 const cycle=Math.max(1,Math.round(year/1000)),eventYear=cycle*1000,offset=year-eventYear;
 const temporal=Math.max(0,1-Math.abs(offset)/.03);
 const local=keplerPosition(BODY_BY_ID.libriam,year);
 const spatial=Math.max(0,1-Math.abs(local[1])/12000);
 return {eventYear,nextYear:temporal>0?eventYear:(Math.floor(year/1000)+1)*1000,temporal,intensity:temporal*spatial,active:temporal*spatial>.01};
}
export function bodyFacts(b){
 if(!b.parentId)return {periodDays:null,speedKmS:0};const parent=BODY_BY_ID[b.parentId];
 return {periodDays:periodYears(b.aKm,parent.massKg+b.massKg)*365.25,speedKmS:orbitalSpeed(b.aKm,parent.massKg+b.massKg),hillKm:hillRadius(b.aKm,b.massKg,parent.massKg,b.e),aKm:b.aKm};
}
export function canonicalProjectBodies(){return [BODY_BY_ID.libriam,...SYSTEM_BODIES.filter(b=>b.id!=='libriam')].map(b=>({id:b.id,name:b.name,type:b.type,radiusKm:b.radiusKm,orbitAU:b.parentId?b.aKm/AU:null,parentId:b.parentId,color:b.color,status:b.id==='libriam'?'author-confirmed dimensions; spherical model':'design proposal'}));}
export const COMETS=[{aKm:7*AU,e:.91,inclination:.43,node:1.2,phase:.4},{aKm:11*AU,e:.945,inclination:-.36,node:2.4,phase:2.2}];
export function cometPosition(c,year){return keplerPosition({...c,parentId:'sun',massKg:0},year);}
