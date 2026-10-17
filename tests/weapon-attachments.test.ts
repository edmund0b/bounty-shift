import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {characters} from '../src/characters/registry';
import {createRig,disposeTree} from '../src/characters/rig';
import {EquippedWeapon} from '../src/weapons/attachment';
import {weaponActions} from '../src/weapons/actions';
import {WEAPON_IDS,weaponAction,isGun} from '../shared/weapons';
import {weaponEvents} from '../src/weapons/actions';
import {GameplayAnimator} from '../src/animations/gameplay';
import {GameplayWeapon} from '../src/weapons/gameplay';
import {freshMotion} from '../shared/game';
import {freshCombat} from '../shared/combat';
import {createWeapon} from '../shared/weapons';

for(const character of characters)test(`${character.displayName}: all nine V5 weapons preserve wrists, root and movement/combat attachments`,()=>{
 const r=createRig(character);r.root.scale.multiplyScalar(.55);const root=r.root.position.clone(),rotation=r.root.quaternion.clone();
 for(const id of WEAPON_IDS){const w=new EquippedWeapon(r,id);for(const action of weaponActions(id).filter(a=>['idle','walk','sprint','jump','slide-entry','slide-loop','slide-exit','crouch-walk','attack1','attack2','attack3','fire','reload'].includes(a.id)))for(let n=0;n<=10;n++){w.sample(action.id,action.duration*n/10,true);assert(w.primaryError<.035,`${character.id}/${id}/${action.id} primary ${w.primaryError}`);assert(w.secondaryError<.035,`${character.id}/${id}/${action.id} secondary ${w.secondaryError}`);assert(r.root.position.distanceTo(root)<1e-12);assert(r.root.quaternion.angleTo(rotation)<1e-7);assert(r.joints.every(j=>[...j.position.toArray(),...j.quaternion.toArray()].every(Number.isFinite)));if(id==='twin-daggers'){assert.equal(w.leftBlade?.parent,r.arms[0].wrist);assert.equal(w.model.root.parent,r.arms[1].wrist);}}
 w.dispose();assert.equal(w.model.root.parent,null);}disposeTree(r.root);
});
test('gameplay adapter keeps actual feet/root during moving, airborne, low stance and reload across 72 combinations',()=>{
 for(const c of characters){const r=createRig(c);r.root.scale.multiplyScalar(.55);const animator=new GameplayAnimator(r),visual=new GameplayWeapon(r);let now=1000;for(const id of WEAPON_IDS){const instance=createWeapon(id,'adapter-'+id),p:any={...freshMotion({x:500,y:500,elevation:110}),...freshCombat(),id:'p',heldItem:id,inventory:{weapons:[instance,null],weapon:id,utility:null},selectedSlot:1};
 for(const state of [{},{airborne:true,verticalVelocity:150},{airborne:true,verticalVelocity:-100},{crouched:true},{traversalState:'slide',dashRemaining:.2},{sprinting:true}]){Object.assign(p,state);now+=33;animator.update(p,200,1/30,3.3);const hips=r.hips.position.clone(),root=r.root.position.clone();visual.update(p,animator.timeline,'kill_race',now,200);assert(r.hips.position.distanceTo(hips)<1e-8);assert(r.root.position.distanceTo(root)<1e-12);assert(visual.weapon!.primaryError<.035);assert(visual.weapon!.secondaryError<.035);}

 for(const clip of isGun(id)?['equip','fire','reload']:['equip','attack1','attack2','attack3'])for(const airborne of [false,true]){Object.assign(p,freshMotion({x:500,y:500,elevation:110}),{airborne,verticalVelocity:airborne?100:0});const config=weaponAction(id,clip);p.weaponAction={serial:1,weaponId:id,instanceId:instance.instanceId,clip,startedAt:now-350,endsAt:now+config.duration*1000,aimX:0,aimY:1,aimZ:0,nextEvent:0};animator.update(p,airborne?200:0,1/30,3.3);const root=r.root.position.clone();visual.update(p,animator.timeline,'kill_race',now,airborne?200:0);assert.equal(visual.lastClip,clip);assert(r.root.position.distanceTo(root)<1e-12);assert(visual.weapon!.primaryError<.035,`${c.id}/${id}/${clip}`);assert(visual.weapon!.secondaryError<.035,`${c.id}/${id}/${clip}`);}
 }visual.dispose();disposeTree(r.root);}
});
test('three minute dagger finisher sampling has zero cumulative actor root drift',()=>{const r=createRig(characters[0]),w=new EquippedWeapon(r,'twin-daggers'),duration=w.durations.get('attack3')!,start=r.root.position.clone();for(let frame=0;frame<180*30;frame++){w.sample('attack3',(frame/30)%duration,true);assert(r.root.position.distanceTo(start)<1e-12);assert(Math.abs(r.hips.position.z)<1e-12);}w.dispose();disposeTree(r.root);});

test('retained equip/reload/melee timings equal V5 source; live gun fire has dedicated balance',()=>{for(const id of WEAPON_IDS)for(const clip of isGun(id)?['equip','reload']:['equip','attack1','attack2','attack3']){const server=weaponAction(id,clip),source=weaponActions(id).find(a=>a.id===clip)!;assert(source);assert.equal(server.duration,source.duration);assert.deepEqual(server.events,weaponEvents(id,clip));}});

for(const c of characters)test(`${c.displayName}: all four guns blend ADS/recoil/low stance without grip or root drift`,()=>{
 const r=createRig(c);r.root.scale.multiplyScalar(.55);const animator=new GameplayAnimator(r),visual=new GameplayWeapon(r);let now=10000;
 for(const id of ['pistol','assault-rifle','shotgun','sniper-rifle'] as const){const w=createWeapon(id,'aim-'+id),p:any={...freshMotion({x:500,y:500}),...freshCombat(),id:'p',heldItem:id,ads:true,aimX:.5,aimY:.8,aimZ:.3,inventory:{weapons:[w,null],weapon:id,utility:null},selectedSlot:1};
 for(const state of [{},{crouched:true},{airborne:true,verticalVelocity:100},{traversalState:'slide',dashRemaining:.2}]){Object.assign(p,freshMotion({x:500,y:500}),state);for(let n=0;n<10;n++){now+=33;animator.update(p,100,1/30,0);const root=r.root.position.clone(),hips=r.hips.position.clone();visual.update(p,animator.timeline,'kill_race',now,100);assert(r.root.position.distanceTo(root)<1e-12);assert(r.hips.position.distanceTo(hips)<1e-8);assert(visual.weapon!.primaryError<.035);assert(visual.weapon!.secondaryError<.035);assert(r.joints.every(j=>j.quaternion.toArray().every(Number.isFinite)));}}}
 visual.dispose();disposeTree(r.root);
});
