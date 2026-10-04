import {MAPS} from '../shared/map';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import type { ServerMessage, RoomView } from '../shared/game.js';
import { move, ARENA } from '../shared/game.js';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.js');
class Client {
 room:RoomView|null=null;ws:WebSocket;messages:ServerMessage[]=[];
 constructor(url:string){this.ws=new WebSocket(url);this.ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.room)this.room=m.room;this.messages.push(m);});}
 async open(){await new Promise<void>((resolve,reject)=>{this.ws.once('open',resolve);this.ws.once('error',reject);});}
 send(m:unknown){this.ws.send(JSON.stringify((m as any)?.type==='input'?{matchId:this.room?.match.id,roundNumber:this.room?.match.roundNumber,...(m as object)}:m));}
 async wait(predicate:(m:ServerMessage)=>boolean,timeout=2500){const end=Date.now()+timeout;while(Date.now()<end){const index=this.messages.findIndex(predicate);if(index>=0)return this.messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,10));}throw new Error('Timed out waiting for message');}
 async state(predicate:(r:RoomView)=>boolean){const m=await this.wait(m=>m.type==='state'&&predicate(m.room));return (m as Extract<ServerMessage,{type:'state'}>).room;}
 close(){this.ws.close();}
}
test('two independent WebSockets: lobby, authority, movement, reconnect, host transfer, cleanup',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const url=`ws://127.0.0.1:${address.port}/ws`;const clients:Client[]=[];
 const connect=async()=>{const c=new Client(url);clients.push(c);await c.open();return c;};
 try{
  const http=`http://127.0.0.1:${address.port}`;assert.deepEqual(await (await fetch(http+'/health')).json(),{ok:true,phase:6});const html=await (await fetch(http+'/')).text();assert(html.includes('Bounty Shift'));const asset=html.match(/src=\"([^\"]+\.js)\"/);assert(asset);assert.equal((await fetch(http+asset[1])).status,200);
  const a=await connect();a.send({type:'create',name:'Edmund'});const wa=await a.wait(m=>m.type==='welcome');assert(wa.type==='welcome');const code=wa.room.code;assert.match(code,/^[A-F0-9]{6}$/);assert.equal(wa.room.hostId,wa.id);
  const invalid=await connect();invalid.send({type:'join',name:'Other',code:'ZZZZZZ'});await invalid.wait(m=>m.type==='error'&&m.message.includes('Room not found'));
  invalid.send({type:'join',name:'edmund',code});await invalid.wait(m=>m.type==='error'&&m.message.includes('already'));
  const b=await connect();b.send({type:'join',name:'Friend',code});const wb=await b.wait(m=>m.type==='welcome');assert(wb.type==='welcome');await a.state(r=>r.players.length===2);
  b.send({type:'start'});await b.wait(m=>m.type==='error'&&m.message.includes('host'));
  a.send({type:'start'});await a.wait(m=>m.type==='error'&&m.message.includes('ready'));
  a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.state(r=>r.players.every(p=>p.ready));a.send({type:'start'});
  const initial=await a.state(r=>r.phase==='arena');const initialB=await b.state(r=>r.phase==='arena');assert.equal(initial.objective.target?.id,wb.id);assert.equal(initialB.objective.target?.id,wa.id);assert(initial.players.every(p=>!('targetId' in p)));const pa=initial.players.find(p=>p.id===wa.id)!;const pb=initial.players.find(p=>p.id===wb.id)!;
  a.messages=[];b.messages=[];
  for(let seq=1;seq<=10;seq++){a.send({type:'input',seq,dx:-1,dy:0});b.send({type:'input',seq,dx:0,dy:1});await new Promise(r=>setTimeout(r,34));}
  a.send({type:'input',seq:11,dx:0,dy:0});b.send({type:'input',seq:11,dx:0,dy:0});
  const movedA=await a.state(r=>r.players.every(p=>p.ack===11));const movedB=await b.state(r=>r.tick===movedA.tick);
  assert.deepEqual(movedA.players,movedB.players);const finalA=movedA.players.find(p=>p.id===wa.id)!;const finalB=movedA.players.find(p=>p.id===wb.id)!;assert(finalA.x<pa.x-40);assert(finalB.y>pb.y+40);assert(finalA.x>=pa.x-120,'Movement is server-speed-limited');
  invalid.send({type:'join',name:'Late',code});await invalid.wait(m=>m.type==='error'&&m.message.includes('already running'));
  a.send({type:'input',seq:12,dx:1000,dy:0});await new Promise(r=>setTimeout(r,80));const authoritative=await b.state(r=>r.tick>movedA.tick+2);assert.equal(authoritative.players.find(p=>p.id===wa.id)!.ack,11);
  a.messages=[];b.messages=[];
  for(let seq=12;seq<=23;seq++){a.send({type:'input',seq,dx:0,dy:-1,sprint:true,dashId:seq<15?0:1});b.send({type:'input',seq,dx:0,dy:1,sprint:true,dashId:0});await new Promise(r=>setTimeout(r,34));}
  a.send({type:'input',seq:24,dx:0,dy:0,sprint:false,dashId:1});b.send({type:'input',seq:24,dx:0,dy:0,sprint:false,dashId:0});
  const abilityA=await a.state(r=>r.players.every(p=>p.ack===24));const abilityB=await b.state(r=>r.tick===abilityA.tick);assert.deepEqual(abilityA.players,abilityB.players);const dasher=abilityA.players.find(p=>p.id===wa.id)!;assert(dasher.dashCooldown>0);assert.equal(dasher.dashSeen,1);assert(dasher.y>=474,'Dash cannot cross north building');assert(abilityA.players.every(p=>p.stamina<100));
  a.close();await b.state(r=>r.hostId===wb.id&&!r.players.find(p=>p.id===wa.id)!.connected);
  const resumed=await connect();resumed.send({type:'resume',code,token:wa.token});const wr=await resumed.wait(m=>m.type==='welcome');assert(wr.type==='welcome');assert.equal(wr.id,wa.id);assert.equal(wr.room.hostId,wb.id);assert.equal(wr.room.players.length,2);
  resumed.send({type:'lobby'});await resumed.wait(m=>m.type==='error'&&m.message.includes('host'));b.send({type:'lobby'});await b.state(r=>r.phase==='lobby'&&r.players.every(p=>!p.ready));
  const dup=await connect();dup.send({type:'resume',code,token:wa.token});await dup.wait(m=>m.type==='error'&&m.retryable===true);
  resumed.close();await b.state(r=>!r.players.find(p=>p.id===wa.id)!.connected);game.rooms.tick(Date.now()+10001);await b.state(r=>r.players.length===1);
  b.send({type:'leave'});await b.wait(m=>m.type==='left');assert.equal(game.rooms.rooms.size,0);
 }finally{for(const c of clients)c.ws.terminate();await game.close();}
});
test('movement normalizes diagonals and respects arena bounds',()=>{const p={x:200,y:200};const straight=move(p,1,0),diagonal=move(p,1,1);assert(Math.abs(Math.hypot(diagonal.x-p.x,diagonal.y-p.y)-(straight.x-p.x))<0.00001);assert.equal(move({x:ARENA.width-14,y:14},1,-1).x,ARENA.width-14);assert.equal(move({x:14,y:14},-1,-1).y,14);});
test('six-player room capacity, readiness, and independent movement',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const clients:Client[]=[];
 try{
  let code='';let host:Client|undefined;
  for(let i=0;i<7;i++){
   const c=new Client(`ws://127.0.0.1:${address.port}/ws`);clients.push(c);await c.open();c.send(i===0?{type:'create',name:'Player0'}:{type:'join',name:`Player${i}`,code});
   if(i===6){await c.wait(m=>m.type==='error'&&m.message.includes('full'));break;}
   const welcome=await c.wait(m=>m.type==='welcome');assert(welcome.type==='welcome');code=welcome.room.code;if(i===0)host=c;c.send({type:'ready',ready:true});
  }
  assert(host);await host.state(r=>r.players.length===6&&r.players.every(p=>p.ready));host.send({type:'start'});const initial=await host.state(r=>r.phase==='arena');
  for(let i=0;i<6;i++){clients[i].send({type:'input',seq:1,dx:i%2?1:-1,dy:0});}
  const moved=await host.state(r=>r.players.every(p=>p.ack===1));for(const p of moved.players){const old=initial.players.find(x=>x.id===p.id)!;assert.notEqual(p.x,old.x);assert(p.x>=ARENA.radius&&p.x<=ARENA.width-ARENA.radius);}
  assert.equal(game.rooms.rooms.get(code)!.players.length,6);
 }finally{for(const c of clients)c.ws.terminate();await game.close();}
});
test('two live WebSocket clients agree on combat, KO, reconnect, and protected respawn',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const clients:Client[]=[];
 const connect=async()=>{const c=new Client(`ws://127.0.0.1:${address.port}/ws`);clients.push(c);await c.open();return c;};
 try{
  const a=await connect();a.send({type:'create',name:'Attacker'});const wa=await a.wait(m=>m.type==='welcome');assert(wa.type==='welcome');const b=await connect();b.send({type:'join',name:'Target',code:wa.room.code});const wb=await b.wait(m=>m.type==='welcome');assert(wb.type==='welcome');a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.state(r=>r.players.every(p=>p.ready));a.send({type:'start'});await a.state(r=>r.phase==='arena');await b.state(r=>r.phase==='arena');a.messages=[];b.messages=[];
  // Arrange authoritative fixtures only in this test, not via a gameplay endpoint.
  const room=game.rooms.rooms.get(wa.room.code)!;Object.assign(room.players[0],{x:1000,y:700});Object.assign(room.players[1],{x:1040,y:700});
  for(let attackId=1;attackId<=4;attackId++){
   if(attackId>1)await new Promise(r=>setTimeout(r,650));a.send({type:'input',seq:attackId,dx:0,dy:0,attackId,aimX:1,aimY:0});const health=100-attackId*25;const ra=await a.state(r=>r.players.find(p=>p.id===wb.id)?.health===health);const rb=await b.state(r=>r.tick===ra.tick);assert.deepEqual(ra.players,rb.players);
  }
  assert.equal(room.players[0].eliminations,1);assert.equal(room.players[1].eliminations,0);
  const dead=room.players.find(p=>p.id===wb.id)!;const x=dead.x,y=dead.y;b.send({type:'input',seq:1,dx:1,dy:0,sprint:true,dashId:1,attackId:1,aimX:-1,aimY:0});await b.state(r=>r.players.find(p=>p.id===wb.id)!.ack===1);assert.equal(dead.x,x);assert.equal(dead.y,y);assert.equal(room.players[0].health,100);
  b.close();await a.state(r=>r.players.some(p=>p.id===wb.id&&!p.connected));const resumed=await connect();resumed.send({type:'resume',code:wa.room.code,token:wb.token});const welcome=await resumed.wait(m=>m.type==='welcome');assert(welcome.type==='welcome');assert.equal(welcome.id,wb.id);assert.equal(welcome.room.players.find(p=>p.id===wb.id)!.health,0);
  const respawn=await resumed.wait(m=>m.type==='state'&&m.room.players.find(p=>p.id===wb.id)?.spawnVersion===2,6500);assert(respawn.type==='state');const ra=await a.state(r=>r.tick===respawn.room.tick);assert.deepEqual(ra.players,respawn.room.players);const p=ra.players.find(p=>p.id===wb.id)!;assert.equal(p.health,100);assert.equal(p.koRemaining,0);assert(p.protection>0);const {isWalkable}=await import('../shared/game.js');assert(isWalkable(p));
  a.messages=[];resumed.messages=[];game.rooms.tick(room.round.endsAt);const resultsA=await a.state(r=>r.phase==='intermission');const resultsB=await resumed.state(r=>r.phase==='intermission');assert.deepEqual(resultsA.round,resultsB.round);assert.equal(resultsA.round.results[0].id,wa.id);assert.equal(resultsA.round.results[0].eliminations,1);assert.equal(resultsB.objective.target?.id,wa.id);
  for(let round=2;round<=3;round++){
   a.messages=[];resumed.messages=[];game.rooms.tick(room.round.returnAt);
   const nextA=await a.state(r=>r.phase==='arena'&&r.match.roundNumber===round);const nextB=await resumed.state(r=>r.phase==='arena'&&r.match.roundNumber===round);
   assert.deepEqual(nextA.players,nextB.players);assert.equal(nextA.objective.eliminations,0);assert.equal(nextA.objective.matchEliminations,1);assert.equal(nextA.objective.target?.id,wb.id);
   a.messages=[];resumed.messages=[];game.rooms.tick(room.round.endsAt);
   const phase=round===3?'complete':'intermission';const endA=await a.state(r=>r.phase===phase);const endB=await resumed.state(r=>r.phase===phase);assert.deepEqual(endA.match,endB.match);
   if(round===3){assert.equal(endA.match.results[0].eliminations,1);assert.deepEqual(endA.match.winners,[{id:wa.id,name:'Attacker'}]);}
  }

 }finally{for(const c of clients)c.ws.terminate();await game.close();}
});
test('real duplicate connection cannot steal session and can resume after old socket closes',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const clients:Client[]=[];
 const connect=async()=>{const c=new Client(`ws://127.0.0.1:${address.port}/ws`);clients.push(c);await c.open();return c;};
 try{
  const a=await connect();a.send({type:'create',name:'Original'});const wa=await a.wait(m=>m.type==='welcome');assert(wa.type==='welcome');const b=await connect();b.send({type:'join',code:wa.room.code,name:'Friend'});const wb=await b.wait(m=>m.type==='welcome');assert(wb.type==='welcome');
  const duplicate=await connect();duplicate.send({type:'resume',code:wa.room.code,token:wa.token});const conflict=await duplicate.wait(m=>m.type==='error'&&!!m.retryable);assert(conflict.type==='error'&&!conflict.fatal);assert.equal(game.rooms.sessions.size,2);
  a.close();await b.state(r=>r.hostId===wb.id);duplicate.send({type:'resume',code:wa.room.code,token:wa.token});const resumed=await duplicate.wait(m=>m.type==='welcome');assert(resumed.type==='welcome');assert.equal(resumed.id,wa.id);assert.equal(resumed.room.hostId,wb.id);assert.equal(resumed.room.players.length,2);
 }finally{for(const c of clients)c.ws.terminate();await game.close();assert.equal(game.rooms.rooms.size,0);assert.equal(game.rooms.sessions.size,0);}
});

