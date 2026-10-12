import { rad } from './model.js';
import { smooth } from './ages.js';
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,y){const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
// A tangent-plane floe field is continuous at the date line and at each pole.
// The texture depicts sea ice over existing water, not new polar continents.
export function polarIce(latitude,longitude){
 const a=Math.abs(latitude);if(a<68)return 0;if(a>=87)return 1;
 const l=longitude*rad,r=90-a,x=r*Math.cos(l),y=r*Math.sin(l)+(latitude<0?25:0);
 const edge=72+(noise(x*.2,y*.2)-.5)*5+(latitude<0?1:0),pack=smooth(edge,83,a);
 const floes=noise(x*.7,y*.7)*.7+noise(x*1.8+8,y*1.8-3)*.3;
 return Math.max(smooth(83,87,a),pack*(.30+.70*smooth(.30,.67,floes)));
}
