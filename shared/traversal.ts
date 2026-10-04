import {ACTIVE_MAP,type MapDefinition} from './map.js';
import type {Surface} from './maps/types.js';
export const TRAVERSAL={radius:14,bodyHeight:60,maxStep:3.5,maxSlope:0.4};
export type ElevatedPosition={x:number;y:number;elevation?:number};
export function inside(p:{x:number;y:number},r:{x:number;y:number;width:number;height:number},padding=0){return p.x>=r.x-padding&&p.x<=r.x+r.width+padding&&p.y>=r.y-padding&&p.y<=r.y+r.height+padding;}
export function surfaceHeight(s:Surface,p:{x:number;y:number}){if(!s.ramp)return s.elevation;const distance=s.ramp.axis==='x'?(p.x-s.x)/s.width:(p.y-s.y)/s.height;return s.ramp.from+(s.ramp.to-s.ramp.from)*Math.max(0,Math.min(1,distance));}
export function blockedAt(p:ElevatedPosition,map:MapDefinition=ACTIVE_MAP){
 const z=p.elevation??0,r=TRAVERSAL.radius;
 if(p.x<r||p.y<r||p.x>map.bounds.width-r||p.y>map.bounds.height-r||z<0)return true;
 if(map.blocks.some(b=>inside(p,b,b.kind==='deck'?0:r-.001)&&z<b.top-.001&&z+TRAVERSAL.bodyHeight>b.bottom+.001))return true;
 // Ramps are solid wedges, not teleport zones or hollow invisible stairs.
 return map.surfaces.some(s=>s.ramp&&inside(p,s)&&z<surfaceHeight(s,p)-.01);
}
export function supported(p:ElevatedPosition,map:MapDefinition=ACTIVE_MAP){const z=p.elevation??0;return z===0||map.surfaces.some(s=>inside(p,s)&&Math.abs(surfaceHeight(s,p)-z)<.02);}
export function walkable(p:ElevatedPosition,map:MapDefinition=ACTIVE_MAP){return supported(p,map)&&!blockedAt(p,map);}
export function nextPosition(previous:ElevatedPosition,x:number,y:number,map:MapDefinition=ACTIVE_MAP):ElevatedPosition|null{
 const prior=previous.elevation??0,point={x,y};const heights=[0,...map.surfaces.filter(s=>inside(point,s)).map(s=>surfaceHeight(s,point))];
 // Tiny axis substeps allow slopes and prevent passing through geometry at dash speed.
 for(const elevation of [...new Set(heights)].sort((a,b)=>b-a)){
  if(Math.abs(elevation-prior)>TRAVERSAL.maxStep+1e-6)continue;
  const candidate={x,y,elevation};if(!blockedAt(candidate,map))return candidate;
 }
 return null;
}

// Visual interpolation chooses the correct local support without smoothing through floors.
export function displayElevation(point:{x:number;y:number},hint:number,map:MapDefinition=ACTIVE_MAP):number|null{
 const heights=[0,...map.surfaces.filter(s=>inside(point,s)).map(s=>surfaceHeight(s,point))];
 for(const elevation of heights.sort((a,b)=>Math.abs(a-hint)-Math.abs(b-hint)))if(!blockedAt({...point,elevation},map))return elevation;
 return null;
}
