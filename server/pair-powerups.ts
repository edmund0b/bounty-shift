import {randomUUID} from 'node:crypto';
import {PAIR,isPair,emptyPair,stickyLifetime,type PairStatus,type PairShot,type PairId} from '../shared/pair-powerups.js';
import {MAPS} from '../shared/map.js';
import {isWalkable,type Position,type Motion} from '../shared/game.js';
import {clearAttackLine} from '../shared/combat.js';
import {inside,surfaceHeight,displayElevation} from '../shared/traversal.js';
import {tagSweep} from '../shared/tag-run.js';
import {consumeUtility,equip} from '../shared/inventory.js';
import {teamKey} from '../shared/modes.js';
import type {ModeRoom,ModePlayer} from './modes.js';
type P=ModePlayer&Partial<Motion>&{spawnVersion?:number;aimZ?:number;weaponAction?:{endsAt:number}|null;ads?:boolean;dx?:number;dy?:number;protection?:number};
const dist=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??0)-(b.elevation??0));
export const pairStatus=(room:ModeRoom,p:P):PairStatus=>room.mode.pair!.status[p.id]??={spawnVersion:p.spawnVersion??0,slowUntil:0,slowAt:0,knockUntil:0,knockAt:0,vx:0,vy:0,immuneUntil:0,cooldownUntil:0};
const alive=(p:P,now:number)=>!!p.socket&&p.health>0&&p.frozenUntil<=now;
const restricted=(room:ModeRoom,p:P,now:number)=>{const s=room.mode.tag?.status[p.id];return s?.sealed!>now||s?.invisible!>now||s?.phase!>now;};
export function pairPlacement(room:ModeRoom,p:P){
 const map=MAPS[room.mapId];if(p.airborne||!isWalkable(p,map))return null;const n=Math.hypot(p.attackX,p.attackY)||1,point=tagSweep(p,p.attackX/n*PAIR.sticky.placeDistance,p.attackY/n*PAIR.sticky.placeDistance,map);if(dist(point,p)<PAIR.sticky.placeDistance-2)return null;
 let sx=0,sy=0;for(const dx of [-PAIR.sticky.footprint,0,PAIR.sticky.footprint])for(const dy of [-PAIR.sticky.footprint,0,PAIR.sticky.footprint]){const q={x:point.x+dx,y:point.y+dy},z=displayElevation(q,point.elevation??0,map);if(z===null||Math.abs(z-(point.elevation??0))>Math.hypot(dx,dy)*PAIR.sticky.maxSlope+.02||!clearAttackLine(point,{...q,elevation:z},map))return null;if(dx&&dy===0)sx+=(z-(point.elevation??0))/dx/2;if(dy&&dx===0)sy+=(z-(point.elevation??0))/dy/2;}
 if(room.players.some(q=>q.id!==p.id&&q.socket&&q.health>0&&dist(q,point)<PAIR.sticky.footprint+14))return null;return {...point,normal:{x:-sx,y:1,z:-sy}};
}
export function activatePair(room:ModeRoom,p:P,now:number,instance?:string){
 const id=p.inventory?.utility,t=room.mode.pair;if(!t||t.ended||now>=room.round.endsAt||!isPair(id)||!room.players.includes(p)||!alive(p,now)||restricted(room,p,now)||instance!==undefined&&instance!==p.inventory?.utilityInstanceId||!p.inventory?.utilityInstanceId||t.actions.some(a=>a.ownerId===p.id&&a.endsAt>now))return false;
 const s=pairStatus(room,p),ts=room.mode.tag?.status[p.id];if(s.cooldownUntil>now||ts?.utilityCooldown!>now||p.weaponAction&&p.weaponAction.endsAt>now)return false;
 if(id==='sticky_trap'&&(!pairPlacement(room,p)||t.traps.filter(v=>!v.triggeredAt&&v.ownerId===p.id).length>=PAIR.sticky.maxPerPlayer||t.traps.filter(v=>!v.triggeredAt).length>=PAIR.sticky.maxPerRound))return false;
 if(!equip(p,3,false))return false;p.ads=false;const n=Math.hypot(p.attackX,p.attackY)||1,z=Number.isFinite(p.aimZ)?Math.max(-1,Math.min(1,p.aimZ!)):0;
 const start=now+Math.max(0,p.dashRemaining)*1000;t.actions.push({id:randomUUID(),kind:id,ownerId:p.id,instanceId:p.inventory!.utilityInstanceId!,startedAt:start,releaseAt:start+PAIR.releaseMs,endsAt:start+PAIR.actionMs,released:false,dx:p.attackX/n,dy:p.attackY/n,dz:z});return true;
}
function blast(room:ModeRoom,ball:PairShot,now:number){
 const t=room.mode.pair!,cfg=PAIR.bounce,targets:string[]=[];
 for(const q of room.players as P[]){const self=q.id===ball.ownerId,s=pairStatus(room,q);if(!q.socket||q.health<=0||restricted(room,q,now)||!self&&!cfg.friendlyFire&&teamKey(room.mode,q.id)===ball.team||!self&&(q.protection??0)>0||s.immuneUntil>now||room.mode.tag?.status[q.id]?.forceImmune!>now)continue;const d=dist(q,ball);if(d>cfg.radius||!clearAttackLine(ball,q,MAPS[room.mapId]))continue;
  const dx=q.x-ball.x,dy=q.y-ball.y,n=Math.hypot(dx,dy)||1,strength=Math.max(cfg.falloffFloor,1-d/cfg.radius)*(self?cfg.selfMultiplier:1)*(room.mode.tag?.status[q.id]?.magnet!>now?.3:1);let vx=(n===1&&dx===0&&dy===0?-ball.vx/(Math.hypot(ball.vx,ball.vy)||1):dx/n)*cfg.horizontal*strength,vy=(n===1&&dx===0&&dy===0?-ball.vy/(Math.hypot(ball.vx,ball.vy)||1):dy/n)*cfg.horizontal*strength,vz=cfg.vertical*strength;const cap=Math.min(1,cfg.maxImpulse/(Math.hypot(vx,vy,vz)||1));vx*=cap;vy*=cap;vz*=cap;
  s.knockAt=now;s.knockUntil=now+cfg.impulseMs;s.vx=vx;s.vy=vy;s.immuneUntil=now+cfg.forceImmunityMs;if(room.mode.tag){const ts=room.mode.tag.status[q.id]??={};ts.forceImmune=Math.max(ts.forceImmune??0,s.immuneUntil);}if(!q.airborne)q.jumpOrigin={x:q.x,y:q.y,elevation:q.elevation};q.airborne=true;q.verticalVelocity=Math.max(q.verticalVelocity??0,vz);q.dashRemaining=0;targets.push(q.id);
 }
 t.events.push({id:ball.id,kind:'shockwave',at:now,ownerId:ball.ownerId,x:ball.x,y:ball.y,elevation:ball.elevation,radius:cfg.radius,targetIds:targets});
}
function blockedProjectile(room:ModeRoom,p:Position){const map=MAPS[room.mapId],r=PAIR.bounce.projectileRadius,z=p.elevation??0;return p.x<r||p.y<r||p.x>map.bounds.width-r||p.y>map.bounds.height-r||map.blocks.some(b=>inside(p,b,r)&&z+r>b.bottom&&z-r<b.top)||map.surfaces.some(v=>v.ramp&&inside(p,v)&&z<surfaceHeight(v,p));}
export function tickPair(room:ModeRoom,now:number,dt:number){
 const t=room.mode.pair;if(!t||t.ended||now>=room.round.endsAt)return;if(!t.actions.length&&!t.shots.length&&!t.traps.length&&!t.events.length&&!Object.keys(t.status).length)return;
 for(const p of room.players as P[]){const s=t.status[p.id];if(s&&(!p.socket||p.health<=0||s.spawnVersion!==(p.spawnVersion??0)))delete t.status[p.id];}
 t.actions=t.actions.filter(a=>{const p=room.players.find(p=>p.id===a.ownerId) as P|undefined;if(!p||!alive(p,now)||restricted(room,p,now)||now>=a.endsAt)return false;if(a.released)return true;if(p.selectedSlot!==3||p.inventory?.utilityInstanceId!==a.instanceId||p.inventory.utility!==a.kind)return false;if(now<a.releaseAt)return true;
  const place=a.kind==='sticky_trap'?pairPlacement(room,p):null;
  if(a.kind==='sticky_trap'&&(!place||t.traps.filter(v=>!v.triggeredAt&&v.ownerId===p.id).length>=PAIR.sticky.maxPerPlayer||t.traps.filter(v=>!v.triggeredAt).length>=PAIR.sticky.maxPerRound))return false;
  if(a.kind==='bounce_bomb'){const horizontal=Math.sqrt(Math.max(0,1-a.dz*a.dz));const shot={id:a.id,ownerId:p.id,team:teamKey(room.mode,p.id),x:p.x+a.dx*18*horizontal,y:p.y+a.dy*18*horizontal,elevation:(p.elevation??0)+PAIR.bounce.originHeight,vx:a.dx*PAIR.bounce.throwSpeed*horizontal,vy:a.dy*PAIR.bounce.throwSpeed*horizontal,vz:a.dz*PAIR.bounce.throwSpeed+PAIR.bounce.lift,bornAt:now,lastAt:now,endsAt:now+PAIR.bounce.fuseMs};if(blockedProjectile(room,shot)){shot.x=p.x;shot.y=p.y;shot.elevation=(p.elevation??0)+PAIR.bounce.originHeight;}t.shots.push(shot);}
  else t.traps.push({...place!,id:a.id,ownerId:p.id,ownerSpawnVersion:p.spawnVersion??0,team:teamKey(room.mode,p.id),bornAt:now,armedAt:now+PAIR.sticky.armMs,endsAt:now+stickyLifetime(room.selectedGameMode)});
  consumeUtility(p);a.released=true;const s=pairStatus(room,p);s.cooldownUntil=now+PAIR.cooldownMs;if(room.mode.tag){room.mode.tag.used[p.id]=(room.mode.tag.used[p.id]??0)+1;room.mode.tag.status[p.id]??={};room.mode.tag.status[p.id].utilityCooldown=s.cooldownUntil;}return true;
 });
 t.shots=t.shots.filter(ball=>{if(!room.players.some(p=>p.id===ball.ownerId&&p.socket))return false;const seconds=Math.min(.1,Math.max(0,(now-ball.lastAt)/1000));ball.lastAt=now;let impact=false;const steps=Math.max(1,Math.ceil(Math.hypot(ball.vx,ball.vy,ball.vz)*seconds/4));for(let n=0;n<steps;n++){const h=seconds/steps,q={x:ball.x+ball.vx*h,y:ball.y+ball.vy*h,elevation:(ball.elevation??0)+ball.vz*h};ball.vz-=PAIR.bounce.gravity*h;if(blockedProjectile(room,q)){impact=true;break;}if((room.players as P[]).some(p=>p.socket&&p.health>0&&(p.id!==ball.ownerId||now-ball.bornAt>150)&&Math.hypot(p.x-q.x,p.y-q.y)<20&&q.elevation>=(p.elevation??0)-6&&q.elevation<=(p.elevation??0)+60)){Object.assign(ball,q);impact=true;break;}const map=MAPS[room.mapId],levels=[0,...map.surfaces.filter(v=>inside(q,v)).map(v=>surfaceHeight(v,q))].sort((a,b)=>b-a),floor=levels.find(z=>(ball.elevation??0)>=z&&q.elevation<=z);if(floor!==undefined){q.elevation=floor;Object.assign(ball,q);impact=true;break;}Object.assign(ball,q);}if((impact&&PAIR.bounce.impact)||now>=ball.endsAt){blast(room,ball,now);return false;}return true;});
 t.traps=t.traps.filter(v=>{if(!room.players.some(p=>p.id===v.ownerId&&p.socket&&p.health>0&&((p as P).spawnVersion??0)===v.ownerSpawnVersion))return false;if(v.triggeredAt)return now-v.triggeredAt<PAIR.sticky.triggerVisualMs;if(now>=v.endsAt)return false;if(now<v.armedAt)return true;
  const target=(room.players as P[]).filter(p=>p.id!==v.ownerId&&p.socket&&p.health>0&&!restricted(room,p,now)&&(PAIR.sticky.friendlyFire||teamKey(room.mode,p.id)!==v.team)&&dist(v,p)<=PAIR.sticky.radius&&clearAttackLine(v,p,MAPS[room.mapId])).sort((a,b)=>dist(a,v)-dist(b,v)||a.id.localeCompare(b.id))[0];if(target){v.triggeredAt=now;v.targetId=target.id;const s=pairStatus(room,target);s.slowAt=now;s.slowUntil=now+PAIR.sticky.effectMs;t.events.push({...v,id:v.id,kind:'sticky',at:now,radius:PAIR.sticky.radius,targetIds:[target.id]});}return true;});
 t.events=t.events.filter(e=>now-e.at<Math.max(900,PAIR.sticky.triggerVisualMs)).slice(-24);
 for(const id of Object.keys(t.status))if(!room.players.some(p=>p.id===id))delete t.status[id];
}
export function initPair(room:ModeRoom){room.mode.pair=emptyPair();}
export function finishPair(room:ModeRoom){if(room.mode.pair)room.mode.pair={...emptyPair(),ended:true};}
