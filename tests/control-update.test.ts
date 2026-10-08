import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlInput,CONTROL_TIMING} from '../shared/control-input.js';
import {advanceMotion,freshMotion,STEP,isWalkable} from '../shared/game.js';
import {MAPS} from '../shared/map.js';
import {RoomServer} from '../server/rooms.js';
import {pickup} from '../shared/inventory.js';
import type {WebSocket} from 'ws';
test('Space edges jump immediately, pair dashes once, repeats do nothing; X tap/hold/cancel distinguish',()=>{
 const actions:string[]=[],c=new ControlInput(a=>actions.push(a));c.down(' ',0);assert.deepEqual(actions,['jump']);c.down(' ',50,true);c.up(' ',70);c.down(' ',100);assert.deepEqual(actions,['jump','dash']);c.up(' ',110);c.down(' ',500);c.up(' ',520);assert.deepEqual(actions,['jump','dash','jump']);
 c.down('x',600);c.up('x',650);assert.equal(actions.at(-1),'crouch');c.down('x',700);c.update(700+CONTROL_TIMING.slideHoldMs);c.update(1000);c.up('x',1100);assert.equal(actions.filter(a=>a==='slide').length,1);c.down('x',1200);c.cancel();c.up('x',1500);assert.equal(actions.filter(a=>a==='crouch').length,1);
 for(const [key,action] of Object.entries({e:'interact',f:'attack',z:'dodge',m:'map',h:'hints','1':'slot1','2':'slot2','3':'slot3'})){c.down(key,1600);c.up(key,1601);assert.equal(actions.at(-1),action);}
});
test('Jump prediction lands on every arena spawn, supports sprint/dash and consumes airborne requests without double jump',()=>{
 for(const map of Object.values(MAPS)){let s=freshMotion(map.spawns[0]),max=0;for(let i=0;i<60;i++){s=advanceMotion(s,{dx:0,dy:0,jumpId:i<5?1:2},STEP,map);max=Math.max(max,s.elevation-(map.spawns[0].elevation??0));}assert(max>20,map.name);assert.equal(s.airborne,false,map.name);assert(isWalkable(s,map));assert.equal(s.jumpSeen,2);}
 let s=freshMotion({x:1300,y:1400});s=advanceMotion(s,{dx:1,dy:0,jumpId:1,sprint:true});assert(s.airborne&&s.sprinting);const v=s.verticalVelocity!;s=advanceMotion(s,{dx:1,dy:0,jumpId:2,dashId:1});assert(s.verticalVelocity!<v);assert(s.dashRemaining>0);assert(s.x>1330);
 s=advanceMotion(s,{dx:0,dy:0,crouch:true});assert(s.crouched);
});
test('Server validates jump/crouch/equipment, broadcasts vertical motion and category inventory, rejects stale epochs',()=>{
 const server=new RoomServer(),fake=()=>({readyState:1,send:()=>{}}) as unknown as WebSocket,a=fake(),b=fake();const send=(ws:WebSocket,m:object)=>server.message(ws,JSON.stringify(m));send(a,{type:'create',name:'A'});const {room,player:p}=server.sessions.get(a)!;send(b,{type:'join',code:room.code,name:'B'});for(const ws of [a,b])send(ws,{type:'ready',ready:true});send(a,{type:'start'});const epoch={matchId:room.match.id,roundNumber:1};
 send(a,{type:'input',...epoch,seq:1,dx:0,dy:0,jumpId:1,crouch:false});server.tick();assert(p.airborne);assert(server.view(room).players[0].elevation>0);send(a,{type:'input',...epoch,seq:2,dx:0,dy:0,jumpId:1.5});assert.equal(p.seq,1);send(a,{type:'input',...epoch,seq:2,dx:0,dy:0,crouch:'yes'});assert.equal(p.seq,1);
 pickup(p,'blade');pickup(p,'freeze_ball');send(a,{type:'equip',...epoch,slot:1});assert.equal(p.heldItem,'blade');send(a,{type:'equip',...epoch,slot:3});assert.equal(p.heldItem,'freeze_ball');send(a,{type:'equip',...epoch,slot:2});assert.equal(p.selectedSlot,3);room.mode.flag={...room.mode.flag,state:'carried',carrier:p.id};send(a,{type:'equip',...epoch,slot:2});assert.equal(p.selectedSlot,2);assert.equal(p.heldItem,null);assert.equal(p.inventory?.weapon,'blade');send(a,{type:'equip',...epoch,slot:4});assert.equal(p.selectedSlot,2);send(a,{type:'equip',...epoch,roundNumber:9,slot:1});assert.equal(p.selectedSlot,2);p.health=0;send(a,{type:'equip',...epoch,slot:1});assert.equal(p.selectedSlot,2);
});

test('Jump plus dash never remains suspended against arena solids or lands inside geometry',()=>{for(const map of Object.values(MAPS))for(const start of map.spawns)for(let direction=0;direction<8;direction++){let s=freshMotion(start);for(let i=0;i<90;i++)s=advanceMotion(s,{dx:Math.cos(direction*Math.PI/4),dy:Math.sin(direction*Math.PI/4),jumpId:1,dashId:i>0?1:0},STEP,map);assert(!s.airborne,map.name);assert(isWalkable(s,map),map.name);}});
