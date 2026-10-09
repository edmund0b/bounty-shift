import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,mapEnvironment} from '../shared/map';
import {selectRoundMap,selectMapVariant} from '../shared/map-rotation';
import {freshMotion,advanceMotion,isWalkable,STEP} from '../shared/game';
import {TRAVERSAL} from '../shared/traversal';
import {canHit,safeSpawn} from '../shared/combat';
const map=MAPS.outlaws_canyon;
function travel(start:{x:number;y:number;elevation?:number},points:number[][]){let p=freshMotion(start);for(const [x,y,e] of points){for(let i=0;i<1600&&Math.hypot(x-p.x,y-p.y)>5;i++){const dx=x-p.x,dy=y-p.y,l=Math.hypot(dx,dy);p=advanceMotion(p,{dx:dx/l,dy:dy/l,sprint:true},STEP,map);assert(isWalkable(p,map));}assert(Math.hypot(x-p.x,y-p.y)<7,`Blocked ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.elevation.toFixed(1)} toward ${x},${y}`);if(e!==undefined)assert(Math.abs(p.elevation-e)<2,`Height ${p.elevation} expected ${e} at ${x},${y}`);}return p;}
test('four registered maps preserve opening/no-repeat selection; Outlaw has no Aerie variant',()=>{assert.equal(selectRoundMap(1,map.id,()=>0),'central_plaza');assert.equal(selectRoundMap(2,'central_plaza',()=>2),map.id);assert.equal(selectMapVariant(map.id,()=>{throw Error('Should not randomize')}),null);assert.equal(mapEnvironment(map,'night'),map.environment);assert.equal(selectMapVariant('aerie_sky_port',()=>1),'night');});
test('eight canyon spawns are valid, spread and all ramps fit the unchanged slope limit',()=>{assert.equal(map.spawns.length,8);for(const p of map.spawns)assert(isWalkable(p,map),JSON.stringify(p));for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)assert(Math.hypot(map.spawns[i].x-map.spawns[j].x,map.spawns[i].y-map.spawns[j].y)>250);for(const s of map.surfaces)if(s.ramp)assert(Math.abs(s.ramp.to-s.ramp.from)/(s.ramp.axis==='x'?s.width:s.height)<=TRAVERSAL.maxSlope);assert(isWalkable(safeSpawn([],map),map));});
test('Central Pit has four smooth, independent approaches to the mid shelves',()=>{
 travel({x:1425,y:1220},[[1425,800,120]]);travel({x:1300,y:1510},[[860,1510,120]]);
 travel({x:1550,y:1510},[[2030,1510,120]]);travel({x:1425,y:1850},[[1425,2310,120]]);
});
test('west ascent, natural Rock Bridge, Watch Tower and eastern descent form a high flank',()=>{
 travel({x:1270,y:1670},[[870,1670,120],[780,1690,120],[780,1130,120],[780,730,240],[950,590,240],[1410,590,240],[1900,590,240],[2170,590,240],[2170,730,240],[2170,1130,120],[2280,1600,120],[2280,2100,0]]);
});
test('outpost interior, stair aperture, southern high crossing and eastern catwalk connect',()=>{
 travel({x:550,y:2825},[[550,2440,120],[550,2450,120],[755,2450,120],[755,2095,240],[845,2095,240],[845,2420,240],[1000,2420,240],[1000,2470,240],[2110,2470,240],[2420,2420,240],[2420,1970,120],[2420,1680,120],[2270,1680,120]]);
});
test('cave is a two-exit lower shortcut with a sheltered chamber and supported overhead routes',()=>{
 travel({x:435,y:900},[[435,1230,0],[500,1230,0],[500,1500,0],[435,1500,0],[435,1820,0],[490,1820,0],[435,1820,0],[435,2040,0],[950,2040,0]]);
});
test('enclosed cliffs stop dash and pit rock blocks melee; vertical combat stays separated',()=>{
 let p=freshMotion({x:1270,y:1300});for(let i=0;i<100;i++){p=advanceMotion(p,{dx:-1,dy:0,dashId:1},STEP,map);assert(isWalkable(p,map));}
 assert(!isWalkable({x:90,y:1500,elevation:0},map));assert(!isWalkable({x:1470,y:1650,elevation:0},map));
 assert(canHit({x:1270,y:1300,elevation:0},{x:1310,y:1300,elevation:0},1,0,map));
 assert(!canHit({x:1380,y:1650,elevation:0},{x:1440,y:1650,elevation:0},1,0,map));
});
import {RoomServer} from './selection-fixture';
import type {WebSocket} from 'ws';
test('Aerie night to Canyon clears variant, restores reconnect state and finishes fresh matches for two/six players',()=>{for(const count of [2,6]){
 const server=new RoomServer(true),socket=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),sockets=Array.from({length:count},socket);server.message(sockets[0],JSON.stringify({type:'create',name:'A'}));const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)server.message(sockets[i],JSON.stringify({type:'join',name:`P${i}`,code:room.code}));for(const ws of sockets)server.message(ws,JSON.stringify({type:'ready',ready:true}));server.message(sockets[0],JSON.stringify({type:'start'}));assert.equal(room.mapId,'central_plaza');assert.equal(room.match.totalRounds,3);
 server.tick(room.round.endsAt);room.nextMapId='aerie_sky_port';room.nextMapVariant='night';server.tick(room.round.returnAt);assert.equal(room.mapVariant,'night');server.tick(room.round.endsAt);room.nextMapId=map.id;room.nextMapVariant=selectMapVariant(map.id,()=>0);server.tick(room.round.returnAt);assert.equal(room.mapVariant,null);assert.equal(room.mapId,map.id);
 for(const [i,p] of room.players.entries()){assert.equal(p.x,map.spawns[i].x);assert.equal(p.y,map.spawns[i].y);assert(isWalkable(p,map));assert.equal(p.health,100);assert(p.targetId&&p.targetId!==p.id);assert.equal(server.view(room,p).mapId,map.id);assert.equal(server.view(room,p).mapVariant,null);}
 const p=room.players[0];p.matchEliminations=3;p.eliminations=1;p.health=75;const target=p.targetId;server.disconnect(sockets[0]);const replacement=socket();server.message(replacement,JSON.stringify({type:'resume',code:room.code,token:p.token}));assert.equal(room.players.length,count);assert.equal(server.view(room,p).mapVariant,null);assert.equal(p.matchEliminations,3);assert.equal(p.health,75);assert.equal(p.targetId,target);
 server.message(replacement,JSON.stringify({type:'input',matchId:room.match.id,roundNumber:3,seq:p.seq+1,dx:0,dy:0,mapId:'aerie_sky_port',mapVariant:'night'}));assert.equal(room.mapId,map.id);assert.equal(room.mapVariant,null);server.tick(room.round.endsAt);assert.equal(room.phase,'complete');assert.equal(room.match.results[0].eliminations,3);
 const host=room.players.find(p=>p.id===room.hostId)!;server.message(host.socket!,JSON.stringify({type:'lobby'}));for(const p of room.players)server.message(p.socket!,JSON.stringify({type:'ready',ready:true}));server.message(host.socket!,JSON.stringify({type:'start'}));assert.equal(room.mapId,'central_plaza');assert.equal(room.match.roundNumber,1);assert(room.players.every(p=>p.matchEliminations===0));
 }});
