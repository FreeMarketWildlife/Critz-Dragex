import {LAKE} from './ages.js';
import {ISLAND_CENTER,RIVER_MOUTHS} from './hydrology.js';
import {EDEN_CENTER} from './coast-design.js';
import {namedPlaces,authorAnnotations} from './authored-geography.js';
const normalize=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[’']/g,'').toLowerCase();
export function searchPlaces(query,project,continents){
 const q=normalize(query.trim());if(!q)return [];
 const places=[...namedPlaces,...authorAnnotations.filter(n=>n.id<4).map(n=>({...n,category:'Mountains',zoom:1.65})),{name:'Hokkaido',category:'Continent',...project.placement,zoom:3.4},...continents.map(f=>({name:f.properties.name,category:'Continent',aliases:f.properties.name==='Zealand'?'New Zealand':'',...f.properties.overview??f.properties.center,zoom:5.6})),{name:'Moana’s Tear lake',category:'Lake',...LAKE,aliases:'great lake Moana',zoom:1.65},{name:'Death’s Valley',category:'Region',...LAKE,zoom:1.65},{name:'Kingdom of Moana',category:'Kingdom',...LAKE,aliases:'country kingdom',zoom:2},{name:'Lake island and inner pool',category:'Island',...ISLAND_CENTER,zoom:1.14},{name:'Eden’s Isle',category:'Island',...EDEN_CENTER,zoom:1.14},...RIVER_MOUTHS.map(p=>({...p,category:'River mouth',zoom:2})),{name:'North pole',category:'Pole',lat:89.9,lon:0,zoom:2.5},{name:'South pole',category:'Pole',lat:-89.9,lon:124,zoom:2.5},...project.pins.map(p=>({...p,category:'Saved place',zoom:1.6}))];
 return places.filter(p=>normalize(`${p.name} ${p.category} ${p.aliases??''}`).includes(q));
}
