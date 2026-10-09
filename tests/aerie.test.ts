import {AERIE_SITES,AERIE_BRIDGES,aerieStairs} from '../shared/maps/aerie-layout';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,mapEnvironment} from '../shared/map';
import {selectMapVariant,selectRoundMap} from '../shared/map-rotation';
import {advanceMotion,freshMotion,isWalkable,STEP} from '../shared/game';
import {TRAVERSAL} from '../shared/traversal';
const map=MAPS.aerie_sky_port;
function travel(start:{x:number;y:number;elevation?:number},points:number[][]){let p=freshMotion(start);for(const [x,y,e] of points){for(let i=0;i<1200&&Math.hypot(x-p.x,y-p.y)>5;i++){const dx=x-p.x,dy=y-p.y,l=Math.hypot(dx,dy);p=advanceMotion(p,{dx:dx/l,dy:dy/l,sprint:true},STEP,map);assert(isWalkable(p,map));}assert(Math.hypot(x-p.x,y-p.y)<7,`Blocked ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.elevation.toFixed(1)} toward ${x},${y}`);if(e!==undefined)assert(Math.abs(p.elevation-e)<2,`Height ${p.elevation} expected ${e} at ${x},${y}`);}return p;}
test('Aerie registry, identical day/night physics, server-supplied variants and opening rule',()=>{assert.equal(selectRoundMap(1,'aerie_sky_port',()=>0),'central_plaza');assert.equal(selectRoundMap(2,'central_plaza',()=>1),'aerie_sky_port');assert.equal(selectMapVariant(map.id,()=>0),'day');assert.equal(selectMapVariant(map.id,()=>1),'night');assert.equal(selectMapVariant('central_plaza',()=>0),null);assert.notEqual(mapEnvironment(map,'day').fog,mapEnvironment(map,'night').fog);assert.equal(map.variants?.day.theme,'sky_port');});
test('eight Aerie spawns are safe, separated and slopes are controller-compatible',()=>{assert.equal(map.spawns.length,8);for(const p of map.spawns)assert(isWalkable(p,map),JSON.stringify(p));for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)assert(Math.hypot(map.spawns[i].x-map.spawns[j].x,map.spawns[i].y-map.spawns[j].y)>250);for(const s of map.surfaces)if(s.ramp)assert(Math.abs(s.ramp.from-s.ramp.to)/(s.ramp.axis==='x'?s.width:s.height)<=TRAVERSAL.maxSlope);});
test('seven locations have two smooth stair flights linking lower, mid and high routes',()=>{
 for(const s of AERIE_SITES){const [a,b]=aerieStairs(s);travel({x:a.x+55,y:s.y+50},[[a.x+55,s.y+s.height-50,120],[b.x+55,s.y+s.height-50,120],[b.x+55,s.y+50,240]]);}
});
test('central hub has north/south approaches and an accessible upper observation loop',()=>{
 travel({x:1810,y:2420},[[1810,2020,120],[1900,2020,120],[1900,1760,120],[1900,1340,240],[1780,1340,240],[1780,1450,240],[1450,1450,240],[1450,1870,240],[1790,1870,240]]);
 travel({x:1810,y:900},[[1810,1300,120]]);
});
test('open sky remains unsupported and repeated dashes stop at visible platform lips',()=>{assert(!isWalkable({x:50,y:50,elevation:0},map));let p=freshMotion({x:1150,y:3020});for(let i=0;i<100;i++)p=advanceMotion(p,{dx:0,dy:1,dashId:1,sprint:true},STEP,map);assert(isWalkable(p,map));assert(p.y<=3140-TRAVERSAL.radius);assert.equal(p.elevation,0);});
import {RoomServer} from './selection-fixture';
import type {WebSocket} from 'ws';
test('two/six clients share authoritative Aerie variant, scores, reconnect and final flow',()=>{for(const count of [2,6])for(const variant of ['day','night']){
 const server=new RoomServer(true),socket=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),sockets=Array.from({length:count},socket);
 server.message(sockets[0],JSON.stringify({type:'create',name:'Host'}));const room=server.sessions.get(sockets[0])!.room;
 for(let i=1;i<count;i++)server.message(sockets[i],JSON.stringify({type:'join',name:`P${i}`,code:room.code}));for(const ws of sockets)server.message(ws,JSON.stringify({type:'ready',ready:true}));server.message(sockets[0],JSON.stringify({type:'start'}));assert.equal(room.mapId,'central_plaza');assert.equal(room.mapVariant,null);
 server.tick(room.round.endsAt);assert(Object.keys(MAPS).includes(room.nextMapId!));room.nextMapId='aerie_sky_port';room.nextMapVariant=variant;server.tick(room.round.returnAt);assert.equal(room.mapId,'aerie_sky_port');assert.equal(room.mapVariant,variant);
 for(const p of room.players){const v=server.view(room,p);assert.equal(v.mapVariant,variant);assert(isWalkable(p,map));assert(p.targetId&&p.targetId!==p.id);}
 const p=room.players[0];p.matchEliminations=4;p.eliminations=2;p.health=75;server.disconnect(sockets[0]);const replacement=socket();server.message(replacement,JSON.stringify({type:'resume',code:room.code,token:p.token}));assert.equal(server.view(room,p).mapVariant,variant);assert.equal(p.health,75);assert.equal(p.matchEliminations,4);assert.equal(room.players.length,count);
 server.message(replacement,JSON.stringify({type:'input',matchId:room.match.id,roundNumber:2,seq:p.seq+1,dx:0,dy:0,mapId:'central_plaza',mapVariant:variant==='day'?'night':'day'}));assert.equal(room.mapVariant,variant);
 server.tick(room.round.endsAt);assert.notEqual(room.nextMapId,'aerie_sky_port');assert.equal(room.nextMapVariant,null);server.tick(room.round.returnAt);assert.equal(room.mapVariant,null);assert.equal(p.matchEliminations,4);server.tick(room.round.endsAt);assert.equal(room.phase,'complete');assert.equal(room.match.results[0].eliminations,4);
 const host=room.players.find(p=>p.id===room.hostId)!;server.message(host.socket!,JSON.stringify({type:'lobby'}));assert.equal(room.mapId,'central_plaza');assert.equal(room.mapVariant,null);assert(room.players.every(p=>p.matchEliminations===0));
 }});
