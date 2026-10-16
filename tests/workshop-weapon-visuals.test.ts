import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {createRig,disposeTree} from '../src/characters/rig';
import {characters} from '../src/characters/registry';
import {EquippedWeapon} from '../src/weapons/attachment';
import {weaponActions,weaponEvents} from '../src/weapons/actions';
import {moveSets} from '../src/weapons/moves';
import {evaluateContacts} from '../src/weapons/contact';
const melee=Object.keys(moveSets);
test('all melee stances keep both ankle targets planted across every skin and repeated scrubs',()=>{
 for(const c of characters){const r=createRig(c);for(const id of melee){const w=new EquippedWeapon(r,id);for(const action of ['attack1','attack2','attack3','recovery']){const d=weaponActions(id).find(a=>a.id===action)!.duration;for(let i=0;i<=30;i++){w.sample(action,d*i/30,true);r.root.updateMatrixWorld(true);for(const l of r.legs){const ankle=r.root.worldToLocal(l.ankle.getWorldPosition(new Vector3()));assert.ok(Math.abs(ankle.y-.185)<.0001,`${c.id}/${id}/${action}: ${ankle.y}`);}assert.equal(r.hips.position.z,0);}}w.dispose();}disposeTree(r.root);}
});
test('preview contact requires actual strike geometry; remote targets never react',()=>{
 const r=createRig(characters[0]);for(const id of [...melee,'pistol','assault-rifle','shotgun','sniper-rifle']){const w=new EquippedWeapon(r,id);for(const action of w.gun?['fire']:['attack1','attack2','attack3']){const first=weaponEvents(id,action)[0];w.sample(action,first.time,true);const hit=w.contact(first.time,action),bounds=new Box3(hit.clone().addScalar(-.15),hit.clone().addScalar(.15));assert.ok(evaluateContacts(w,action,bounds)[0].connected,id+action);bounds.translate(new Vector3(20,0,0));assert.ok(evaluateContacts(w,action,bounds).every(e=>!e.connected),id+' miss');}w.dispose();}disposeTree(r.root);
});
test('dagger finisher alternates wrists and hammer uses the head face, not handle',()=>{const r=createRig(characters[0]),w=new EquippedWeapon(r,'twin-daggers');assert.deepEqual(weaponEvents(w.id,'attack3').map(e=>e.hand),[1,0]);for(const e of weaponEvents(w.id,'attack3')){w.sample('attack3',e.time,true);assert.ok(w.contact(e.time,'attack3').distanceTo(w.anchor(e.hand?'right-strike':'left-strike'))<1e-8);}w.dispose();const h=new EquippedWeapon(r,'impact-hammer');assert.deepEqual(h.node('contact-surface')!.position.toArray(),[1.93,-.94,0]);h.dispose();disposeTree(r.root);});
test('firearm recoil is distinct and all reload components restore their rest positions',()=>{
 const r=createRig(characters[0]),peaks:Record<string,number>={};for(const id of ['pistol','assault-rifle','shotgun','sniper-rifle']){const w=new EquippedWeapon(r,id),duration=w.durations.get('fire')!;w.sample('aim',0);const rest=w.holder.quaternion.clone();let max=0;for(let i=0;i<=100;i++){w.sample('fire',duration*i/100);max=Math.max(max,w.holder.quaternion.angleTo(rest));}peaks[id]=max;w.sample('fire',duration);assert.ok(w.holder.quaternion.angleTo(rest)<.05,id+' recovery');if(id==='shotgun'){const d=w.durations.get('reload')!;for(const p of [.2,.42,.64]){w.sample('reload',d*p);assert.ok(w.ammo?.visible);}for(const p of [.01,.81,.99]){w.sample('reload',d*p);assert.equal(w.ammo?.visible,false);}}
 w.sample('reload',w.durations.get('reload')!);for(const [part,position]of w.parts)assert.ok(part.position.distanceTo(position)<1e-9,id+' '+part.name);if(w.ammo)assert.equal(w.ammo.visible,false);w.dispose();}assert.ok(peaks.shotgun>peaks.pistol&&peaks['sniper-rifle']>peaks['assault-rifle'],JSON.stringify(peaks));disposeTree(r.root);
});