test('Canyon lethal Bounty attack credits once and respawn uses only safe Canyon coordinates',()=>{const server=new RoomServer(true),socket=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),a=socket(),b=socket();server.message(a,JSON.stringify({type:'create',name:'A'}));const room=server.sessions.get(a)!.room;server.message(b,JSON.stringify({type:'join',name:'B',code:room.code}));for(const ws of [a,b])server.message(ws,JSON.stringify({type:'ready',ready:true}));server.message(a,JSON.stringify({type:'start'}));server.tick(room.round.endsAt);room.nextMapId=map.id;room.nextMapVariant=null;server.tick(room.round.returnAt);room.round.endsAt=Date.now()+90000;const attacker=room.players[0],victim=room.players[1];Object.assign(attacker,{x:950,y:1180,elevation:0,protection:0,attackCooldown:0});Object.assign(victim,{x:990,y:1180,elevation:0,protection:0,health:25});server.message(a,JSON.stringify({type:'input',matchId:room.match.id,roundNumber:2,seq:attacker.seq+1,dx:0,dy:0,aimX:1,aimY:0,attackId:attacker.attackId+1}));let now=Date.now();server.tick(now);assert.equal(victim.health,0);assert.equal(attacker.eliminations,1);assert.equal(attacker.matchEliminations,1);for(let i=0;i<155;i++){now+=STEP*1000;server.tick(now);}assert.equal(victim.health,100);assert(victim.protection>0);assert(isWalkable(victim,map));assert(map.spawns.some(s=>s.x===victim.x&&s.y===victim.y));assert.equal(attacker.matchEliminations,1);});
test('high Rock Bridge permits same-level melee but rejects attacks across floors',()=>{assert(isWalkable({x:1400,y:590,elevation:240},map));assert(isWalkable({x:1440,y:590,elevation:240},map));assert(canHit({x:1400,y:590,elevation:240},{x:1440,y:590,elevation:240},1,0,map));assert(!canHit({x:1400,y:590,elevation:120},{x:1440,y:590,elevation:240},1,0,map));});
