export const DEFAULT_EXAGGERATION=1,MAX_EXAGGERATION=10;
export function validateTerrain(value){
 if(value===undefined)return {exaggeration:DEFAULT_EXAGGERATION};
 if(!value||!Number.isFinite(value.exaggeration)||value.exaggeration<0||value.exaggeration>MAX_EXAGGERATION)throw Error('Terrain exaggeration must be from 0 to 10.');
 return {exaggeration:value.exaggeration};
}
export function terrainRadius(u,v,land,mountain,state,exaggeration=1,relief=true){
 const phase=state.frame/1700,multiplier=relief?exaggeration:0;
 const wave=Math.sin(u*71+phase)*Math.sin(v*63-phase)*.0015*land*(1-mountain*(1-state.submersion));
 const ridge=mountain*.008*(1-state.submersion);
 return (1+(ridge+wave)*multiplier)*(.94+.06*state.emergence);
}
