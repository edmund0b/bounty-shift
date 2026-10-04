import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebSocket } from 'ws';
import { RoomServer } from '../server/rooms.js';
import { STEP, freshMotion } from '../shared/game.js';
import { ROUND } from '../shared/rounds.js';

function fixture(count=2){
 const server=new RoomServer();const packets:string[][]=[];
 const sockets=Array.from({length:count},(_,i)=>{packets[i]=[];return {readyState:1,send:(s:string)=>packets[i].push(s)} as unknown as WebSocket;});
 const send=(i:number,m:unknown)=>server.message(sockets[i],JSON.stringify((m as any)?.type==='input'?{matchId:room.match.id,roundNumber:room.match.roundNumber,...(m as object)}:m));
 send(0,{type:'create',name:'P0'});const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)send(i,{type:'join',name:`P${i}`,code:room.code});
 for(let i=0;i<count;i++)send(i,{type:'ready',ready:true});send(0,{type:'start'});
 let now=room.round.endsAt-ROUND.durationMs;
 const tick=(n=1)=>{for(let i=0;i<n;i++){now+=STEP*1000;for(const p of room.players)p.lastInput=now;server.tick(now);}};
 const attack=(i:number,x=1,y=0)=>{const p=room.players[i];send(i,{type:'input',seq:p.seq+1,dx:0,dy:0,attackId:p.attackId+1,aimX:x,aimY:y});};
 const arrange=(a=0,b=1)=>{room.players.forEach((p,i)=>Object.assign(p,freshMotion({x:800+i*150,y:850})));Object.assign(room.players[a],freshMotion({x:1000,y:700}));Object.assign(room.players[b],freshMotion({x:1040,y:700}));};
 return {server,room,send,tick,attack,arrange,sockets,packets};
}

