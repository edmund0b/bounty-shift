import type {PlayerView} from '../../shared/game';
import {ARENA,MOVEMENT,JUMP} from '../../shared/game';
import {COMBAT} from '../../shared/combat';
import type {Rig} from '../characters/rig';
import {animate as existingAttack,defaults} from './player';
import {animateLocomotion} from './locomotion';
import {animateMotion,capturePose,savePose,blendPose,resetRig} from './motion';
import {motionById} from './clips';

export type AnimationState='idle'|'walk'|'run'|'sprint'|'dash'|'jump_start'|'airborne'|'falling'|'landing'|'slide_entry'|'slide_travel'|'slide_exit'|'crouch_enter'|'crouch_idle'|'crouch_walk'|'crouch_exit'|'hit_reaction'|'knockback'|'recovery'|'elimination';
export type VisualSample=Pick<PlayerView,'health'|'spawnVersion'|'airborne'|'verticalVelocity'|'crouched'|'sprinting'|'traversalState'|'dashRemaining'|'hitFlash'|'koRemaining'> & {knockbackRemaining?:number;knockbackDuration?:number};
export const ANIMATION_TIMING={blend:.09,jumpTakeoff:.12,slideEntry:.12,movingThreshold:3,walkThreshold:ARENA.speed*.7};
const clips:Record<AnimationState,string>={idle:'idle',walk:'walk',run:'run',sprint:'sprint',dash:'dash',jump_start:'jump-start',airborne:'airborne',falling:'falling',landing:'land',slide_entry:'slide-entry',slide_travel:'slide-loop',slide_exit:'slide-exit',crouch_enter:'crouch-enter',crouch_idle:'crouch-idle',crouch_walk:'crouch-walk',crouch_exit:'crouch-exit',hit_reaction:'hit',knockback:'knockback',recovery:'recover',elimination:'elimination'};
const period=(state:AnimationState)=>motionById.get(clips[state])?.duration??(state==='idle'?3:state==='walk'?1.2:state==='run'?.8:.65);

