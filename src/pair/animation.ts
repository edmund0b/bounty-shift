import * as T from 'three';
import type {Rig} from '../characters/rig';
import {solveArm} from '../weapons/attachment';
import type {PairId,PairStatus} from '../../shared/pair-powerups';
/** V7 activation gesture targets; lower body and root remain owned by gameplay locomotion. */
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
const gestures={bounce_bomb:{wind:[.38,.68,-.13],release:[.31,.26,.72],twist:.25},sticky_trap:{wind:[.28,-.04,.53],release:[.28,-.28,.67],twist:.04}};
export function pairPose(r:Rig,id:PairId,age:number|null,crouched:boolean){
 const nodes=[r.torso,r.head,...r.arms.flatMap(a=>[a.shoulder,a.elbow,a.wrist])],base=nodes.map(n=>n.quaternion.clone()),recovery=age===null?1:1-smooth((age-.64)/.71);
 const g=gestures[id],big=r.shape.shoulder/.5,rot=new T.Quaternion().setFromEuler(new T.Euler(-.25,0,0)),reach=new T.Vector3(r.shape.shoulder*.72,.04+(crouched?.12:0),.55);
 if(age!==null){const draw=smooth(age/.20),wind=smooth((age-.20)/.20),release=smooth((age-.40)/.24);reach.set(r.shape.shoulder*.75,-.30,.25).lerp(new T.Vector3(r.shape.shoulder*.72,.06,.55),draw).lerp(new T.Vector3(...g.wind as [number,number,number]),wind).lerp(new T.Vector3(...g.release as [number,number,number]),release);reach.x*=big;if(crouched)reach.y+=.12;r.torso.rotation.y+=g.twist*(wind-1.6*release);r.head.rotation.y-=g.twist*.4;rot.setFromEuler(new T.Euler(-.3-wind*.45+release*.65,0,0));}
 if(id==='sticky_trap'){const scale=.64*Math.max(1,big);if(age===null){reach.set(.35*scale,-.12+.08-.17*scale,.61);rot.identity();}const left=new T.Vector3(-.7*scale,0,0).applyQuaternion(rot).add(reach);solveArm(r,0,left,rot);}
 solveArm(r,1,reach,rot);if(recovery<1)nodes.forEach((n,i)=>n.quaternion.slerpQuaternions(base[i],n.quaternion.clone(),recovery));r.root.updateMatrixWorld(true);
}
/** Authored V7 knockback and foot-catching upper-body reaction, no demo root trajectory. */
export function pairReaction(r:Rig,s:PairStatus|undefined,now:number){if(!s)return;const age=(now-s.knockAt)/1000;if(s.knockUntil>now){const w=smooth(age/.08)*Math.min(1,(s.knockUntil-now)/180);r.torso.rotation.x-=.32*w;r.head.rotation.x+=.14*w;r.arms.forEach((a,i)=>{a.shoulder.rotation.x+=(-.7-a.shoulder.rotation.x)*w;a.shoulder.rotation.z+=((i?1:-1)*.32-a.shoulder.rotation.z)*w;a.elbow.rotation.x+=(-.55-a.elbow.rotation.x)*w;});}else if(s.slowUntil>now){const w=smooth((now-s.slowAt)/90)*Math.min(1,(s.slowUntil-now)/200);r.torso.rotation.x+=.18*w;r.arms.forEach(a=>a.shoulder.rotation.x*=1-.5*w);}}
