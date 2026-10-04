import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA, STEP, MOVEMENT, move, freshMotion, advanceMotion, isWalkable, type Motion } from '../shared/game.js';
import { BUILDINGS, SPAWNS, cameraFor, WORLD } from '../shared/map.js';
import { RoomServer } from '../server/rooms.js';
import type { WebSocket } from 'ws';

test('city spawns and all traversable routes are connected',()=>{
 for(const p of SPAWNS)assert(isWalkable(p));
 const seen=new Set<string>(),queue=[{x:SPAWNS[0].x,y:SPAWNS[0].y}];
 const key=(x:number,y:number)=>`${x},${y}`;seen.add(key(queue[0].x,queue[0].y));
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const n={x:p.x+dx,y:p.y+dy};if(!isWalkable(n)||seen.has(key(n.x,n.y)))continue;seen.add(key(n.x,n.y));queue.push(n);}}
 // Route landmarks on both sides and the exterior must be reachable from the plaza.
 for(const p of [{x:90,y:90},{x:2510,y:90},{x:90,y:2010},{x:2510,y:2010},{x:570,y:810},{x:2010,y:810},{x:1010,y:810}])assert(queue.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<=15),`Unreachable route ${key(p.x,p.y)}`);
});
test('walls block fast movement from every direction; diagonal sliding stays outside',()=>{
 for(const b of BUILDINGS.filter(b=>b.bottom===0)){
  const cx=b.x+b.width/2,cy=b.y+b.height/2,r=ARENA.radius;
  for(const [start,dx,dy] of [[{x:b.x-r-10,y:cy},1,0],[{x:b.x+b.width+r+10,y:cy},-1,0],[{x:cx,y:b.y-r-10},0,1],[{x:cx,y:b.y+b.height+r+10},0,-1]] as const){if(!isWalkable(start))continue;const p=move(start,dx,dy,.2,MOVEMENT.dashSpeed);assert(isWalkable(p));assert(Math.hypot(p.x-start.x,p.y-start.y)<=10.00001);}
 }
 let p={x:166,y:600};for(let i=0;i<90;i++){p=move(p,1,1);assert(isWalkable(p));}assert(p.y>600,'Wall contact allows sliding');
 // Large displacement and a wall narrower than a dash cannot tunnel through.
 const p2=move({x:1106,y:1572},1,0,1,MOVEMENT.dashSpeed);assert(p2.x<=1116);assert(isWalkable(p2));
});
test('sprint speed, stamina exhaustion, release, and regeneration are deterministic',()=>{
 let walking=freshMotion({x:800,y:720}),sprinting=freshMotion({x:800,y:720});
 for(let i=0;i<20;i++){walking=advanceMotion(walking,{dx:1,dy:0});sprinting=advanceMotion(sprinting,{dx:1,dy:0,sprint:true});}
 assert(Math.abs((sprinting.x-800)/(walking.x-800)-1.5)<1e-8);assert(sprinting.stamina<walking.stamina);
 for(let i=0;i<160;i++)sprinting=advanceMotion(sprinting,{dx:1,dy:0,sprint:true});assert(sprinting.exhausted);assert(!sprinting.sprinting);assert(sprinting.stamina>=0&&sprinting.stamina<=100);
 for(let i=0;i<180;i++)sprinting=advanceMotion(sprinting,{dx:0,dy:0,sprint:false});assert.equal(sprinting.stamina,100);assert(!sprinting.exhausted);
});
test('dash is a single burst, obeys collision, cooldown, and facing while idle',()=>{
 let s=advanceMotion(freshMotion({x:1000,y:720}),{dx:1,dy:0,dashId:1});assert(s.dashRemaining>0);assert.equal(s.dashCooldown,3);
 for(let i=0;i<20;i++)s=advanceMotion(s,{dx:0,dy:0,dashId:1});assert.equal(s.dashRemaining,0);const x=s.x;
 s=advanceMotion(s,{dx:0,dy:0,dashId:2});assert.equal(s.x,x);assert.equal(s.dashSeen,2);
 for(let i=0;i<100;i++)s=advanceMotion(s,{dx:0,dy:0,dashId:2});assert.equal(s.dashCooldown,0);assert.equal(s.x,x,'Rejected requests are not queued');
 s=advanceMotion(s,{dx:0,dy:0,dashId:3});assert(s.x>x,'Idle dash uses last facing direction');
 let blocked=freshMotion({x:166,y:600});for(let i=0;i<10;i++)blocked=advanceMotion(blocked,{dx:1,dy:0,dashId:1});assert.equal(blocked.x,166);assert(isWalkable(blocked));
});
test('camera follows and clamps without exposing the whole world',()=>{
 assert.deepEqual(cameraFor({x:1000,y:720}),{x:520,y:420});assert.deepEqual(cameraFor({x:0,y:0}),{x:0,y:0});const far=cameraFor({x:WORLD.width,y:WORLD.height});assert.equal(far.x,WORLD.width-960);assert.equal(far.y,WORLD.height-600);
});
test('authoritative room state agrees with prediction and rejects ability spoofing',()=>{
 const rooms=new RoomServer(),messages:string[]=[];
 const fake=()=>({readyState:1,send:(s:string)=>messages.push(s)}) as unknown as WebSocket;
 const a=fake(),b=fake();const send=(ws:WebSocket,m:unknown)=>rooms.message(ws,JSON.stringify((m as any)?.type==='input'?{matchId:rooms.sessions.get(ws)!.room.match.id,roundNumber:rooms.sessions.get(ws)!.room.match.roundNumber,...(m as object)}:m));
 send(a,{type:'create',name:'A'});const code=rooms.sessions.get(a)!.room.code;send(b,{type:'join',code,name:'B'});send(a,{type:'ready',ready:true});send(b,{type:'ready',ready:true});send(a,{type:'start'});
 const player=rooms.sessions.get(a)!.player;let predicted:Motion={...player};const now=Date.now();
 for(let seq=1;seq<=90;seq++){
  const input={seq,dx:1,dy:0,sprint:true,dashId:seq<20?0:1};send(a,{type:'input',...input,stamina:100,dashCooldown:0,x:999999});player.lastInput=now+seq*STEP*1000;rooms.tick(player.lastInput);predicted=advanceMotion(predicted,input);
  assert.equal(player.x,predicted.x);assert.equal(player.y,predicted.y);assert.equal(player.stamina,predicted.stamina);assert.equal(player.dashCooldown,predicted.dashCooldown);assert(isWalkable(player));
 }
 const prevSeq=player.seq;send(a,{type:'input',seq:91,dx:1,dy:0,sprint:'yes',dashId:2});assert.equal(player.seq,prevSeq);send(a,{type:'input',seq:91,dx:1,dy:0,sprint:true,dashId:999999});assert.equal(player.seq,prevSeq);
 const snap=rooms.view(rooms.sessions.get(a)!.room);assert.equal(snap.players.length,2);assert.equal(snap.players[0].stamina,player.stamina);assert(!JSON.stringify(snap).includes(player.token));
 // Refresh/resume preserves cooldown and stamina; start a new session resets both.
 const before={stamina:player.stamina,dashCooldown:player.dashCooldown};rooms.disconnect(a);const c=fake();send(c,{type:'resume',code,token:player.token});assert.equal(player.stamina,before.stamina);assert.equal(player.dashCooldown,before.dashCooldown);
 send(b,{type:'lobby'});send(b,{type:'ready',ready:true});send(c,{type:'ready',ready:true});send(b,{type:'start'});assert.equal(player.stamina,100);assert.equal(player.dashCooldown,0);assert.equal(player.dashSeen,0);
});
