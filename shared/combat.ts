import { BUILDINGS, SPAWNS } from './map.js';
import { isWalkable, type Position } from './game.js';
export const COMBAT = { maxHealth:100,damage:25,range:80,halfAngle:Math.PI/3,cooldown:0.6,respawnDelay:5,protection:1.5,attackFlash:0.15,hitFlash:0.2 };
export type CombatState = { health:number;koRemaining:number;protection:number;attackCooldown:number;attackSeen:number;attackFlash:number;hitFlash:number;attackX:number;attackY:number;spawnVersion:number };
export function freshCombat():CombatState {return {health:COMBAT.maxHealth,koRemaining:0,protection:0,attackCooldown:0,attackSeen:0,attackFlash:0,hitFlash:0,attackX:0,attackY:1,spawnVersion:0};}
// Segment versus each solid building. Boundaries count as blocked to avoid corner hits.
export function clearAttackLine(a:Position,b:Position):boolean {
 return !BUILDINGS.some(w=>{
  let enter=0,exit=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,w.x,w.x+w.width],[a.y,b.y-a.y,w.y,w.y+w.height]]){
   if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
   const t1=(min-start)/delta,t2=(max-start)/delta;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));if(enter>exit)return false;
  }
  return enter<=exit;
 });
}
export function canHit(a:Position,b:Position,aimX:number,aimY:number):boolean {
 const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),length=Math.hypot(aimX,aimY);
 if(distance>COMBAT.range||length<1e-6)return false;
 return (distance<1e-6||(dx*aimX+dy*aimY)/(distance*length)>=Math.cos(COMBAT.halfAngle))&&clearAttackLine(a,b);
}
export function safeSpawn(others:Position[]):Position {
 let best=SPAWNS[0],score=-1;
 for(const point of SPAWNS){if(!isWalkable(point))continue;const clearance=others.length?Math.min(...others.map(p=>Math.hypot(p.x-point.x,p.y-point.y))):Infinity;if(clearance>score){best=point;score=clearance;}}
 return {...best};
}
