// Workshop locomotion formulas, unchanged; gameplay supplies phase and speed.
import type {Rig} from '../characters/rig';
import {resetRig} from './motion';
import {defaults,type Params} from './player';
export function animateLocomotion(r:Rig,id:string,phase:number,p:Params=defaults){
 resetRig(r);
 r.joints.forEach(j=>j.rotation.set(0,0,0));r.hips.position.set(0,r.restHipsY,0);const t=phase*Math.PI*2;
 if(id==='idle'){r.torso.scale.y=1+Math.sin(t)*.008;r.head.rotation.y=Math.sin(t)*.07;r.arms.forEach((a,i)=>a.shoulder.rotation.z=(i?1:-1)*.055);return;}
 r.torso.scale.y=1;
 if(['walk','run','sprint'].includes(id)){const intensity=id==='walk'?1:id==='run'?1.35:1.65,s=Math.sin(t),lift=Math.sin(t*2);r.hips.position.y+=p.bob*(1-Math.cos(t*2));r.hips.rotation.y=-s*p.twist*.5;r.torso.rotation.y=s*p.twist;r.torso.rotation.x=p.lean*(intensity-0.55);r.head.rotation.y=-r.torso.rotation.y*.65;r.head.rotation.x=-r.torso.rotation.x*.6;r.legs.forEach((leg,i)=>{const a=t+i*Math.PI;leg.hip.rotation.x=Math.sin(a)*p.stride*intensity;leg.knee.rotation.x=Math.max(0,-Math.sin(a)) *p.kneeBend*intensity;leg.ankle.rotation.x=-leg.hip.rotation.x*.35-leg.knee.rotation.x*.55;});r.arms.forEach((arm,i)=>{arm.shoulder.rotation.x=-Math.sin(t+i*Math.PI)*p.armSwing*intensity;arm.elbow.rotation.x=-.15-(intensity-1)*.9-Math.max(0,Math.sin(t+i*Math.PI))*.2;});r.torso.rotation.z=lift*.018;return;}
}
