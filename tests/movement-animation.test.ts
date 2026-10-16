import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {characters} from '../src/characters/registry';
import {createRig,disposeTree} from '../src/characters/rig';
import {AnimationTimeline,GameplayAnimator,type VisualSample} from '../src/animations/gameplay';
import {animateMotion,resetRig} from '../src/animations/motion';
import {animateLocomotion} from '../src/animations/locomotion';
import {jumpRiseTime,jumpFallTime,jumpDuration,slideDuration} from '../src/animations/tuning';
import {motions,motionById,channels,sampleMotion} from '../src/animations/clips';
import {ACTIVE_MAP} from '../shared/map';
import {freshMotion,advanceMotion,STEP,ARENA} from '../shared/game';
const sample=(extra:Partial<VisualSample>={}):VisualSample=>({health:100,spawnVersion:1,airborne:false,verticalVelocity:0,crouched:false,sprinting:false,traversalState:'idle',dashRemaining:0,hitFlash:0,koRemaining:0,...extra});
const transforms=(r:ReturnType<typeof createRig>)=>r.joints.flatMap(j=>[...j.position.toArray(),...j.quaternion.toArray(),...j.scale.toArray()]);
test('Workshop V5 movement/reaction clips retain source timing; gameplay adapts the actual physics',()=>{
 for(const [id,duration] of Object.entries({'dash':.78,'jump-start':.1,'airborne':jumpRiseTime(),'falling':jumpFallTime(),'land':.46,'jump':jumpDuration(),'slide-entry':.2,'slide-loop':.72,'slide-exit':.32,'slide':slideDuration(),'crouch-enter':.4,'crouch-idle':2,'crouch-walk':1.35,'crouch-exit':.45,'hit':.62,'knockback':1.05,'recover':.45,'elimination':1.75}))assert.equal(motionById.get(id)?.duration,duration,id);
 for(const id of ['attack','attack2','attack3','combo'])assert(motionById.has(id),'V5 combat clip '+id);
 const pose=new Float64Array(channels.length);sampleMotion('crouch-idle',.5,pose);assert.equal(pose[channels.indexOf('hy')],-.55);
});
test('movement chooses idle/walk/run/sprint by actual speed; loops retain phase instead of restarting with snapshots',()=>{
 const t=new AnimationTimeline();t.update(sample(),0,STEP);assert.equal(t.state,'idle');for(let i=0;i<20;i++)t.update(sample(),0,STEP);assert(t.phase>0);
 t.update(sample({traversalState:'walk'}),80,STEP);assert.equal(t.state,'walk');const phase=t.phase;t.update(sample(),80,STEP);assert(t.phase>phase);t.update(sample(),220,STEP);assert.equal(t.state,'run');t.update(sample({sprinting:true}),330,STEP);assert.equal(t.state,'sprint');t.update(sample({sprinting:true}),0,STEP);assert.equal(t.state,'idle','wall contact and camera orbit do not imply motion');
});
test('actual jump physics drive takeoff, air, fall and one landing, without changing the supplied physics',()=>{
 const t=new AnimationTimeline();let m=freshMotion(ACTIVE_MAP.spawns[0]);t.update(sample(),0,STEP);const seen=new Set<string>();for(let i=0;i<65;i++){m=advanceMotion(m,{dx:0,dy:0,jumpId:1},STEP);t.update(sample({...m}),0,STEP);seen.add(t.state);}for(const s of ['jump_start','airborne','falling','landing','idle'])assert(seen.has(s),s);assert.equal(m.elevation,ACTIVE_MAP.spawns[0].elevation??0);assert(!m.airborne);for(let i=0;i<30;i++){t.update(sample({...m}),0,STEP);assert.equal(t.state,'idle');}
});
test('long falls hold falling; late join in air/fall does not replay takeoff; no artificial 1.75 second flight',()=>{
 const t=new AnimationTimeline();for(let i=0;i<150;i++){t.update(sample({airborne:true,verticalVelocity:-200}),0,STEP);assert.equal(t.state,'falling');}assert.equal(t.phase,1);t.update(sample(),0,STEP);assert.equal(t.state,'landing');const rising=new AnimationTimeline();rising.update(sample({airborne:true,verticalVelocity:100}),0,STEP);assert.equal(rising.state,'airborne');const delayed=new AnimationTimeline();delayed.update(sample(),0,STEP);delayed.update(sample({airborne:true,verticalVelocity:100}),0,STEP);assert.equal(delayed.state,'airborne','late positive-velocity snapshot must not replay completed takeoff');
});
test('dash/dodge clip phase follows the existing burst, then resumes movement without a preview-duration lock',()=>{
 for(const [style,duration] of [['dash',.18],['dodge',.24]] as const){const t=new AnimationTimeline();t.update(sample(),0,STEP);t.update(sample({dashRemaining:duration,traversalState:style}),ARENA.speed,STEP);assert.equal(t.state,'dash');t.update(sample({dashRemaining:duration/2,traversalState:style}),ARENA.speed,STEP);assert(t.phase>=.5);t.update(sample(),220,STEP);assert.equal(t.state,'run');}
});
test('slide entry/travel/exit use real duration; interruption restores jump or crouch, not upright running',()=>{
 const t=new AnimationTimeline();t.update(sample(),220,STEP);t.update(sample({dashRemaining:.4,traversalState:'slide'}),400,STEP);assert.equal(t.state,'slide_entry');t.update(sample({dashRemaining:.25,traversalState:'slide'}),400,STEP);assert.equal(t.state,'slide_travel');t.update(sample(),220,STEP);assert.equal(t.state,'slide_exit');for(let i=0;i<20;i++)t.update(sample(),220,STEP);assert.equal(t.state,'run');t.update(sample({dashRemaining:.3,traversalState:'slide'}),400,STEP);t.update(sample({airborne:true,verticalVelocity:-20}),220,STEP);assert.equal(t.state,'falling');
});
test('crouch enter/idling/walking/exit follows actual toggles and can remain crouched indefinitely',()=>{
 const t=new AnimationTimeline();t.update(sample(),0,STEP);t.update(sample({crouched:true}),0,STEP);assert.equal(t.state,'crouch_enter');for(let i=0;i<200;i++)t.update(sample({crouched:true}),0,STEP);assert.equal(t.state,'crouch_idle');t.update(sample({crouched:true,sprinting:true}),220,STEP);assert.equal(t.state,'crouch_walk');t.update(sample(),0,STEP);assert.equal(t.state,'crouch_exit');for(let i=0;i<20;i++)t.update(sample(),0,STEP);assert.equal(t.state,'idle');
});
test('health edges trigger one reaction despite duplicate snapshots; KO overrides locomotion until authoritative respawn',()=>{
 const t=new AnimationTimeline();t.update(sample(),220,STEP);t.update(sample({health:75,hitFlash:.2}),220,STEP);assert.equal(t.state,'hit_reaction');for(let i=0;i<30;i++)t.update(sample({health:75,hitFlash:.2}),220,STEP);assert.equal(t.state,'run','duplicate flash does not restart hit');t.update(sample({health:50}),220,STEP);assert.equal(t.state,'hit_reaction');t.update(sample({health:0,koRemaining:5}),220,STEP);assert.equal(t.state,'elimination');for(let i=0;i<120;i++)t.update(sample({health:0,koRemaining:5}),220,STEP);assert.equal(t.state,'elimination');assert.equal(t.phase,1);t.update(sample({spawnVersion:2}),0,STEP);assert.equal(t.state,'idle');
});
test('knockback/recovery are dormant unless an explicit existing effect is provided; no force or position is created',()=>{
 const t=new AnimationTimeline();t.update(sample(),220,STEP);t.update(sample({health:75}),220,STEP);assert.equal(t.state,'hit_reaction');t.update(sample({knockbackRemaining:1,knockbackDuration:1.05}),220,STEP);assert.equal(t.state,'knockback');t.update(sample(),220,STEP);assert.equal(t.state,'recovery');for(let i=0;i<20;i++)t.update(sample(),220,STEP);assert.equal(t.state,'run');
});
test('frame-rate independent gait and freeze preserve continuity and the current pose',()=>{
 const phases=[];for(const fps of [5,10,30,60,120]){const t=new AnimationTimeline();t.update(sample(),220,0);for(let i=0;i<fps;i++)t.update(sample(),220,1/fps);phases.push(t.phase);}assert(Math.max(...phases)-Math.min(...phases)<1e-8);
 const r=createRig(characters[0]),a=new GameplayAnimator(r);a.update(sample(),220,STEP,0);const before=transforms(r);for(let i=0;i<30;i++)a.update(sample(),0,STEP,0,true);assert.deepEqual(transforms(r),before);a.update(sample(),220,STEP,0,false);assert.notDeepEqual(transforms(r),before);disposeTree(r.root);
});
test('every authorized motion and locomotion works on all eight unchanged skins; root placement/scale and floor remain intact',()=>{
 for(const c of characters){const rig=createRig(c),parent=new Group();parent.position.set(2,4,3);parent.add(rig.root);rig.root.scale.multiplyScalar(.55);const scale=rig.root.scale.clone(),position=rig.root.position.clone();for(const m of motions.filter(m=>!m.parts))for(const phase of [0,.25,.5,.75,1]){animateMotion(rig,m.id,phase,true,{suppressLift:true,floorY:4});rig.root.updateWorldMatrix(true,true);assert(transforms(rig).every(Number.isFinite),c.id+' '+m.id);assert(rig.root.scale.equals(scale));assert(rig.root.position.equals(position));if(m.id==='elimination')assert(new Box3().setFromObject(rig.hips).min.y>=4-.005,c.id+' elevated collapse');}
  for(const id of ['idle','walk','run','sprint']){animateLocomotion(rig,id,.25);assert(transforms(rig).every(Number.isFinite));}resetRig(rig);assert.equal(rig.hips.position.y,rig.restHipsY);disposeTree(rig.root);
 }
});
test('adapter suppresses preview lift/travel and preserves grounded lower-body pose during existing attack',()=>{
 const r=createRig(characters[0]);animateMotion(r,'airborne',.5,true);const lifted=r.hips.position.y;animateMotion(r,'airborne',.5,true,{suppressLift:true});assert(lifted-r.hips.position.y>.6);animateMotion(r,'dash',.6,false);const travel=r.hips.position.z;animateMotion(r,'dash',.6,true);assert(travel-r.hips.position.z>.3);
 const a=new GameplayAnimator(r);const p=sample({crouched:true});a.update(p,0,0,0);const hips=r.hips.position.y;const leg=r.legs[0].hip.quaternion.clone();a.update({...p,attackFlash:.08},0,0,0);assert.equal(r.hips.position.y,hips);assert(r.legs[0].hip.quaternion.equals(leg));disposeTree(r.root);
});



