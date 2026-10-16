import {meleeGrip} from './swings';
import * as T from 'three';
import type {Rig} from '../characters/rig';
import {createEquipment,type EquipmentModel} from './models';
import {capturePose,blendPose} from '../animations/motion';
import {animate,defaults} from '../animations/player';
import {actionAt,weaponEvents} from './actions';
import {weaponActions} from './actions';
import {moveSets,meleeMove,sampleMove,sampleGuard,bodyClipId,recoilProfiles,eases} from './moves';
const movement=['idle','walk','run','sprint','dash','jump','jump-start','airborne','falling','land','slide','slide-entry','slide-loop','slide-exit','crouch','crouch-enter','crouch-idle','crouch-walk','crouch-exit'];
const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
const ramp=(p:number,a:number,b:number)=>eases.io(clamp01((p-a)/(b-a)));
/** Pull-back-then-return used for slides, pumps and bolts: fast out, snappy return. */
const rack=(p:number,a:number,b:number)=>{const c=(p-a)/(b-a);if(c<=0||c>=1)return 0;return c<.45?eases.out(c/.45):1-eases.in((c-.45)/.55);};
/** Short seat impulse when a magazine slams home. */
const seat=(p:number,at:number)=>{const e=p-at;return e<0||e>.08?0:Math.sin(Math.PI*e/.08);};
/** Magazine: pulled out, stowed, new one driven home. */
const magTrack=(p:number)=>p<.15?0:p<.3?-.85*eases.io((p-.15)/.15):p<.46?-.85-.2*((p-.3)/.16):p<.58?-1.05*(1-eases.in((p-.46)/.12)):0;
/** Shotgun: three shells, each lifted from the belt and thumbed into the port. */
const shellCycle=(p:number)=>{const c=(p-.14)/.11;if(c<0||c>=6)return {u:0,visible:false,push:0};const f=c-Math.floor(c);return {u:eases.out(clamp01(f/.7)),visible:f<.92,push:f>.7?Math.sin(Math.PI*(f-.7)/.3):0};};
/** How much the support hand leaves the foregrip to work the magazine / shells during a reload. */
const reloadHand=(id:string,p:number)=>id==='shotgun'?ramp(p,.08,.16)*(1-ramp(p,.8,.86)):id==='pistol'?ramp(p,.12,.22)*(1-ramp(p,.56,.64)):ramp(p,.06,.16)*(1-ramp(p,.6,.7));
/** Two-handed melee: support hand stays on the handle at rest and walking, lets go for running and air time. */
const supportFor=(id:string,p:number)=>['idle','walk','land','crouch','crouch-enter','crouch-idle','crouch-walk','crouch-exit'].includes(id)?1:id==='equip'?ramp(p,.55,.95):id==='unequip'?1-ramp(p,0,.35):0;
export const attachmentProfiles:Record<string,{scale:number;reach:number;weight:number}>={pistol:{scale:.36,reach:.32,weight:.35},'assault-rifle':{scale:.36,reach:.30,weight:.6},shotgun:{scale:.38,reach:.30,weight:1},'sniper-rifle':{scale:.36,reach:.30,weight:1.1},'heavy-blade':{scale:.48,reach:.48,weight:1},'impact-hammer':{scale:.5,reach:.5,weight:1.2},'riot-bat':{scale:.52,reach:.48,weight:.8},'pulse-katana':{scale:.43,reach:.48,weight:.7},'twin-daggers':{scale:.43,reach:.6,weight:.3}};
const down=new T.Vector3(0,-1,0),v=new T.Vector3(),dir=new T.Vector3(),bend=new T.Vector3(),elbow=new T.Vector3(),q=new T.Quaternion();
/** Two-bone arm constraint in torso space. Wrist orientation follows the grip. */
export function solveArm(r:Rig,index:number,target:T.Vector3,orientation:T.Quaternion){const a=r.arms[index];v.copy(target).sub(a.shoulder.position);const d=Math.max(.03,Math.min(1.0199,v.length()));dir.copy(v).normalize();const along=(.53*.53-.49*.49+d*d)/(2*d),height=Math.sqrt(Math.max(0,.53*.53-along*along));bend.set(index?1:-1,-.8,-.2).addScaledVector(dir,-bend.dot(dir)).normalize();elbow.copy(dir).multiplyScalar(along).addScaledVector(bend,height);a.shoulder.quaternion.setFromUnitVectors(down,elbow.clone().normalize());q.copy(a.shoulder.quaternion).invert();v.copy(dir).multiplyScalar(d).sub(elbow).applyQuaternion(q).normalize();a.elbow.quaternion.setFromUnitVectors(down,v);a.wrist.quaternion.copy(a.shoulder.quaternion).multiply(a.elbow.quaternion).invert().multiply(orientation);for(const f of a.fingers)if(f.name!=='thumb'){f.rotation.x=-1.05;for(const c of f.children)if(c.name==='distal')c.rotation.x=-.85;}}
export class EquippedWeapon{
 model:EquipmentModel;holder=new T.Group();leftHolder=new T.Group();profile;gun:boolean;dual:boolean;parts=new Map<T.Object3D,T.Vector3>();primaryError=0;secondaryError=0;ammo:T.Mesh|null=null;leftBlade:T.Object3D|null=null;twoHanded:boolean;support=1;durations=new Map<string,number>();
 constructor(public rig:Rig,public id:string){this.model=createEquipment(id);this.profile=attachmentProfiles[id];this.gun=this.model.asset.category==='firearms';this.dual=id==='twin-daggers';this.twoHanded=this.gun||id==='impact-hammer'||id==='pulse-katana';rig.torso.add(this.holder,this.leftHolder);rig.arms[1].wrist.add(this.model.root);this.model.root.position.set(0,-.08,0);this.model.root.rotation.set(0,-Math.PI/2,0);this.model.root.scale.setScalar(this.profile.scale);
 if(this.dual){const right=this.model.root.getObjectByName('right-dagger')!,left=this.model.root.getObjectByName('left-dagger')!;right.position.set(0,0,0);right.rotation.set(0,0,0);this.leftBlade=left;rig.arms[0].wrist.add(left);left.position.set(0,-.08,0);left.rotation.set(0,-Math.PI/2,0);left.scale.setScalar(this.profile.scale);}
 if(id==='impact-hammer'){const surface=new T.Object3D();surface.name='contact-surface';surface.position.set(1.93,-.94,0);this.model.root.add(surface);}

 for(const name of ['magazine','handguard','bolt',...(id==='pistol'?['barrel']:[])]){const part=this.model.root.getObjectByName(name);if(part)this.parts.set(part,part.position.clone());}
 if(this.gun&&!this.model.root.getObjectByName('magazine')){this.ammo=new T.Mesh(this.id==='shotgun'?new T.CylinderGeometry(.035,.035,.12,8):new T.BoxGeometry(.07,.18,.065),new T.MeshStandardMaterial({color:0x707984,metalness:.7,roughness:.4}));this.holder.add(this.ammo);this.ammo.visible=false;}
 for(const action of weaponActions(id))this.durations.set(action.id,action.duration);
 this.holder.userData.attachment={primary:'right-wrist',secondary:this.dual?'left-wrist':this.gun&&id!=='pistol'?'secondary-grip':null,scale:this.profile.scale,weaponForward:'+X',characterForward:'+Z',previewOnly:true};
 }
 /** Which body clip drives the skeleton underneath the weapon for a given action. */
 bodyClip(clip:string,crouched:boolean){
  if(crouched&&['aim','fire'].includes(clip))return 'crouch-idle';
  if(!this.gun&&(clip==='idle'||clip==='equip'||clip==='unequip'||clip==='recovery'||clip.startsWith('attack')))return bodyClipId(this.id,clip==='equip'||clip==='unequip'?'idle':clip);
  if(clip.endsWith('-fire'))return clip.slice(0,-5);
  if(movement.includes(clip))return clip;
  if(this.gun&&['aim','fire','recoil'].includes(clip))return 'gun:aim';
  if(this.gun&&clip==='reload')return 'gun:reload';
  return 'idle';
 }
 sample(action:string,time:number,inPlace=false){const a=actionAt(this.id,action,time),p=a.phase,id=a.id;
 const base=(clip:string,phase:number)=>{animate(this.rig,this.bodyClip(clip,a.crouched),phase,defaults,inPlace);if(this.gun)this.gunBody(clip,phase);};
 const blending=a.start>0&&a.local<.16;
 let previous:ReturnType<typeof capturePose>|undefined;if(blending){base(a.previous,1);previous=capturePose(this.rig);}
 base(id,p);
 if(previous){const t=a.local/.16;blendPose(previous,t*t*(3-2*t));}
 const pose=this.pose(id,p);if(blending){const old=this.pose(a.previous,1),w=a.local/.16,s=w*w*(3-2*w);pose.pos.lerp(old.pos,1-s);pose.rot.slerp(old.rot,1-s);pose.left.lerp(old.left,1-s);pose.leftRot.slerp(old.leftRot,1-s);pose.support+=(old.support-pose.support)*(1-s);}
 this.holder.position.copy(pose.pos);this.holder.quaternion.copy(pose.rot);this.leftHolder.position.copy(pose.left);this.leftHolder.quaternion.copy(pose.leftRot);this.support=pose.support;
 this.holder.visible=this.leftHolder.visible=this.model.root.visible=!(id==='unequip'&&p>=.999);if(this.leftBlade)this.leftBlade.visible=this.model.root.visible;
 for(const [part,rest]of this.parts)part.position.copy(rest);
 this.animateParts(id,p);
 this.constrain(id,p);
 }
 /** Seconds-based recoil impulse: near-instant kick, then a settle whose length is set per gun. */
 kick(id:string,p:number){const original=id;const r=recoilProfiles[this.id];if(id.endsWith('-fire'))id='fire';if(!r||(id!=='fire'&&id!=='recoil'))return {kick:0,climb:0,side:0,slide:0};const d=this.durations.get(original)??1,shots=id==='fire'?(this.id==='assault-rifle'?[.18,.34,.5,.66]:[.32]):[0];let kick=0,climb=0,side=0,slide=0;
  shots.forEach((at,n)=>{const e=(p-at)*d;if(e<0)return;const k=(1-Math.exp(-e/.012))*Math.exp(-e/(r.settle*.4));kick+=k;side+=Math.sin(n*2.3+.7)*r.side*k;climb+=r.climb*(e<.12?1:Math.exp(-(e-.12)/.06));slide+=e<.09?Math.sin(Math.PI*e/.09):0;});
  return {kick,climb,side,slide};}
 /** Upper-body absorb layered on the stance: the shoulder takes the kick, hips shift back on heavy guns. */
 gunBody(id:string,p:number){const r=recoilProfiles[this.id];if(!r)return;const {kick,climb}=this.kick(id,p);if(!kick&&!climb)return;this.rig.torso.rotation.x-=kick*r.body+climb*.25;this.rig.torso.rotation.y+=kick*r.body*.35;this.rig.head.rotation.x+=kick*r.body*.5;}
 animateParts(id:string,p:number){
  const piece=(name:string)=>this.model.root.getObjectByName(name);
  if(this.ammo)this.ammo.visible=false;
  if(id==='reload'){
   const mag=piece('magazine');
   if(mag)mag.position.y=magTrack(p);
   else if(this.id==='shotgun'&&this.ammo){const c=shellCycle(p);this.ammo.visible=c.visible;this.ammo.position.set(-.15+.15*c.u,-.42+.44*c.u,.05+.14*c.u);this.ammo.rotation.set(Math.PI/2*(1-c.u)*.6,0,0);}
   else if(this.ammo){const u=clamp01((p-.22)/.33);this.ammo.visible=p>.22&&p<.58;this.ammo.position.set(0,-.12-.42*(1-eases.in(u)),-.01);this.ammo.rotation.set(0,0,0);}
   if(this.id==='pistol'){const slide=piece('barrel');if(slide)slide.position.x-=rack(p,.66,.8)*.32;}
   if(this.id==='shotgun'){const fore=piece('handguard');if(fore)fore.position.x-=rack(p,.84,.97)*.3;}
   if(this.id==='sniper-rifle'){const bolt=piece('bolt');if(bolt)bolt.position.x-=rack(p,.72,.9)*.3;}
   if(this.id==='assault-rifle'){const fore=piece('handguard');if(fore)fore.position.x-=0;}
  }
  if(id==='fire'||id==='recoil'||id.endsWith('-fire')){
   const k=this.kick(id,p);
   if(this.id==='pistol'){const slide=piece('barrel');if(slide)slide.position.x-=k.slide*.28;}
   if(this.id==='shotgun'){const fore=piece('handguard');if(fore)fore.position.x-=(id==='recoil'?rack(p,.28,.62):rack(p,.6,.9))*.3;}
   if(this.id==='sniper-rifle'){const bolt=piece('bolt');if(bolt){const r=id==='recoil'?rack(p,.3,.7):rack(p,.62,.92);bolt.position.x-=r*.3;bolt.position.y+=r*.03;}}
  }
 }
 constrain(id='idle',p=0){
 const pose={pos:this.holder.position,rot:this.holder.quaternion,left:this.leftHolder.position,leftRot:this.leftHolder.quaternion};
 const offset=new T.Vector3(0,.08,0).applyQuaternion(pose.rot);
 const set=moveSets[this.id],twoHanded=!this.gun&&!this.dual&&!!set&&set.support>0&&this.support>0;
 const supportOffset=this.gun?(this.id==='pistol'?new T.Vector3(-.1,.03,-.04):new T.Vector3(0,.27*this.profile.scale,(1.1+(this.model.root.getObjectByName('handguard')?.position.x??0))*this.profile.scale)).applyQuaternion(pose.rot).add(offset)
  :new T.Vector3(0,0,this.id==='impact-hammer'?.22:-(set?.support??0)).applyQuaternion(pose.rot).add(offset);
 const correct=(position:T.Vector3,off:T.Vector3,hand:number)=>{const target=position.clone().add(off),origin=this.rig.arms[hand].shoulder.position,d=target.clone().sub(origin);if(d.length()>.995)position.add(origin.clone().add(d.setLength(.995)).sub(target));};
 // Project the rigid weapon into the intersection of the hands' reachable volumes.
 for(let i=0;i<12;i++){correct(pose.pos,offset,1);if((this.gun&&id!=='reload')||twoHanded)correct(pose.pos,supportOffset,0);}
 const rightTarget=pose.pos.clone().add(offset);solveArm(this.rig,1,rightTarget,pose.rot);
 let secondary:T.Vector3|undefined,weight=1;
 if(this.dual){const off=new T.Vector3(0,.08,0).applyQuaternion(pose.leftRot);correct(pose.left,off,0);secondary=pose.left.clone().add(off);}
 else if(this.gun){secondary=supportOffset.clone().add(pose.pos);if(id==='reload'){const magazine=this.model.root.getObjectByName('magazine'),off=magazine?new T.Vector3(0,(-.2+magazine.position.y)*this.profile.scale,(this.id==='sniper-rifle'?.68:.53)*this.profile.scale):this.ammo!.position.clone();const hand=off.applyQuaternion(pose.rot).add(pose.pos).add(offset);const w=reloadHand(this.id,p);secondary.lerp(hand,w);const d=secondary.clone().sub(this.rig.arms[0].shoulder.position);if(d.length()>.995)secondary.copy(this.rig.arms[0].shoulder.position).add(d.setLength(.995));}}
 else if(twoHanded){secondary=supportOffset.clone().add(pose.pos);weight=Math.min(1,this.support);}
 if(secondary){const arm=this.rig.arms[0],before=weight<1?[arm.shoulder.quaternion.clone(),arm.elbow.quaternion.clone(),arm.wrist.quaternion.clone()]:null;solveArm(this.rig,0,secondary,this.dual?pose.leftRot:pose.rot);if(before){arm.shoulder.quaternion.copy(before[0].slerp(arm.shoulder.quaternion,weight));arm.elbow.quaternion.copy(before[1].slerp(arm.elbow.quaternion,weight));arm.wrist.quaternion.copy(before[2].slerp(arm.wrist.quaternion,weight));}}
 this.rig.root.updateMatrixWorld(true);this.primaryError=this.rig.arms[1].wrist.getWorldPosition(new T.Vector3()).distanceTo(this.rig.torso.localToWorld(rightTarget.clone()));this.secondaryError=secondary&&weight>=1?this.rig.arms[0].wrist.getWorldPosition(new T.Vector3()).distanceTo(this.rig.torso.localToWorld(secondary.clone())):0;
 }

