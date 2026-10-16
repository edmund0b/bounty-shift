import {movementConfig,jumpDuration,jumpRiseTime,jumpFallTime,jumpHeight,slideDistance,slideTravel,slideDuration} from './tuning';
/** Workshop motion data. Normalized time; no damage, controller or networking rules. */
export const channels=['hx','hy','hz','rx','ry','rz','tx','ty','tz','headx','heady','a0x','a0y','a0z','e0x','e0y','w0z','a1x','a1y','a1z','e1x','e1y','w1z','f0x','f0y','f0z','f1x','f1y','f1z','foot0','foot1','lift','travel','fall','k0','k1','l0','l1','fist'] as const;
export type Channel=typeof channels[number];
export type Pose=Partial<Record<Channel,number>>;
export type MotionEvent={at:number;label:string;kind?:'impact';hand?:number;force?:number};
export type Motion={id:string;name:string;category:string;status:string;duration:number;events:MotionEvent[];frames?:{at:number;values:Float64Array;ease?:(t:number)=>number}[];parts?:{id:string;start:number;duration:number}[]};
export const guard:Pose={hy:-.10,tx:.06,ty:-.08,a0x:-.4,a0z:-.1,e0x:-1.25,a1x:-.32,a1z:.12,e1x:-1.4,f0z:.13,f1z:-.13,fist:1};
const low:Pose={hy:-.56,tx:.22,a0x:-.32,e0x:-.9,a1x:-.3,e1x:-.95,f0z:.12,f1z:-.1,fist:.35};
const slide:Pose={hy:-.91,tx:.23,ty:.12,rz:-.08,a0x:.15,a0z:-.35,e0x:-.45,a1x:-.2,a1z:.45,e1x:-.9,f0z:.82,f1z:-.28,f0y:0,f1y:.015,foot0:-.1,fist:.2};
const air:Pose={hy:-.12,tx:.13,a0x:-.45,a0z:-.16,e0x:-.85,a1x:.15,a1z:.17,e1x:-.8,f0z:.23,f1z:-.16,f0y:.35,f1y:.23,foot0:.15,foot1:.1};
const ev=(at:number,label:string):MotionEvent=>({at,label});
const impact=(at:number,hand:number,force=1):MotionEvent=>({at,label:'Impact',kind:'impact',hand,force});
const definitions:Motion[]=[];
function clip(id:string,name:string,category:string,duration:number,keys:[number,Pose][],events:MotionEvent[]=[]){const m:Motion={id,name,category,duration,status:'implemented',events,frames:keys.map(([at,p])=>({at,values:new Float64Array(channels.map(c=>p[c]??0))}))};definitions.push(m);return m;}
clip('attack','Attack 1 · opening strike','Melee combat',.72,[
 [0,guard],[.13,{...guard,hy:-.14,ry:.13,ty:.18,a1x:-.1,a1y:-.2,e1x:-1.7,hz:-.035}],
 [.31,{...guard,hz:.23,hx:-.025,hy:-.15,ry:-.18,ty:-.30,tx:.14,heady:.27,a1x:-1.46,a1y:-.17,a1z:.07,e1x:-.10,w1z:-.1,a0x:-.55,e0x:-1.55,f1y:.025,foot1:.18}],
 [.36,{...guard,hz:.25,hy:-.14,ry:-.21,ty:-.34,tx:.15,heady:.29,a1x:-1.52,a1y:-.14,e1x:-.13,a0x:-.55,e0x:-1.5,foot1:.2}],
 [.56,{...guard,hz:.15,hy:-.12,ry:-.12,ty:-.20,a1x:-.88,e1x:-.8,heady:.15}], [1,guard]
],[ev(.13,'Anticipation'),ev(.23,'Strike'),impact(.31,1),ev(.56,'Recovery')]);
clip('attack2','Attack 2 · cross hook','Melee combat',.84,[
 [0,guard],[.16,{...guard,ry:-.16,ty:-.3,hx:.035,hy:-.17,a0x:-.55,a0z:-.65,e0x:-1.55,a1x:-.5,e1x:-1.4}],
 [.37,{...guard,hx:-.04,hz:.24,hy:-.17,ry:.28,ty:.43,tx:.12,heady:-.40,a0x:-1.24,a0y:.4,a0z:-.14,e0x:-.55,e0y:.20,a1x:-.55,e1x:-1.45,f1y:.035,foot1:.25}],
 [.45,{...guard,hz:.28,hy:-.18,ry:.31,ty:.48,heady:-.42,a0x:-1.2,a0y:.54,a0z:.12,e0x:-.55,e0y:.25,a1x:-.5,e1x:-1.4,foot1:.22}],
 [.7,{...guard,hz:.10,ry:.16,ty:.14,a0x:-.7,e0x:-1.1}], [1,guard]
],[ev(.16,'Load'),ev(.28,'Arc'),impact(.37,0,1.2),ev(.7,'Recovery')]);
clip('attack3','Attack 3 · driving finisher','Melee combat',1.12,[
 [0,guard],[.23,{...guard,hy:-.35,hz:-.07,ry:.20,ty:.26,tx:.19,a1x:.1,e1x:-1.65,a0x:-.5,e0x:-1.4,f0z:.16}],
 [.45,{...guard,hy:-.19,hz:.21,ry:-.27,ty:-.39,tx:.22,heady:.35,a1x:-1.38,a1y:-.17,e1x:-.12,a0x:.05,e0x:-1.1,f0z:.25,f1z:-.13,f1y:.05,foot1:.26}],
 [.52,{...guard,hy:-.16,hz:.23,ry:-.32,ty:-.42,tx:.24,heady:.36,a1x:-1.45,e1x:-.1,a0x:.2,e0x:-.9,f0z:.28,f1y:.06,foot1:.3}],
 [.74,{...guard,hy:-.23,hz:.13,ry:-.15,ty:-.16,a1x:-.8,e1x:-.7,f0z:.21}], [1,guard]
],[ev(.23,'Compression'),ev(.36,'Drive'),impact(.45,1,1.7),ev(.74,'Recovery')]);
clip('hit','Hit reaction','Reactions',.62,[[0,{}],[.14,{...guard,hy:-.20,hz:-.11,rx:-.06,tx:-.22,tz:.06,headx:-.2,a0x:-.7,a1x:-.65,e0x:-.7,e1x:-.85}],[.35,{...guard,hy:-.23,hz:-.16,tx:-.14,ty:.10,headx:-.09,a0z:-.2,a1z:.25,f1z:-.20}],[.7,{...guard,hy:-.14,hz:-.06,tx:.08,f1z:-.16}],[1,{}]],[ev(.14,'Recoil'),ev(.35,'Absorb'),ev(.7,'Recovery')]);
clip('knockback','Knockback','Reactions',1.05,[[0,guard],[.12,{...guard,hy:-.20,tx:-.28,headx:-.23,a0x:-.7,a1x:-.65,e0x:-.55,e1x:-.65}],[.35,{...guard,hy:-.23,travel:-.46,tx:-.2,a0z:-.3,a1z:.3,f0z:.24,f0y:.12,f1z:-.26}],[.62,{...guard,hy:-.24,travel:-.78,tx:.13,a0x:-.1,a1x:-.2,e0x:-.6,e1x:-.5,f0z:.12,f1z:-.24,f1y:.06}],[.82,{...guard,hy:-.15,travel:-.84,tx:.08,f0z:.17}],[1,{...guard,travel:-.84}]],[ev(.12,'Impact recoil'),ev(.35,'Back step'),ev(.62,'Catch balance'),ev(.82,'Stabilize')]);
clip('recover','Recovery','Reactions',.45,[[0,guard],[.45,{...guard,hy:-.13,tx:.08}],[1,guard]],[ev(.5,'Settle')]);
clip('elimination','Elimination','Reactions',1.75,[[0,guard],[.12,{...guard,hy:-.22,tx:-.28,headx:-.22,a0x:-.7,a1x:-.6,e0x:-.7,e1x:-.7}],[.32,{...guard,hy:-.62,rx:-.25,tx:-.22,hz:-.24,a0z:-.4,a1z:.45,e0x:-.8,e1x:-.4,fall:.35,l0:-.4,l1:-.55,k0:1.1,k1:1.25}],[.6,{hy:-1.04,hz:-.57,rx:-1.1,tx:-.08,headx:.15,a0x:-.1,a0z:-.75,a1x:.15,a1z:.6,e0x:-.7,e1x:-.45,fall:1,l0:-.25,l1:-.12,k0:.55,k1:.3}],[.78,{hy:-1.23,hz:-.72,rx:-1.53,tx:.06,headx:.12,a0z:-.65,a1z:.48,e0x:-.45,e1x:-.24,fall:1,l0:-.1,l1:.03,k0:.18,k1:.1}],[1,{hy:-1.22,hz:-.72,rx:-1.52,tx:.04,headx:.10,a0z:-.62,a1z:.45,e0x:-.42,e1x:-.21,fall:1,l0:-.08,l1:.03,k0:.15,k1:.1}]],[ev(.12,'Impact'),ev(.32,'Collapse'),ev(.6,'Fall'),ev(.78,'Ground contact')]);
clip('dash','Dash','Movement',.78,[[0,{}],[.16,{hy:-.30,tx:.35,headx:-.19,a0x:-.8,e0x:-.7,a1x:.6,e1x:-.9,f0z:.25,f1z:-.3}],[.44,{hy:-.24,travel:.58,tx:.48,headx:-.28,a0x:.65,e0x:-.9,a1x:-.8,e1x:-.8,f0z:-.25,f1z:.32,f0y:.12}],[.72,{hy:-.17,travel:1.05,tx:.23,a0x:-.3,e0x:-.6,a1x:.3,e1x:-.7,f0z:.24,f1z:-.2,f1y:.08}],[1,{travel:1.18}]],[ev(.16,'Start'),ev(.44,'Travel'),ev(.72,'Recovery')]);
const takeoff:Pose={hy:-.12,tx:.13,a0x:-.45,a0z:-.16,e0x:-.85,a1x:.15,a1z:.17,e1x:-.8};
const apex:Pose={...air,lift:.85,tx:.08,a0x:-.25,a1x:-.3,f0y:.25,f1y:.33};
const touchdown:Pose={hy:-.08,tx:.08,a0z:-.15,a1z:.15,e0x:-.4,e1x:-.4};
clip('jump-start','Jump Start','Jump',.10,[[0,{}],[.38,{hy:-.32,tx:.2,a0x:.4,a1x:.4,e0x:-.5,e1x:-.5}],[1,takeoff]],[ev(1,'Takeoff')]);
clip('airborne','Airborne / rise','Jump',jumpRiseTime(),[[0,takeoff],[1,apex]],[ev(1,'Apex')]);
clip('falling','Falling','Jump',jumpFallTime(),[[0,apex],[1,touchdown]],[ev(.7,'Prepare landing')]);
clip('land','Landing','Jump',.46,[[0,{hy:-.08,tx:.08,a0z:-.15,a1z:.15,e0x:-.4,e1x:-.4}],[.25,{hy:-.42,tx:.3,headx:-.16,a0x:.3,a1x:.3,a0z:-.15,a1z:.15,e0x:-.6,e1x:-.6}],[.65,{hy:-.16,tx:.12,e0x:-.2,e1x:-.2}],[1,{}]],[ev(0,'Landing'),ev(.25,'Absorb'),ev(.65,'Recovery')]);
clip('slide-entry','Slide Entry','Slide',movementConfig.slide.entry,[[0,{tx:.2,e0x:-.9,e1x:-.9,a0x:-.5,a1x:.5}],[.45,{hy:-.45,travel:.15,tx:.14,a0z:-.3,a1z:.3,e0x:-.6,e1x:-.8,f0z:.38,f1z:-.26}],[1,{...slide,travel:.35}]],[ev(.45,'Lower'),ev(1,'Slide contact')]);
clip('slide-loop','Slide Loop / travel','Slide',movementConfig.slide.duration,[[0,{...slide,travel:.35}],[.5,{...slide,travel:.75,tx:-.13,headx:.08,a1z:.5}],[1,{...slide,travel:1.12}]],[ev(.5,'Travel')]);
clip('slide-exit','Slide Exit','Slide',movementConfig.slide.recovery,[[0,{...slide,travel:1.12}],[.45,{hy:-.45,travel:1.28,tx:.3,a0x:-.4,e0x:-.9,a1x:.3,e1x:-.8,f0z:.32,f1z:-.25}],[.75,{hy:-.17,travel:1.39,tx:.16,f0z:.15,f1z:-.1,e0x:-.4,e1x:-.5}],[1,{travel:1.42}]],[ev(.45,'Rise'),ev(.75,'Exit')]);
clip('crouch-enter','Crouch Enter','Crouch',.4,[[0,{}],[.45,{hy:-.24,tx:.12,e0x:-.4,e1x:-.4}],[1,low]],[ev(.45,'Lower')]);
clip('crouch-idle','Crouch Idle','Crouch',2,[[0,low],[.5,{...low,tx:.24,hy:-.55,heady:.025}],[1,low]]);
clip('crouch-walk','Crouch Walk','Crouch',1.35,[[0,{...low,f0z:-.18,f1z:.18}],[.25,{...low,hy:-.53,f0z:.02,f0y:.08,f1z:0,ty:.06,a0x:-.2,a1x:-.4}],[.5,{...low,f0z:.18,f1z:-.18}],[.75,{...low,hy:-.53,f0z:0,f1z:.02,f1y:.08,ty:-.06,a0x:-.4,a1x:-.2}],[1,{...low,f0z:-.18,f1z:.18}]]);
clip('crouch-exit','Crouch Exit','Crouch',.45,[[0,low],[.55,{hy:-.22,tx:.11,e0x:-.4,e1x:-.4}],[1,{}]],[ev(.55,'Rise')]);
// Shared forward momentum across jump stages; In-place preview removes it for idle jumps.
for(const [id,start,end] of [['jump-start',0,.18],['airborne',.18,.45],['falling',.45,.6],['land',.6,.68]] as const){for(const frame of definitions.find(m=>m.id===id)!.frames!)frame.values[channels.indexOf('travel')]=start+(end-start)*frame.at;}
function sequence(id:string,name:string,parts:{id:string;start:number;duration:number}[],duration:number){const events:MotionEvent[]=[];for(const part of parts){const source=definitions.find(m=>m.id===part.id)!;for(const e of source.events)events.push({...e,at:(part.start+e.at*part.duration)/duration,label:source.name.split(' · ')[0]+' · '+e.label});}definitions.push({id,name,category:'Full sequences',status:'implemented',duration,events,parts});}
sequence('combo','Full Combo — Attack 1 → 2 → 3',[{id:'attack',start:0,duration:.72},{id:'attack2',start:.57,duration:.84},{id:'attack3',start:1.24,duration:1.12}],2.36);
sequence('jump','Complete Jump',[{id:'jump-start',start:0,duration:.10},{id:'airborne',start:.10,duration:jumpRiseTime()},{id:'falling',start:.10+jumpRiseTime(),duration:jumpFallTime()},{id:'land',start:.10+jumpRiseTime()+jumpFallTime(),duration:.30}],jumpDuration());
sequence('slide','Complete Slide',[{id:'slide-entry',start:0,duration:movementConfig.slide.entry},{id:'slide-loop',start:movementConfig.slide.entry,duration:movementConfig.slide.duration},{id:'slide-exit',start:movementConfig.slide.entry+movementConfig.slide.duration,duration:movementConfig.slide.recovery}],slideDuration());
sequence('crouch','Crouch Enter → Idle → Exit',[{id:'crouch-enter',start:0,duration:.4},{id:'crouch-idle',start:.4,duration:1},{id:'crouch-exit',start:1.4,duration:.45}],1.85);
sequence('knockback-recovery','Knockback → Recovery',[{id:'knockback',start:0,duration:1.05},{id:'recover',start:1.05,duration:.45}],1.5);
export const motions=definitions;
export const motionById=new Map(motions.map(m=>[m.id,m]));
export const smooth=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
const scratch=new Float64Array(channels.length);
export function sampleMotion(id:string,phase:number,out:Float64Array){const m=motionById.get(id)!;const t=Math.max(0,Math.min(1,phase));
 if(m.parts){const seconds=t*m.duration;let selected=m.parts[0];for(const p of m.parts)if(seconds>=p.start)selected=p;sampleMotion(selected.id,(seconds-selected.start)/selected.duration,out);const i=m.parts.indexOf(selected),prev=m.parts[i-1];if(prev&&seconds<prev.start+prev.duration){sampleMotion(prev.id,(seconds-prev.start)/prev.duration,scratch);const w=smooth((seconds-selected.start)/(prev.start+prev.duration-selected.start));for(let j=0;j<out.length;j++)out[j]=scratch[j]+(out[j]-scratch[j])*w;}if(id==='knockback-recovery'&&i===1)out[channels.indexOf('travel')]=-.84;if(id==='slide')out[channels.indexOf('travel')]=2*slideTravel(seconds);return;}
 const frames=m.frames!;let left=frames[0],right=frames[frames.length-1];for(let i=1;i<frames.length;i++)if(t<=frames[i].at){left=frames[i-1];right=frames[i];break;}const f=(right.ease??smooth)(Math.max(0,Math.min(1,(t-left.at)/Math.max(.00001,right.at-left.at))));for(let i=0;i<out.length;i++)out[i]=left.values[i]+(right.values[i]-left.values[i])*f;
 if(id==='airborne')out[channels.indexOf('lift')]=jumpHeight(movementConfig.jump.anticipation+t*jumpRiseTime());if(id==='falling')out[channels.indexOf('lift')]=jumpHeight(movementConfig.jump.anticipation+jumpRiseTime()+t*jumpFallTime());
}
/** Weapon body clips register here: sampled like any motion, but kept out of the unarmed Animation/Combat lists. */
export function registerMotion(m:Motion){motionById.set(m.id,m);}
export function motionEvents(id:string){return motionById.get(id)?.events??[];}
