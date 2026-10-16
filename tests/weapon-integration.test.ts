import test from 'node:test';
import assert from 'node:assert/strict';
import type {WebSocket} from 'ws';
import {RoomServer} from './selection-fixture';
import {pickup,activeWeapon,weaponSlots,clearInventory} from '../shared/inventory';
import {WEAPON_IDS,AMMO_CONFIG,WEAPON_BALANCE,createWeapon,isGun,allowedWeapon,GROUND_WEAPONS,CHEST_WEAPONS,weaponAction,LOOT_CONFIG,type WeaponId} from '../shared/weapons';
import {buildLoot,chestReward} from '../server/weapon-loot';
import {startWeaponAttack,reloadWeapon,tickWeapon} from '../server/weapon-combat';
import {interact,beginMode,tickMode} from '../server/modes';
import {MAPS} from '../shared/map';
import {clearAttackLine} from '../shared/combat';
import {freshMotion,isWalkable,STEP,advanceMotion} from '../shared/game';
import {CHEST_OPEN_MS,pickupPosition} from '../shared/loot';
import type {GameMode} from '../shared/modes';
import {teamKey} from '../shared/modes';
function fixture(mode:GameMode='kill_race'){
 const server=new RoomServer(),packets:any[][]=[];const sockets=Array.from({length:2},()=>{const messages:any[]=[];packets.push(messages);return{readyState:1,send:(m:string)=>messages.push(JSON.parse(m))} as unknown as WebSocket;});
 const send=(i:number,m:any)=>server.message(sockets[i],JSON.stringify(m));send(0,{type:'create',name:'A'});const room=server.sessions.get(sockets[0])!.room;send(1,{type:'join',code:room.code,name:'B'});send(0,{type:'settings',mode,format:'solo'});send(0,{type:'ready',ready:true});send(1,{type:'ready',ready:true});send(0,{type:'start'});room.round.endsAt=Date.now()+900000;const [p,q]=room.players,map=MAPS[room.mapId];
 let pair:{a:any;b:any}|undefined;for(const a of map.spawns){for(let i=0;i<16;i++){const b={x:a.x+Math.cos(i*Math.PI/8)*55,y:a.y+Math.sin(i*Math.PI/8)*55,elevation:a.elevation};if(isWalkable(b,map)&&clearAttackLine(a,b,map)){pair={a,b};break;}}if(pair)break;}assert(pair);Object.assign(p,freshMotion(pair.a));Object.assign(q,freshMotion(pair.b));p.protection=q.protection=0;const n=Math.hypot(q.x-p.x,q.y-p.y);p.attackX=(q.x-p.x)/n;p.attackY=(q.y-p.y)/n;q.attackX=-p.attackX;q.attackY=-p.attackY;
 const epoch={matchId:room.match.id,roundNumber:room.match.roundNumber};
 const grant=(id:WeaponId,who=p)=>{assert(pickup(who,id,createWeapon(id,'owned-'+id+'-'+who.id)));return activeWeapon(who)!;};return{server,room,p,q,sockets,send,epoch,grant,packets};
}
test('mode whitelist and all randomized sources obey exact ground/chest rules across five maps',()=>{
 for(const mode of ['tag','flag_run','kill_race'] as const){const seen=new Set();for(let n=0;n<300;n++){const reward=chestReward(mode);assert(CHEST_WEAPONS.includes(reward));assert(!GROUND_WEAPONS.includes(reward));assert(allowedWeapon(mode,reward));seen.add(reward);}assert.equal(seen.size,mode==='tag'?3:7);
 for(const map of Object.values(MAPS))for(let n=0;n<5;n++){const loot=buildLoot(map.id);assert.equal(loot.length,10);assert.equal(new Set(loot.map(i=>i.id)).size,10);for(const item of loot){assert(isWalkable(item,map),map.id);if(item.source==='floor'&&item.kind!=='freeze_ball')assert(GROUND_WEAPONS.includes(item.kind as WeaponId));}for(let a=0;a<loot.length;a++)for(let b=a+1;b<loot.length;b++)assert(Math.hypot(loot[a].x-loot[b].x,loot[a].y-loot[b].y)>=90);}}
});
for(const mode of ['tag','flag_run','kill_race'] as const)for(const id of WEAPON_IDS)test(`${mode}: ${id} validates ownership/permissions and actual event timing`,()=>{
 const f=fixture(mode),w=f.grant(id),now=Date.now();const permitted=allowedWeapon(mode,id),health=f.q.health,it=f.room.mode.it;f.room.mode.it=f.p.id;
 assert.equal(startWeaponAttack(f.p,f.room,now),permitted);if(!permitted){assert.equal(reloadWeapon(f.p,f.room,now),false);assert.equal(f.p.weaponAction,null);return;}
 const action=f.p.weaponAction!,event=weaponAction(id,action.clip).events[0];assert(event);assert.deepEqual(tickWeapon(f.room,f.p,now+event.time*1000-1),[]);const hits=tickWeapon(f.room,f.p,now+event.time*1000+1);assert(hits.length>0,id);assert.deepEqual(tickWeapon(f.room,f.p,now+event.time*1000+1),[],'event cannot damage twice');if(isGun(id))assert.equal(w.magazine,AMMO_CONFIG[id as keyof typeof AMMO_CONFIG].magazine-1);assert.equal(f.q.health,health,'events return intents, only existing room pipeline owns health');
});
test('atomic pickup contention, capacity, replacement and dropped ammo preserve one instance',()=>{
 const f=fixture(),now=Date.now();f.room.mode.items=[{...f.p,id:'one',source:'floor',state:'opened',kind:'pistol',weapon:createWeapon('pistol','unique'),refreshAt:0}];Object.assign(f.q,{x:f.p.x,y:f.p.y,elevation:f.p.elevation});interact(f.room,f.p,now,'one');interact(f.room,f.q,now,'one');assert.equal(activeWeapon(f.p)?.instanceId,'unique');assert.equal(activeWeapon(f.q),null);assert.equal(f.room.mode.items[0].state,'empty');f.grant('riot-bat');
 const reward={...f.p,id:'replace',source:'drop' as const,state:'opened' as const,kind:'shotgun' as const,weapon:createWeapon('shotgun','new'),refreshAt:0};f.room.mode.items.push(reward);interact(f.room,f.p,now,'replace');assert.equal(reward.state,'opened','full inventory rejects without explicit replacement');interact(f.room,f.p,now,'replace',1);assert.equal(reward.state,'empty');assert.equal(weaponSlots(f.p)[0]?.instanceId,'new');assert(f.room.mode.items.some(i=>i.source==='drop'&&i.weapon?.instanceId==='unique'));
 const gun=activeWeapon(f.p)!;gun.magazine=2;gun.reserve=7;f.send(0,{type:'drop_weapon',...f.epoch,instanceId:gun.instanceId});const drop=f.room.mode.items.find(i=>i.weapon?.instanceId===gun.instanceId)!;assert(drop);assert.equal(drop.weapon?.magazine,2);assert.equal(drop.weapon?.reserve,7);assert(!weaponSlots(f.p).some(w=>w?.instanceId===gun.instanceId));Object.assign(f.q,pickupPosition(drop));interact(f.room,f.q,now,drop.id);assert.equal(activeWeapon(f.q)?.magazine,2);assert.equal(activeWeapon(f.q)?.reserve,7);
});
for(const id of ['pistol','assault-rifle','shotgun','sniper-rifle'] as const)test(`${id}: correct ammo, timed reload, switch interruption, stale instance rejection`,()=>{
 const f=fixture(),w=f.grant(id),now=Date.now(),config=AMMO_CONFIG[id];assert.equal(w.magazine,config.magazine);assert.equal(w.reserve,config.reserve);w.magazine=0;assert.equal(startWeaponAttack(f.p,f.room,now),false);assert(reloadWeapon(f.p,f.room,now));const a=f.p.weaponAction!,first=weaponAction(id,'reload').events[0];tickWeapon(f.room,f.p,now+first.time*1000-1);assert.equal(w.magazine,0);tickWeapon(f.room,f.p,now+first.time*1000+1);assert.equal(w.magazine,id==='shotgun'?1:config.magazine);assert.equal(w.reserve,config.reserve-w.magazine);const before=w.magazine+w.reserve;f.grant('riot-bat');f.send(0,{type:'equip',...f.epoch,slot:1});f.send(0,{type:'reload',...f.epoch,instanceId:'stale'});assert.equal((f.p.weaponAction as {clip:string}|null)?.clip,'equip');tickWeapon(f.room,f.p,f.p.weaponAction!.endsAt+1);assert.equal(f.p.weaponAction,null);assert.equal(w.magazine+w.reserve,before);if(id==='shotgun'){f.p.attackCooldown=0;assert(startWeaponAttack(f.p,f.room,now+1500));assert.equal((f.p.weaponAction as {clip:string}|null)?.clip,'fire');}
});
test('Tag rejects forged gun pickup/equip/fire/reload and reconciles gun/ammo away',()=>{
 const f=fixture('tag'),now=Date.now();f.room.mode.items=[{...f.p,id:'forged',source:'drop',state:'opened',kind:'pistol',weapon:createWeapon('pistol','forged'),refreshAt:0}];interact(f.room,f.p,now,'forged');assert.equal(activeWeapon(f.p),null);const w=f.grant('pistol');f.send(0,{type:'reload',...f.epoch,instanceId:w.instanceId});assert.equal(f.p.weaponAction,null);f.send(0,{type:'equip',...f.epoch,slot:1});f.send(0,{type:'input',...f.epoch,seq:1,dx:0,dy:0,attackId:1,weaponInstanceId:w.instanceId,aimX:1,aimY:0});f.server.tick();assert.equal(activeWeapon(f.p),null);assert.equal(f.room.mode.weaponEffects?.length,0);assert.equal(f.q.health,100);
});
test('real room combat credits gun KO once in Kill Race; Tag melee transfers IT without damage',()=>{
 for(const mode of ['kill_race','tag'] as const){const f=fixture(mode),w=f.grant(mode==='tag'?'riot-bat':'pistol'),now=Date.now();f.q.health=mode==='tag'?100:20;f.room.mode.it=f.p.id;f.send(0,{type:'input',...f.epoch,seq:1,dx:0,dy:0,attackId:1,weaponInstanceId:w.instanceId,aimX:f.p.attackX,aimY:f.p.attackY});f.server.tick(now);const action=f.p.weaponAction!;assert(action);const event=weaponAction(w.weaponId,action.clip).events[0];f.server.tick(now+event.time*1000+2);if(mode==='tag'){assert.equal(f.room.mode.it,f.q.id);assert.equal(f.q.health,100);assert.equal(f.p.eliminations,0);}else{assert.equal(f.q.health,0);assert.equal(f.p.eliminations,1);assert.equal(f.room.mode.scores[teamKey(f.room.mode,f.p.id)],1);f.server.tick(now+event.time*1000+3);assert.equal(f.p.eliminations,1);}}
});
test('firearm wall occlusion rejects both reticle-through-wall and obstructed muzzle hits',()=>{
 const f=fixture(),w=f.grant('sniper-rifle'),map=MAPS[f.room.mapId],now=Date.now();const wall={id:'test-cover',name:'cover',kind:'building' as const,accent:'#fff',x:(f.p.x+f.q.x)/2-5,y:(f.p.y+f.q.y)/2-5,width:10,height:10,bottom:0,top:1000};map.blocks.push(wall);try{assert(startWeaponAttack(f.p,f.room,now));const e=weaponAction(w.weaponId,'fire').events[0];assert.equal(tickWeapon(f.room,f.p,now+e.time*1000+1).length,0);}finally{map.blocks.pop();}
});
for(const id of ['pistol','assault-rifle','shotgun','sniper-rifle'] as const)test(`${id}: exhaustion, two-round reserve, repeated ticks and bolt/rate gates conserve ammunition`,()=>{
 const f=fixture(),w=f.grant(id);let now=Date.now();const original=w.magazine;
 while(w.magazine>0){f.p.attackCooldown=0;assert(startWeaponAttack(f.p,f.room,now));const a=f.p.weaponAction!;assert.equal(startWeaponAttack(f.p,f.room,now+1),false,'busy fire/bolt rejects overlap');tickWeapon(f.room,f.p,a.endsAt+1);now=a.endsAt+2;}
 assert.equal(startWeaponAttack(f.p,f.room,now),false);assert.equal(w.magazine,0);w.reserve=2;f.p.attackCooldown=0;assert(reloadWeapon(f.p,f.room,now));const a=f.p.weaponAction!;tickWeapon(f.room,f.p,a.endsAt+1);assert.equal(w.magazine,2);assert.equal(w.reserve,0);for(let n=0;n<10;n++)tickWeapon(f.room,f.p,a.endsAt+2+n);assert.equal(w.magazine,2);assert.equal(reloadWeapon(f.p,f.room,a.endsAt+3),false);assert(original>2);
});
test('dead/frozen clients cannot use reload, drop, pickups or chests; stale epoch and instance cannot mutate inventory',()=>{
 const f=fixture(),w=f.grant('pistol');w.magazine=1;const epoch={...f.epoch,instanceId:w.instanceId},now=Date.now();
 for(const bad of [{health:0,frozenUntil:0},{health:100,frozenUntil:now+3000}]){Object.assign(f.p,bad);f.send(0,{type:'reload',...epoch});f.send(0,{type:'drop_weapon',...epoch});assert.equal(activeWeapon(f.p)?.instanceId,w.instanceId);assert.equal(f.p.weaponAction,null);assert.equal(w.magazine,1);}
 Object.assign(f.p,{health:100,frozenUntil:0});f.send(0,{type:'reload',...epoch,matchId:'stale'});f.send(0,{type:'drop_weapon',...epoch,roundNumber:999});f.send(0,{type:'drop_weapon',...epoch,instanceId:'old-owner'});assert.equal(activeWeapon(f.p)?.instanceId,w.instanceId);assert.equal(f.p.weaponAction,null);
});
test('Flag Run firing keeps the existing flag carrier and score objective independent of weapon slots',()=>{
 const f=fixture('flag_run'),w=f.grant('pistol'),now=Date.now();f.room.mode.flag={state:'carried',carrier:f.p.id,position:{x:f.p.x,y:f.p.y,elevation:f.p.elevation},spawnAt:now};f.send(0,{type:'input',...f.epoch,seq:1,dx:0,dy:0,attackId:1,weaponInstanceId:w.instanceId,aimX:f.p.attackX,aimY:f.p.attackY});f.server.tick(now);const a=f.p.weaponAction!;f.server.tick(a.startedAt+weaponAction(w.weaponId,'fire').events[0].time*1000+1);assert(f.q.health<100);assert.equal(f.room.mode.flag.carrier,f.p.id);assert.equal(f.room.mode.flag.state,'carried');assert.deepEqual(f.room.mode.winnerKeys,[]);
});
test('slide decelerates while keeping the original .42 second, 168-unit unobstructed travel',()=>{
 const map={...MAPS.central_plaza,bounds:{width:3000,height:3000},blocks:[],surfaces:[],ground:undefined};let p=freshMotion({x:1000,y:1000}),first=0,mid=0;for(let n=0;n<13;n++){const old=p.x;p=advanceMotion(p,{dx:1,dy:0,dashId:1,dashStyle:'slide'},STEP,map);if(n===0)first=p.x-old;if(n===7)mid=p.x-old;}assert(first>mid);assert(Math.abs(p.x-1168)<1e-6);assert.equal(p.dashRemaining,0);
});
