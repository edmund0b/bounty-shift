import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVE_MAP,MAPS,SPAWNS,WORLD} from './legacy-game-fixture';
import {freshMotion,advanceMotion,isWalkable,move,STEP} from './legacy-game-fixture';
import {surfaceHeight,walkable,TRAVERSAL} from './legacy-game-fixture';
import {canHit,clearAttackLine} from './legacy-game-fixture';
import {RoomServer} from './legacy-game-fixture';
import type {WebSocket} from 'ws';

test('Central Plaza remains the default map with eight spread valid spawns and asymmetric districts',()=>{
 assert(MAPS.central_plaza);assert.equal(ACTIVE_MAP.id,'central_plaza');assert(WORLD.width*WORLD.height>2000*1440*1.5);
 assert.equal(ACTIVE_MAP.districts.length,5);assert.equal(SPAWNS.length,8);SPAWNS.forEach(p=>assert(isWalkable(p)));
 for(const s of ACTIVE_MAP.surfaces)if(s.ramp)assert(Math.abs(s.ramp.to-s.ramp.from)/(s.ramp.axis==='x'?s.width:s.height)<=TRAVERSAL.maxSlope,`${s.id} exceeds the supported map slope`);
 for(let i=0;i<SPAWNS.length;i++)for(let j=i+1;j<SPAWNS.length;j++)assert(Math.hypot(SPAWNS[i].x-SPAWNS[j].x,SPAWNS[i].y-SPAWNS[j].y)>250);
});
test('all three approaches climb smoothly, descend, and preserve sprint/dash constraints',()=>{
 for(const ramp of ACTIVE_MAP.surfaces.filter(s=>s.ramp)){
  let p=freshMotion({x:ramp.x+ramp.width/2,y:ramp.y+ramp.height+20});let previous=0,climbed=false;
  for(let i=0;i<180;i++){const old={...p};p=advanceMotion(p,{dx:0,dy:-1,sprint:true,dashId:i>10?1:0});assert(isWalkable(p));assert(p.elevation>=previous-1e-7);assert(Math.abs(p.elevation-old.elevation)<=30,'No teleport onto high ground');previous=p.elevation;if(p.elevation===100){climbed=true;break;}}
  assert(climbed,`Could not climb ${ramp.id}`);assert(p.stamina<100);assert(p.dashCooldown>0||p.dashSeen===1);
  for(let i=0;i<160&&p.y<ramp.y+ramp.height+15;i++)p=advanceMotion(p,{dx:0,dy:1});assert.equal(p.elevation,0,`Could not descend ${ramp.id}`);
 }
});
test('upper route connects west ascent, North Bridge, east catwalk and opposite descent',()=>{
 let p=freshMotion({x:730,y:1900});
 const travel=(x:number,y:number)=>{for(let i=0;i<600&&Math.hypot(p.x-x,p.y-y)>8;i++){const dx=x-p.x,dy=y-p.y,l=Math.hypot(dx,dy);p=advanceMotion(p,{dx:dx/l,dy:dy/l,sprint:true});assert(isWalkable(p));}assert(Math.hypot(p.x-x,p.y-y)<10,`Route blocked at ${p.x},${p.y},${p.elevation} toward ${x},${y}`);};
 travel(730,1480);assert.equal(p.elevation,100);travel(730,350);travel(1870,350);travel(1870,1450);travel(1870,1900);assert.equal(p.elevation,0);
});
test('ground underpasses stay grounded, upper edges block, and dash cannot skip elevation or solids',()=>{
 let ground=freshMotion({x:1000,y:1300});for(let i=0;i<45;i++){ground=advanceMotion(ground,{dx:0,dy:1,dashId:1});assert.equal(ground.elevation,0);assert(isWalkable(ground));}assert(ground.y>1540);
 let upper=freshMotion({x:730,y:1000,elevation:100});for(let i=0;i<30;i++)upper=advanceMotion(upper,{dx:1,dy:0,dashId:1});assert(upper.x<=787);assert.equal(upper.elevation,100);assert(isWalkable(upper));
 let side=freshMotion({x:1150,y:500});for(let i=0;i<30;i++)side=advanceMotion(side,{dx:1,dy:0,dashId:1});assert(side.x<1220);assert.equal(side.elevation,0);
 assert(!walkable({x:1300,y:1050,elevation:100}));assert(!walkable({x:730,y:1000,elevation:50}));
});
test('melee respects vertical separation, deck/rail thickness, low cover and slope volumes',()=>{
 assert(!canHit({x:900,y:1450,elevation:0},{x:900,y:1450,elevation:100},1,0));
 assert(canHit({x:900,y:1450,elevation:100},{x:940,y:1450,elevation:100},1,0));
 assert(canHit({x:1000,y:700,elevation:0},{x:1040,y:700,elevation:0},1,0));
 assert(!clearAttackLine({x:166,y:515},{x:195,y:486}));
 const ramp=ACTIVE_MAP.surfaces.find(s=>s.id==='north-stairs')!;
 assert(canHit({x:1300,y:600,elevation:surfaceHeight(ramp,{x:1300,y:600})},{x:1300,y:640,elevation:surfaceHeight(ramp,{x:1300,y:640})},0,1));
});
test('server/prediction elevation matches, forging height is ignored, reconnect restores upper body',()=>{
 const rooms=new RoomServer(true),fake=()=>({readyState:1,send:()=>{}} as unknown as WebSocket),a=fake(),b=fake();
 const send=(s:WebSocket,m:any)=>{const r=rooms.sessions.get(s)?.room;rooms.message(s,JSON.stringify(m.type==='input'?{matchId:r!.match.id,roundNumber:r!.match.roundNumber,...m}:m));};
 send(a,{type:'create',name:'A'});const room=rooms.sessions.get(a)!.room;send(b,{type:'join',code:room.code,name:'B'});send(a,{type:'ready',ready:true});send(b,{type:'ready',ready:true});send(a,{type:'start'});const p=room.players[0];Object.assign(p,freshMotion({x:730,y:1900}));let predicted={...p},now=Date.now();
 for(let i=1;i<=90;i++){const input={seq:i,dx:0,dy:-1,sprint:true,dashId:i>=10?1:0};send(a,{type:'input',...input,elevation:999999,y:-999});now+=STEP*1000;p.lastInput=now;rooms.tick(now);predicted={...predicted,...advanceMotion(predicted,input)};assert.equal(p.elevation,predicted.elevation);assert.equal(p.x,predicted.x);assert.equal(p.y,predicted.y);assert(isWalkable(p));}
 assert.equal(p.elevation,100);rooms.disconnect(a);const c=fake();send(c,{type:'resume',code:room.code,token:p.token});assert.equal(rooms.sessions.get(c)!.player.id,p.id);assert.equal(rooms.view(room,p).players[0].elevation,100);assert.equal(rooms.view(room,p).mapId,'__legacy_plaza');
});
test('traversal and combat accept a map definition instead of fixed Central Plaza world geometry',()=>{
 const other={...ACTIVE_MAP,id:'test_fixture',bounds:{width:500,height:500},blocks:[],surfaces:[],spawns:[{x:50,y:50}]};
 assert(isWalkable({x:200,y:200},other));assert(!isWalkable({x:600,y:200},other));
 const p=move({x:480,y:250},1,0,1,850,other);assert.equal(p.x,486);
 assert(clearAttackLine({x:100,y:600},{x:600,y:600},other));assert(!clearAttackLine({x:100,y:600},{x:600,y:600}));
});
