import {randomUUID,randomInt} from 'node:crypto';
import {CRATE_CONFIG,CRATE_PRESENTATION,crateRewardPool,type CrateState} from '../shared/mystery-crates.js';
import {MAPS} from '../shared/map.js';
import {isWalkable,type Position} from '../shared/game.js';
import {clearAttackLine} from '../shared/combat.js';
import {canonicalWeapon,LOOT_CONFIG} from '../shared/weapons.js';
import {pickup} from '../shared/inventory.js';
import {lootPositions} from './weapon-loot.js';
import {mapAnchors} from '../shared/map-anchors.js';
import {collectMystery} from './tag-run.js';
import type {ModeRoom,ModePlayer} from './modes.js';
import type {WorldItem} from '../shared/modes.js';
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??0)-(b.elevation??0));
export function cratePointValid(room:ModeRoom,p:Position){
 const map=MAPS[room.mapId],c=CRATE_CONFIG[room.selectedGameMode],anchors=mapAnchors(room.mapId);
 if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<26||p.y<26||p.x>map.bounds.width-26||p.y>map.bounds.height-26)return false;
 // Chest footprint (1.3m × 1.02m at .8 scale), not merely a walkable center point.
 for(const dx of [-20,0,20])for(const dy of [-16,0,16]){const q={x:p.x+dx,y:p.y+dy,elevation:p.elevation??0};if(!isWalkable(q,map)||!clearAttackLine(p,q,map))return false;}
 if(room.players.some(q=>q.socket&&q.health>0&&distance(p,q)<c.playerClearance))return false;
 if(room.mode.items.some(i=>i.state!=='empty'&&distance(p,i.pickupPosition??i)<(i.source==='mystery'?c.minSpacing:c.pickupClearance)))return false;
 if(room.selectedGameMode==='flag_run'&&[anchors.capture,...anchors.flags,room.mode.flag.position].some(q=>distance(p,q)<c.objectiveClearance))return false;
 return true;
}
function recordWeapons(room:ModeRoom){const t=room.mode.crates!;const seen=new Set(t.weaponKeys);for(const item of room.mode.items){const key=item.source==='chest'?'chest:'+item.id:item.source==='floor'&&canonicalWeapon(item.kind)&&item.weapon?'floor:'+item.id+':'+item.weapon.instanceId:null;if(key&&!seen.has(key)){seen.add(key);t.weaponKeys.push(key);t.weaponOpportunities++;}}}
export function initCrates(room:ModeRoom,now:number){
 room.mode.items=room.mode.items.filter(i=>i.source!=='mystery');
 room.mode.crates={version:1,startedAt:now,nextSpawnAt:now+CRATE_CONFIG[room.selectedGameMode].initialDelayMs,ended:false,weaponKeys:[],weaponOpportunities:0,baseWeaponOpportunities:0,repeatingWeapons:room.mode.items.filter(i=>i.source==='floor'&&!!canonicalWeapon(i.kind)).length,referenceWeaponOpportunities:0,crateOpportunities:0,receipts:[],collectionAfter:{}};
 recordWeapons(room);room.mode.crates.baseWeaponOpportunities=room.mode.crates.weaponOpportunities;tickCrates(room,now,true);
}
export function tickCrates(room:ModeRoom,now:number,initial=false){
 const t=room.mode.crates,c=CRATE_CONFIG[room.selectedGameMode];if(!t||t.ended||!c.enabled||now>=room.round.endsAt)return;
 recordWeapons(room);t.referenceWeaponOpportunities=Math.max(t.weaponOpportunities,t.baseWeaponOpportunities+Math.floor(Math.max(0,now-t.startedAt)/LOOT_CONFIG.respawnMs)*t.repeatingWeapons);t.receipts=t.receipts.filter(r=>now-r.at<CRATE_PRESENTATION.receiptMs).slice(-64);
 if(now<t.nextSpawnAt||room.round.endsAt-now<=c.stopBeforeEndMs)return;
 let budget=Math.max(0,Math.floor(t.referenceWeaponOpportunities*c.ratio)-t.crateOpportunities);
 const available=room.mode.items.filter(i=>i.source==='mystery'&&i.state!=='empty').length;
 const capacity=c.maxActive-available;if(!budget||capacity<=0)return;
 // Choose from the original, traversably connected loot route candidates. Shuffle on every respawn.
 const candidates=lootPositions(room.mapId);let spawned=0;
 for(const point of candidates){
  if(spawned>=Math.min(budget,capacity,initial?c.maxActive:1))break;if(!cratePointValid(room,point))continue;
  let slot=room.mode.items.find(i=>i.source==='mystery'&&i.state==='empty'&&now>=i.refreshAt);
  if(!slot){if(room.mode.items.filter(i=>i.source==='mystery').length>=c.maxActive)break;slot={...point,id:'crate-'+randomUUID(),source:'mystery',state:'empty',kind:null,refreshAt:0,generation:0};room.mode.items.push(slot);}
  Object.assign(slot,point,{state:'opened',kind:'mystery',spawnedAt:now,generation:(slot.generation??0)+1,collectedAt:undefined,collectorId:undefined,collectionId:undefined});t.crateOpportunities++;spawned++;
 }
 // A blocked spawn retries at the same bounded cadence; never relax collision/occupancy checks.
 t.nextSpawnAt=now+c.spawnIntervalMs;
}
export function collectCrate(room:ModeRoom,p:ModePlayer,item:WorldItem,now:number){
 const t=room.mode.crates,c=CRATE_CONFIG[room.selectedGameMode];if(!t||t.ended||now>=room.round.endsAt||!room.players.includes(p)||!room.mode.items.includes(item)||!p.socket||p.health<=0||p.frozenUntil>now||p.inventory?.utility||(t.collectionAfter[p.id]??0)>now||item.source!=='mystery'||item.state!=='opened'||item.kind!=='mystery'||distance(p,item)>65||!clearAttackLine(p,item,MAPS[room.mapId]))return false;
 // Synchronous inventory grant + availability change: no await between eligibility and claim.
 if(room.selectedGameMode==='tag'){if(!collectMystery(room,p,item,now))return false;}
 else {const pool=crateRewardPool(room.selectedGameMode);if(typeof pool==='string'||!pool.length||!pickup(p,pool[randomInt(pool.length)]))return false;p.inventory!.utilityInstanceId=randomUUID();item.state='empty';item.kind=null;}
 const id=randomUUID();item.collectedAt=now;item.collectorId=p.id;item.collectionId=id;item.refreshAt=now+c.respawnMs;t.collectionAfter[p.id]=now+c.collectionCooldownMs;
 t.receipts.push({id,crateId:item.id,generation:item.generation??0,ownerId:p.id,at:now,reward:p.inventory!.utility as 'freeze_ball'});return true;
}
export function finishCrates(room:ModeRoom){const t=room.mode.crates;if(!t)return;t.ended=true;t.receipts=[];t.collectionAfter={};for(const i of room.mode.items)if(i.source==='mystery'){i.state='empty';i.kind=null;i.refreshAt=0;}}
export function crateView(t:CrateState|undefined,recipientId?:string):CrateState|undefined{return t?{...t,weaponKeys:[],collectionAfter:{},receipts:t.receipts.map(r=>({...r,reward:r.ownerId===recipientId?r.reward:undefined}))}:undefined;}
