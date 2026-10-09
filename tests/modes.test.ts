import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {WebSocket} from 'ws';
import {RoomServer} from './selection-fixture';
import {MAPS} from '../shared/map.js';
import {isWalkable,STEP} from '../shared/game.js';
import {CHEST_OPEN_MS,pickupPosition} from '../shared/loot.js';
import {RULES,teamKey,type GameMode,type Format} from '../shared/modes.js';
import {mapAnchors} from '../shared/map-anchors.js';
import {beginMode,interact,tickMode,MODE_RULES,throwBall} from '../server/modes.js';
function fixture(count=2,mode:GameMode='tag',format:Format='solo'){
 const server=new RoomServer(),packets:any[][]=[];
 const socket=()=>{const messages:any[]=[];packets.push(messages);return {readyState:1,send:(raw:string)=>messages.push(JSON.parse(raw))} as unknown as WebSocket;};
 const sockets=Array.from({length:count},socket);server.message(sockets[0],JSON.stringify({type:'create',name:'P0'}));const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)server.message(sockets[i],JSON.stringify({type:'join',name:`P${i}`,code:room.code}));
 const send=(i:number,m:any)=>server.message(sockets[i],JSON.stringify(m));
 send(0,{type:'settings',mode,format});
 const start=()=>{for(let i=0;i<count;i++)send(i,{type:'ready',ready:true});send(0,{type:'start'});};
 return {server,room,send,start,sockets,socket,packets};
}
function swing(f:ReturnType<typeof fixture>,a=0,b=1){const p=f.room.players[a],q=f.room.players[b];Object.assign(p,{x:1000,y:700,elevation:0,attackCooldown:0,frozenUntil:0});Object.assign(q,{x:1040,y:700,elevation:0,protection:0});f.send(a,{type:'input',matchId:f.room.match.id,roundNumber:f.room.match.roundNumber,seq:p.seq+1,dx:0,dy:0,aimX:1,aimY:0,attackId:p.attackId+1});f.server.tick();}
test('host authority, enum validation, ready reset, and invalid Duo roster rejection',()=>{
 const f=fixture();f.send(1,{type:'settings',mode:'kill_race',format:'duo'});assert.equal(f.room.selectedGameMode,'tag');f.send(0,{type:'settings',mode:'__proto__',format:'solo'});assert.equal(f.room.selectedGameMode,'tag');f.send(0,{type:'ready',ready:true});f.send(0,{type:'settings',mode:'flag_run',format:'duo'});assert(f.room.players.every(p=>!p.ready));f.start();assert.equal(f.room.phase,'lobby');
 for(const count of [1,2,3,5]){const x=fixture(count,'tag','duo');x.start();assert.equal(x.room.phase,'lobby');}
});
for(const mode of ['tag','kill_race','flag_run'] as const)for(const [count,format] of [[2,'solo'],[4,'solo'],[6,'solo'],[4,'duo'],[6,'duo']] as const)test(`${mode}: ${count} ${format}, stable teams, three rounds, map rotation, results and lobby`,()=>{
 const f=fixture(count,mode,format);f.start();assert.equal(f.room.phase,'arena');const teams={...f.room.mode.teams};assert.equal(new Set(Object.values(teams)).size,format==='duo'?count/2:count);
 for(let i=1;i<=3;i++){assert.equal(f.room.match.roundNumber,i);assert.equal(f.room.selectedGameMode,mode);assert.deepEqual(f.room.mode.teams,teams);assert.equal(f.room.mode.items.length,MAPS[f.room.mapId].spawns.length);f.server.tick(f.room.round.endsAt);assert.equal(f.room.phase,i===3?'complete':'intermission');if(i<3)f.server.tick(f.room.round.returnAt);}
 assert.equal(f.room.match.history.length,3);assert.equal(f.room.match.mapHistory[0],'central_plaza');assert.notEqual(f.room.match.mapHistory[0],f.room.match.mapHistory[1]);assert(f.room.match.results.length>0);f.send(0,{type:'lobby'});assert.equal(f.room.phase,'lobby');assert.equal(f.room.mode.items.length,0);assert(f.room.players.every(p=>!p.ready));
});
test('all map anchors are walkable and flag destinations are separated',()=>{for(const id of Object.keys(MAPS)){const a=mapAnchors(id);assert(isWalkable(a.capture,MAPS[id]),id);assert(a.flags.length>0,id);for(const p of [...a.chests,...a.floor,...a.flags])assert(isWalkable(p,MAPS[id]),id);}});
test('authoritative Tag transfer, grace, teammate immunity and timeout loser',()=>{
 const f=fixture(4,'tag','duo');f.start();f.room.mode.it=teamKey(f.room.mode,f.room.players[0].id);swing(f,0,1);assert.equal(f.room.mode.it,teamKey(f.room.mode,f.room.players[0].id));
 // Move teammate outside melee range, then tag the opponent.
 f.room.players[1].x=500;swing(f,0,2);assert.equal(f.room.mode.it,teamKey(f.room.mode,f.room.players[2].id));assert.equal(f.room.players[2].health,100);swing(f,2,0);assert.equal(f.room.mode.it,teamKey(f.room.mode,f.room.players[2].id));f.server.tick(f.room.round.endsAt);assert.deepEqual(f.room.mode.winnerKeys,[teamKey(f.room.mode,f.room.players[0].id)]);
});
test('chest contention, mode loot isolation, replay and distance checks',()=>{
 for(const mode of ['tag','kill_race','flag_run'] as const){const f=fixture(2,mode);f.start();const chest=f.room.mode.items.find(i=>i.source==='chest')!;f.room.players.forEach(p=>Object.assign(p,{x:chest.x,y:chest.y,elevation:chest.elevation??0}));
  f.send(0,{type:'interact',matchId:'stale',roundNumber:1});assert.equal(chest.state,'closed');interact(f.room,f.room.players[0],Date.now());assert.equal(chest.state,'opening');tickMode(f.room,Date.now()+CHEST_OPEN_MS+1,STEP);assert.equal(chest.state,'opened');f.room.players.forEach(p=>Object.assign(p,pickupPosition(chest)));interact(f.room,f.room.players[0],Date.now()+CHEST_OPEN_MS+1);interact(f.room,f.room.players[1],Date.now());assert.equal(chest.state,'empty');assert(f.room.players[0].heldItem);assert.equal(f.room.players[1].heldItem,null);assert(MODE_RULES[mode].loot.includes(f.room.players[0].heldItem!));
 }
});
test('freeze ball has authoritative hit, duration, wall collision and movement restoration',()=>{
 const f=fixture();f.start();const [p,q]=f.room.players;Object.assign(p,{x:1300,y:1400,elevation:110,heldItem:'freeze_ball',attackX:1,attackY:0});Object.assign(q,{x:1380,y:1400,elevation:110});const now=Date.now();assert(throwBall(f.room,p,now));assert.equal(p.heldItem,null);for(let i=0;i<6;i++)tickMode(f.room,now+i*STEP*1000,STEP);assert(q.frozenUntil>now);assert.equal(f.room.mode.projectiles.length,0);
 q.lastInput=now;q.dx=1;const x=q.x;f.server.tick(now+100);assert.equal(q.x,x);q.lastInput=q.frozenUntil+1;f.server.tick(q.frozenUntil+1);assert(q.x>x);
 Object.assign(p,{x:55,y:400,elevation:110,heldItem:'freeze_ball',attackX:-1,attackY:0});throwBall(f.room,p,now);for(let i=0;i<3;i++)tickMode(f.room,now+i*STEP*1000,STEP);assert.equal(f.room.mode.projectiles.length,0);
});
test('Kill Race counts non-bounty kills, respawns and immediately ends at Duo target',()=>{
 const f=fixture(4,'kill_race','duo');f.start();f.room.players[1].x=400;f.room.players[2].health=25;swing(f,0,2);const team=teamKey(f.room.mode,f.room.players[0].id);assert.equal(f.room.mode.scores[team],1);assert.equal(f.room.players[2].health,0);assert.equal(f.room.players[2].koRemaining,5);const version=f.room.players[2].spawnVersion;for(let i=0;i<151;i++)f.server.tick();assert.equal(f.room.players[2].spawnVersion,version+1);assert.equal(f.room.players[2].health,100);f.room.mode.scores[team]=RULES.killTarget-1;f.room.players[2].health=25;swing(f,0,2);assert.equal(f.room.phase,'intermission');assert.deepEqual(f.room.mode.winnerKeys,[team]);
});
test('Flag waits, has one carrier, drops on KO/disconnect, captures for the team',()=>{
 const f=fixture(4,'flag_run','duo');f.start();const now=Date.now();tickMode(f.room,now,STEP);assert.equal(f.room.mode.flag.state,'not_spawned');tickMode(f.room,f.room.mode.flag.spawnAt,STEP);const flag=f.room.mode.flag;assert.equal(flag.state,'spawned');const [p,q]=f.room.players;Object.assign(p,flag.position);Object.assign(q,flag.position);interact(f.room,p,now);interact(f.room,q,now);assert.equal(flag.carrier,p.id);f.server.disconnect(f.sockets[0]);assert.equal(flag.state,'dropped');interact(f.room,q,now);assert.equal(flag.carrier,q.id);Object.assign(q,f.room.mode.capture);assert(tickMode(f.room,now,STEP));f.server.endRound(f.room,now);assert.equal(flag.state,'captured');assert.deepEqual(f.room.mode.winnerKeys,[teamKey(f.room.mode,q.id)]);
});
test('reconnect preserves teams, inventory, frozen status; stale settings cannot mutate a match',()=>{
 const f=fixture(4,'tag','duo');f.start();const p=f.room.players[0],team=teamKey(f.room.mode,p.id);p.heldItem='freeze_ball';p.frozenUntil=Date.now()+3000;f.server.disconnect(f.sockets[0]);const ws=f.socket();f.server.message(ws,JSON.stringify({type:'resume',code:f.room.code,token:p.token}));assert.equal(teamKey(f.room.mode,p.id),team);assert.equal(p.heldItem,'freeze_ball');assert(p.frozenUntil>Date.now());f.send(1,{type:'settings',mode:'kill_race',format:'solo'});assert.equal(f.room.selectedGameMode,'tag');
});
test('permanent Duo departure returns to a valid lobby instead of creating an uneven match',()=>{
 const f=fixture(4,'kill_race','duo');f.start();f.send(3,{type:'leave'});assert.equal(f.room.phase,'lobby');assert(f.room.players.every(p=>!p.ready));f.send(0,{type:'start'});assert.equal(f.room.phase,'lobby');
});
test('weapon damage is captured before simultaneous KOs clear inventories',()=>{
 const f=fixture(2,'kill_race');f.start();f.room.players.forEach((p,i)=>{Object.assign(p,{x:1000+i*40,y:700,elevation:0,health:40,heldItem:'hammer',protection:0});f.send(i,{type:'input',matchId:f.room.match.id,roundNumber:1,seq:1,dx:0,dy:0,attackId:1,aimX:i?-1:1,aimY:0});});f.server.tick();assert(f.room.players.every(p=>p.health===0&&p.eliminations===1));
});
test('disconnect cannot discard IT during reconnect grace',()=>{const f=fixture();f.start();f.room.mode.it=f.room.players[0].id;f.server.disconnect(f.sockets[0]);tickMode(f.room,Date.now(),STEP);assert.equal(f.room.mode.it,f.room.players[0].id);});
