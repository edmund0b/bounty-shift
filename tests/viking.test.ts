import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,mapEnvironment} from '../shared/map';
import {selectRoundMap,selectMapVariant} from '../shared/map-rotation';
import {freshMotion,advanceMotion,isWalkable,STEP} from '../shared/game';
import {TRAVERSAL} from '../shared/traversal';
import {canHit,safeSpawn} from '../shared/combat';
import {RoomServer} from './selection-fixture';
import type {WebSocket} from 'ws';
const map=MAPS.vikings_fjord;
function travel(start:{x:number;y:number;elevation?:number},points:number[][]){let p=freshMotion(start);for(const [x,y,e] of points){for(let i=0;i<1600&&Math.hypot(x-p.x,y-p.y)>5;i++){const dx=x-p.x,dy=y-p.y,l=Math.hypot(dx,dy);p=advanceMotion(p,{dx:dx/l,dy:dy/l,sprint:true},STEP,map);assert(isWalkable(p,map),JSON.stringify(p));}assert(Math.hypot(x-p.x,y-p.y)<7,`Blocked ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.elevation.toFixed(1)} toward ${x},${y}`);if(e!==undefined)assert(Math.abs(p.elevation-e)<2,`Height ${p.elevation} expected ${e}`);}return p;}
test('fifth arena participates in existing no-repeat rotation, never inherits Aerie variants',()=>{assert.equal(Object.keys(MAPS).length,5);assert.equal(selectRoundMap(1,map.id,()=>3),'central_plaza');assert.equal(selectRoundMap(2,'central_plaza',()=>3),map.id);assert.notEqual(selectRoundMap(3,map.id,()=>3),map.id);assert.equal(selectMapVariant(map.id,()=>{throw Error('No variants')}),null);assert.equal(mapEnvironment(map,'night'),map.environment);assert.equal(map.environment.theme,'fjord');});
test('eight Fjord spawns have valid support and separation; stairs meet existing slope limits',()=>{assert.equal(map.spawns.length,8);for(const p of map.spawns)assert(isWalkable(p,map),JSON.stringify(p));for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)assert(Math.hypot(map.spawns[i].x-map.spawns[j].x,map.spawns[i].y-map.spawns[j].y)>250);for(const s of map.surfaces)if(s.ramp)assert(Math.abs(s.ramp.to-s.ramp.from)/(s.ramp.axis==='x'?s.width:s.height)<=TRAVERSAL.maxSlope);assert(isWalkable(safeSpawn([],map),map));});
test('Longhouse has front/back interior route, loft stair and exterior high connection',()=>{
 travel({x:1130,y:1190,elevation:120},[[1130,950,120],[1130,660,120],[1130,400,120],[1200,400,120],[1590,400,0],[1590,520,0]]);
 travel({x:1350,y:950,elevation:120},[[1350,580,240],[880,540,240],[720,540,240],[720,350,240],[940,350,240],[1120,350,240]]);
});
test('high Watch Tower and Cliff Path circuit has two village and shoreline descents',()=>{
 travel({x:1120,y:360,elevation:240},[[1540,360,240],[2040,360,240],[2040,600,240],[2460,600,240],[2460,1740,240],[2460,2230,120],[2220,2230,120],[2460,2230,120],[2460,2720,0]]);
 travel({x:2040,y:600,elevation:240},[[2260,600,240],[2260,1110,120],[2100,1110,120],[2100,1500,120],[2570,1500,0]]);
});
test('western high walk, mid village junction and cave shore route connect',()=>{
 travel({x:700,y:350,elevation:240},[[530,350,240],[530,970,240],[530,1400,120],[710,1400,120],[720,1870,0],[720,2420,0],[430,2420,0],[430,1540,0],[430,1420,0],[430,1840,0],[400,2080,0],[430,2400,0],[820,2400,0]]);
});
test('village descents, exposed Ice Bridge and lower Dockyard provide alternatives',()=>{
 travel({x:1150,y:1890,elevation:120},[[1090,1890,120],[1090,2300,0],[820,2300,0],[820,2490,0],[1230,2490,120],[1900,2490,120],[2320,2490,0],[2420,2750,0],[2420,2800,0],[1720,2800,0],[1720,2890,0],[1720,3100,0]]);
 travel({x:1600,y:1880,elevation:120},[[1990,1910,120],[1990,2320,0]]);
});
test('frozen shoreline keeps ordinary walking, sprint, stamina and dash with no damage physics',()=>{
 let walk=freshMotion({x:1500,y:2150}),sprint=freshMotion({x:1500,y:2150}),dash=freshMotion({x:1500,y:2150});
 for(let i=0;i<10;i++){walk=advanceMotion(walk,{dx:1,dy:0},STEP,map);sprint=advanceMotion(sprint,{dx:1,dy:0,sprint:true},STEP,map);dash=advanceMotion(dash,{dx:1,dy:0,dashId:1},STEP,map);}
 assert(Math.abs(walk.x-1500-220*STEP*10)<.01);assert(Math.abs(sprint.x-1500-330*STEP*10)<.01);assert(sprint.stamina<100);assert(dash.x>sprint.x&&dash.dashCooldown>0);assert(isWalkable(dash,map));
});
test('Fjord boundary, cabin walls and upper floors block invalid movement and attacks',()=>{
 let p=freshMotion({x:470,y:2540});for(let i=0;i<100;i++)p=advanceMotion(p,{dx:-1,dy:0,dashId:1},STEP,map);assert(isWalkable(p,map));assert(p.x>=200+TRAVERSAL.radius);
 assert(!isWalkable({x:1700,y:1100,elevation:120},map));assert(canHit({x:1500,y:2150},{x:1540,y:2150},1,0,map));
 assert(canHit({x:1550,y:2490,elevation:120},{x:1590,y:2490,elevation:120},1,0,map));assert(!canHit({x:1550,y:2490,elevation:0},{x:1590,y:2490,elevation:120},1,0,map));
});
function fixture(count=2){const server=new RoomServer(true),socket=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),sockets=Array.from({length:count},socket);server.message(sockets[0],JSON.stringify({type:'create',name:'A'}));const room=server.sessions.get(sockets[0])!.room;for(let i=1;i<count;i++)server.message(sockets[i],JSON.stringify({type:'join',name:`P${i}`,code:room.code}));for(const ws of sockets)server.message(ws,JSON.stringify({type:'ready',ready:true}));server.message(sockets[0],JSON.stringify({type:'start'}));return {server,sockets,room,socket};}
test('two/six players transition Aerie night → Fjord, resume current state and reset to Central Plaza',()=>{for(const count of [2,6]){const {server,sockets,room,socket}=fixture(count);assert.equal(room.mapId,'central_plaza');assert.equal(room.match.totalRounds,3);server.tick(room.round.endsAt);room.nextMapId='aerie_sky_port';room.nextMapVariant='night';server.tick(room.round.returnAt);server.tick(room.round.endsAt);room.nextMapId=map.id;room.nextMapVariant=selectMapVariant(map.id,()=>0);server.tick(room.round.returnAt);assert.equal(room.mapVariant,null);for(const [i,p] of room.players.entries()){assert.equal(p.x,map.spawns[i].x);assert.equal(p.y,map.spawns[i].y);assert.equal(p.elevation,map.spawns[i].elevation??0);assert(isWalkable(p,map));assert.equal(p.health,100);assert(p.targetId&&p.targetId!==p.id);assert.equal(server.view(room,p).mapId,map.id);}const p=room.players[0];p.health=75;p.matchEliminations=3;const target=p.targetId;server.disconnect(sockets[0]);const resumed=socket();server.message(resumed,JSON.stringify({type:'resume',code:room.code,token:p.token}));assert.equal(room.players.length,count);assert.equal(server.view(room,p).mapId,map.id);assert.equal(server.view(room,p).mapVariant,null);assert.equal(p.health,75);assert.equal(p.targetId,target);server.tick(room.round.endsAt);assert.equal(room.phase,'complete');assert.equal(room.match.results[0].eliminations,3);const host=room.players.find(p=>p.id===room.hostId)!;server.message(host.socket!,JSON.stringify({type:'lobby'}));for(const q of room.players)server.message(q.socket!,JSON.stringify({type:'ready',ready:true}));server.message(host.socket!,JSON.stringify({type:'start'}));assert.equal(room.mapId,'central_plaza');assert.equal(room.match.roundNumber,1);assert(room.players.every(q=>q.matchEliminations===0));}});
test('Fjord lethal Bounty attack scores once and respawn restores map-specific safe spawn/protection',()=>{const {server,sockets,room}=fixture();server.tick(room.round.endsAt);room.nextMapId=map.id;room.nextMapVariant=null;server.tick(room.round.returnAt);room.round.endsAt=Date.now()+90000;const attacker=room.players[0],victim=room.players[1];Object.assign(attacker,{x:1500,y:2150,elevation:0,protection:0,attackCooldown:0});Object.assign(victim,{x:1540,y:2150,elevation:0,protection:0,health:25});server.message(sockets[0],JSON.stringify({type:'input',matchId:room.match.id,roundNumber:2,seq:attacker.seq+1,dx:0,dy:0,aimX:1,aimY:0,attackId:attacker.attackId+1}));let now=Date.now();server.tick(now);assert.equal(victim.health,0);assert.equal(attacker.eliminations,1);assert.equal(attacker.matchEliminations,1);for(let i=0;i<155;i++){now+=STEP*1000;server.tick(now);}assert.equal(victim.health,100);assert(victim.protection>0);assert(isWalkable(victim,map));assert(map.spawns.some(s=>s.x===victim.x&&s.y===victim.y));});
test('all Fjord spawn points have a usable exit rather than isolated safe coordinates',()=>{
 const exits=[[[1550,1800,120]],[[900,1410,120]],[[2110,1490,120]],[[2700,1650,0]],[[700,2600,0]],[[1500,2800,0]],[[2430,2830,0]],[[1310,360,240]]];
 map.spawns.forEach((s,i)=>travel(s,exits[i]));
});
test('dash remains supported on village stairs, high cliff and Ice Bridge',()=>{
 for(const [start,dx,dy] of [[{x:1090,y:2300},0,-1],[{x:2460,y:1300,elevation:240},0,1],[{x:1500,y:2490,elevation:120},1,0]] as const){let p=freshMotion(start);for(let i=0;i<15;i++){p=advanceMotion(p,{dx,dy,dashId:1},STEP,map);assert(isWalkable(p,map));}assert(p.dashCooldown>0);assert(Math.hypot(p.x-start.x,p.y-start.y)>50);}
});