import {canHit,safeSpawn} from '../shared/combat';
test('Aerie melee is blocked by beacon and vertical decks; respawn selection stays supported',()=>{assert(canHit({x:1150,y:2600,elevation:0},{x:1190,y:2600,elevation:0},1,0,map));assert(!canHit({x:1550,y:1660,elevation:0},{x:1620,y:1660,elevation:0},1,0,map));assert(!canHit({x:900,y:200,elevation:90},{x:900,y:200,elevation:180},1,0,map));assert(isWalkable(safeSpawn([],map),map));});
test('Aerie authoritative target KO credits once and respawns on its own platforms',()=>{const server=new RoomServer(true),socket=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),a=socket(),b=socket();server.message(a,JSON.stringify({type:'create',name:'A'}));const room=server.sessions.get(a)!.room;server.message(b,JSON.stringify({type:'join',name:'B',code:room.code}));for(const ws of [a,b])server.message(ws,JSON.stringify({type:'ready',ready:true}));server.message(a,JSON.stringify({type:'start'}));server.tick(room.round.endsAt);room.nextMapId=map.id;room.nextMapVariant='day';server.tick(room.round.returnAt);room.round.endsAt=Date.now()+90000;const attacker=room.players[0],victim=room.players[1];Object.assign(attacker,{x:1150,y:2600,elevation:0,protection:0,attackCooldown:0});Object.assign(victim,{x:1190,y:2600,elevation:0,protection:0,health:25});server.message(a,JSON.stringify({type:'input',matchId:room.match.id,roundNumber:2,seq:attacker.seq+1,dx:0,dy:0,aimX:1,aimY:0,attackId:attacker.attackId+1}));let now=Date.now();server.tick(now);assert.equal(victim.health,0);assert.equal(attacker.eliminations,1);assert.equal(attacker.matchEliminations,1);for(let i=0;i<155;i++){now+=STEP*1000;server.tick(now);}assert.equal(victim.health,100);assert(isWalkable(victim,map));assert(map.spawns.some(s=>s.x===victim.x&&s.y===victim.y));assert.equal(attacker.matchEliminations,1);});

test('each inter-site sky bridge can be crossed in both directions at its authored level',()=>{
 for(const b of AERIE_BRIDGES.filter(b=>!b.id.startsWith('hub-'))){const horizontal=b.width>b.height;
 const a={x:b.x+(horizontal?25:b.width/2),y:b.y+(horizontal?b.height/2:25),elevation:b.elevation};
 const end=[b.x+(horizontal?b.width-25:b.width/2),b.y+(horizontal?b.height/2:b.height-25),b.elevation];
 assert(isWalkable(a,map),b.id);const p=travel(a,[end]);travel(p,[[a.x,a.y,a.elevation]]);
 }
});

test('sky bridge entrances join real rooms and balconies without sealed rails',()=>{
 travel({x:760,y:710,elevation:120},[[1140,710,120]]);
 travel({x:1670,y:680,elevation:240},[[2425,680,240],[2425,650,240],[2590,650,240]]);
 travel({x:2520,y:1060,elevation:120},[[2520,1440,120]]);
 travel({x:2520,y:2040,elevation:240},[[2520,2440,240]]);
 travel({x:1575,y:3040,elevation:120},[[1575,2780,120],[2290,2780,120]]);
 travel({x:340,y:1160,elevation:120},[[340,1790,120]]);
 travel({x:760,y:2240,elevation:240},[[1060,2240,240],[1060,2580,240]]);
});
