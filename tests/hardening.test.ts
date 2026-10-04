import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebSocket } from 'ws';
import { RoomServer } from '../server/rooms.js';
import { COMBAT } from '../shared/combat.js';
import { isWalkable, MOVEMENT, STEP, RECONNECT_MS } from '../shared/game.js';

function fixture(count=3,start=true){
 const server=new RoomServer();const packets=new Map<WebSocket,any[]>();
 const socket=()=>{const messages:any[]=[];const ws={readyState:1,send:(s:string)=>messages.push(JSON.parse(s))} as unknown as WebSocket;packets.set(ws,messages);return ws;};
 const sockets=Array.from({length:count},socket);
 const send=(ws:WebSocket,m:any)=>server.message(ws,JSON.stringify(m.type==='input'?{matchId:room.match.id,roundNumber:room.match.roundNumber,...m}:m));
 server.message(sockets[0],JSON.stringify({type:'create',name:'P0'}));const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)send(sockets[i],{type:'join',name:`P${i}`,code:room.code});
 const begin=()=>{sockets.forEach(ws=>send(ws,{type:'ready',ready:true}));send(sockets[0],{type:'start'});};if(start)begin();
 const completeRound=()=>server.tick(room.round.endsAt);
 const next=()=>{completeRound();server.tick(room.round.returnAt);};
 return {server,room,sockets,socket,packets,send,begin,completeRound,next};
}
for(const state of ['lobby','damaged','scored','KO','respawn','intermission','round2','round3','complete']){
 test(`resume preserves identity, private state and server deadline during ${state}`,()=>{
  const f=fixture(3,state!=='lobby');const p=f.room.players[1];
  if(state==='round2')f.next();if(state==='round3'){f.next();f.next();}
  if(state==='complete'){f.next();f.next();f.completeRound();}
  if(state==='intermission')f.completeRound();
  if(state==='damaged')p.health=75;
  if(state==='scored'){p.eliminations=2;p.matchEliminations=4;}
  if(state==='KO'){p.health=0;p.koRemaining=3;}
  if(state==='respawn'){p.health=0;p.koRemaining=STEP;f.server.tick(Date.now());assert.equal(p.health,COMBAT.maxHealth);}
  const before={id:p.id,health:p.health,ko:p.koRemaining,target:p.targetId,round:p.eliminations,total:p.matchEliminations,endsAt:f.room.round.endsAt,returnAt:f.room.round.returnAt,match:f.room.match.id,number:f.room.match.roundNumber,phase:f.room.phase,host:f.room.hostId};
  f.server.disconnect(f.sockets[1]);const replacement=f.socket();f.send(replacement,{type:'resume',code:f.room.code,token:p.token});const welcome=f.packets.get(replacement)![0];assert.equal(welcome.type,'welcome');assert.equal(welcome.id,p.id);assert.equal(f.room.players.length,3);assert.equal(f.server.sessions.size,3);assert(!f.server.sessions.has(f.sockets[1]));
  assert.deepEqual({id:p.id,health:p.health,ko:p.koRemaining,target:p.targetId,round:p.eliminations,total:p.matchEliminations,endsAt:f.room.round.endsAt,returnAt:f.room.round.returnAt,match:f.room.match.id,number:f.room.match.roundNumber,phase:f.room.phase,host:f.room.hostId},before);
  assert.equal(welcome.room.objective.target?.id??null,p.targetId);assert.equal(welcome.room.objective.matchEliminations,p.matchEliminations);
  f.server.disconnect(f.sockets[1]);assert.equal(p.socket,replacement,'Late close from previous transport cannot detach replacement');
 });
}
test('duplicate tab is retryable, never takes over, then recovers after original close',()=>{
 const f=fixture();const p=f.room.players[0];const duplicate=f.socket();f.send(duplicate,{type:'resume',code:f.room.code,token:p.token});assert.equal(f.packets.get(duplicate)![0].retryable,true);assert.equal(p.socket,f.sockets[0]);assert.equal(f.server.sessions.size,3);
 f.server.disconnect(f.sockets[0]);const host=f.room.hostId;f.send(duplicate,{type:'resume',code:f.room.code,token:p.token});assert.equal(p.socket,duplicate);assert.equal(f.room.hostId,host,'Former host does not reclaim authority');assert.equal(f.room.players.length,3);
});
test('expired or forged resume does not create a player or change scores',()=>{
 const f=fixture();const ws=f.socket();f.send(ws,{type:'resume',code:f.room.code,token:'forged'});assert.equal(f.packets.get(ws)!.at(-1).fatal,true);assert.equal(f.room.players.length,3);
 const p=f.room.players[1];f.server.disconnect(f.sockets[1]);p.disconnectedAt=Date.now()-RECONNECT_MS-1;f.send(ws,{type:'resume',code:f.room.code,token:p.token});assert.equal(f.packets.get(ws)!.at(-1).fatal,true);assert.equal(p.socket,null);
});
test('duplicate start and lobby return are idempotent; readiness is phase-restricted',()=>{
 const f=fixture();const id=f.room.match.id,deadline=f.room.round.endsAt;f.send(f.sockets[0],{type:'start'});f.send(f.sockets[1],{type:'ready',ready:false});assert.equal(f.room.match.id,id);assert.equal(f.room.round.endsAt,deadline);assert.equal(f.room.players[1].ready,true);
 f.send(f.sockets[0],{type:'lobby'});f.send(f.sockets[1],{type:'ready',ready:true});f.send(f.sockets[0],{type:'lobby'});assert.equal(f.room.players[1].ready,true);assert(f.room.players.every(p=>p.health===100&&p.koRemaining===0&&p.matchEliminations===0&&p.targetId===null));
});
test('non-host cannot control start or lobby after host migration',()=>{
 const f=fixture(3,false);f.sockets.forEach(ws=>f.send(ws,{type:'ready',ready:true}));f.send(f.sockets[1],{type:'start'});assert.equal(f.room.phase,'lobby');f.server.disconnect(f.sockets[0]);assert.equal(f.room.hostId,f.room.players[1].id);f.send(f.sockets[2],{type:'lobby'});assert.equal(f.packets.get(f.sockets[2])!.at(-1).type,'error');
 f.server.remove(f.room,f.room.players[0]);f.send(f.sockets[1],{type:'start'});assert.equal(f.room.phase,'arena');
});
test('stale/missing input epochs and unreasonable movement/ability packets cannot mutate state',()=>{
 const f=fixture();const p=f.room.players[0];const before=JSON.stringify(p,(k,v)=>k==='socket'?null:v);
 const invalid=[{dx:99},{dy:null},{dx:'1'},{seq:-1},{seq:9999},{seq:1.5},{sprint:'yes'},{dashId:9999},{attackId:-1},{aimX:2},{matchId:'old'},{roundNumber:0}];
 for(const bad of invalid)f.send(f.sockets[0],{type:'input',seq:p.seq+1,dx:0,dy:0,...bad});
 f.server.message(f.sockets[0],JSON.stringify({type:'input',seq:p.seq+1,dx:1,dy:0}));assert.equal(JSON.stringify(p,(k,v)=>k==='socket'?null:v),before);
 const oldMatch=f.room.match.id;f.send(f.sockets[0],{type:'lobby'});f.begin();f.send(f.sockets[0],{type:'input',matchId:oldMatch,seq:p.seq+1,dx:1,dy:0});assert.equal(p.seq,p.ack);
});
test('stale round input is rejected after automatic transition; duplicate transitions cannot create Round 4',()=>{
 const f=fixture();const old=f.room.match.roundNumber;f.next();const p=f.room.players[0];f.send(f.sockets[0],{type:'input',roundNumber:old,seq:p.seq+1,dx:1,dy:0,attackId:1});assert.equal(p.seq,p.ack);
 const n=f.room.match.roundNumber;f.server.startRound(f.room,Date.now());assert.equal(f.room.match.roundNumber,n);f.server.endRound(f.room,f.room.round.endsAt);const len=f.room.match.history.length;f.server.endRound(f.room,Date.now());assert.equal(f.room.match.history.length,len);f.server.tick(f.room.round.returnAt);f.completeRound();f.server.startRound(f.room,Date.now());assert.equal(f.room.match.roundNumber,3);assert.equal(f.room.phase,'complete');
});
test('intermission and final phases reject movement, combat, score forgery, and ready changes',()=>{
 const f=fixture();for(const phase of ['intermission','complete']){
  if(phase==='intermission')f.completeRound();else{f.server.tick(f.room.round.returnAt);f.next();f.completeRound();}
  assert.equal(f.room.phase,phase);const p=f.room.players[0];const before={x:p.x,health:p.health,seq:p.seq,total:p.matchEliminations,ready:p.ready};
  f.send(f.sockets[0],{type:'input',seq:p.seq+1,dx:1,dy:1,sprint:true,dashId:1,attackId:1,health:999,matchEliminations:999});f.send(f.sockets[0],{type:'ready',ready:false});f.send(f.sockets[0],{type:'start'});
  assert.deepEqual({x:p.x,health:p.health,seq:p.seq,total:p.matchEliminations,ready:p.ready},before);
 }
});
test('deadline processing discards attacks and accepted movement queued just before expiry',()=>{
 const f=fixture(2);const [a,b]=f.room.players;Object.assign(a,{x:1000,y:700});Object.assign(b,{x:1040,y:700,health:25});f.send(f.sockets[0],{type:'input',seq:1,dx:1,dy:0,attackId:1,aimX:1,aimY:0});f.completeRound();assert.equal(a.x,1000);assert.equal(b.health,25);assert.equal(a.matchEliminations,0);assert.equal(f.room.match.history.length,1);
});
test('replayed melee never credits a KO twice and blocked KO cannot attack',()=>{
 const f=fixture(2);const [a,b]=f.room.players;Object.assign(a,{x:1000,y:700});Object.assign(b,{x:1040,y:700,health:25});const m={type:'input',seq:1,dx:0,dy:0,attackId:1,aimX:1,aimY:0};f.send(f.sockets[0],m);a.lastInput=Date.now();f.server.tick();assert.equal(a.matchEliminations,1);
 for(let i=0;i<50;i++){f.send(f.sockets[0],m);f.send(f.sockets[1],{type:'input',seq:b.seq+1,dx:1,dy:1,sprint:true,dashId:b.dashId+1,attackId:b.attackId+1,aimX:-1,aimY:0});f.server.tick();}assert.equal(a.matchEliminations,1);assert.equal(a.health,100);assert.equal(b.health,0);assert.equal(b.x,1040);
});
test('long-running sprint/dash spam remains bounded, collision-safe and resource-limited',()=>{
 const f=fixture(2);const p=f.room.players[0];let now=Date.now();let dashStarts=0;let last=0;
 for(let i=0;i<900;i++){f.send(f.sockets[0],{type:'input',seq:p.seq+1,dx:1,dy:i%90<45?1:-1,sprint:true,dashId:p.dashId+1,stamina:999,x:1e9});now+=STEP*1000;p.lastInput=now;f.server.tick(now);if(p.dashCooldown>last)dashStarts++;last=p.dashCooldown;assert(isWalkable(p));assert(p.stamina>=0&&p.stamina<=MOVEMENT.staminaMax);assert(p.health>=0&&p.health<=COMBAT.maxHealth);}
 assert(dashStarts<=11);assert(p.exhausted);assert(!p.sprinting);
});
test('all temporary disconnects clean up after grace in every match phase, including a deleted room',()=>{
 for(const phase of ['lobby','arena','intermission','complete']){
  const f=fixture(3,phase!=='lobby');if(phase==='intermission')f.completeRound();if(phase==='complete'){f.next();f.next();f.completeRound();}
  for(const ws of f.sockets)f.server.disconnect(ws);f.server.tick(Date.now()+RECONNECT_MS+1);assert.equal(f.server.rooms.size,0);assert.equal(f.server.sessions.size,0);assert(f.room.roster.every(p=>p.socket===null));f.server.startRound(f.room,Date.now());f.server.endRound(f.room,Date.now());assert.equal(f.server.rooms.size,0);
 }
});
test('leave is repeatable, clears socket references, and repairs graph without awarding points',()=>{
 const f=fixture();const p=f.room.players[0];f.room.players[1].targetId=p.id;f.send(f.sockets[0],{type:'leave'});f.send(f.sockets[0],{type:'leave'});assert.equal(f.room.players.length,2);assert.equal(p.socket,null);assert(!f.server.sessions.has(f.sockets[0]));assert(f.room.players.every(p=>p.targetId&&p.targetId!==p.id&&p.matchEliminations===0));assert.equal(f.packets.get(f.sockets[0])!.at(-1).type,'left');
});
test('malformed JSON and stale sessions fail safely without mutating other players',()=>{
 const f=fixture();for(const value of ['{','null','[]','42','"input"','{"type":"unknown"}'])assert.doesNotThrow(()=>f.server.message(f.sockets[0],value));
 const p=f.room.players[0];f.server.remove(f.room,p);f.server.sessions.set(f.sockets[0],{room:f.room,player:p});f.send(f.sockets[0],{type:'lobby'});assert.equal(f.room.players.length,2);assert.equal(f.room.phase,'arena');assert(!f.server.sessions.has(f.sockets[0]));
});
test('failed socket send detaches only that connection and preserves the remaining room',()=>{
 const f=fixture();const ws=f.sockets[0];ws.send=()=>{throw new Error('Transport closed');};assert.doesNotThrow(()=>f.server.broadcast(f.room));assert.equal(f.room.players[0].socket,null);assert.equal(f.room.hostId,f.room.players[1].id);assert.equal(f.server.sessions.size,2);assert.equal(f.room.phase,'arena');assert(f.packets.get(f.sockets[1])!.at(-1).room.players.some((p:any)=>!p.connected));
});