test('hidden held-item geometry does not lift the Workshop collapse above the actual character floor',()=>{const bare=createRig(characters[0]),held=createRig(characters[0]);const prop=new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());prop.visible=false;prop.position.y=-100;held.arms[1].wrist.add(prop);for(const phase of [.5,.75,1]){animateMotion(bare,'elimination',phase,true,{floorY:0});animateMotion(held,'elimination',phase,true,{floorY:0});assert(Math.abs(bare.hips.position.y-held.hips.position.y)<1e-8);}disposeTree(bare.root);disposeTree(held.root);});

test('damage preserves real crouch/slide lower stance, and elimination from crouch does not stand first',()=>{for(const stance of [{crouched:true},{dashRemaining:.25,traversalState:'slide' as const}]){const rig=createRig(characters[0]),anim=new GameplayAnimator(rig);anim.update(sample(stance),0,0,0);anim.update(sample({...stance,health:75,hitFlash:.2}),0,.04,0);assert.equal(anim.timeline.state,'hit_reaction');assert(rig.hips.position.y<rig.restHipsY-.35);disposeTree(rig.root);}const rig=createRig(characters[0]),anim=new GameplayAnimator(rig);anim.update(sample({crouched:true}),0,0,0);anim.update(sample({health:0,crouched:true,koRemaining:5}),0,.04,0);assert(rig.hips.position.y<rig.restHipsY-.35);for(let n=1;n<=9;n++){anim.update(sample({health:0,crouched:true,koRemaining:5-n/30}),0,1/30,0);assert(rig.hips.position.y<rig.restHipsY-.25);}disposeTree(rig.root);});