 pose(id:string,p:number){
 if(!this.gun){const set=moveSets[this.id],m=meleeMove(this.id,id);
  if(this.dual&&id==='attack3'){const pose=meleeGrip(this.id,id,p);this.rig.hips.updateMatrix();this.rig.torso.updateMatrix();const matrix=new T.Matrix4().multiplyMatrices(this.rig.hips.matrix,this.rig.torso.matrix),inv=matrix.clone().invert(),q=new T.Quaternion().setFromRotationMatrix(matrix).invert();pose.pos.applyMatrix4(inv);pose.left.applyMatrix4(inv);pose.rot.premultiply(q);pose.leftRot.premultiply(q);return {...pose,support:0};}
  if(m)return sampleMove(set,m,p);
  const g=sampleGuard(set);let dx=0,dy=0,dz=0,drx=0;
  if(id==='equip'||id==='unequip'){const t=id==='equip'?1-p:p,s=t*t*(3-2*t);dx+=s*.25;dy-=s*.55;dz-=s*.3;drx+=s*1.1;}
  if(id==='sprint'){dy-=.12;dz-=.14;drx+=.9;}if(id==='run'){drx+=.35;dz-=.06;}if(id.startsWith('slide')){dy+=.26;drx-=.3;}if(id.includes('crouch'))dy+=.08;
  const tilt=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),drx);
  g.pos.add(new T.Vector3(dx,dy,dz));g.rot.premultiply(tilt);g.left.add(new T.Vector3(-dx,dy,dz));g.leftRot.premultiply(tilt);
  g.support=set.support?supportFor(id,p):0;return g;}
 const locomotion=id.endsWith('-fire')?id.slice(0,-5):id;const r=recoilProfiles[this.id];let x=0,y=.18,z=this.profile.reach,rx=.08,ry=0,rz=0;
 const long=this.id!=='pistol';if(long){x=.24;y=.04;z=.58+Math.max(0,this.rig.shape.chest-.46)*.25;rx=this.id==='shotgun'?.20:.09;ry=-.20;rz=-.06;}
 if(long&&['walk','run','sprint','crouch-walk'].includes(locomotion)){const t=p*Math.PI*2,weight=locomotion==='sprint'?1.6:locomotion==='run'?1.25:.7;x+=Math.sin(t)*.016*weight;y+=(1-Math.cos(t*2))*.012*weight;rx+=Math.sin(t*2)*.018*weight;ry+=Math.sin(t)*.025*weight;}const lx=-.38,ly=-.18,lz=.5;
 if(['aim','fire','recoil'].includes(id)){y=this.id==='pistol'?.37:this.id==='sniper-rifle'?.32:.25;rx=0;if(id==='aim'){y+=Math.sin(Math.PI*2*p)*.006;rx+=Math.sin(Math.PI*2*p+1)*.006;}}
 if(id==='fire'||id==='recoil'||id.endsWith('-fire')){const k=this.kick(id,p);z-=k.kick*r.back;y+=k.kick*r.back*.35;rx-=k.kick*r.rise+k.climb;ry+=k.side;rz+=k.side*.6;}
 if(id==='recoil'&&(this.id==='shotgun'||this.id==='sniper-rifle')){const c=Math.sin(Math.PI*clamp01((p-.22)/.55));rz+=c*.18;ry-=c*.08;}
 if(id==='reload'){const tilt=eases.io(clamp01(p/.16))*(1-eases.io(clamp01((p-.86)/.14))),bump=this.id==='shotgun'?0:seat(p,this.id==='pistol'?.55:.6);
  const roll=this.id==='shotgun'?-.55:this.id==='pistol'?.25:.45;rx=-.28*tilt-bump*.12;ry=.3*tilt;rz=roll*tilt;y=.18-.06*tilt+bump*.03;x=(long?.24:0)-.08*tilt;z=long?.58:z;
  if(this.id==='pistol'){const rk=rack(p,.66,.8);z-=rk*.05;rx-=rk*.15;}
  if(this.id==='shotgun'){const sh=shellCycle(p);rx-=sh.push*.05;}
  if(this.id==='sniper-rifle'||this.id==='assault-rifle'){const rk=rack(p,.72,.9);rz+=rk*.2;}}
 if(id==='equip'||id==='unequip'){const t=id==='equip'?1-p:p,s=t*t*(3-2*t);x+=s*.38;y-=s*.5;z-=s*.25;rx+=s*.9;if(id==='equip'){const o=Math.sin(Math.PI*clamp01((p-.7)/.3))*.05;y+=o;rx-=o*1.5;}}
 if(locomotion==='sprint'){if(long){rx+=.25;y-=.08;z-=.03;}else{rx=.5;y-=.1;z-=.08;}}if(locomotion.startsWith('slide')){y+=long?.18:.28;rx=long?-.12:-.15;}if(id.includes('crouch'))y+=.08;
 const rot=new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz));return{pos:new T.Vector3(x,y,z),rot,left:new T.Vector3(lx,ly,lz),leftRot:new T.Quaternion(),support:0};
 }
 node(name:string){return this.model.root.getObjectByName(name)??this.leftBlade?.getObjectByName(name);}
 anchor(name:string){const node=this.node(name);return node?.getWorldPosition(new T.Vector3())??this.holder.getWorldPosition(new T.Vector3());}
 contact(time:number,action:string){const part=actionAt(this.id,action,time);return this.anchor(this.gun?'muzzle':this.dual?part.id==='attack2'||(part.id==='attack3'&&part.phase>.5)?'left-strike':'right-strike':this.id==='impact-hammer'?'contact-surface':'strike-region');}
 dispose(){this.leftBlade?.removeFromParent();if(this.ammo){this.ammo.geometry.dispose();(this.ammo.material as T.Material).dispose();}this.holder.removeFromParent();this.leftHolder.removeFromParent();this.model.dispose();this.holder.clear();this.leftHolder.clear();}
}
