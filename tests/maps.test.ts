import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {WebSocket} from 'ws';
import {RoomServer} from './selection-fixture';
import {MAPS} from '../shared/map';
import {selectRoundMap} from '../shared/map-rotation';
import {freshMotion,advanceMotion,isWalkable,STEP} from '../shared/game';
import {TRAVERSAL} from '../shared/traversal';
import {canHit,safeSpawn} from '../shared/combat';
const map=MAPS.scorched_point;
const travel=(start:{x:number;y:number;elevation?:number},waypoints:number[][])=>{
 let p=freshMotion(start);
 for(const [x,y,elevation] of waypoints){for(let i=0;i<1000&&Math.hypot(p.x-x,p.y-y)>7;i++){const dx=x-p.x,dy=y-p.y,l=Math.hypot(dx,dy);p=advanceMotion(p,{dx:dx/l,dy:dy/l,sprint:false},STEP,map);assert(isWalkable(p,map));}
  assert(Math.hypot(p.x-x,p.y-y)<=9,`Blocked at ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.elevation.toFixed(1)} toward ${x},${y}`);if(elevation!==undefined)assert(Math.abs(p.elevation-elevation)<2);
 }return p;
};
function fixture(count=3){const server=new RoomServer(true),packets=new Map<WebSocket,any[]>();const socket=()=>{const messages:any[]=[];const ws={readyState:1,send:(s:string)=>messages.push(JSON.parse(s))} as unknown as WebSocket;packets.set(ws,messages);return ws;};const sockets=Array.from({length:count},socket);server.message(sockets[0],JSON.stringify({type:'create',name:'A'}));const room=server.sessions.get(sockets[0])!.room;for(let i=1;i<count;i++)server.message(sockets[i],JSON.stringify({type:'join',name:`P${i}`,code:room.code}));const send=(i:number,m:any)=>server.message(sockets[i],JSON.stringify(m.type==='input'?{matchId:room.match.id,roundNumber:room.match.roundNumber,...m}:m));const start=()=>{for(let i=0;i<count;i++)send(i,{type:'ready',ready:true});send(room.players.findIndex(p=>p.id===room.hostId),{type:'start'});};start();return {server,room,sockets,socket,packets,send,start};}
test('rotation always opens Central Plaza and avoids immediate repeats for registered maps and larger future pools',()=>{
 assert.deepEqual(Object.keys(MAPS),['central_plaza','scorched_point','aerie_sky_port','outlaws_canyon','vikings_fjord']);
 for(let i=0;i<20;i++){assert.equal(selectRoundMap(1,'scorched_point',()=>i),'central_plaza');assert.equal(selectRoundMap(2,'central_plaza',()=>0),'scorched_point');assert.equal(selectRoundMap(3,'scorched_point',()=>0),'central_plaza');}
 const registry={...MAPS,fixture_3:{...map,id:'fixture_3'},fixture_4:{...map,id:'fixture_4'},fixture_5:{...map,id:'fixture_5'}};
 const chosen=new Set<string>();for(let i=0;i<Object.keys(registry).length-1;i++)chosen.add(selectRoundMap(8,'scorched_point',()=>i,registry));assert.equal(chosen.size,Object.keys(registry).length-1);assert(!chosen.has('scorched_point'));
 assert.equal(selectRoundMap(12,'scorched_point',()=>0,{scorched_point:map}),'scorched_point');
});
test('Scorched Point keeps eight safe ground spawns, seven named locations and controller-compatible slopes',()=>{
 assert.equal(map.spawns.length,8);assert.equal(map.districts.length,8);assert.equal(map.minimapLabels?.length,8);
 for(const p of map.spawns)assert(isWalkable(p,map));for(const s of map.surfaces)if(s.ramp)assert(Math.abs(s.ramp.to-s.ramp.from)/(s.ramp.axis==='x'?s.width:s.height)<=TRAVERSAL.maxSlope);assert(map.spawns.some(p=>p.x===safeSpawn([],map).x));
});
test('four core approaches cross between the industrial ground islands and raised ring',()=>{
 travel({x:780,y:1500},[[1400,1500,120]]);travel({x:2420,y:1400},[[2420,1470,0],[1880,1470,120]]);travel({x:1600,y:700},[[1600,1340,120]]);travel({x:1600,y:2320},[[1600,1760,120]]);
});
test('lava stays non-walkable and dash cannot jump unsupported gaps',()=>{assert(!isWalkable({x:1000,y:1300},map));let p=freshMotion({x:1000,y:440});for(let i=0;i<90;i++){p=advanceMotion(p,{dx:0,dy:1,dashId:1},STEP,map);assert(isWalkable(p,map));}assert(p.y<=516);assert.equal(p.elevation,0);});
test('core machinery blocks melee, while upper platform combat respects height separation',()=>{assert(canHit({x:1600,y:1250,elevation:240},{x:1640,y:1250,elevation:240},1,0,map));assert(!canHit({x:1510,y:1500,elevation:120},{x:1570,y:1500,elevation:120},1,0,map));assert(!canHit({x:1600,y:1250,elevation:120},{x:1600,y:1250,elevation:240},1,0,map));});
test('authoritative map changes are atomic across a complete match, reset spawns/resources and survive reconnect/host migration',()=>{
 for(const count of [2,3,6]){const f=fixture(count),id=f.room.match.id;
  for(let n=1;n<=3;n++){
   const expected=n===2?'scorched_point':'central_plaza';assert.equal(f.room.mapId,expected);assert.equal(f.room.match.roundNumber,n);
   const active=MAPS[expected];f.room.players.forEach((p,i)=>{assert(isWalkable(p,active));assert.equal(p.x,active.spawns[i].x);assert.equal(p.y,active.spawns[i].y);assert.equal(p.health,100);assert.equal(p.eliminations,0);assert.equal(p.stamina,100);assert(p.targetId&&p.targetId!==p.id);});
   for(const p of f.room.players){const v=f.server.view(f.room,p);assert.equal(v.mapId,expected);assert.equal(v.match.id,id);assert(!v.players.some((p:any)=>p.targetId));}
   f.send(0,{type:'input',seq:f.room.players[0].seq+1,dx:0,dy:0,mapId:'forged'});assert.equal(f.room.mapId,expected);
   if(n===2){const p=f.room.players[0];p.matchEliminations=3;p.eliminations=2;Object.assign(p,{x:1600,y:1250,elevation:240});f.server.disconnect(f.sockets[0]);const replacement=f.socket();f.server.message(replacement,JSON.stringify({type:'resume',code:f.room.code,token:p.token}));f.sockets[0]=replacement;const welcome=f.packets.get(replacement)![0];assert.equal(welcome.room.mapId,'scorched_point');assert.equal(welcome.room.players.find((v:any)=>v.id===p.id).elevation,240);assert.equal(welcome.room.objective.matchEliminations,3);assert.equal(f.room.players.length,count);assert.equal(f.room.hostId,f.room.players[1].id);}
   f.server.tick(f.room.round.endsAt);if(n<3){f.room.nextMapId=n===1?'scorched_point':'central_plaza';f.room.nextMapVariant=null;}assert.equal(f.room.mapId,expected,'Round-end freezes current map');if(n<3){assert.equal(f.room.phase,'intermission');assert.equal(f.room.nextMapId,n===1?'scorched_point':'central_plaza');const selected=f.room.nextMapId;f.server.endRound(f.room,Date.now());assert.equal(f.room.nextMapId,selected);f.server.tick(f.room.round.returnAt);}else assert.equal(f.room.phase,'complete');
  }
  assert.deepEqual(f.room.match.mapHistory,['central_plaza','scorched_point','central_plaza']);assert.equal(f.room.match.results[0].eliminations,3);
  const host=f.room.players.findIndex(p=>p.id===f.room.hostId);f.send(host,{type:'lobby'});assert.equal(f.room.mapId,'central_plaza');assert.equal(f.room.nextMapId,null);f.start();assert.equal(f.room.mapId,'central_plaza');assert.deepEqual(f.room.match.mapHistory,['central_plaza']);assert(f.room.players.every(p=>p.matchEliminations===0));
 }
});
test('Scorched Point authoritative upper-floor KO awards one Bounty credit and safe ground respawn; simultaneous ground hits still trade',()=>{
 const f=fixture(3);f.server.tick(f.room.round.endsAt);f.room.nextMapId='scorched_point';f.room.nextMapVariant=null;f.server.tick(f.room.round.returnAt);const a=f.room.players[0],b=f.room.players.find(p=>p.id===a.targetId)!;
 Object.assign(a,{x:1600,y:1250,elevation:240,health:100,protection:0,attackCooldown:0});Object.assign(b,{x:1630,y:1250,elevation:240,health:25,protection:0});assert(isWalkable(a,map)&&isWalkable(b,map));
 f.send(0,{type:'input',seq:a.seq+1,dx:0,dy:0,attackId:a.attackId+1,aimX:1,aimY:0});let now=Date.now()+20;a.lastInput=now;f.server.tick(now);assert.equal(b.health,0);assert.equal(a.eliminations,1);assert.equal(a.matchEliminations,1);
 for(let i=0;i<151;i++){now+=STEP*1000;f.server.tick(now);}assert.equal(b.health,100);assert.equal(b.elevation,0);assert(b.protection>0);assert(isWalkable(b,map));assert(map.spawns.some(s=>s.x===b.x&&s.y===b.y));assert.equal(a.matchEliminations,1);
 const g=fixture(2);g.server.tick(g.room.round.endsAt);g.room.nextMapId='scorched_point';g.room.nextMapVariant=null;g.server.tick(g.room.round.returnAt);g.room.players.forEach((p,i)=>Object.assign(p,{x:960+i*40,y:440,elevation:0,health:25,protection:0,attackCooldown:0}));
 g.room.players.forEach((p,i)=>g.send(i,{type:'input',seq:p.seq+1,dx:0,dy:0,attackId:p.attackId+1,aimX:i?-1:1,aimY:0}));g.server.tick(Date.now());assert(g.room.players.every(p=>p.health===0&&p.eliminations===1&&p.matchEliminations===1));
});
