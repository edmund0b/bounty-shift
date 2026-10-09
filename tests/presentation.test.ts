import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraMovement, cameraAim } from '../shared/presentation.js';
import { freshMotion, advanceMotion, isWalkable } from './legacy-game-fixture';
import { SPAWNS } from './legacy-game-fixture';
test('camera-relative controls rotate forward/strafe without changing speed',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.63]){
  const aim=cameraAim(yaw),f=cameraMovement(0,1,yaw),r=cameraMovement(1,0,yaw),d=cameraMovement(1,1,yaw);
  assert(Math.abs(f.dx-aim.x)<1e-9&&Math.abs(f.dy-aim.y)<1e-9);assert(Math.abs(f.dx*r.dx+f.dy*r.dy)<1e-9);assert(Math.abs(Math.hypot(d.dx,d.dy)-1)<1e-9);
 }
 assert(cameraMovement(0,1,0).dy<0);assert(cameraMovement(0,1,Math.PI/2).dx>.99);
});
test('rotated sprint/dash retain shared prediction, map collision and valid spawns',()=>{
 assert(SPAWNS.every(p=>isWalkable(p)));for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  let p=freshMotion({x:1000,y:700});for(let i=0;i<240;i++){p=advanceMotion(p,{...cameraMovement(0,1,yaw),sprint:true,dashId:Math.floor(i/100)+1});assert(isWalkable(p));}
 }
});

test('look yaw and clamped pitch are independent of stationary player motion',async()=>{
 const {CONTROLLER,turnLook}=await import('../shared/presentation.js');
 const control={targetYaw:0,targetPitch:CONTROLLER.defaultPitch,pitch:CONTROLLER.defaultPitch};
 const before=freshMotion({x:1000,y:700});turnLook(control,100,-100);
 assert(control.targetYaw>0);assert(control.targetPitch>CONTROLLER.defaultPitch);assert.deepEqual(before,freshMotion({x:1000,y:700}));
 turnLook(control,0,-100000);assert.equal(control.targetPitch,CONTROLLER.maxPitch);
 turnLook(control,0,100000,true);assert.equal(control.targetPitch,CONTROLLER.minPitch);
});
test('joystick preserves analog magnitude, deadzone and normalized diagonals',async()=>{
 const {joystickInput,CONTROLLER}=await import('../shared/presentation.js');
 assert.deepEqual(joystickInput(1,1),{x:0,y:0});
 const f=joystickInput(0,-CONTROLLER.joystickRadius);assert.equal(f.y,1);assert.equal(f.x,0);
 const d=joystickInput(100,-100);assert(Math.abs(Math.hypot(d.x,d.y)-1)<1e-9);
 const half=joystickInput(0,-21);assert(half.y>0&&half.y<1);
 for(const yaw of [0,1,2,3]){const m=cameraMovement(d.x,d.y,yaw);assert(Math.abs(Math.hypot(m.dx,m.dy)-1)<1e-9);}
});
test('avatar turn smoothing takes the short path and is frame-rate independent',async()=>{
 const {smoothAngle,CONTROLLER}=await import('../shared/presentation.js');
 const next=smoothAngle(Math.PI-.1,-Math.PI+.1,CONTROLLER.avatarTurnSpeed,1/60);assert(next>Math.PI-.1&&next<Math.PI+.1);
 let fine=0;for(let i=0;i<60;i++)fine=smoothAngle(fine,1,14,1/60);
 assert(Math.abs(fine-smoothAngle(0,1,14,1))<1e-9);
});
