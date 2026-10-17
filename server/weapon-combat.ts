import {GUNS,gunId,ADS,decayedHeat,shotgunFalloff,hitBoxes,spreadDirection,plausibleCamera,type HitRegion} from '../shared/gun-combat.js';
import {randomUUID} from 'node:crypto';
import {activeWeapon,weaponSlots,syncEquipped,type Equipped} from '../shared/inventory.js';
import {AMMO_CONFIG,allowedWeapon,isGun,weaponAction,WEAPON_BALANCE,type WeaponAction,type WeaponEffect,type WeaponInstance} from '../shared/weapons.js';
import {MAPS} from '../shared/map.js';
import {COMBAT,clearAttackLine} from '../shared/combat.js';
import type {GameMode,ModeState} from '../shared/modes.js';
import type {Position} from '../shared/game.js';
import {along,unit,rayMap,rayBox,clearRay,type Vec3} from '../shared/weapon-ray.js';
export type ArmedPlayer=Equipped&Position&{ads?:boolean;adsSince?:number;crouched?:boolean;traversalState?:string;dashRemaining?:number;gunHeat?:{instanceId:string;heat:number;at:number;sequence:number};id:string;health:number;socket:unknown;frozenUntil:number;protection:number;attackCooldown:number;attackX:number;attackY:number;aimX?:number;aimY?:number;aimZ?:number;aimOrigin?:Position;weaponAction?:WeaponAction|null;weaponSerial?:number;combo?:number;comboUntil?:number;comboWeapon?:string;facingX?:number;facingY?:number};
export type ArmedRoom={mapId:string;selectedGameMode:GameMode;mode:ModeState;players:ArmedPlayer[]};
export type WeaponHit={attacker:ArmedPlayer;target:ArmedPlayer;damage:number};
const live=(p:ArmedPlayer,now:number)=>!!p.socket&&p.health>0&&p.frozenUntil<=now;
export function cancelWeapon(p:ArmedPlayer){p.weaponAction=null;}
export function beginWeaponEquip(p:ArmedPlayer,now:number){cancelWeapon(p);p.ads=false;p.adsSince=0;p.combo=0;p.comboUntil=0;const w=activeWeapon(p);if(!w)return;const config=weaponAction(w.weaponId,'equip');p.weaponAction={serial:(p.weaponSerial??0)+1,weaponId:w.weaponId,instanceId:w.instanceId,clip:'equip',startedAt:now,endsAt:now+config.duration*1000,nextEvent:0,aimX:p.facingX??0,aimY:p.facingY??1,aimZ:0};p.weaponSerial=p.weaponAction.serial;}
export function startWeaponAttack(p:ArmedPlayer,room:ArmedRoom,now:number){const w=activeWeapon(p);if(!w||!allowedWeapon(room.selectedGameMode,w.weaponId)||!live(p,now))return false;
 if(p.weaponAction){if(p.weaponAction.clip==='reload'&&w.weaponId==='shotgun'&&w.magazine>0)cancelWeapon(p);else return false;}
 if(p.attackCooldown>1e-8)return false;if(isGun(w.weaponId)&&w.magazine<=0)return false;
 if(p.comboWeapon!==w.instanceId){p.combo=0;p.comboUntil=0;p.comboWeapon=w.instanceId;}
 p.combo=now<(p.comboUntil??0)?(p.combo??0)%3+1:1;const clip=isGun(w.weaponId)?'fire':`attack${p.combo}`;const config=weaponAction(w.weaponId,clip);p.weaponAction={serial:(p.weaponSerial??0)+1,weaponId:w.weaponId,instanceId:w.instanceId,clip,startedAt:now,endsAt:now+config.duration*1000,nextEvent:0,aimX:p.attackX*Math.sqrt(Math.max(0,1-(p.aimZ??0)**2)),aimY:p.attackY*Math.sqrt(Math.max(0,1-(p.aimZ??0)**2)),aimZ:p.aimZ??0,origin:p.aimOrigin?{...p.aimOrigin,elevation:p.aimOrigin.elevation??0}:undefined};p.weaponSerial=p.weaponAction.serial;p.comboUntil=p.weaponAction.endsAt+700;p.attackCooldown=config.duration;p.protection=0;return true;}
