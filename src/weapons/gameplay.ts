import {GUNS,gunId} from '../../shared/gun-config';
import * as T from 'three';
import type {Rig} from '../characters/rig';
import type {PlayerView} from '../../shared/game';
import type {AnimationTimeline} from '../animations/gameplay';
import {capturePose,savePose} from '../animations/motion';
import {EquippedWeapon} from './attachment';
import {canonicalWeapon,allowedWeapon,weaponAction} from '../../shared/weapons';
import type {GameMode} from '../../shared/modes';

/** Adapts V5 presentation to the existing gameplay timeline; never advances gameplay state. */
export class GameplayWeapon {
 weapon:EquippedWeapon|null=null;private trail:T.Line|null=null;private trailSerial=-1;private trailPoints:T.Vector3[]=[];private instance='';private aimBlend=0;private lastTime=0;private base;lastClip='idle';
 constructor(private rig:Rig){this.base=capturePose(rig);}
 update(player:PlayerView,timeline:AnimationTimeline,mode:GameMode,now:number,speed:number){
  const id=canonicalWeapon(player.heldItem),instance=player.inventory?.weapons?.[player.selectedSlot===2?1:0]?.instanceId??id??'';
  if(!id||!allowedWeapon(mode,id)||player.health<=0){this.dispose();return;}
  if(this.weapon?.id!==id||this.instance!==instance){this.dispose();this.weapon=new EquippedWeapon(this.rig,id);this.instance=instance;this.weapon.holder.userData.attachment.previewOnly=false;this.weapon.model.root.userData.gameplayIntegrated=true;this.trail=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:10},()=>new T.Vector3())),new T.LineBasicMaterial({color:this.weapon.model.asset.color,transparent:true,opacity:.45,depthWrite:false}));this.rig.root.add(this.trail);this.trail.visible=false;}
  if(timeline.frozen)return;
  const weapon=this.weapon!,action=player.weaponAction,active=action?.weaponId===id&&now<action.endsAt;
  savePose(this.base);
  let clip=active?action.clip:timeline.clip;
  if(['hit','knockback','recover','elimination'].includes(clip))clip=player.crouched?'crouch-idle':'idle';
  const duration=weapon.durations.get(clip)??2,time=active?Math.max(0,Math.min(duration,(now-action!.startedAt)/1000)):timeline.phase*duration;
  const firing=!!active&&clip==='fire'&&gunId(id),shotAge=firing?Math.max(0,(now-action!.startedAt)/1000-GUNS[id].event):0;
  weapon.sample(firing?'recoil':clip,firing?shotAge:time,true);this.lastClip=clip;
  if(weapon.gun){const dt=this.lastTime?Math.max(0,Math.min(.1,(now-this.lastTime)/1000)):1/30;this.lastTime=now;const aiming=!!player.ads&&!['reload','equip'].includes(clip),target=Number(aiming||firing);this.aimBlend+=(target-this.aimBlend)*(1-Math.exp(-dt*14));
   if(!active||firing){const pose=weapon.holder.position.clone(),rotation=weapon.holder.quaternion.clone();weapon.sample('aim',0,true);weapon.holder.position.lerp(pose,1-this.aimBlend);weapon.holder.quaternion.slerp(rotation,1-this.aimBlend);
    const kick=firing?Math.exp(-shotAge*18):0;weapon.holder.position.z-=kick*(id==='shotgun'?.12:id==='sniper-rifle'?.10:.045);weapon.holder.rotation.x-=kick*.08;
    const pitch=Math.asin(Math.max(-1,Math.min(1,player.aimZ??action?.aimZ??0)));this.rig.torso.rotation.x-=pitch*this.aimBlend*.65;this.rig.neck.rotation.x-=pitch*this.aimBlend*.2;weapon.holder.rotation.x-=pitch*this.aimBlend*.35;
   }
   this.rig.root.userData.aimBlend=this.aimBlend;
  }
  // Preserve authoritative jump lift/feet, crouch, slide and impact layers; a stationary melee uses its V5 planted stance.
  const preserve=weapon.gun||!active||speed>3||player.airborne||player.crouched||player.traversalState==='slide'||timeline.state==='hit_reaction'||timeline.state==='landing';
  if(preserve){for(let i=0;i<this.base.nodes.length;i++){const node=this.base.nodes[i];if(node===this.rig.hips||this.rig.legs.some(l=>node===l.hip||node===l.knee||node===l.ankle)||timeline.state==='hit_reaction'&&(node===this.rig.torso||node===this.rig.head||node===this.rig.neck)){node.position.copy(this.base.positions[i]);node.quaternion.copy(this.base.quaternions[i]);node.scale.copy(this.base.scales[i]);}}}
  if(weapon.gun&&player.ads&&speed>3&&!player.airborne&&!player.crouched&&!(player.dashRemaining>0)&&!['hit_reaction','landing'].includes(timeline.state)){
   const ax=player.aimX??player.facingX,ay=player.aimY??player.facingY,n=Math.hypot(ax,ay)||1,forward=(player.facingX*ax+player.facingY*ay)/n,side=(player.facingX*ay-player.facingY*ax)/n;
   for(let i=0;i<2;i++){const step=Math.sin(timeline.phase*Math.PI*2+i*Math.PI)*Math.min(.5,speed/400);this.rig.legs[i].hip.rotation.x=step*forward;this.rig.legs[i].hip.rotation.z=step*side*.6;}
  }
  weapon.constrain(clip,time/duration);
  if(this.trail){const phase=time/duration;this.trail.visible=!!active&&!weapon.gun&&clip.startsWith('attack')&&phase>.18&&phase<.82;if(this.trail.visible){const tip=this.rig.root.worldToLocal(weapon.contact(time,clip));if(this.trailSerial!==action!.serial){this.trailSerial=action!.serial;this.trailPoints=Array.from({length:10},()=>tip.clone());}this.trailPoints.shift();this.trailPoints.push(tip);const points=this.trail.geometry.getAttribute('position');this.trailPoints.forEach((p,i)=>points.setXYZ(i,p.x,p.y,p.z));points.needsUpdate=true;}}

 }
 dispose(){if(this.trail){this.trail.removeFromParent();this.trail.geometry.dispose();(this.trail.material as T.Material).dispose();this.trail=null;}this.trailPoints=[];this.trailSerial=-1;this.weapon?.dispose();this.weapon=null;this.instance='';this.aimBlend=0;this.lastTime=0;this.rig.root.userData.aimBlend=0;}
}