/** A visual timeline only: never writes player state, root transforms, inputs, or server clocks. */
export class AnimationTimeline {
 state:AnimationState='idle';clip='idle';phase=0;stanceClip='';stancePhase=0;elapsed=0;changed=false;reset=false;frozen=false;
 private initialized=false;private version=-1;private previousHealth=100;private previousAir=false;private previousCrouch=false;private previousSlide=false;private previousKnockback=false;
 private takeoffAge=Infinity;private landAge=Infinity;private slideExitAge=Infinity;private crouchEnterAge=Infinity;private crouchExitAge=Infinity;private hitAge=Infinity;private recoveryAge=Infinity;private gaitPhase=0;private breathPhase=0;private eliminationAge=0;private evadeAge=0;private previousEvade=false;
 update(p:VisualSample,speed:number,dt:number,frozen=false){
  dt=Number.isFinite(dt)?Math.max(0,dt):0;speed=Number.isFinite(speed)?Math.max(0,speed):0;this.changed=false;this.reset=!this.initialized||this.version!==p.spawnVersion;this.frozen=frozen&&p.health>0;
  const eliminationStarted=p.health<=0&&this.previousHealth>0;const evade=p.dashRemaining>0;const slide=p.dashRemaining>0&&p.traversalState==='slide',knockback=(p.knockbackRemaining??0)>0;
  if(this.reset){this.initialized=true;this.version=p.spawnVersion;this.takeoffAge=this.landAge=this.slideExitAge=this.crouchEnterAge=this.crouchExitAge=this.hitAge=this.recoveryAge=Infinity;this.gaitPhase=this.breathPhase=0;this.eliminationAge=Math.max(0,COMBAT.respawnDelay-p.koRemaining);this.previousEvade=false;this.previousHealth=p.health;this.previousAir=!!p.airborne;this.previousCrouch=!!p.crouched;this.previousSlide=slide;this.previousKnockback=knockback;if(p.hitFlash>0&&p.health>0)this.hitAge=Math.max(0,COMBAT.hitFlash-p.hitFlash);}
  if(this.frozen&&!this.reset)return;
  if(!this.frozen){this.takeoffAge+=dt;this.landAge+=dt;this.slideExitAge+=dt;this.crouchEnterAge+=dt;this.crouchExitAge+=dt;this.hitAge+=dt;this.recoveryAge+=dt;this.breathPhase=(this.breathPhase+dt/3)%1;}
  if(!this.reset){
   if(p.airborne&&!this.previousAir)this.takeoffAge=Math.max(0,(JUMP.velocity-(p.verticalVelocity??JUMP.velocity))/JUMP.gravity);
   if(!p.airborne&&this.previousAir&&p.health>0)this.landAge=0;
   if(!slide&&this.previousSlide)this.slideExitAge=0;
   if(p.crouched&&!this.previousCrouch){this.crouchEnterAge=0;this.crouchExitAge=Infinity;}
   if(!p.crouched&&this.previousCrouch){this.crouchExitAge=0;this.crouchEnterAge=Infinity;}
   if(p.health>0&&p.health<this.previousHealth)this.hitAge=0;
   if(!knockback&&this.previousKnockback)this.recoveryAge=0;
  }
  this.previousHealth=p.health;this.previousAir=!!p.airborne;this.previousCrouch=!!p.crouched;this.previousSlide=slide;this.previousKnockback=knockback;
  if(p.health<=0){const authoritativeAge=Math.max(0,COMBAT.respawnDelay-p.koRemaining);this.eliminationAge=this.reset||eliminationStarted?authoritativeAge:Math.max(this.eliminationAge+dt,authoritativeAge);}else this.eliminationAge=0;
  if(evade){const duration=slide?.42:p.traversalState==='dodge'?.24:MOVEMENT.dashDuration;this.evadeAge=Math.max(this.previousEvade?this.evadeAge+dt:0,duration-p.dashRemaining);}else this.evadeAge=0;this.previousEvade=evade;
  const moving=speed>ANIMATION_TIMING.movingThreshold;
  let next:AnimationState;let phase:number|undefined;
  if(p.health<=0){next='elimination';phase=Math.min(1,this.eliminationAge/period(next));}
  else if(knockback){next='knockback';phase=1-(p.knockbackRemaining??0)/(p.knockbackDuration??period(next));}
  else if(this.recoveryAge<period('recovery')){next='recovery';phase=this.recoveryAge/period(next);}
  else if(this.hitAge<period('hit_reaction')){next='hit_reaction';phase=this.hitAge/period(next);}
  else if(p.dashRemaining>0&&!slide){next='dash';const duration=p.traversalState==='dodge'?.24:MOVEMENT.dashDuration;phase=this.evadeAge/duration;}
  else if(p.airborne){if((p.verticalVelocity??0)<=0){next='falling';}else if(this.takeoffAge<ANIMATION_TIMING.jumpTakeoff){next='jump_start';phase=this.takeoffAge/ANIMATION_TIMING.jumpTakeoff;}else next='airborne';}
  else if(slide){const age=this.evadeAge;next=age<ANIMATION_TIMING.slideEntry?'slide_entry':'slide_travel';phase=next==='slide_entry'?age/ANIMATION_TIMING.slideEntry:(age-ANIMATION_TIMING.slideEntry)/(.42-ANIMATION_TIMING.slideEntry);}
  else if(p.crouched){if(this.crouchEnterAge<period('crouch_enter')){next='crouch_enter';phase=this.crouchEnterAge/period(next);}else next=moving?'crouch_walk':'crouch_idle';}
  else if(this.landAge<period('landing')){next='landing';phase=this.landAge/period(next);}
  else if(this.slideExitAge<period('slide_exit')){next='slide_exit';phase=this.slideExitAge/period(next);}
  else if(this.crouchExitAge<period('crouch_exit')){next='crouch_exit';phase=this.crouchExitAge/period(next);}
  else next=!moving?'idle':p.sprinting?'sprint':speed>=ANIMATION_TIMING.walkThreshold?'run':'walk';
  if(next!==this.state||this.reset){this.state=next;this.clip=clips[next];this.elapsed=0;this.changed=true;}else if(!this.frozen)this.elapsed+=dt;
  if(phase===undefined){
   if(['walk','run','sprint','crouch_walk'].includes(next)){const reference=next==='crouch_walk'?ARENA.speed*MOVEMENT.crouchMultiplier:next==='walk'?ARENA.speed*.45:next==='sprint'?ARENA.speed*MOVEMENT.sprintMultiplier:ARENA.speed;this.gaitPhase=(this.gaitPhase+dt*Math.max(.35,Math.min(2.2,speed/reference))/period(next))%1;phase=this.gaitPhase;}
   else if(next==='idle')phase=this.breathPhase;
   else if(next==='crouch_idle'||next==='airborne')phase=(this.elapsed/period(next))%1;
   else phase=Math.min(1,this.elapsed/period(next));
  }
  this.phase=Math.max(0,Math.min(1,phase));
  // A hit must not stand up the actual crouch/slide stance. Both layers share this timeline.
  this.stanceClip='';
  if(next==='hit_reaction'&&!p.airborne){
   if(slide){const age=this.evadeAge;this.stanceClip=age<ANIMATION_TIMING.slideEntry?'slide-entry':'slide-loop';this.stancePhase=age<ANIMATION_TIMING.slideEntry?age/ANIMATION_TIMING.slideEntry:(age-ANIMATION_TIMING.slideEntry)/(.42-ANIMATION_TIMING.slideEntry);}
   else if(p.crouched){if(this.crouchEnterAge<period('crouch_enter')){this.stanceClip='crouch-enter';this.stancePhase=this.crouchEnterAge/period('crouch_enter');}else{this.stanceClip=moving?'crouch-walk':'crouch-idle';if(moving)this.gaitPhase=(this.gaitPhase+dt*Math.max(.35,Math.min(2.2,speed/(ARENA.speed*MOVEMENT.crouchMultiplier)))/period('crouch_walk'))%1;this.stancePhase=moving?this.gaitPhase:(this.breathPhase*3/2)%1;}}
   else if(this.slideExitAge<period('slide_exit')){this.stanceClip='slide-exit';this.stancePhase=this.slideExitAge/period('slide_exit');}
   else if(this.crouchExitAge<period('crouch_exit')){this.stanceClip='crouch-exit';this.stancePhase=this.crouchExitAge/period('crouch_exit');}
  }
 }
}