export function reloadWeapon(p:ArmedPlayer,room:ArmedRoom,now:number){const w=activeWeapon(p);if(!live(p,now)||!w||!allowedWeapon(room.selectedGameMode,w.weaponId)||!isGun(w.weaponId)||p.weaponAction||p.attackCooldown>1e-8)return false;const ammo=AMMO_CONFIG[w.weaponId as keyof typeof AMMO_CONFIG];if(!ammo||w.magazine>=ammo.magazine||w.reserve<=0)return false;p.ads=false;p.adsSince=0;const action=weaponAction(w.weaponId,'reload');p.weaponAction={serial:(p.weaponSerial??0)+1,weaponId:w.weaponId,instanceId:w.instanceId,clip:'reload',startedAt:now,endsAt:now+action.duration*1000,nextEvent:0,aimX:p.attackX,aimY:p.attackY,aimZ:0};p.weaponSerial=p.weaponAction.serial;return true;}
const hostile=(r:ArmedRoom,a:ArmedPlayer,b:ArmedPlayer)=>a.id!==b.id&&(r.mode.teams[a.id]??a.id)!==(r.mode.teams[b.id]??b.id);
function firstPlayer(room:ArmedRoom,p:ArmedPlayer,a:Vec3,d:Vec3,limit:number){let distance=limit,target:ArmedPlayer|undefined,region:HitRegion='body';for(const other of room.players){if(!hostile(room,p,other)||!other.socket||other.health<=0)continue;for(const box of hitBoxes(other)){const t=rayBox(a,d,box.min,box.max,distance);if(t<distance){target=other;distance=t;region=box.region;}}}return{target,distance,region};}
function effect(room:ArmedRoom,p:ArmedPlayer,w:WeaponInstance,now:number,type:WeaponEffect['type'],a:Vec3,b:Vec3,target?:ArmedPlayer,details:Partial<WeaponEffect>={}){(room.mode.weaponEffects??=[]).push({id:randomUUID(),ownerId:p.id,weaponId:w.weaponId,instanceId:w.instanceId,type,at:now,x:a.x,y:a.y,elevation:a.z,toX:b.x,toY:b.y,toZ:b.z,targetId:target?.id,...details});}
function fire(room:ArmedRoom,p:ArmedPlayer,w:WeaponInstance,action:WeaponAction,now:number):WeaponHit[]{
 if(w.magazine<=0||!gunId(w.weaponId))return[];w.magazine--;const g=GUNS[w.weaponId],map=MAPS[room.mapId],aim=unit({x:action.aimX,y:action.aimY,z:action.aimZ});
 const stance=p.traversalState==='slide'&&(p.dashRemaining??0)>0?25:p.crouched?14:0,chest={x:p.x,y:p.y,z:(p.elevation??0)+COMBAT.chestHeight-stance};let origin=action.origin?{x:action.origin.x,y:action.origin.y,z:action.origin.elevation}:chest;
 if(!plausibleCamera(origin,chest,aim)||!clearRay(map,chest,origin))origin=chest;
 const cameraWall=rayMap(map,origin,aim,g.range),sight=firstPlayer(room,p,origin,aim,cameraWall),reticle=along(origin,aim,sight.distance),n=Math.hypot(aim.x,aim.y)||1,dx=aim.x/n,dy=aim.y/n;
 const precise=!!p.ads&&now-(p.adsSince??now)>=ADS.seconds*1000,muzzle={x:p.x+dx*24+dy*10,y:p.y+dy*24-dx*10,z:(p.elevation??0)+(precise?48:42)-stance};
 const old=p.gunHeat?.instanceId===w.instanceId?p.gunHeat:undefined,heat=old?decayedHeat(old.heat,old.at,now,w.weaponId):0,sequence=(old?.sequence??0)+1,cone=(precise?g.ads:g.hip)+heat*g.recoil,shotId=p.id+':'+action.serial;
 p.gunHeat={instanceId:w.instanceId,at:now,heat:Math.min(6,heat+1),sequence};
 if(!clearRay(map,chest,muzzle)){const t=rayMap(map,chest,unit({x:muzzle.x-chest.x,y:muzzle.y-chest.y,z:muzzle.z-chest.z}),Math.hypot(muzzle.x-chest.x,muzzle.y-chest.y,muzzle.z-chest.z));effect(room,p,w,now,'shot',chest,along(chest,unit({x:muzzle.x-chest.x,y:muzzle.y-chest.y,z:muzzle.z-chest.z}),t),undefined,{shotId,surface:true,spread:cone,heat:p.gunHeat.heat});return[];}
 const base=unit({x:reticle.x-muzzle.x,y:reticle.y-muzzle.y,z:reticle.z-muzzle.z}),hits=new Map<ArmedPlayer,{damage:number;head:boolean;end:Vec3}>();
 for(let i=0;i<g.pellets;i++){const dir=spreadDirection(base,cone,i,g.pellets,sequence),wall=rayMap(map,muzzle,dir,g.range),hit=firstPlayer(room,p,muzzle,dir,wall),end=along(muzzle,dir,hit.distance);if(hit.target&&hit.target.protection<=0){const value=(hit.region==='head'?g.head:g.body)*(w.weaponId==='shotgun'?shotgunFalloff(hit.distance):1),old=hits.get(hit.target);hits.set(hit.target,{damage:(old?.damage??0)+value,head:!!old?.head||hit.region==='head',end});}effect(room,p,w,now,'shot',muzzle,end,hit.target,{shotId,region:hit.region,spread:cone,heat:p.gunHeat.heat,surface:wall<g.range&&!hit.target});}
 return [...hits].map(([target,hit])=>{const damage=Math.round(Math.min(w.weaponId==='shotgun'?85:Infinity,hit.damage));if(damage>0)effect(room,p,w,now,'damage',muzzle,hit.end,target,{shotId,damage,region:hit.head?'head':'body'});return{attacker:p,target,damage};}).filter(h=>h.damage>0);
}
export function tickWeapon(room:ArmedRoom,p:ArmedPlayer,now:number):WeaponHit[]{
 const action=p.weaponAction;if(!action)return[];const w=activeWeapon(p);if(!live(p,now)||!w||w.instanceId!==action.instanceId||w.weaponId!==action.weaponId||!allowedWeapon(room.selectedGameMode,w.weaponId)){cancelWeapon(p);return[];}
 const config=weaponAction(w.weaponId,action.clip),hits:WeaponHit[]=[];
 while(action.nextEvent<config.events.length&&now>=action.startedAt+config.events[action.nextEvent].time*1000){const event=config.events[action.nextEvent++];
  if(event.kind==='reload'){const capacity=(AMMO_CONFIG as Record<string,{magazine:number}>)[w.weaponId]?.magazine??0,amount=Math.min(capacity-w.magazine,w.reserve,w.weaponId==='shotgun'?1:Infinity);w.magazine+=amount;w.reserve-=amount;}
  else if(event.kind==='shot'){const raw={x:p.aimX??action.aimX,y:p.aimY??action.aimY,z:p.aimZ??action.aimZ};if(Math.hypot(raw.x,raw.y,raw.z)>1e-6){const current=unit(raw);action.aimX=current.x;action.aimY=current.y;action.aimZ=current.z;}action.origin=p.aimOrigin?{x:p.aimOrigin.x,y:p.aimOrigin.y,elevation:p.aimOrigin.elevation??0}:action.origin;hits.push(...fire(room,p,w,action,now));}
  else if(event.kind==='contact'){
   const balance=WEAPON_BALANCE[w.weaponId],length=Math.hypot(action.aimX,action.aimY)||1;const target=room.players.filter(other=>hostile(room,p,other)&&other.socket&&other.health>0&&other.protection<=0&&Math.hypot(other.x-p.x,other.y-p.y,(other.elevation??0)-(p.elevation??0))<=balance.range).filter(other=>{const n=Math.hypot(other.x-p.x,other.y-p.y)||1;return((other.x-p.x)*action.aimX+(other.y-p.y)*action.aimY)/(n*length)>=Math.cos(COMBAT.halfAngle)&&clearAttackLine(p,other,MAPS[room.mapId]);}).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   if(target)hits.push({attacker:p,target,damage:balance.damage});effect(room,p,w,now,target?'melee_hit':'melee_miss',{x:p.x,y:p.y,z:(p.elevation??0)+30},{x:target?.x??p.x+action.aimX*balance.range,y:target?.y??p.y+action.aimY*balance.range,z:(target?.elevation??p.elevation??0)+30},target);
  }
 }
 if(now>=action.endsAt)cancelWeapon(p);return hits;
}
