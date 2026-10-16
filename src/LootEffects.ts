import {weaponName} from '../shared/weapons';
import * as THREE from 'three';
import type {RoomView,Motion} from '../shared/game';
import type {WorldItem} from '../shared/modes';
import {RULES} from '../shared/modes';
import {VIEW} from '../shared/presentation';
import {createItemArt,revealPosition} from './ItemArt';
import {gameplayAudio} from './gameplayAudio';
type Track=<T extends {dispose:()=>void}>(resource:T)=>T;
export function createLootEffects(scene:THREE.Scene,track:Track){
 const art=createItemArt(track),sound=gameplayAudio(),loot=new Map<string,{chest:ReturnType<typeof art.chest>|null;pickup:THREE.Group;kind:string|null;openedAt:number}>();
 const shard=track(new THREE.OctahedronGeometry(.045,0)),flashGeometry=track(new THREE.IcosahedronGeometry(.14,1));
 const bursts=Array.from({length:8},()=>{const group=new THREE.Group(),material=track(new THREE.MeshBasicMaterial({color:'#a3f5ff',transparent:true,opacity:0,depthWrite:false}));const particles=Array.from({length:10},()=>{const mesh=new THREE.Mesh(shard,material);group.add(mesh);return mesh;});const flash=new THREE.Mesh(flashGeometry,material);flash.position.y=.2;group.add(flash);scene.add(group);group.visible=false;return {group,particles,flash,material,at:0};});let burstIndex=0;let listener:Motion|null=null;
 const burst=(x:number,y:number,z:number,at:number,chest=false)=>{const b=bursts[burstIndex++%bursts.length];b.group.position.set(x,y,z);b.at=at;b.group.visible=true;b.material.color.set(chest?'#e0ffff':'#86eaff');};
 const projectiles=Array.from({length:24},()=>{const group=art.freezeBall(),trail=Array.from({length:3},()=>new THREE.Mesh(shard,art.ice));scene.add(group);trail.forEach(m=>scene.add(m));group.visible=false;trail.forEach(m=>m.visible=false);return {group,trail,id:'',seen:0,from:new THREE.Vector3()};});
 const labels=new Map<string,THREE.SpriteMaterial>();
 const weaponViews=Array.from({length:40},()=>{const geometry=track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()])),material=track(new THREE.LineBasicMaterial({color:'#ffd092',transparent:true,opacity:.65})),line=new THREE.Line(geometry,material),flash=new THREE.Mesh(flashGeometry,material),impact=new THREE.Mesh(shard,material);scene.add(line,flash,impact);return{line,flash,impact};});
 const sounds=new Set<string>();
 let snapshotTick=-1,received=0;const seenEffects=new Set<string>();
 function clock(room:RoomView){if(room.tick!==snapshotTick){snapshotTick=room.tick;received=performance.now();}return room.serverTime+Math.min(120,Math.max(0,performance.now()-received));}
 function updateLoot(room:RoomView,now:number,local:Motion|null){
  listener=local;const ids=new Set(room.mode.items.map(i=>i.id));for(const [id,entry]of loot)if(!ids.has(id)){if(entry.chest)scene.remove(entry.chest.group);scene.remove(entry.pickup);loot.delete(id);}
  for(const item of room.mode.items){let entry=loot.get(item.id);if(!entry){const chest=item.source==='chest'?art.chest():null,pickup=new THREE.Group();if(chest){chest.group.position.set(item.x*VIEW.scale,(item.elevation??0)*VIEW.scale,item.y*VIEW.scale);scene.add(chest.group);}scene.add(pickup);entry={chest,pickup,kind:null,openedAt:0};loot.set(item.id,entry);}
   if(entry.chest){entry.chest.update(item,now);if(item.openedAt&&entry.openedAt!==item.openedAt){entry.openedAt=item.openedAt;if(now-item.openedAt<700)burst(item.x*VIEW.scale,(item.elevation??0)*VIEW.scale+.55,item.y*VIEW.scale,item.openedAt+150,true);if(now-item.openedAt<250&&local)sound.open(Math.hypot(local.x-item.x,local.y-item.y)*VIEW.scale);}}
   if(entry.kind!==item.kind){entry.pickup.clear();entry.kind=item.kind;if(item.kind){entry.pickup.add(art.item(item.kind));let material=labels.get(item.kind);if(!material){const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d')!;ctx.font='600 36px Arial';ctx.textAlign='center';ctx.fillStyle='#dbf8ff';ctx.shadowColor='#071522';ctx.shadowBlur=8;ctx.fillText(weaponName(item.kind),384,56);const texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;material=track(new THREE.SpriteMaterial({map:texture,transparent:true}));labels.set(item.kind,material);}const text=new THREE.Sprite(material);text.scale.set(2,.25,1);text.position.y=.75;entry.pickup.add(text);}}
   entry.pickup.visible=!!item.kind&&(item.state==='opened'||item.state==='opening'&&now-(item.openedAt??now)>220);
   if(item.source==='chest')entry.pickup.position.copy(revealPosition(item,now));else entry.pickup.position.set(item.x*VIEW.scale,(item.elevation??0)*VIEW.scale+(item.kind==='freeze_ball'?.35:.4),item.y*VIEW.scale);
   entry.pickup.rotation.y=now*.00045;
  }
 }
 function updateProjectiles(room:RoomView,now:number,hand:(id:string)=>THREE.Vector3|undefined,muzzle?:(id:string,weaponId:string)=>THREE.Vector3|undefined){
  const effects=(room.mode.weaponEffects??[]).filter(e=>now-e.at<200);
  weaponViews.forEach((v,i)=>{const e=effects[i];v.line.visible=v.flash.visible=v.impact.visible=false;if(!e)return;const age=now-e.at,from=muzzle?.(e.ownerId,e.weaponId)??new THREE.Vector3(e.x*VIEW.scale,(e.elevation??0)*VIEW.scale,e.y*VIEW.scale),end=new THREE.Vector3(e.toX*VIEW.scale,e.toZ*VIEW.scale,e.toY*VIEW.scale);if(e.type==='shot'){const points=v.line.geometry.getAttribute('position');points.setXYZ(0,from.x,from.y,from.z);points.setXYZ(1,end.x,end.y,end.z);points.needsUpdate=true;v.line.visible=age<100;v.flash.position.copy(from);v.flash.visible=age<65;}v.impact.position.copy(end);v.impact.visible=!!e.targetId&&age<180;if(!sounds.has(e.id)){sounds.add(e.id);const self=listener;sound.weapon(e.type==='shot'?'shot':e.targetId?'hit':'swing',e.weaponId,self?Math.hypot(self.x-e.x,self.y-e.y)*VIEW.scale:0);}});
  for(const p of room.players??[]){const a=p.weaponAction;if(a?.clip==='reload'&&!sounds.has(p.id+':'+a.serial)){sounds.add(p.id+':'+a.serial);sound.weapon('reload',a.weaponId,0);}}
  if(sounds.size>256){sounds.clear();for(const e of effects)sounds.add(e.id);}
  for(let i=0;i<projectiles.length;i++){const entry=projectiles[i],ball=room.mode.projectiles[i];entry.group.visible=!!ball;entry.trail.forEach(m=>m.visible=!!ball);if(!ball){entry.id='';continue;}if(entry.id!==ball.id){entry.id=ball.id;entry.seen=now;entry.from.copy(hand(ball.ownerId)??new THREE.Vector3(ball.x*VIEW.scale,(ball.elevation??0)*VIEW.scale+.9,ball.y*VIEW.scale));}
   const extra=Math.min(80,Math.max(0,now-room.serverTime))/1000;const target=new THREE.Vector3((ball.x+ball.dx*RULES.ballSpeed*extra)*VIEW.scale,(ball.elevation??0)*VIEW.scale+.9,(ball.y+ball.dy*RULES.ballSpeed*extra)*VIEW.scale),t=Math.min(1,(now-entry.seen)/65);entry.group.position.lerpVectors(entry.from,target,t);entry.group.rotation.y=now*.006;
   entry.trail.forEach((m,j)=>{m.position.copy(entry.group.position);m.position.x-=ball.dx*(j+1)*.13;m.position.z-=ball.dy*(j+1)*.13;m.position.y+=Math.sin(now*.01+j)*.025;m.scale.setScalar(1-j*.2);});
  }
  const activeIds=new Set(room.mode.effects.map(e=>e.id));for(const id of seenEffects)if(!activeIds.has(id))seenEffects.delete(id);
  for(const e of room.mode.effects)if(!seenEffects.has(e.id)){seenEffects.add(e.id);if(e.type!=='throw'&&now-e.at<800)burst(e.x*VIEW.scale,(e.elevation??0)*VIEW.scale+.9,e.y*VIEW.scale,e.at);}
  for(const b of bursts){const age=(now-b.at)/1000;b.group.visible=age>=0&&age<.55;if(!b.group.visible)continue;b.material.opacity=(1-age/.55)*.8;b.flash.visible=age<.15;b.flash.scale.setScalar(Math.max(0,1-age/.15));b.particles.forEach((p,j)=>{const angle=j*2.399;p.position.set(Math.cos(angle)*age*.9,.2+age*(.5+(j%3)*.2)-age*age*.8,Math.sin(angle)*age*.9);p.scale.setScalar(1+age);p.rotation.set(age+j,age*2,angle);});}
 }
 return {art,clock,updateLoot,updateProjectiles,dispose(){sound.dispose();loot.clear();seenEffects.clear();}};
}