/** Adapter for the existing eight rigs. The original attack/throw hooks remain separate. */
export class GameplayAnimator {
 readonly timeline=new AnimationTimeline();private readonly transition;private readonly attackBase;
 private lowEliminationBlend=false;private blendAge=Infinity;private readonly motionOptions={suppressLift:true,floorY:0};
 constructor(private readonly rig:Rig){this.transition=capturePose(rig);this.attackBase=capturePose(rig);}
 update(p:VisualSample & {attackFlash?:number},speed:number,dt:number,floorY:number,frozen=false){
  this.timeline.update(p,speed,dt,frozen);const t=this.timeline;
  if(t.frozen&&!t.reset)return;
  if(t.reset){resetRig(this.rig);this.blendAge=Infinity;this.lowEliminationBlend=false;}
  else if(t.changed){savePose(this.transition);this.blendAge=0;this.lowEliminationBlend=t.state==='elimination'&&this.rig.hips.position.y<this.rig.restHipsY-.25;}
  if(['idle','walk','run','sprint'].includes(t.state))animateLocomotion(this.rig,t.clip,t.phase);
  else {this.motionOptions.floorY=floorY;if(t.state==='hit_reaction'&&t.stanceClip){animateMotion(this.rig,t.stanceClip,t.stancePhase,true,this.motionOptions);savePose(this.attackBase);animateMotion(this.rig,t.clip,t.phase,true,this.motionOptions);this.restoreLowerBody();}else animateMotion(this.rig,t.clip,t.phase,true,this.motionOptions);}
  if(this.blendAge<ANIMATION_TIMING.blend||this.lowEliminationBlend&&t.phase<.32){this.blendAge+=dt;const blend=Math.min(1,this.lowEliminationBlend?t.phase/.32:this.blendAge/ANIMATION_TIMING.blend);blendPose(this.transition,blend*blend*(3-2*blend));}
  // Keep existing melee pose on the upper body without standing up a crouched/sliding character.
  if((p.attackFlash??0)>0&&p.health>0&&t.state!=='hit_reaction'&&t.state!=='knockback'&&t.state!=='recovery'){
   savePose(this.attackBase);existingAttack(this.rig,'attack',1-(p.attackFlash??0)/COMBAT.attackFlash,defaults);
   this.restoreLowerBody();
  }
 }
 private restoreLowerBody(){for(let i=0;i<this.attackBase.nodes.length;i++){const node=this.attackBase.nodes[i];if(node===this.rig.hips||this.rig.legs.some(leg=>node===leg.hip||node===leg.knee||node===leg.ankle)){node.position.copy(this.attackBase.positions[i]);node.quaternion.copy(this.attackBase.quaternions[i]);node.scale.copy(this.attackBase.scales[i]);}}}

}
