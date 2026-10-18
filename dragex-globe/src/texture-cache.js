// Keep exact source bitmaps for fast presentation switches, with only the
// selected variant uploaded. Geography changes invalidate every bitmap.
export function makeTextureCache(factory){
 const textures=new Map();let active=null;
 function get(key){if(!textures.has(key))textures.set(key,factory(key));return textures.get(key);}
 return {get,select(key){const next=get(key);if(next!==active){active?.dispose();next.needsUpdate=true;active=next;}return next;},
  invalidate(){for(const texture of textures.values())texture.dispose();textures.clear();active=null;},
  get count(){return textures.size;}};
}
