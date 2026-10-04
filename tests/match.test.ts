import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebSocket } from 'ws';
import { RoomServer } from '../server/rooms.js';
import { ROUND } from '../shared/rounds.js';
import {MAPS} from '../shared/map.js';

function fixture(count=2){
 const server=new RoomServer();const packets:string[][]=[];
 const sockets=Array.from({length:count},(_,i)=>{packets[i]=[];return {readyState:1,send:(s:string)=>packets[i].push(s)} as unknown as WebSocket;});
 const send=(i:number,m:unknown)=>server.message(sockets[i],JSON.stringify((m as any)?.type==='input'?{matchId:room.match.id,roundNumber:room.match.roundNumber,...(m as object)}:m));send(0,{type:'create',name:'P0'});const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)send(i,{type:'join',name:`P${i}`,code:room.code});
 const start=()=>{sockets.forEach((_,i)=>send(i,{type:'ready',ready:true}));send(0,{type:'start'});};start();
 const credit=(attacker=0)=>{const a=room.players[attacker],b=room.players.find(p=>p.id===a.targetId)!;const map=MAPS[room.mapId],origin=room.mapId==='central_plaza'?{x:1000,y:700}:map.spawns[0];room.players.forEach((p,i)=>Object.assign(p,{...map.spawns[i],elevation:0}));Object.assign(a,{...origin,elevation:0,health:100,koRemaining:0,attackCooldown:0});Object.assign(b,{x:origin.x+40,y:origin.y,elevation:0,health:25,koRemaining:0,protection:0});const now=room.round.endsAt-ROUND.durationMs+100;a.lastInput=now;
 send(attacker,{type:'input',seq:a.seq+1,dx:0,dy:0,attackId:a.attackId+1,aimX:1,aimY:0,matchEliminations:999});a.lastInput=now;server.tick(now);};
 return {server,room,sockets,packets,send,start,credit};
}
test('complete 3-round matches with 2–6 players persist actual knockout credit and reset each round',()=>{
 for(const count of [2,3,6]){
  const f=fixture(count);const matchId=f.room.match.id;const host=f.room.hostId;
  for(let n=1;n<=3;n++){
   assert.equal(f.room.match.roundNumber,n);assert.equal(f.room.match.id,matchId);assert.equal(f.room.hostId,host);
   assert(f.room.players.every(p=>p.targetId&&p.targetId!==p.id&&p.health===100&&p.eliminations===0));
   assert.equal(f.room.players[0].matchEliminations,n-1);f.credit();assert.equal(f.room.players[0].matchEliminations,n);assert.equal(f.room.players[0].eliminations,1);
   f.server.tick(f.room.round.endsAt);assert.equal(f.room.match.history.length,n);assert.equal(f.room.match.history[n-1][0].eliminations,1);
   if(n<3){assert.equal(f.room.phase,'intermission');const snapshot=f.room.players.map(p=>({x:p.x,y:p.y,health:p.health}));f.send(0,{type:'input',seq:999,dx:1,dy:1,attackId:999,dashId:999});f.server.tick(f.room.round.returnAt-1000);assert.equal(f.room.match.nextRoundSeconds,1);assert.deepEqual(f.room.players.map(p=>({x:p.x,y:p.y,health:p.health})),snapshot);f.server.tick(f.room.round.returnAt);assert.equal(f.room.phase,'arena');}
  }
  assert.equal(f.room.phase,'complete');assert.equal(f.room.match.results[0].eliminations,3);assert.deepEqual(f.room.match.winners,[{id:f.room.players[0].id,name:'P0'}]);
  f.server.tick(f.room.round.endsAt+60000);assert.equal(f.room.phase,'complete','Final results never auto-advance');
  f.send(0,{type:'lobby'});assert.equal(f.room.phase,'lobby');assert(f.room.players.every(p=>p.health===100&&p.koRemaining===0&&!p.ready&&p.targetId===null&&p.eliminations===0&&p.matchEliminations===0));assert.equal(f.room.match.id,'');f.start();assert.notEqual(f.room.match.id,matchId);assert.equal(f.room.match.roundNumber,1);assert.equal(f.room.match.history.length,0);
 }
});
test('zero-score and equal-high-score matches report ties without tiebreak rounds',()=>{
 for(const score of [0,2]){const f=fixture(3);f.room.players[0].matchEliminations=score;f.room.players[1].matchEliminations=score;for(let n=1;n<=3;n++){f.server.tick(f.room.round.endsAt);if(n<3)f.server.tick(f.room.round.returnAt);}assert.equal(f.room.phase,'complete');assert.equal(f.room.match.winners.length,score?2:3);assert(f.room.match.results.filter(p=>p.eliminations===score).every(p=>p.rank===1));}
});
test('fresh target generation does not retain previous round assignments; private totals restore on reconnect',()=>{
 const f=fixture(3);f.credit();const a=f.room.players[0];const resume=()=>{f.server.disconnect(a.socket!);const out:string[]=[];const ws={readyState:1,send:(s:string)=>out.push(s)} as unknown as WebSocket;f.server.message(ws,JSON.stringify({type:'resume',code:f.room.code,token:a.token}));const m=JSON.parse(out[0]);assert.equal(m.id,a.id);assert.equal(m.room.match.id,f.room.match.id);assert.equal(m.room.match.roundNumber,f.room.match.roundNumber);assert.equal(m.room.objective.eliminations,a.eliminations);assert.equal(m.room.objective.matchEliminations,a.matchEliminations);assert.equal(m.room.objective.target.id,a.targetId);assert.equal(m.room.round.endsAt,f.room.round.endsAt);assert.equal(m.room.players.find((p:any)=>p.id===a.id).health,a.health);assert.equal(f.room.players.length,3);};
 resume();f.server.tick(f.room.round.endsAt);resume();assert.equal(f.room.phase,'intermission');f.room.players.forEach(p=>p.targetId=p.id);f.server.tick(f.room.round.returnAt);assert(f.room.players.every(p=>p.targetId!==p.id));assert.equal(a.matchEliminations,1);assert.equal(a.eliminations,0);
});
test('host departure transfers controls; permanent target removal preserves totals; insufficient players cancel intermission',()=>{
 const f=fixture(3);f.credit();const [a,b,c]=f.room.players;c.targetId=a.id;f.server.remove(f.room,a);assert.equal(f.room.hostId,b.id);assert.equal(c.targetId,b.id);assert.equal(f.room.roster.find(p=>p.id===a.id)!.matchEliminations,1);f.server.tick(f.room.round.endsAt);assert.equal(f.room.phase,'intermission');f.server.remove(f.room,c);assert.equal(f.room.phase,'lobby');assert.equal(b.matchEliminations,0);
 const g=fixture(3);g.server.disconnect(g.sockets[0]);assert.equal(g.room.hostId,g.room.players[1].id);g.send(1,{type:'lobby'});assert.equal(g.room.phase,'lobby');assert(g.room.players.every(p=>p.matchEliminations===0&&p.targetId===null));
});