test('two live clients agree on stair elevation, elevated reconnect, KO respawn and round reset',async()=>{
 const {freshMotion,isWalkable,STEP}=await import('../shared/game.js');
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const clients:Client[]=[];
 const connect=async()=>{const c=new Client(`ws://127.0.0.1:${address.port}/ws`);clients.push(c);await c.open();return c;};
 try{
  const a=await connect();a.send({type:'create',name:'Climber'});const wa=await a.wait(m=>m.type==='welcome');assert(wa.type==='welcome');const b=await connect();b.send({type:'join',name:'Observer',code:wa.room.code});await b.wait(m=>m.type==='welcome');a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.state(r=>r.players.every(p=>p.ready));a.send({type:'start'});await a.state(r=>r.phase==='arena');await b.state(r=>r.phase==='arena');
  const room=game.rooms.rooms.get(wa.room.code)!,p=room.players[0];Object.assign(p,freshMotion({x:730,y:1900}));a.messages=[];b.messages=[];
  a.send({type:'input',seq:1,dx:0,dy:-1,sprint:true,dashId:1,elevation:99999});await a.state(r=>r.players[0].ack===1);
  let now=Date.now();for(let i=0;i<60;i++){now+=STEP*1000;p.lastInput=now;game.rooms.tick(now);}
  assert.equal(p.elevation,100);assert(isWalkable(p));game.rooms.broadcast(room);
  const ra=await a.state(r=>r.players[0].elevation===100),rb=await b.state(r=>r.tick===ra.tick);assert.deepEqual(ra.players,rb.players);assert.equal(ra.mapId,'central_plaza');
  a.close();await b.state(r=>!r.players[0].connected);const c=await connect();c.send({type:'resume',code:wa.room.code,token:wa.token});const resumed=await c.wait(m=>m.type==='welcome');assert(resumed.type==='welcome');assert.equal(resumed.id,wa.id);assert.equal(resumed.room.players[0].elevation,100);
  // KO fixture exercises the same authoritative timer/respawn path used by combat.
  p.health=0;p.koRemaining=STEP;p.dx=0;p.dy=0;c.messages=[];b.messages=[];game.rooms.tick(Date.now());
  const spawn=await c.state(r=>r.players[0].health===100&&r.players[0].spawnVersion===2),other=await b.state(r=>r.tick===spawn.tick);assert.deepEqual(spawn.players,other.players);assert.equal(spawn.players[0].elevation,0);assert(spawn.players[0].protection>0);assert(isWalkable(spawn.players[0]));
  Object.assign(p,freshMotion({x:730,y:1000,elevation:100}));game.rooms.tick(room.round.endsAt);game.rooms.tick(room.round.returnAt);assert(room.players.every(p=>p.elevation===0&&isWalkable(p,MAPS[room.mapId])));assert.equal(room.match.roundNumber,2);
 }finally{clients.forEach(c=>c.ws.terminate());await game.close();}
});
