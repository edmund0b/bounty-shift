import {CRATE_CONFIG} from '../shared/mystery-crates.js';
import {activatePair} from './pair-powerups.js';
import {isPair} from '../shared/pair-powerups.js';
import {randomInt,randomUUID} from 'node:crypto';
import {TAG,POWERS,POWER_IDS,RARITIES,isPower,pickupCount,tagSweep,type PowerId,type TagState,type TagStatus,type TagField} from '../shared/tag-run.js';
import {MAPS} from '../shared/map.js';
import {isWalkable,type Position,type Motion} from '../shared/game.js';
import {clearAttackLine,COMBAT} from '../shared/combat.js';
import {teamKey,type WorldItem} from '../shared/modes.js';
import {weaponSlots,pickup,consumeUtility} from '../shared/inventory.js';
import {canonicalWeapon,WEAPON_BALANCE,allowedWeapon} from '../shared/weapons.js';
import {lootPositions} from './weapon-loot.js';
import type {ModeRoom,ModePlayer} from './modes.js';
type P=ModePlayer&Partial<Motion>&{characterId?:string|null;attackSeen?:number;weaponSerial?:number;ads?:boolean;dx?:number;dy?:number;protection?:number;weaponAction?:{endsAt:number}|null};
const key=(r:ModeRoom,p:ModePlayer)=>teamKey(r.mode,p.id);
const status=(r:ModeRoom,p:ModePlayer)=>{const s=r.mode.tag!.status[p.id]??={};for(const key of ['utilityCooldown','speed','slow','bubble','tracker','ghost','magnet','flash','invisible','sealed','freezeImmune','portalLock','padLock','escapeLock','forceImmune','phase','impulseUntil'] as const)s[key]??=0;return s;};
const active=(p:ModePlayer,now:number)=>!!p.socket&&p.health>0&&p.frozenUntil<=now;
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??0)-(b.elevation??0));
const inRange=(r:ModeRoom,a:Position,b:Position,range=TAG.fieldRadius)=>distance(a,b)<=range&&clearAttackLine(a,b,MAPS[r.mapId]);
const hostile=(r:ModeRoom,a:ModePlayer,b:ModePlayer)=>a.id!==b.id&&key(r,a)!==key(r,b);
const event=(r:ModeRoom,p:ModePlayer,now:number,kind:TagState['events'][number]['kind'],power?:PowerId,targetId?:string)=>r.mode.tag!.events.push({id:randomUUID(),kind,power,targetId,at:now,ownerId:p.id,x:p.x,y:p.y,elevation:p.elevation});
export function initTag(room:ModeRoom,now:number,prior?:TagState){
 const keys=[...new Set(room.players.map(p=>key(room,p)))];
 room.mode.tag={version:2,startedAt:now,clock:now,spent:Object.fromEntries(keys.map(k=>[k,0])),tags:{},collected:{},used:{},immunity:{},status:{},fields:[],shots:[],events:[],trails:[],pings:[],pingAt:0,trailAt:0,lastTransferAt:-1,serial:0,consumed:{},announcement:'HOT POTATO — avoid holding IT at zero',announcementAt:now,sealSpawned:false,sealUsed:prior?.sealUsed??{},totalTime:prior?.totalTime??{},totalTags:prior?.totalTags??{},totalCollected:prior?.totalCollected??{},totalUsed:prior?.totalUsed??{},rankings:[],ended:false};
 const activeKeys=keys.filter(k=>room.players.some(p=>p.socket&&key(room,p)===k));room.mode.it=activeKeys[randomInt(activeKeys.length)]??keys[0];room.mode.tagAfter=now;
 room.mode.items=room.mode.items.filter(i=>i.kind!=='freeze_ball'&&!i.id.startsWith('utility-'));

}
export function tagClock(room:ModeRoom,now:number){const t=room.mode.tag;if(!t||t.ended)return;const end=Math.min(now,room.round.endsAt);if(end>t.clock&&room.mode.it)t.spent[room.mode.it]=(t.spent[room.mode.it]??0)+end-t.clock;t.clock=Math.max(t.clock,end);}
function clearEscape(room:ModeRoom,p:P,now:number){const s=status(room,p);if(s.origin){Object.assign(p,s.origin);delete s.origin;}s.invisible=0;s.sealed=0;s.phase=0;s.impulseUntil=0;p.frozenUntil=0;s.freezeImmune=now+TAG.freezeImmunityMs;p.weaponAction=null;p.ads=false;room.mode.tag!.fields=room.mode.tag!.fields.filter(f=>!(f.ownerId===p.id&&f.kind==='clone_decoy'));}
const token=(p:P)=>canonicalWeapon(p.heldItem)?'w:'+p.weaponSerial:'a:'+p.attackSeen;
export function tryTag(room:ModeRoom,a:P,b:P,now:number){
 const t=room.mode.tag;if(!t||t.ended||now>=room.round.endsAt||t.lastTransferAt===now||key(room,a)!==room.mode.it||!active(a,now)||!b.socket||b.health<=0||!hostile(room,a,b)||!tagVisible(room,a,undefined,now)||status(room,a).invisible!>now||status(room,a).sealed!>now||status(room,b).sealed!>now||(t.immunity[b.id]??0)>now||(b.protection??0)>0||t.consumed[a.id]===token(a))return false;
 const w=canonicalWeapon(a.heldItem);if(w&&!allowedWeapon('tag',w))return false;const range=w?WEAPON_BALANCE[w].range:TAG.tagRange,n=Math.hypot(b.x-a.x,b.y-a.y)||1,aim=Math.hypot(a.attackX,a.attackY)||1;
 if(!inRange(room,a,b,range)||((b.x-a.x)*a.attackX+(b.y-a.y)*a.attackY)/(n*aim)<Math.cos(COMBAT.halfAngle))return false;
 tagClock(room,now);const old=room.mode.it;t.consumed[a.id]=token(a);t.tags[old]=(t.tags[old]??0)+1;room.mode.it=key(room,b);room.mode.tagAfter=now;t.lastTransferAt=now;t.serial++;
 for(const p of room.players as P[]){if(key(room,p)===old)t.immunity[p.id]=now+TAG.immunityMs;if(key(room,p)===room.mode.it)clearEscape(room,p,now);}
 t.announcement=room.players.filter(p=>key(room,p)===room.mode.it).map(p=>p.name).join(' + ')+' IS IT';t.announcementAt=now;event(room,b,now,'tag',undefined,a.id);return true;
}
export function choosePower(t:TagState,roll=randomInt(1000000)/1000000,choice=randomInt(1000000)):PowerId{
 let value=roll*Object.values(RARITIES).reduce((n,r)=>n+r.weight,0),rarity:keyof typeof RARITIES='common';for(const [name,r] of Object.entries(RARITIES)){value-=r.weight;if(value<0){rarity=name as keyof typeof RARITIES;break;}}
 if(rarity==='legendary'&&t.sealSpawned)rarity='epic';const pool=POWER_IDS.filter(id=>POWERS[id].rarity===rarity);return pool[choice%pool.length];
}
export function collectMystery(room:ModeRoom,p:P,item:WorldItem,now:number){
 const t=room.mode.tag;if(!t||t.ended||now>=room.round.endsAt||!active(p,now)||status(room,p).sealed!>now||p.inventory?.utility||item.kind!=='mystery'||item.source!=='mystery'||item.state!=='opened'||!inRange(room,p,item,65))return false;
 const reward=choosePower(t),epic=POWER_IDS.filter(id=>POWERS[id].rarity==='epic'),id=reward==='seal_tug'&&t.sealUsed[p.id]?epic[randomInt(epic.length)]:reward;if(!pickup(p,id))return false;p.inventory!.utilityInstanceId=randomUUID();if(id==='seal_tug')t.sealSpawned=true;item.kind=null;item.state='empty';item.refreshAt=now+CRATE_CONFIG.tag.respawnMs;t.collected[p.id]=(t.collected[p.id]??0)+1;event(room,p,now,'pickup',id);return true;
}
const direction=(p:P)=>{const n=Math.hypot(p.attackX,p.attackY)||1;return{x:p.attackX/n,y:p.attackY/n};};
function field(room:ModeRoom,p:P,id:TagField['kind'],now:number,duration:number,position:Position=p,other?:Position){const d=direction(p),f:TagField={id:randomUUID(),kind:id,ownerId:p.id,team:key(room,p),x:position.x,y:position.y,elevation:position.elevation,createdAt:now,endsAt:now+duration,dx:d.x,dy:d.y,other,characterId:p.characterId??'voltrix'};room.mode.tag!.fields.push(f);return f;}
function push(room:ModeRoom,p:P,dx:number,dy:number,now:number,up=true){const s=status(room,p);if(s.sealed!>now||s.forceImmune!>now)return;const strength=s.magnet!>now?.3:1,n=Math.hypot(dx,dy)||1;s.impulseX=dx/n*260*strength;s.impulseY=dy/n*260*strength;s.impulseUntil=now+450;s.forceImmune=now+1000;if(up){p.jumpOrigin={x:p.x,y:p.y,elevation:p.elevation};p.airborne=true;p.verticalVelocity=250*strength;}}
const ESCAPES=new Set<PowerId>(['speed_surge','blink_beaker','clone_decoy','phase_dash','portal_pair','seal_tug']);
export function activateTagPower(room:ModeRoom,p:P,now:number,instance?:string){
 if(isPair(p.inventory?.utility))return activatePair(room,p,now,instance);
 const t=room.mode.tag,id=p.inventory?.utility;if(!t||t.ended||now>=room.round.endsAt||!active(p,now)||!isPower(id)||instance!==undefined&&instance!==p.inventory?.utilityInstanceId)return false;const s=status(room,p),d=direction(p),map=MAPS[room.mapId];
 if(s.utilityCooldown!>now||s.sealed!>now||s.invisible!>now||s.phase!>now||ESCAPES.has(id)&&s.escapeLock!>now)return false;
 const grounded=isWalkable(p,map)&&!p.airborne;
 if(['sticky_trap','jump_pad','trap_clone','portal_pair','seal_tug'].includes(id)&&!grounded)return false;
 if(id==='seal_tug'&&(room.round.endsAt-now<=6000||t.sealUsed[p.id]))return false;
 let destination:Position|undefined;if(id==='blink_beaker'||id==='portal_pair'){if(!grounded)return false;destination=tagSweep(p,d.x*TAG.blinkRange,d.y*TAG.blinkRange,map);if(distance(destination,p)<40)return false;}
 consumeUtility(p);if(p.inventory)delete p.inventory.utilityInstanceId;t.used[p.id]=(t.used[p.id]??0)+1;event(room,p,now,'power',id);
 const until=now+POWERS[id].duration;s.utilityCooldown=now+POWERS[id].cooldown;
 if(ESCAPES.has(id))s.escapeLock=until+1000;
 switch(id){
  case 'smoke_screen':field(room,p,id,now,POWERS[id].duration);break;
  case 'speed_surge':s.speed=until;break;
  case 'jump_pad':case 'trap_clone':field(room,p,id,now,POWERS[id].duration);break;
  case 'footprint_tracker':s.tracker=until;break;
  case 'healing_burst':p.stamina=Math.min(100,(p.stamina??0)+35);s.slow=0;if(room.mode.pair?.status[p.id])room.mode.pair.status[p.id].slowUntil=0;break;
  case 'freeze_ball':t.shots.push({id:randomUUID(),kind:id,ownerId:p.id,team:key(room,p),x:p.x,y:p.y,elevation:p.elevation,dx:d.x,dy:d.y,endsAt:now+1600});break;
  case 'gravity_bomb':{const center=tagSweep(p,d.x*80,d.y*80,map);field(room,p,id,now,POWERS[id].duration,center);break;}
  case 'ghost_step':s.ghost=until;t.trails=t.trails.filter(v=>v.ownerId!==p.id);break;
  case 'flash_pop':for(const q of room.players as P[])if(hostile(room,p,q)&&q.socket&&status(room,q).sealed!<=now&&inRange(room,p,q))status(room,q).flash=until;break;
  case 'magnet_boots':s.magnet=until;break;
  case 'reverse_pulse':for(const q of room.players as P[])if(hostile(room,p,q)&&q.socket&&inRange(room,p,q))push(room,q,q.x-p.x,q.y-p.y,now);field(room,p,id,now,400);break;
  case 'blink_beaker':Object.assign(p,destination);p.jumpOrigin={...destination!};break;
  case 'clone_decoy':s.invisible=until;field(room,p,id,now,POWERS[id].duration);break;
  case 'phase_dash':s.phase=until;s.phaseX=d.x;s.phaseY=d.y;break;
  case 'portal_pair':field(room,p,id,now,POWERS[id].duration,p,destination);break;
  case 'time_bubble':field(room,p,id,now,POWERS[id].duration);break;
  case 'seal_tug':s.sealed=until;s.origin={x:p.x,y:p.y,elevation:p.elevation};t.sealUsed[p.id]=true;p.dashRemaining=0;p.sprinting=false;p.dx=0;p.dy=0;p.weaponAction=null;break;
 }
 return true;
}
export function hitTagClone(room:ModeRoom,p:P,now:number){const t=room.mode.tag;if(!t||!active(p,now)||status(room,p).sealed!>now||status(room,p).invisible!>now)return false;const w=canonicalWeapon(p.heldItem),range=w?WEAPON_BALANCE[w].range:TAG.tagRange;
 const f=t.fields.filter(f=>['clone_decoy','trap_clone'].includes(f.kind)&&f.team!==key(room,p)&&f.endsAt>now&&inRange(room,p,f,range)).sort((a,b)=>distance(p,a)-distance(p,b)).find(f=>{const d=distance(p,f)||1;return((f.x-p.x)*p.attackX+(f.y-p.y)*p.attackY)/d>=.5;});if(!f)return false;
 if(room.players.some(q=>hostile(room,p,q)&&distance(p,q)<distance(p,f)&&inRange(room,p,q,range)))return false;
 f.endsAt=now;t.consumed[p.id]=token(p);const owner=room.players.find(q=>q.id===f.ownerId) as P|undefined;if(f.kind==='clone_decoy'&&owner)status(room,owner).invisible=0;if(f.kind==='trap_clone'&&owner){field(room,owner,'slow_cloud',now,1500,f);status(room,p).slow=now+1500;}event(room,p,now,'burst');return true;
}
export function tagVisible(room:ModeRoom,p:ModePlayer,viewer?:ModePlayer,now=Date.now()){
 const t=room.mode.tag;if(!t)return true;const s=t.status[p.id];if(viewer&&key(room,p)===key(room,viewer))return true;if(s?.sealed!>now||s?.invisible!>now)return false;
 if(viewer&&hostile(room,p,viewer)){for(const f of t.fields.filter(f=>f.kind==='smoke_screen'&&f.endsAt>now)){const dx=p.x-viewer.x,dy=p.y-viewer.y,v=Math.max(0,Math.min(1,((f.x-viewer.x)*dx+(f.y-viewer.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(viewer.x+dx*v-f.x,viewer.y+dy*v-f.y)<95&&Math.abs((p.elevation??0)-(f.elevation??0))<70)return false;}}
 return true;
}
export function tickTag(room:ModeRoom,now:number,dt:number){
 const t=room.mode.tag;if(!t||t.ended)return;tagClock(room,now);
 if(!room.players.some(p=>key(room,p)===room.mode.it)){const next=room.players.find(p=>p.socket&&p.health>0);if(next){room.mode.it=key(room,next);for(const p of room.players as P[])if(key(room,p)===room.mode.it)clearEscape(room,p,now);t.announcement='IT reassigned after disconnect';t.announcementAt=now;t.serial++;}}

 for(const p of room.players as P[]){const s=status(room,p);s.bubble=0;if(s.origin&&(!(s.sealed!>now)||!p.socket)){Object.assign(p,isWalkable(s.origin,MAPS[room.mapId])?s.origin:MAPS[room.mapId].spawns[0]);delete s.origin;s.sealed=0;}if(!p.socket){s.invisible=0;s.phase=0;continue;}if(s.sealed!>now){Object.assign(p,s.origin);continue;}
  if(s.phase!>now){const q=tagSweep(p,(s.phaseX??0)*700*dt,(s.phaseY??0)*700*dt,MAPS[room.mapId],!!p.airborne);Object.assign(p,q);}
  if(s.impulseUntil!>now){const damp=Math.max(0,(s.impulseUntil!-now)/450),q=tagSweep(p,(s.impulseX??0)*dt*damp,(s.impulseY??0)*dt*damp,MAPS[room.mapId],!!p.airborne);Object.assign(p,q);}
 }
 t.fields=t.fields.filter(f=>f.endsAt>now&&room.players.some(p=>p.id===f.ownerId&&p.socket));
 for(const f of t.fields){if(f.kind==='clone_decoy'){const q=tagSweep(f,f.dx*120*dt,f.dy*120*dt,MAPS[room.mapId]);if(distance(q,f)<.1){f.dx=-f.dx;f.dy=-f.dy;}Object.assign(f,q);}
  for(const p of room.players as P[]){if(!p.socket||p.health<=0||status(room,p).sealed!>now)continue;const s=status(room,p),enemy=key(room,p)!==f.team;
   if(f.kind==='sticky_trap'&&enemy&&inRange(room,p,f,35)){s.slow=now+1500;f.endsAt=now;break;}
   if(f.kind==='slow_cloud'&&enemy&&inRange(room,p,f,65))s.slow=now+100;
   if(f.kind==='time_bubble'&&enemy&&inRange(room,p,f))s.bubble=now+100;
   if(f.kind==='gravity_bomb'&&enemy&&inRange(room,p,f)&&s.forceImmune!<=now){const n=distance(p,f)||1,strength=s.magnet!>now?.3:1;Object.assign(p,tagSweep(p,(f.x-p.x)/n*100*dt*strength,(f.y-p.y)/n*100*dt*strength,MAPS[room.mapId],!!p.airborne));}
   if(f.kind==='jump_pad'&&inRange(room,p,f,32)&&s.padLock!<=now){s.padLock=now+1000;p.jumpOrigin={x:p.x,y:p.y,elevation:p.elevation};p.airborne=true;p.verticalVelocity=380;s.impulseX=f.dx*150;s.impulseY=f.dy*150;s.impulseUntil=now+450;}
   if(f.kind==='portal_pair'&&f.other&&s.portalLock!<=now){const dest=inRange(room,p,f,30)?f.other:inRange(room,p,f.other,30)?f:null;if(dest&&isWalkable(dest,MAPS[room.mapId])){Object.assign(p,{x:dest.x,y:dest.y,elevation:dest.elevation??0});p.jumpOrigin={x:p.x,y:p.y,elevation:p.elevation};p.airborne=false;p.verticalVelocity=0;p.dashRemaining=0;s.portalLock=now+1000;}}
  }
 }
 t.shots=t.shots.filter(ball=>{if(now>=ball.endsAt)return false;const from={...ball},dx=ball.dx*650*dt,dy=ball.dy*650*dt,end={x:ball.x+dx,y:ball.y+dy,elevation:ball.elevation};if(!clearAttackLine(from,end,MAPS[room.mapId]))return false;
  const target=(room.players as P[]).filter(p=>p.socket&&p.health>0&&key(room,p)!==ball.team&&status(room,p).sealed!<=now).map(p=>{const u=Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/(dx*dx+dy*dy||1)));return{p,u,point:{x:from.x+u*dx,y:from.y+u*dy,elevation:from.elevation}};}).filter(v=>inRange(room,v.p,v.point,30)).sort((a,b)=>a.u-b.u)[0];if(target){const s=status(room,target.p);if(ball.kind==='freeze_ball'){if(s.freezeImmune!<=now){target.p.frozenUntil=now+TAG.freezeMs;target.p.dashRemaining=0;s.freezeImmune=now+TAG.freezeMs+TAG.freezeImmunityMs;event(room,target.p,now,'freeze');}}else push(room,target.p,ball.dx,ball.dy,now);return false;}Object.assign(ball,end);return true;});
 if(now-t.trailAt>=200){t.trailAt=now;for(const p of room.players){const s=status(room,p);if(!p.socket||s.ghost!>now||s.sealed!>now||s.invisible!>now)continue;const last=[...t.trails].reverse().find(v=>v.ownerId===p.id);if(!last||distance(last,p)>6)t.trails.push({ownerId:p.id,at:now,x:p.x,y:p.y,elevation:p.elevation});}}
 t.trails=t.trails.filter(v=>now-v.at<5000).slice(-180);t.events=t.events.filter(e=>now-e.at<1600).slice(-48);
 if(room.round.endsAt-now<=10000&&now-t.pingAt>=2000){t.pingAt=now;t.pings=room.players.filter(p=>p.socket&&key(room,p)!==room.mode.it&&tagVisible(room,p,undefined,now)).map(p=>({x:Math.round(p.x/200)*200,y:Math.round(p.y/200)*200,elevation:undefined}));}
}
export function finishTag(room:ModeRoom,now:number){const t=room.mode.tag;if(!t||t.ended)return;tagClock(room,now);t.ended=true;
 const keys=[...new Set(room.players.map(p=>key(room,p)))];t.rankings=keys.map(k=>({key:k,survived:k!==room.mode.it,itMs:t.spent[k]??0,tags:t.tags[k]??0,collected:room.players.filter(p=>key(room,p)===k).reduce((n,p)=>n+(t.collected[p.id]??0),0),used:room.players.filter(p=>key(room,p)===k).reduce((n,p)=>n+(t.used[p.id]??0),0)})).sort((a,b)=>Number(b.survived)-Number(a.survived)||a.itMs-b.itMs||b.tags-a.tags||(a.key<b.key?-1:a.key>b.key?1:0));
 room.mode.winnerKeys=t.rankings.filter(r=>r.survived).map(r=>r.key);room.mode.reason='Hot Potato — the side holding IT at zero loses. Survivors: least IT time, then most tags, then stable team ID.';
 for(const r of t.rankings){t.totalTime[r.key]=(t.totalTime[r.key]??0)+r.itMs;t.totalTags[r.key]=(t.totalTags[r.key]??0)+r.tags;t.totalCollected[r.key]=(t.totalCollected[r.key]??0)+r.collected;t.totalUsed[r.key]=(t.totalUsed[r.key]??0)+r.used;}
 for(const p of room.players as P[]){clearEscape(room,p,now);p.frozenUntil=0;consumeUtility(p);}t.status={};t.fields=[];t.shots=[];t.trails=[];t.pings=[];
}
export function tagView(room:ModeRoom,recipient:ModePlayer|undefined,now:number):TagState|undefined{const t=room.mode.tag;if(!t)return;const viewer=recipient,s=viewer?t.status[viewer.id]:undefined;return {...t,status:Object.fromEntries(Object.entries(t.status).map(([id,value])=>[id,{...value,origin:viewer?.id===id?value.origin:undefined}])),trails:viewer&&s?.tracker!>now?t.trails.filter(v=>{const p=room.players.find(p=>p.id===v.ownerId);return p&&p.id!==viewer.id&&status(room,p).ghost!<=now&&tagVisible(room,p,viewer,now)&&distance(v,viewer)<500;}):[],pings:viewer&&key(room,viewer)===room.mode.it&&room.round.endsAt-now<=10000?t.pings:[],consumed:{}};}
