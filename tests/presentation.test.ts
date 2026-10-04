import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraMovement, cameraAim } from '../shared/presentation.js';
import { freshMotion, advanceMotion, isWalkable } from '../shared/game.js';
import { SPAWNS } from '../shared/map.js';
test('camera-relative controls rotate forward/strafe without changing speed',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.63]){
  const aim=cameraAim(yaw),f=cameraMovement(0,1,yaw),r=cameraMovement(1,0,yaw),d=cameraMovement(1,1,yaw);
  assert(Math.abs(f.dx-aim.x)<1e-9&&Math.abs(f.dy-aim.y)<1e-9);assert(Math.abs(f.dx*r.dx+f.dy*r.dy)<1e-9);assert(Math.abs(Math.hypot(d.dx,d.dy)-1)<1e-9);
 }
 assert(cameraMovement(0,1,0).dy<0);assert(cameraMovement(0,1,Math.PI/2).dx>.99);
});
test('rotated sprint/dash retain shared prediction, map collision and valid spawns',()=>{
 assert(SPAWNS.every(isWalkable));for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  let p=freshMotion({x:1000,y:700});for(let i=0;i<240;i++){p=advanceMotion(p,{...cameraMovement(0,1,yaw),sprint:true,dashId:Math.floor(i/100)+1});assert(isWalkable(p));}
 }
});
