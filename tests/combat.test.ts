import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebSocket } from 'ws';
import { RoomServer } from './legacy-game-fixture';
import { canHit, clearAttackLine, safeSpawn, COMBAT } from './legacy-game-fixture';
import { isWalkable, STEP, freshMotion } from './legacy-game-fixture';

function fixture(count=2){
 const rooms=new RoomServer(true);const packets:string[][]=[];
 const sockets=Array.from({length:count},(_,i)=>{packets[i]=[];return {readyState:1,send:(s:string)=>packets[i].push(s)} as unknown as WebSocket;});
 const send=(i:number,m:unknown)=>rooms.message(sockets[i],JSON.stringify((m as any)?.type==='input'?{matchId:room.match.id,roundNumber:room.match.roundNumber,...(m as object)}:m));send(0,{type:'create',name:'P0'});const room=rooms.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)send(i,{type:'join',name:`P${i}`,code:room.code});for(let i=0;i<count;i++)send(i,{type:'ready',ready:true});send(0,{type:'start'});
 let now=Date.now();const players=room.players;
 const ticks=(n=1)=>{for(let i=0;i<n;i++){now+=STEP*1000;for(const p of players)if(p.socket)p.lastInput=now;rooms.tick(now);}};
 const attack=(i:number,aimX=1,aimY=0,extra={})=>{const p=players[i];send(i,{type:'input',seq:p.seq+1,dx:0,dy:0,attackId:p.attackId+1,aimX,aimY,...extra});};
 const pair=()=>{Object.assign(players[0],freshMotion({x:1000,y:700}));Object.assign(players[1],freshMotion({x:1040,y:700}));};pair();
 return {rooms,room,players,sockets,send,ticks,attack,pair,packets};
}
test('melee requires range, directional aim, and unblocked building line',()=>{
 assert(canHit({x:1000,y:700},{x:1040,y:700},1,0));assert(!canHit({x:1000,y:700},{x:1100,y:700},1,0));assert(!canHit({x:1000,y:700},{x:1040,y:700},-1,0));
 const a={x:166,y:515},b={x:195,y:486};assert(isWalkable(a)&&isWalkable(b));assert(!clearAttackLine(a,b));assert(!canHit(a,b,1,-1));
 assert(clearAttackLine({x:900,y:600},{x:950,y:600}));assert(!clearAttackLine({x:100,y:600},{x:600,y:600}));
});
test('server damage, request deduplication, cooldown, misses, and forged health',()=>{
 const f=fixture();f.attack(0,1,0,{health:0,damage:9999});f.ticks();assert.equal(f.players[1].health,75);assert.equal(f.players[0].health,100);assert(f.players[1].hitFlash>0);
 f.ticks();assert.equal(f.players[1].health,75,'Same request cannot hit twice');f.attack(0);f.ticks();assert.equal(f.players[1].health,75,'Cooldown rejects repeated request');
 f.ticks(20);assert.equal(f.players[1].health,75,'Rejected attack is not queued');f.attack(0);f.ticks();assert.equal(f.players[1].health,50);
 f.ticks(20);f.players[1].x=1200;f.attack(0);f.ticks();assert.equal(f.players[1].health,50);assert(f.players[0].attackCooldown>0,'Miss consumes cooldown');
 const old=f.players[0].seq;f.send(0,{type:'input',seq:old+1,dx:0,dy:0,attackId:Infinity,aimX:1,aimY:0});assert.equal(f.players[0].seq,old);f.send(0,{type:'input',seq:old+1,dx:0,dy:0,attackId:4,aimX:99,aimY:0});assert.equal(f.players[0].seq,old);
});
test('wall corner blocks an otherwise in-range server attack',()=>{
 const f=fixture();Object.assign(f.players[0],{x:166,y:515});Object.assign(f.players[1],{x:195,y:486});f.attack(0,1,-1);f.ticks();assert.equal(f.players[1].health,100);
});
test('KO freezes walking, sprint, dash and attack; safe protected respawn follows five seconds',()=>{
 const f=fixture();for(let i=0;i<4;i++){f.attack(0);f.ticks();if(i<3)f.ticks(20);}const target=f.players[1];assert.equal(target.health,0);assert.equal(target.koRemaining,5);
 const x=target.x,y=target.y;f.attack(1,-1,0,{dx:1,dy:1,sprint:true,dashId:1});f.ticks(149);assert.equal(target.x,x);assert.equal(target.y,y);assert.equal(f.players[0].health,100);assert.equal(target.health,0);f.ticks();assert.equal(target.health,100);assert.equal(target.koRemaining,0);assert.equal(target.protection,1.5);assert.equal(target.spawnVersion,2);assert(isWalkable(target));assert.equal(target.stamina,100);assert.equal(target.attackCooldown,0);
 // Hit protection blocks damage, but the protected player's own valid swing ends it.
 f.players[0].x=target.x-40;f.players[0].y=target.y;f.attack(0);f.ticks();assert.equal(target.health,100);f.attack(1,-1,0);f.ticks();assert.equal(target.protection,0);assert.equal(f.players[0].health,75);
});
test('protection expires and simultaneous lethal attacks trade without player order bias',()=>{
 const f=fixture();f.players[1].protection=1.5;f.ticks(46);assert.equal(f.players[1].protection,0);f.players[0].health=25;f.players[1].health=25;f.attack(0);f.attack(1,-1,0);f.ticks();assert(f.players.every(p=>p.health===0&&p.koRemaining===5));
});
test('multiple attackers damage one target together; each strike hits only one target',()=>{
 const f=fixture(3);Object.assign(f.players[0],{x:1000,y:700});Object.assign(f.players[1],{x:1000,y:740});Object.assign(f.players[2],{x:1040,y:720});f.attack(0);f.attack(1);f.ticks();assert.equal(f.players[2].health,50);assert.equal(f.players[0].health,100);assert.equal(f.players[1].health,100);
 f.ticks(20);f.players[1].x=1030;f.players[1].y=700;f.players[2].x=1050;f.players[2].y=700;f.attack(0);f.ticks();assert.equal(f.players[1].health,75);assert.equal(f.players[2].health,50);
});
test('sprint and dash can accompany a server-resolved attack without overriding collision',()=>{
 const f=fixture();f.players[1].x=1060;f.attack(0,1,0,{dx:1,sprint:true,dashId:1});f.ticks();assert(f.players[0].x>1000);assert(f.players[0].dashRemaining>0);assert.equal(f.players[1].health,75);assert(isWalkable(f.players[0]));
 const g=fixture();g.attack(0,1,0,{dx:1,sprint:true});g.ticks();assert(g.players[0].sprinting);assert(g.players[0].stamina<100);assert.equal(g.players[1].health,75);
});
test('reconnect retains damaged health, KO, protection and cooldown; fresh arena resets combat',()=>{
 const f=fixture();f.attack(0);f.ticks();const p=f.players[1];f.rooms.disconnect(f.sockets[1]);const socket={readyState:1,send:()=>{}} as unknown as WebSocket;f.rooms.message(socket,JSON.stringify({type:'resume',code:f.room.code,token:p.token}));assert.equal(p.health,75);
 p.health=0;p.koRemaining=3;f.rooms.disconnect(socket);const socket2={readyState:1,send:()=>{}} as unknown as WebSocket;f.rooms.message(socket2,JSON.stringify({type:'resume',code:f.room.code,token:p.token}));assert.equal(p.koRemaining,3);assert.equal(p.health,0);
 const a=f.players[0];const cooldown=a.attackCooldown;f.rooms.disconnect(f.sockets[0]);const sa={readyState:1,send:()=>{}} as unknown as WebSocket;f.rooms.message(sa,JSON.stringify({type:'resume',code:f.room.code,token:a.token}));assert.equal(a.attackCooldown,cooldown);
 f.rooms.message(socket2,JSON.stringify({type:'lobby'}));f.rooms.message(socket2,JSON.stringify({type:'ready',ready:true}));f.rooms.message(sa,JSON.stringify({type:'ready',ready:true}));f.rooms.message(socket2,JSON.stringify({type:'start'}));assert(f.players.every(p=>p.health===100&&p.koRemaining===0&&p.attackCooldown===0));
});
test('safe spawn chooses greatest opponent clearance and remains collision-free',()=>{
 const point=safeSpawn([{x:850,y:580}]);assert(isWalkable(point));assert(Math.hypot(point.x-850,point.y-580)>300);assert(isWalkable(safeSpawn([])));
});
