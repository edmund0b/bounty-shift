import type {Rig} from './characters/rig';
export const TAG_REACH={anticipation:.08,contact:.20,duration:.35};
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
/** Accepted server swings only, not attackSeen (which also acknowledges rejected spam). */
export function tagSwingAge(p:{unarmedSerial?:number;unarmedAt?:number},now:number){return (p.unarmedSerial??0)>0&&now>=(p.unarmedAt??0)?(now-(p.unarmedAt??0))/1000:Infinity;}
/** Upper body only: blend a short hand reach over the existing moving/crouched pose. */
export function tagReach(r:Rig,age:number,aimYaw=0){
 if(age<0||age>=TAG_REACH.duration)return;
 const reach=age<TAG_REACH.anticipation?0:age<TAG_REACH.contact?smooth((age-TAG_REACH.anticipation)/(TAG_REACH.contact-TAG_REACH.anticipation)):1-smooth((age-TAG_REACH.contact)/(TAG_REACH.duration-TAG_REACH.contact));
 const prepare=age<TAG_REACH.anticipation?smooth(age/TAG_REACH.anticipation):1-smooth((age-TAG_REACH.anticipation)/.12),weight=Math.max(reach,prepare*.32),arm=r.arms[1];
 const blend=(base:number,target:number)=>base+(target-base)*weight;
 r.torso.rotation.y+=Math.max(-.65,Math.min(.65,aimYaw))*reach+.08*reach;
 arm.shoulder.rotation.x=blend(arm.shoulder.rotation.x,-1.65*reach+.16*prepare);arm.shoulder.rotation.z=blend(arm.shoulder.rotation.z,-.10);arm.elbow.rotation.x=blend(arm.elbow.rotation.x,-.12-.65*prepare);arm.wrist.rotation.x=blend(arm.wrist.rotation.x,.08);
 for(const finger of arm.fingers)if(finger.name!=='thumb')finger.rotation.x=blend(finger.rotation.x,-.06);
}
