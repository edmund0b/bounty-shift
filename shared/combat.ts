import { ACTIVE_MAP, type MapDefinition } from './map.js';
import { isWalkable, type Position } from './game.js';
import {inside,surfaceHeight} from './traversal.js';
export const COMBAT = { chestHeight:30,maxHealth:100,damage:25,range:80,halfAngle:Math.PI/3,cooldown:0.6,respawnDelay:5,protection:1.5,attackFlash:0.15,hitFlash:0.2 };
export type CombatState = { health:number;koRemaining:number;protection:number;attackCooldown:number;attackSeen:number;attackFlash:number;hitFlash:number;attackX:number;attackY:number;spawnVersion:number };
export function freshCombat():CombatState {return {health:COMBAT.maxHealth,koRemaining:0,protection:0,attackCooldown:0,attackSeen:0,attackFlash:0,hitFlash:0,attackX:0,attackY:1,spawnVersion:0};}
// Chest-height segment against actual solid volumes, including overhead decks.
export function clearAttackLine(a:Position,b:Position,map:MapDefinition=ACTIVE_MAP):boolean {
 const az=(a.elevation??0)+COMBAT.chestHeight,bz=(b.elevation??0)+COMBAT.chestHeight;
 const hit=map.blocks.some(w=>{
  let enter=0,exit=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,w.x,w.x+w.width],[a.y,b.y-a.y,w.y,w.y+w.height],[az,bz-az,w.bottom,w.top]]){
   if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
   const t1=(min-start)/delta,t2=(max-start)/delta;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));if(enter>exit)return false;
  }
  return enter<=exit;
 });if(hit)return false;
 // Short melee segments are sampled conservatively through sloped stair solids.
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,bz-az)/4));
 for(let i=0;i<=steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},z=az+(bz-az)*t;
  if(map.surfaces.some(s=>s.ramp&&inside(p,s)&&z>=0&&z<=surfaceHeight(s,p)))return false;
 }return true;
}
export function canHit(a:Position,b:Position,aimX:number,aimY:number,map:MapDefinition=ACTIVE_MAP):boolean {
 const dx=b.x-a.x,dy=b.y-a.y,horizontal=Math.hypot(dx,dy),distance=Math.hypot(dx,dy,(b.elevation??0)-(a.elevation??0)),length=Math.hypot(aimX,aimY);
 if(distance>COMBAT.range||length<1e-6)return false;
 return (horizontal<1e-6||(dx*aimX+dy*aimY)/(horizontal*length)>=Math.cos(COMBAT.halfAngle))&&clearAttackLine(a,b,map);
}
export function safeSpawn(others:Position[],map:MapDefinition=ACTIVE_MAP):Position {
 let best=map.spawns[0],score=-1;
 for(const point of map.spawns){if(!isWalkable(point,map))continue;const clearance=others.length?Math.min(...others.map(p=>Math.hypot(p.x-point.x,p.y-point.y))):Infinity;if(clearance>score){best=point;score=clearance;}}
 return {...best};
}