test('2–6 initial targets form a private derangement; no targets or tokens in public players',()=>{
 for(let count=2;count<=6;count++)for(let repeat=0;repeat<10;repeat++){
  const f=fixture(count);const ids=new Set(f.room.players.map(p=>p.id));
  assert.equal(new Set(f.room.players.map(p=>p.targetId)).size,count);
  f.room.players.forEach((p,i)=>{
   assert(p.targetId&&ids.has(p.targetId)&&p.targetId!==p.id);
   const packet=JSON.parse(f.packets[i].at(-1)!);assert.equal(packet.room.objective.target.id,p.targetId);
   assert.equal(packet.room.objective.target.name,f.room.players.find(o=>o.id===p.targetId)!.name);
   assert.deepEqual(packet.room.players,f.server.view(f.room).players);
   packet.room.players.forEach((o:object)=>{assert(!('targetId' in o));assert(!('token' in o));assert(!('eliminations' in o));});
   assert(!('roster' in packet.room));assert(!('targetAssignments' in packet.room));
  });
 }
});
test('only a verified target knockout earns credit; reassign prefers another target',()=>{
 const f=fixture(3);const [a,b,c]=f.room.players;a.targetId=b.id;f.arrange();b.health=25;
 f.attack(0);f.tick();assert.equal(a.eliminations,1);assert.equal(a.targetId,c.id);assert.equal(b.health,0);
 // Respawn cannot clear objective progress or private assignment.
 f.tick(150);assert.equal(b.health,100);assert.equal(a.eliminations,1);assert.equal(a.targetId,c.id);
 f.arrange();b.health=25;b.protection=0;f.attack(0);f.tick();assert.equal(b.health,0);assert.equal(a.eliminations,1,'Wrong-target KO earns no credit');assert.equal(a.targetId,c.id);
});
test('two-player target remains valid across KO, respawn, and repeated completion',()=>{
 const f=fixture();const [a,b]=f.room.players;f.arrange();b.health=25;f.attack(0);f.tick();assert.equal(a.eliminations,1);assert.equal(a.targetId,b.id);
 f.tick(150);assert.equal(b.health,100);assert.equal(b.targetId,a.id);f.arrange();b.protection=0;b.health=25;f.attack(0);f.tick();assert.equal(a.eliminations,2);
});
test('simultaneous mutual KOs credit both pre-tick target relationships',()=>{
 const f=fixture();f.arrange();f.room.players.forEach(p=>p.health=25);f.attack(0);f.attack(1,-1);f.tick();assert(f.room.players.every(p=>p.health===0&&p.eliminations===1));
});
test('multiple lethal contributors award at most one completion with stable final-hit attribution',()=>{
 const f=fixture(3);const [a,b,c]=f.room.players;
 Object.assign(a,{id:'a',x:1000,y:700,targetId:c.id});Object.assign(b,{id:'b',x:1000,y:740,targetId:c.id});Object.assign(c,{x:1040,y:720,health:50});
 f.attack(0);f.attack(1);f.tick();assert.equal(c.health,0);assert.equal(a.eliminations,0);assert.equal(b.eliminations,1);
});
test('deadline rejects pending damage, freezes movement, publishes tied results, then starts the next round',()=>{
 const f=fixture(3);const [a,b,c]=f.room.players;a.eliminations=2;b.eliminations=2;c.eliminations=0;f.arrange();b.health=25;f.attack(0);
 f.server.tick(f.room.round.endsAt);assert.equal(f.room.phase,'intermission');assert.equal(b.health,25);assert.equal(a.eliminations,2);assert.deepEqual(f.room.round.results.map(p=>p.rank),[1,1,3]);
 const state=f.room.players.map(p=>({x:p.x,y:p.y,health:p.health}));
 f.send(0,{type:'input',seq:a.seq+1,dx:1,dy:1,sprint:true,dashId:1,attackId:2});f.server.tick(f.room.round.endsAt+1000);assert.deepEqual(f.room.players.map(p=>({x:p.x,y:p.y,health:p.health})),state);
 f.server.tick(f.room.round.returnAt);assert.equal(f.room.phase,'arena');assert.equal(f.room.match.roundNumber,2);f.send(0,{type:'lobby'});assert.equal(f.room.phase,'lobby');assert(f.room.players.every(p=>!p.ready&&p.targetId===null&&p.eliminations===0));assert.deepEqual(f.room.round.results,[]);
 for(let i=0;i<3;i++)f.send(i,{type:'ready',ready:true});f.send(0,{type:'start'});assert.equal(f.room.phase,'arena');assert(f.room.players.every(p=>p.health===100&&p.targetId&&p.eliminations===0));
});
test('reconnect keeps own private target and score; departure repairs targets and host return clears round',()=>{
 const f=fixture(3);const [a,b,c]=f.room.players;a.targetId=b.id;a.eliminations=3;
 f.server.disconnect(f.sockets[0]);const packets:string[]=[];const ws={readyState:1,send:(s:string)=>packets.push(s)} as unknown as WebSocket;
 f.server.message(ws,JSON.stringify({type:'resume',code:f.room.code,token:a.token}));const welcome=JSON.parse(packets[0]);assert.equal(welcome.room.objective.target.id,b.id);assert.equal(welcome.room.objective.eliminations,3);
 f.server.remove(f.room,b);assert.equal(a.targetId,c.id);assert.equal(c.targetId,a.id);assert.equal(a.eliminations,3);
 f.server.endRound(f.room,Date.now());assert.equal(f.room.round.results.length,3,'Departed participant remains in final ranking');
 const host=f.room.players.find(p=>p.id===f.room.hostId)!;f.server.message(host.socket!,JSON.stringify({type:'lobby'}));assert.equal(f.room.phase,'lobby');assert(f.room.players.every(p=>p.targetId===null));
});
test('a target in reconnect grace remains valid; permanent departure with one player ends gracefully',()=>{
 const f=fixture();const [a,b]=f.room.players;f.server.disconnect(f.sockets[1]);f.arrange();b.health=25;f.attack(0);f.tick();assert.equal(a.eliminations,1);assert.equal(a.targetId,b.id);
 f.server.tick(b.disconnectedAt+10001);assert.equal(f.room.phase,'lobby');assert.equal(f.room.players.length,1);assert.equal(a.targetId,null);
});
