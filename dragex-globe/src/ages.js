import { distance, RADIUS, rad } from './model.js';
import {mountainRelief} from './authored-geography.js';
export const UNITS_PER_AGE=1000;
export const FRAME_COUNT=7000;
export const LAKE={lat:19.75,lon:9.98};
export const DROUGHT_EDGE={lat:17.69,lon:1.33};
export const MOUNTAIN_START={lat:9.97,lon:-8.18};
export const MOUNTAIN_END={lat:2.10,lon:-.79};
export const LAKE_RADIUS_KM=24; // Draft footprint; author specified a large lake, not its exact size.
export const AGES=[
 {name:'Creation',short:'Creation',moment:650,title:'The living waters',description:'Hokkaido emerges from magma, water and cloud. A great freshwater lake sustains three outward rivers.',status:'Formation described by Phil; timing, lake outline and river routes are illustrative.'},
 {name:'Fall',short:'Fall',moment:1450,title:'Before the Tear is stolen',description:'The great lake and its rivers still nourish Hokkaido. At the age’s end, Koric’s unnamed first-generation ancestor steals Moana’s Tear.',status:'Latest author account adds theft near the end of Age 2; the Fey battle still marks its boundary.'},
 {name:'Redemptive Opportunity',short:'Redemption',moment:2900,title:'Death’s Valley spreads',description:'The lake has dried. An irregular drought spreads eastward faster, while the western forests resist. Returning the Tear ends this age.',status:'Lake and mountain coordinates are author-specified. Drought contours are a visual model.'},
 {name:'Arcane',short:'Arcane',moment:3550,title:'Life returns to the valley',description:'The Tear restores rain and life. Veratus’s Kingdom of Moana begins the age; arcane wars devastate Hokkaido at its end.',status:'Restoration is confirmed; the recovery pace and visual colors are design drafts.'},
 {name:'Fallout',short:'Fallout',moment:4570,title:'The poisoned world',description:'A scarred, poisoned Hokkaido: decay, ruined life and mutation. Allohim’s judgement and cleansing end this age.',status:'Poisoned appearance requested by Phil; scar patterns are illustrative, not named battle sites.'},
 {name:'Man',short:'Man',moment:5550,title:'A cleansed world',description:'Hokkaido rises cleansed. Humanity begins on Eden’s Isle and, helped by Allohim, fills and subdues all three continents.',status:'Cleansing is confirmed. Eden’s Isle has not been mapped; no human cities are invented.'},
 {name:'Peace / Perfection',short:'Peace',moment:6500,title:'Everlasting abundance',description:'The last enemy is defeated. Libriam becomes beautiful, lush and perfected; sin and death never return.',status:'The final age is eternal. These 1,000 units are a viewing window, not an end to Age 7.'}
];
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function smooth(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
export function timelineState(value){
 const frame=clamp(Number.isFinite(value)?value:0,0,6999),age=Math.min(6,Math.floor(frame/1000)),unit=Math.floor(frame-age*1000)+1;
 const emergence=smooth(0,180,frame),lava=(1-smooth(100,780,frame))*emergence;
 const theft=smooth(1960,2000,frame),restoration=smooth(3000,3150,frame),wars=smooth(3910,4080,frame),cleansing=smooth(4910,5150,frame),peace=smooth(5900,6180,frame);
 return {frame,age,unit,progress:(frame-age*1000)/999,emergence,lava,theft,restoration,fallout:wars*(1-cleansing),cleansing,peace,lake:1-theft*(1-restoration),drought:smooth(2000,2999,frame)*(1-restoration),submersion:smooth(4950,5000,frame)*(1-smooth(5000,5060,frame)),clouds:.16+.5*lava+.1*restoration};
}
export function localKm(p,center=LAKE){return {x:(p.lon-center.lon)*rad*RADIUS*Math.cos(center.lat*rad),y:(p.lat-center.lat)*rad*RADIUS};}
export function lakeField(p){const {x,y}=localKm(p),angle=Math.atan2(y,x),shape=1+.13*Math.sin(3*angle+.8)+.07*Math.cos(5*angle-.4);return Math.hypot(x/1.15,y/.88)/(LAKE_RADIUS_KM*shape);}
export function mountainField(p){return mountainRelief(p);}
function rawDroughtCost(p){
 const {x,y}=localKm(p),angle=Math.atan2(y,x),east=clamp(x/70),south=clamp(-y/70),west=clamp(-x/60);
 const speed=(1+east*.75+south*.9)/(1+west*.2);
 const uneven=1+.1*Math.sin(angle*3+.35)+.07*Math.cos(angle*5-.8);
 // Wet western side and the mountain corridor resist the front. This is an
 // artistic arrival-cost field, not a numerical atmospheric simulation.
 const ridge=mountainField(p),rainResistance=1+ridge*1.7+west*.12;
 return distance(LAKE,p)*rainResistance/(speed*uneven);
}
const referenceCost=rawDroughtCost(DROUGHT_EDGE);
export function droughtCost(p){return rawDroughtCost(p)/referenceCost;}
export function droughtAt(p,frame){const s=timelineState(frame);return s.drought*(1-smooth(.97,1.03,droughtCost(p)/(0.38+.62*s.drought)));}
export function destination(p,bearing,km){const d=km/RADIUS,t=bearing*rad,lat=p.lat*rad,lon=p.lon*rad,q=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(t));return {lat:q/rad,lon:((lon+Math.atan2(Math.sin(t)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(q)))/rad+540)%360-180};}
