import type {Rig} from './characters/rig';
/** Upper-body reach only. Actor/hips/feet stay owned by the existing locomotion animator. */
export function tagReach(r:Rig,age:number,aimYaw=0){
 if(age<0||age>.42)return;const p=age/.42,w=p<.42?Math.sin(p/.42*Math.PI/2):Math.cos((p-.42)/.58*Math.PI/2);
 r.torso.rotation.y+=aimYaw*w+.12*w;r.arms[1].shoulder.rotation.x=-1.45*w;r.arms[1].shoulder.rotation.z=-.12*w;r.arms[1].elbow.rotation.x=-.22-.3*w;r.arms[1].wrist.rotation.x=.1*w;
 for(const f of r.arms[1].fingers){if(f.name!=='thumb')f.rotation.x=-.1;}
}
