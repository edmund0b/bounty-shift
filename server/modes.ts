import {initPair,tickPair,activatePair,finishPair} from './pair-powerups.js';
import {isPair} from '../shared/pair-powerups.js';
import {initCrates,tickCrates,collectCrate,finishCrates} from './mystery-crates.js';
import {initTag,tryTag,collectMystery,activateTagPower,tickTag,finishTag} from './tag-run.js';
import {isPower} from '../shared/tag-run.js';
import {buildLoot,chestReward,dropOwned,dropPosition,spawnDrop} from './weapon-loot.js';
import {canonicalWeapon,allowedWeapon,createWeapon,GROUND_WEAPONS,LOOT_CONFIG,MODE_EQUIPMENT,WEAPON_IDS} from '../shared/weapons.js';
import {weaponSlots} from '../shared/inventory.js';
import {clearInventory,pickup,consumeUtility,type Equipped} from '../shared/inventory.js';
import {randomInt,randomUUID} from 'node:crypto';
import {MAPS} from '../shared/map.js';
import {clearAttackLine} from '../shared/combat.js';
import {CHEST_OPEN_MS,interactionItem,pickupPosition} from '../shared/loot.js';
import {isWalkable} from '../shared/game.js';
import {mapAnchors} from '../shared/map-anchors.js';
import {RULES,emptyMode,teamKey,type ModeState,type Format,type GameMode,type ItemKind} from '../shared/modes.js';
import type {Position} from '../shared/game.js';
export type ModePlayer=Position&Equipped&{id:string;name:string;health:number;socket:unknown;frozenUntil:number;heldItem:ItemKind|null;eliminations:number;matchEliminations:number;dashRemaining:number;attackX:number;attackY:number};
export type ModeRoom={selectedGameMode:GameMode;selectedFormat:Format;mode:ModeState;players:ModePlayer[];mapId:string;round:{endsAt:number};match:{roundNumber:number}};
type Context={room:ModeRoom;now:number};
type Ruleset={loot:readonly ItemKind[];combat:boolean;init:(c:Context)=>void;tick:(c:Context)=>boolean;hit?:(c:Context,a:ModePlayer,b:ModePlayer)=>void;finish:(c:Context)=>void};
const key=(r:ModeRoom,p:ModePlayer)=>teamKey(r.mode,p.id);
const keys=(r:ModeRoom)=>[...new Set(Object.values(r.mode.teams))];
const noOp=()=>{};
function leaders(room:ModeRoom){const max=Math.max(...keys(room).map(k=>room.mode.scores[k]??0));return keys(room).filter(k=>(room.mode.scores[k]??0)===max);}
export const MODE_RULES:Record<GameMode,Ruleset>={
 tag:{loot:['freeze_ball',...WEAPON_IDS.filter(id=>allowedWeapon('tag',id))],combat:false,init:({room,now})=>initTag(room,now,room.mode.tag),tick:({room})=>false,hit:({room,now},a,b)=>{tryTag(room,a,b,now);},finish:({room,now})=>finishTag(room,now)},
 kill_race:{loot:['freeze_ball',...WEAPON_IDS.filter(id=>allowedWeapon('kill_race',id))],combat:true,init:noOp,tick:({room})=>room.selectedFormat==='duo'&&Object.values(room.mode.scores).some(n=>n>=RULES.killTarget),finish:({room})=>{room.mode.winnerKeys=leaders(room);room.mode.reason=Object.values(room.mode.scores).some(n=>n>=RULES.killTarget)&&room.selectedFormat==='duo'?'Elimination target reached.':'Time expired — highest elimination score wins. Ties share the win.';}},
 flag_run:{loot:['freeze_ball',...WEAPON_IDS.filter(id=>allowedWeapon('flag_run',id))],combat:true,init:({room,now})=>{const anchors=mapAnchors(room.mapId);room.mode.flag={state:'not_spawned',carrier:null,position:anchors.flags[randomInt(anchors.flags.length)],spawnAt:now+RULES.flagSpawnMs};},tick:({room,now})=>{
  const f=room.mode.flag;if(f.state==='not_spawned'&&now>=f.spawnAt)f.state='spawned';
  if(f.state==='carried'){const p=room.players.find(p=>p.id===f.carrier);if(!p||!p.socket||p.health<=0){dropFlag(room,p);return false;}f.position={x:p.x,y:p.y,elevation:p.elevation};if(near(room,p,room.mode.capture)){f.state='captured';room.mode.winnerKeys=[key(room,p)];return true;}}
  return false;
 },finish:({room})=>{room.mode.reason=room.mode.flag.state==='captured'?'Flag delivered — capture wins.':'Time expired without a capture — no round winner.';}}
};
export function beginMode(room:ModeRoom,now:number){
 const prior=room.mode;room.mode=emptyMode();room.mode.teams=prior.teams;room.mode.matchPoints=prior.matchPoints;if(room.selectedGameMode==='tag')room.mode.tag=prior.tag;
 for(const k of keys(room))room.mode.scores[k]=0;
 const anchors=mapAnchors(room.mapId);room.mode.capture=anchors.capture;
 const loot=MODE_RULES[room.selectedGameMode].loot;
 room.mode.items=buildLoot(room.mapId);
 for(const p of room.players){p.frozenUntil=0;clearInventory(p);}
 MODE_RULES[room.selectedGameMode].init({room,now});
 initPair(room);initCrates(room,now);
}
export function assignTeams(room:ModeRoom){room.mode=emptyMode();room.players.forEach((p,i)=>{room.mode.teams[p.id]=room.selectedFormat==='duo'?`team-${Math.floor(i/2)+1}`:p.id;});}
export function enemies(room:ModeRoom,a:ModePlayer,b:ModePlayer){return a.id!==b.id&&key(room,a)!==key(room,b);}
export function near(room:ModeRoom,a:Position,b:Position,range=RULES.pickupRange){return Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??0)-(b.elevation??0))<=range&&clearAttackLine(a,b,MAPS[room.mapId]);}
export function interact(room:ModeRoom,p:ModePlayer,now:number,itemId?:string,replaceSlot?:1|2){
 if(!p.socket||p.health<=0||p.frozenUntil>now||room.selectedGameMode==='tag'&&(room.mode.tag?.status[p.id]?.sealed??0)>now)return;
 const flag=room.mode.flag;
 if(room.selectedGameMode==='flag_run'&&['spawned','dropped'].includes(flag.state)&&near(room,p,flag.position)){flag.state='carried';flag.carrier=p.id;return;}
 const item=itemId?room.mode.items.find(i=>i.id===itemId&&(i.state==='closed'||i.state==='opened'&&!!i.kind)&&near(room,p,i.state==='closed'?i:(i.pickupPosition??i))):interactionItem(room.mode.items,room.mapId,p);
 if(!item)return;if(item.source==='mystery'){collectCrate(room,p,item,now);return;}
 if(item.state==='closed'){item.kind=chestReward(room.selectedGameMode);item.weapon=createWeapon(canonicalWeapon(item.kind)!,randomUUID());item.state='opening';item.openedAt=now;
  // A short supported drop beside this authored chest; never inside scenery or below a deck.
  item.pickupPosition={x:item.x,y:item.y,elevation:item.elevation};
  for(let radius=28;radius>=14;radius-=7){let found=false;for(let i=0;i<16;i++){const candidate={x:item.x+Math.cos(i*Math.PI/8)*radius,y:item.y+Math.sin(i*Math.PI/8)*radius,elevation:item.elevation??0};if(isWalkable(candidate,MAPS[room.mapId])&&clearAttackLine(item,candidate,MAPS[room.mapId])){item.pickupPosition=candidate;found=true;break;}}if(found)break;}
  return;}
 if(!item.kind||item.kind==='freeze_ball'&&!MODE_EQUIPMENT[room.selectedGameMode].powerUps)return;
 const weaponId=canonicalWeapon(item.kind);if(weaponId&&!allowedWeapon(room.selectedGameMode,weaponId))return;
 if(weaponId){const slots=weaponSlots(p);if(slots.some(w=>w?.weaponId===weaponId))return;if(slots.every(Boolean)&&!replaceSlot)return;if(replaceSlot&&slots[replaceSlot-1]){const point=dropPosition(room.mapId,p,room.mode.items);if(!point)return;spawnDrop(room.mode.items,point,slots[replaceSlot-1]!,now);}}
 if(!pickup(p,item.kind,item.weapon,replaceSlot))return;item.kind=null;delete item.weapon;item.state='empty';item.refreshAt=now+LOOT_CONFIG.respawnMs;
}
export function dropFlag(room:ModeRoom,p?:ModePlayer){const f=room.mode.flag;if(f.state!=='carried'||p&&f.carrier!==p.id)return;if(p)f.position={x:p.x,y:p.y,elevation:p.elevation};f.carrier=null;f.state='dropped';}
export function onElimination(room:ModeRoom,killer:ModePlayer,victim:ModePlayer){dropFlag(room,victim);clearInventory(victim);victim.frozenUntil=0;killer.eliminations++;killer.matchEliminations++;room.mode.scores[key(room,killer)]=(room.mode.scores[key(room,killer)]??0)+1;}
export function throwBall(room:ModeRoom,p:ModePlayer,now:number){if(isPair(p.heldItem)){activatePair(room,p,now);return true;}if(room.selectedGameMode==='tag'&&isPower(p.heldItem)){activateTagPower(room,p,now);return true;}if(p.heldItem!=='freeze_ball'||!MODE_EQUIPMENT[room.selectedGameMode].powerUps)return false;consumeUtility(p);room.mode.projectiles.push({id:randomUUID(),ownerId:p.id,teamId:key(room,p),x:p.x,y:p.y,elevation:p.elevation,dx:p.attackX,dy:p.attackY,expiresAt:now+RULES.ballLifetimeMs,bornAt:now});room.mode.effects.push({id:randomUUID(),type:'throw',at:now,ownerId:p.id,x:p.x,y:p.y,elevation:p.elevation,dx:p.attackX,dy:p.attackY});return true;}
export function tickMode(room:ModeRoom,now:number,dt:number){
 room.mode.items=room.mode.items.filter(i=>i.source!=='drop'||i.state!=='empty'&&now<(i.expiresAt??Infinity));
 room.mode.effects=room.mode.effects.filter(e=>now-e.at<1000).slice(-48);
 for(const item of room.mode.items)if(item.state==='opening'&&now>=(item.openedAt??now)+CHEST_OPEN_MS)item.state='opened';
 for(const item of room.mode.items)if(item.source==='floor'&&item.state==='empty'&&now>=item.refreshAt){item.kind=item.id.startsWith('utility-')?'freeze_ball':GROUND_WEAPONS[randomInt(GROUND_WEAPONS.length)];if(item.kind!=='freeze_ball')item.weapon=createWeapon(canonicalWeapon(item.kind)!,randomUUID());item.state='opened';}
 room.mode.projectiles=room.mode.projectiles.filter(ball=>{
  if(now>=ball.expiresAt)return false;
  const start={x:ball.x,y:ball.y,elevation:ball.elevation};const end={x:ball.x+ball.dx*RULES.ballSpeed*dt,y:ball.y+ball.dy*RULES.ballSpeed*dt,elevation:ball.elevation};
  if(!clearAttackLine(start,end,MAPS[room.mapId])){room.mode.effects.push({id:randomUUID(),type:'ice_wall',at:now,ownerId:ball.ownerId,...start,dx:ball.dx,dy:ball.dy});return false;}
  const targets=room.players.filter(p=>p.socket&&p.health>0&&p.id!==ball.ownerId&&key(room,p)!==ball.teamId).map(p=>{const vx=end.x-start.x,vy=end.y-start.y,t=Math.max(0,Math.min(1,((p.x-start.x)*vx+(p.y-start.y)*vy)/(vx*vx+vy*vy||1)));return {p,t,point:{x:start.x+vx*t,y:start.y+vy*t,elevation:ball.elevation}};}).filter(({p,point})=>near(room,p,point,30)).sort((a,b)=>a.t-b.t);
  if(targets[0]){targets[0].p.frozenUntil=now+RULES.freezeMs;targets[0].p.dashRemaining=0;room.mode.effects.push({id:randomUUID(),type:'ice_hit',at:now,ownerId:ball.ownerId,targetId:targets[0].p.id,...targets[0].point,dx:ball.dx,dy:ball.dy});return false;}Object.assign(ball,end);return true;
 });
 tickPair(room,now,dt);tickCrates(room,now);if(room.selectedGameMode==='tag')tickTag(room,now,dt);return MODE_RULES[room.selectedGameMode].tick({room,now});
}
export function finishMode(room:ModeRoom,now:number){MODE_RULES[room.selectedGameMode].finish({room,now});for(const k of room.mode.winnerKeys)room.mode.matchPoints[k]=(room.mode.matchPoints[k]??0)+1;room.mode.projectiles=[];finishCrates(room);finishPair(room);}

