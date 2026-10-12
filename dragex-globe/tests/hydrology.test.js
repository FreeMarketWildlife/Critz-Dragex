import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geoContains} from 'd3-geo';
import {makeHokkaido,distance} from '../src/model.js';
import {LAKE,lakeField,destination} from '../src/ages.js';
import {RIVER_MOUTHS,makeRiverRoute,ISLAND_EDGES,ISLAND_CENTER,ISLAND_LENGTH_KM,islandField,POOL_CENTER,POOL_DIAMETER_KM} from '../src/hydrology.js';
const land=makeHokkaido(JSON.parse(readFileSync(new URL('../public/data/hokkaido.geojson',import.meta.url))));
test('three meandering great rivers keep the exact author-provided lake and mouth anchors',()=>{
 assert.deepEqual(RIVER_MOUTHS.map(({lat,lon})=>[lat,lon]),[[11.37192,31.4374],[14.7848,-18.33008],[36.54197,-13.66136]]);
 RIVER_MOUTHS.forEach((mouth,i)=>{const route=makeRiverRoute(mouth,i,land);assert.deepEqual(route[0],LAKE);assert.deepEqual(route.at(-1),{lat:mouth.lat,lon:mouth.lon});
  const length=route.reduce((sum,p,j)=>sum+(j?distance(p,route[j-1]):0),0),direct=distance(LAKE,mouth);assert.ok(length>direct*1.02&&length<direct*1.1);
  route.slice(0,315).forEach(p=>assert.ok(geoContains(land,[p.lon,p.lat])));
  for(let j=1;j<route.length;j++)assert.ok(distance(route[j-1],route[j])<direct/200,'route stays continuous near coast');
  assert.deepEqual(makeRiverRoute(mouth,i,land),route);
 });
});
test('island matches both supplied opposite edges and fits inside the great lake',()=>{
 ISLAND_EDGES.forEach(p=>{assert.ok(Math.abs(islandField(p)-1)<1e-12);assert.ok(lakeField(p)<1);});
 assert.ok(ISLAND_LENGTH_KM>14&&ISLAND_LENGTH_KM<14.2);assert.equal(islandField(ISLAND_CENTER),0);
});
test('the 1 km inner pool is fully enclosed by the small island',()=>{
 assert.equal(POOL_DIAMETER_KM,1);
 for(let bearing=0;bearing<360;bearing+=5){const edge=destination(POOL_CENTER,bearing,POOL_DIAMETER_KM/2);assert.ok(islandField(edge)<.4);assert.ok(lakeField(edge)<1);assert.ok(Math.abs(distance(edge,POOL_CENTER)-.5)<1e-8);}
});
