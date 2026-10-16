import {meleeGrip} from './swings';
import * as T from 'three';
import {channels,registerMotion,type Pose,type Motion,type MotionEvent} from '../animations/clips';
/**
 * Weapon move sets — Combat V3 polish pass.
 *
 * Every melee move is authored once as a list of keys. Each key carries:
 *  - the weapon trajectory in torso space (g = grip position, b = blade/tip direction, e = cutting-edge direction, s = support-hand weight),
 *  - the full-body pose for the same instant (existing Combat V2 channels),
 *  - the easing used to ARRIVE at that key.
 *
 * Timing language used across all moves:
 *  guard → anticipation/wind-up (ease 'out', slows into the loaded pose) → short hang →
 *  strike (ease 'in', accelerates INTO contact, only a few frames) → hitstop (near-still hold) →
 *  follow-through (ease 'out', body keeps rotating past the contact point) → loose recovery to guard.
 *
 * Torso space: +Z forward (toward the target), +Y up, +X is the weapon-hand side.
 * Right shoulder sits at roughly (+0.5, 0.46, 0); keep grips within ~0.95 of it.
 */
export type Ease='in'|'out'|'io'|'lin'|'snap';
export const eases:Record<Ease,(t:number)=>number>={
 in:t=>t*t*t,                       // accelerate into contact
 snap:t=>t*t,                       // fast but less violent acceleration
 out:t=>1-(1-t)**3,                 // decelerate into a held pose
 io:t=>t*t*(3-2*t),
 lin:t=>t,
};
type V=[number,number,number];
export type Grip={g:V;b:V;e:V};
export type WeaponKey={g:V;b:V;e:V;s?:number;l?:Grip};
export type MoveKey={t:number;ease:Ease;w:WeaponKey;body:Pose};
export type Move={id:string;name:string;duration:number;contact:number;hand:number;keys:MoveKey[];events:MotionEvent[]};
export type MoveSet={guard:WeaponKey;stance:Pose;support:number;moves:Record<string,Move>};

/* ---------- body stances ---------- */
const meleeStance:Pose={hy:-.13,tx:.07,ty:-.06,f0z:.2,f1z:-.2,f0x:-.03,f1x:.03,a0x:-.45,a0z:-.12,e0x:-1.2,a1x:-.35,e1x:-1.2,fist:1};
const heavyStance:Pose={...meleeStance,hy:-.2,tx:.05,f0z:.24,f1z:-.24,f0x:-.07,f1x:.07};
const daggerStance:Pose={...meleeStance,hy:-.22,tx:.16,ty:-.1,f0z:.24,f1z:-.2};
/** Body pose builder: keeps the eyes on the target by counter-rotating the head against hips + torso yaw. */
const B=(base:Pose,o:Pose):Pose=>({...base,...o,heady:o.heady??-((o.ty??base.ty??0)+(o.ry??0))*.62});

/* ---------- helpers ---------- */
const k=(t:number,ease:Ease,w:WeaponKey,body:Pose):MoveKey=>({t,ease,w,body});
/** Facing space → torso space. Contact keys are authored in the character's facing frame (root units, +Z toward the target),
 *  so the blade lands on the target no matter how far the hips and torso are twisted at that instant. */
function torsoFrame(b:Pose){const hips=new T.Quaternion().setFromEuler(new T.Euler(b.rx??0,b.ry??0,b.rz??0)),q=hips.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(b.tx??0,b.ty??0,b.tz??0)));
 const pos=new T.Vector3(b.hx??0,1.55+(b.hy??0)+(b.lift??0),(b.hz??0)+(b.travel??0)*.5).add(new T.Vector3(0,.55,0).applyQuaternion(hips));return {q,pos};}
function aimed(body:Pose,w:WeaponKey):WeaponKey{const {q,pos}=torsoFrame(body),inv=q.invert();const P=(g:V)=>new T.Vector3(...g).sub(pos).applyQuaternion(inv).toArray() as V,D=(d:V)=>new T.Vector3(...d).applyQuaternion(inv).toArray() as V;
 const r:WeaponKey={...w,g:P(w.g),b:D(w.b),e:D(w.e)};if(w.l)r.l={g:P(w.l.g),b:D(w.l.b),e:D(w.l.e)};return r;}
/** Key whose weapon pose is given in facing space (used for contact + hitstop). */
const kA=(t:number,ease:Ease,w:WeaponKey,body:Pose):MoveKey=>({t,ease,w:aimed(body,w),body});
const move=(id:string,name:string,duration:number,contact:number,keys:MoveKey[],hand=1):Move=>({id,name,duration,contact,hand,keys,events:[{at:contact,label:'Impact',kind:'impact',hand}]});

/* =================================================================== */
/* PULSE KATANA — balanced, fast, clean lines. Two-handed, iaido feel.  */
/* =================================================================== */
const katanaGuard:WeaponKey={g:[.1,-.05,.42],b:[-.1,.55,.83],e:[0,-.83,.55],s:1};
const katana:MoveSet={guard:katanaGuard,stance:meleeStance,support:.13,moves:{
 attack1:move('attack1','Opening cut · diagonal kesa',.8,.5,[
  k(0,'io',katanaGuard,meleeStance),
  k(.3,'out',{g:[.34,.74,-.04],b:[.38,.52,-.76],e:[-.35,.75,.4],s:1},B(meleeStance,{ty:.48,ry:.18,hy:-.17,hz:-.05,tx:-.04,f0y:.04})),
  k(.42,'io',{g:[.37,.8,-.1],b:[.42,.46,-.78],e:[-.35,.78,.35],s:1},B(meleeStance,{ty:.54,ry:.2,hy:-.18,hz:-.06,tx:-.06,f0z:.26})),
  kA(.5,'in',{g:[.15,2.36,.95],b:[-.35,-.28,.89],e:[-.6,-.8,0],s:1},B(meleeStance,{ty:-.3,ry:-.22,tx:.24,hy:-.25,hz:.15,f0z:.36})),
  kA(.56,'lin',{g:[.06,2.24,.95],b:[-.45,-.36,.82],e:[-.6,-.8,0],s:1},B(meleeStance,{ty:-.34,ry:-.24,tx:.26,hy:-.26,hz:.16,f0z:.36})),
  k(.72,'out',{g:[.04,-.16,.42],b:[-.7,-.58,-.18],e:[.1,-.45,-.9],s:1},B(meleeStance,{ty:-.58,ry:-.34,tx:.3,hy:-.27,hz:.12,f0z:.34})),
  k(1,'io',katanaGuard,meleeStance)]),
 attack2:move('attack2','Return strike · horizontal backhand',.72,.47,[
  k(0,'io',katanaGuard,meleeStance),
  k(.28,'out',{g:[-.15,.3,.25],b:[-.75,.15,-.6],e:[.4,0,1],s:1},B(meleeStance,{ty:-.46,ry:-.2,hy:-.16,tx:.06,f1z:-.26})),
  k(.38,'io',{g:[-.18,.32,.2],b:[-.8,.16,-.55],e:[.4,0,1],s:.6},B(meleeStance,{ty:-.52,ry:-.22,hy:-.17,f1z:-.26,a0x:-.5,a0z:-.5,e0x:-.9})),
  kA(.47,'in',{g:[-.1,2.26,.95],b:[.15,0,.99],e:[1,0,-.15],s:0},B(meleeStance,{ty:.06,ry:.1,tx:.15,hy:-.22,hz:.1,a0x:-.3,a0z:-.75,e0x:-.6})),
  kA(.53,'lin',{g:[-.02,2.26,.96],b:[.26,0,.97],e:[1,0,-.26],s:0},B(meleeStance,{ty:.1,ry:.12,tx:.15,hy:-.22,hz:.1,a0x:-.3,a0z:-.75,e0x:-.6})),
  k(.7,'out',{g:[.45,.3,.3],b:[.9,.06,-.35],e:[.3,0,-1],s:0},B(meleeStance,{ty:.46,ry:.3,tx:.12,hy:-.2,hz:.06,a0x:-.2,a0z:-.8,e0x:-.5})),
  k(1,'io',katanaGuard,meleeStance)]),
 attack3:move('attack3','Finisher · leaping overhead cleave',1.05,.53,[
  k(0,'io',katanaGuard,meleeStance),
  k(.3,'out',{g:[.12,.92,-.04],b:[0,.38,-.93],e:[0,.93,.38],s:1},B(meleeStance,{hy:-.34,tx:-.12,ty:.12,f0z:.26,f1z:-.26})),
  k(.43,'io',{g:[.12,1,-.1],b:[0,.12,-1],e:[0,1,.12],s:1},B(meleeStance,{hy:-.04,lift:.24,tx:-.16,ty:.08,travel:.12,f0y:.12,f1y:.06,foot0:.15,foot1:.15})),
  kA(.53,'in',{g:[.1,2.46,1],b:[0,-.04,1],e:[0,-1,0],s:1},B(meleeStance,{hy:-.44,tx:.36,hz:.18,travel:.22,f0z:.46,f1z:-.32,headx:.15})),
  kA(.61,'lin',{g:[.1,2.38,1],b:[0,-.14,.99],e:[0,-1,0],s:1},B(meleeStance,{hy:-.46,tx:.38,hz:.19,travel:.22,f0z:.46,f1z:-.32,headx:.15})),
  k(.76,'out',{g:[.08,-.14,.5],b:[0,-.86,.5],e:[0,-.5,-.86],s:1},B(meleeStance,{hy:-.48,tx:.45,hz:.2,travel:.22,f0z:.46,f1z:-.32,headx:.1})),
  k(1,'io',katanaGuard,meleeStance)]),
 recovery:move('recovery','Recovery · blade flick',.7,.35,[
  k(0,'io',katanaGuard,meleeStance),
  k(.22,'out',{g:[.2,.35,.35],b:[.2,.8,.56],e:[.6,-.3,.3],s:0},B(meleeStance,{ty:-.05,a0x:-.35,a0z:-.15,e0x:-.8})),
  k(.35,'in',{g:[.45,-.05,.38],b:[.62,-.55,.56],e:[.55,-.8,0],s:0},B(meleeStance,{ty:.2,hy:-.16,a0x:-.35,a0z:-.15,e0x:-.8})),
  k(.55,'out',{g:[.45,-.08,.36],b:[.6,-.58,.55],e:[.55,-.8,0],s:0},B(meleeStance,{ty:.18,hy:-.14,a0x:-.35,a0z:-.15,e0x:-.8})),
  k(1,'io',katanaGuard,meleeStance)]),
}};

/* =================================================================== */
/* HEAVY FUTURISTIC BLADE — slow, huge wind-ups, the body carries it.   */
/* =================================================================== */
const heavyGuard:WeaponKey={g:[.3,.12,.3],b:[.15,.76,-.63],e:[0,.63,.76],s:1};
const heavy:MoveSet={guard:heavyGuard,stance:heavyStance,support:.14,moves:{
 attack1:move('attack1','Opening cut · wide horizontal sweep',1.15,.55,[
  k(0,'io',heavyGuard,heavyStance),
  k(.36,'out',{g:[.44,.24,-.12],b:[.55,.22,-.8],e:[.2,0,1],s:1},B(heavyStance,{ty:.6,ry:.3,hy:-.24,tx:0,hz:-.06})),
  k(.46,'io',{g:[.46,.22,-.16],b:[.58,.2,-.79],e:[.2,0,1],s:1},B(heavyStance,{ty:.66,ry:.33,hy:-.26,tx:-.02,hz:-.07})),
  kA(.55,'in',{g:[-.04,2.16,.95],b:[-.15,0,.99],e:[-1,0,-.15],s:1},B(heavyStance,{ty:-.16,ry:-.2,tx:.2,hy:-.3,hz:.15,f0z:.36})),
  kA(.62,'lin',{g:[-.12,2.16,.94],b:[-.26,0,.97],e:[-1,0,-.26],s:1},B(heavyStance,{ty:-.2,ry:-.22,tx:.21,hy:-.31,hz:.15,f0z:.36})),
  k(.8,'out',{g:[-.15,.1,.36],b:[-.95,-.06,-.12],e:[-.15,0,-1],s:1},B(heavyStance,{ty:-.62,ry:-.36,tx:.2,hy:-.3,hz:.12,f0z:.36})),
  k(1,'io',heavyGuard,heavyStance)]),
 attack2:move('attack2','Return strike · rising uppercut',1.05,.52,[
  k(0,'io',heavyGuard,heavyStance),
  k(.34,'out',{g:[.3,-.32,.02],b:[.3,-.5,-.81],e:[0,.6,-.4],s:1},B(heavyStance,{hy:-.42,tx:.3,ty:.36,ry:.15})),
  k(.43,'io',{g:[.31,-.36,0],b:[.28,-.55,-.79],e:[0,.6,-.4],s:1},B(heavyStance,{hy:-.45,tx:.32,ty:.4,ry:.17})),
  kA(.52,'in',{g:[.1,2.1,.95],b:[0,.34,.94],e:[0,1,-.34],s:1},B(heavyStance,{hy:-.12,tx:-.04,ty:-.1,ry:-.05,lift:.05,f0z:.32})),
  kA(.59,'lin',{g:[.1,2.2,.92],b:[0,.45,.89],e:[0,1,-.45],s:1},B(heavyStance,{hy:-.11,tx:-.06,ty:-.12,ry:-.06,lift:.05,f0z:.32})),
  k(.76,'out',{g:[.06,.84,.18],b:[-.1,.62,-.78],e:[0,.3,-1],s:1},B(heavyStance,{hy:-.12,tx:-.16,ty:-.15,headx:-.1,f0z:.32})),
  k(1,'io',heavyGuard,heavyStance)]),
 attack3:move('attack3','Finisher · overhead power cleave',1.5,.55,[
  k(0,'io',heavyGuard,heavyStance),
  k(.36,'out',{g:[.14,.94,-.1],b:[.05,.25,-.97],e:[0,.97,.25],s:1},B(heavyStance,{hy:-.26,tx:-.16,ty:.18,f0z:.3,f1z:-.3,f0y:.05})),
  k(.47,'io',{g:[.14,.98,-.14],b:[.05,.12,-.99],e:[0,1,.12],s:1},B(heavyStance,{hy:-.24,tx:-.2,ty:.2,f0z:.36,f1z:-.3})),
  kA(.55,'in',{g:[.08,2.42,.95],b:[0,-.08,1],e:[0,-1,0],s:1},B(heavyStance,{hy:-.55,tx:.42,hz:.22,f0z:.5,f1z:-.36,headx:.18})),
  kA(.65,'lin',{g:[.08,2.32,.95],b:[0,-.2,.98],e:[0,-1,0],s:1},B(heavyStance,{hy:-.57,tx:.44,hz:.22,f0z:.5,f1z:-.36,headx:.18})),
  k(.8,'out',{g:[.06,-.22,.52],b:[0,-.92,.38],e:[0,-.38,-.92],s:1},B(heavyStance,{hy:-.6,tx:.5,hz:.22,f0z:.5,f1z:-.36,headx:.12})),
  k(1,'io',heavyGuard,heavyStance)]),
 recovery:move('recovery','Recovery · shoulder the blade',.8,.4,[
  k(0,'io',heavyGuard,heavyStance),
  k(.3,'out',{g:[.2,-.1,.45],b:[.1,-.35,.93],e:[0,-.93,-.35],s:1},B(heavyStance,{hy:-.24,tx:.15})),
  k(.55,'in',{g:[.3,.16,.28],b:[.15,.8,-.58],e:[0,.58,.8],s:1},B(heavyStance,{hy:-.1,tx:0})),
  k(.66,'out',{g:[.3,.1,.31],b:[.15,.74,-.65],e:[0,.65,.74],s:1},B(heavyStance,{hy:-.22,tx:.06})),
  k(1,'io',heavyGuard,heavyStance)]),
}};

/* =================================================================== */
/* HEAVY IMPACT HAMMER — heaviest; long loads, big drops, long hitstop. */
/* =================================================================== */
const hammerGuard:WeaponKey={g:[.24,-.24,.36],b:[-.35,.6,.72],e:[0,-.77,.64],s:1};
const hammer:MoveSet={guard:hammerGuard,stance:heavyStance,support:.15,moves:{
 attack1:move('attack1','Opening cut · overhead diagonal smash',1.25,.56,[
  k(0,'io',hammerGuard,heavyStance),
  k(.38,'out',{g:[.4,.84,-.08],b:[.22,.3,-.93],e:[0,.95,.3],s:1},B(heavyStance,{ty:.55,ry:.22,hy:-.22,tx:-.08,hz:-.05})),
  k(.48,'io',{g:[.42,.88,-.12],b:[.24,.2,-.95],e:[0,.98,.2],s:1},B(heavyStance,{ty:.6,ry:.24,hy:-.2,tx:-.1,hz:-.06})),
  kA(.56,'in',{g:[.1,2.32,.95],b:[-.25,-.22,.94],e:[-.3,-.95,0],s:1},B(heavyStance,{ty:-.32,ry:-.2,tx:.32,hy:-.4,hz:.16,f0z:.38})),
  kA(.66,'lin',{g:[.05,2.22,.94],b:[-.28,-.3,.91],e:[-.3,-.95,0],s:1},B(heavyStance,{ty:-.34,ry:-.22,tx:.33,hy:-.41,hz:.16,f0z:.38})),
  k(.8,'out',{g:[-.04,-.32,.42],b:[-.3,-.9,.3],e:[0,-.3,-.95],s:1},B(heavyStance,{ty:-.42,ry:-.26,tx:.42,hy:-.46,hz:.16,f0z:.38})),
  k(1,'io',hammerGuard,heavyStance)]),
 attack2:move('attack2','Return strike · rising side swat',1.15,.5,[
  k(0,'io',hammerGuard,heavyStance),
  k(.34,'out',{g:[-.16,-.2,.2],b:[-.8,-.2,-.56],e:[.4,0,1],s:1},B(heavyStance,{ty:-.55,ry:-.25,hy:-.3,tx:.12})),
  k(.42,'io',{g:[-.18,-.22,.16],b:[-.82,-.22,-.52],e:[.4,0,1],s:1},B(heavyStance,{ty:-.6,ry:-.28,hy:-.32,tx:.13})),
  kA(.5,'in',{g:[0,2.15,.95],b:[.15,.05,.99],e:[1,0,-.15],s:1},B(heavyStance,{ty:.1,ry:.12,hy:-.22,tx:.14,hz:.12,f0z:.34})),
  kA(.6,'lin',{g:[.05,2.16,.95],b:[.24,.05,.97],e:[1,0,-.24],s:1},B(heavyStance,{ty:.13,ry:.14,hy:-.22,tx:.14,hz:.12,f0z:.34})),
  k(.78,'out',{g:[.38,.44,.25],b:[.85,.4,-.35],e:[.3,.1,-1],s:1},B(heavyStance,{ty:.5,ry:.3,hy:-.18,tx:.05,hz:.08,f0z:.34})),
  k(1,'io',hammerGuard,heavyStance)]),
 attack3:move('attack3','Finisher · jumping ground slam',1.6,.57,[
  k(0,'io',hammerGuard,heavyStance),
  k(.28,'out',{g:[.1,.55,.12],b:[0,.62,-.78],e:[0,.78,.62],s:1},B(heavyStance,{hy:-.45,tx:.2,f0z:.26,f1z:-.26})),
  k(.46,'io',{g:[.1,1,-.1],b:[0,.14,-.99],e:[0,1,.14],s:1},B(heavyStance,{hy:-.02,lift:.45,tx:-.2,travel:.14,f0y:.15,f1y:.08,foot0:.2,foot1:.2,headx:-.08})),
  kA(.57,'in',{g:[.05,2.0,1],b:[0,-.32,.95],e:[0,-1,-.3],s:1},B(heavyStance,{hy:-.62,lift:0,tx:.48,hz:.2,travel:.26,f0z:.46,f1z:-.36,headx:.22})),
  kA(.7,'lin',{g:[.05,1.94,1],b:[0,-.38,.93],e:[0,-1,-.38],s:1},B(heavyStance,{hy:-.64,tx:.5,hz:.2,travel:.26,f0z:.46,f1z:-.36,headx:.22})),
  k(.78,'out',{g:[.05,-.08,.6],b:[0,-.58,.82],e:[0,-.82,-.58],s:1},B(heavyStance,{hy:-.56,tx:.46,hz:.2,travel:.26,f0z:.46,f1z:-.36,headx:.18})),
  k(1,'io',hammerGuard,heavyStance)]),
 recovery:move('recovery','Recovery · heft and reset',.85,.45,[
  k(0,'io',hammerGuard,heavyStance),
  k(.35,'out',{g:[.22,-.4,.42],b:[-.2,-.3,.93],e:[0,-.95,-.3],s:1},B(heavyStance,{hy:-.3,tx:.22})),
  k(.62,'in',{g:[.28,.2,.3],b:[-.3,.8,.5],e:[0,-.5,.85],s:1},B(heavyStance,{hy:-.1,tx:0})),
  k(1,'io',hammerGuard,heavyStance)]),
}};

/* =================================================================== */
/* RIOT BAT — rotational power, hips lead the hands.                   */
/* =================================================================== */
const batGuard:WeaponKey={g:[.34,.34,.14],b:[.25,.62,-.74],e:[0,.3,1],s:1};
const bat:MoveSet={guard:batGuard,stance:meleeStance,support:.15,moves:{
 attack1:move('attack1','Opening cut · full baseball swing',.9,.52,[
  k(0,'io',batGuard,meleeStance),
  k(.32,'out',{g:[.44,.42,-.12],b:[.35,.66,-.66],e:[0,.4,1],s:1},B(meleeStance,{ty:.55,ry:.35,hy:-.2,hz:-.06,f0y:.07,f0z:.15})),
  k(.42,'io',{g:[.44,.38,-.12],b:[.4,.6,-.69],e:[0,.4,1],s:1},B(meleeStance,{ty:.55,ry:.2,hy:-.22,hz:-.03,f0z:.34})),
  kA(.52,'in',{g:[-.05,2.16,.95],b:[-.1,0,1],e:[-1,0,-.1],s:1},B(meleeStance,{ty:.08,ry:-.32,tx:.12,hy:-.24,hz:.12,f0z:.36})),
  kA(.58,'lin',{g:[-.13,2.16,.94],b:[-.22,0,.98],e:[-1,0,-.22],s:1},B(meleeStance,{ty:.04,ry:-.36,tx:.12,hy:-.24,hz:.12,f0z:.36})),
  k(.76,'out',{g:[-.08,.38,.24],b:[-.75,.42,-.5],e:[-.4,0,-1],s:1},B(meleeStance,{ty:-.55,ry:-.5,tx:.08,hy:-.2,hz:.1,f0z:.36,foot1:.35})),
  k(1,'io',batGuard,meleeStance)]),
 attack2:move('attack2','Return strike · one-hand backhand',.8,.48,[
  k(0,'io',batGuard,meleeStance),
  k(.3,'out',{g:[-.1,.3,.22],b:[-.7,.4,-.6],e:[.5,0,1],s:.2},B(meleeStance,{ty:-.45,ry:-.2,hy:-.16,a0x:-.6,a0z:-.4,e0x:-1})),
  k(.4,'io',{g:[-.12,.32,.18],b:[-.74,.42,-.53],e:[.5,0,1],s:0},B(meleeStance,{ty:-.5,ry:-.22,hy:-.17,a0x:-.4,a0z:-.6,e0x:-.8})),
  kA(.48,'in',{g:[.18,2.26,.92],b:[.2,0,.98],e:[1,0,-.2],s:0},B(meleeStance,{ty:.18,ry:.12,hy:-.2,tx:.12,hz:.1,a0x:-.2,a0z:-.85,e0x:-.4})),
  kA(.55,'lin',{g:[.24,2.26,.9],b:[.3,0,.95],e:[1,0,-.3],s:0},B(meleeStance,{ty:.2,ry:.14,hy:-.2,tx:.12,hz:.1,a0x:-.2,a0z:-.85,e0x:-.4})),
  k(.72,'out',{g:[.5,.26,.28],b:[.9,.12,-.42],e:[.3,0,-1],s:0},B(meleeStance,{ty:.45,ry:.28,hy:-.18,tx:.08,a0x:-.2,a0z:-.85,e0x:-.4})),
  k(1,'io',batGuard,meleeStance)]),
 attack3:move('attack3','Finisher · overhead slam',1.1,.53,[
  k(0,'io',batGuard,meleeStance),
  k(.32,'out',{g:[.15,.95,-.05],b:[0,.4,-.92],e:[0,.92,.4],s:1},B(meleeStance,{hy:-.2,tx:-.14,ty:.2,f0y:.05})),
  k(.44,'io',{g:[.15,.98,-.1],b:[0,.25,-.97],e:[0,.97,.25],s:1},B(meleeStance,{hy:-.18,tx:-.18,ty:.2,f0z:.32})),
  kA(.53,'in',{g:[.08,2.46,.95],b:[0,-.04,1],e:[0,-1,0],s:1},B(meleeStance,{hy:-.38,tx:.38,hz:.16,f0z:.4,f1z:-.28,headx:.15})),
  kA(.61,'lin',{g:[.08,2.38,.95],b:[0,-.13,.99],e:[0,-1,0],s:1},B(meleeStance,{hy:-.4,tx:.4,hz:.16,f0z:.4,f1z:-.28,headx:.15})),
  k(.76,'out',{g:[.05,-.2,.5],b:[0,-.85,.52],e:[0,-.52,-.85],s:1},B(meleeStance,{hy:-.42,tx:.46,hz:.16,f0z:.4,f1z:-.28,headx:.1})),
  k(1,'io',batGuard,meleeStance)]),
 recovery:move('recovery','Recovery · ground tap',.7,.4,[
  k(0,'io',batGuard,meleeStance),
  k(.32,'out',{g:[.25,-.15,.4],b:[.1,-.85,.5],e:[0,-.5,-.85],s:0},B(meleeStance,{hy:-.18,tx:.15,a0x:-.3,e0x:-.9})),
  k(.42,'in',{g:[.25,-.2,.42],b:[.1,-.9,.42],e:[0,-.42,-.9],s:0},B(meleeStance,{hy:-.2,tx:.17,a0x:-.3,e0x:-.9})),
  k(1,'io',batGuard,meleeStance)]),
}};

/* =================================================================== */
/* TWIN DAGGERS — quick, low, alternating hands; tiny wind-ups.        */
/* =================================================================== */
const dR:Grip={g:[.3,-.02,.42],b:[0,.3,.95],e:[0,-.95,.3]},dL:Grip={g:[-.3,0,.36],b:[0,.3,.95],e:[0,-.95,.3]};
const daggerGuard:WeaponKey={...dR,l:dL};
const daggers:MoveSet={guard:daggerGuard,stance:daggerStance,support:0,moves:{
 attack1:move('attack1','Opening cut · right lunge stab',.42,.42,[
  k(0,'io',daggerGuard,daggerStance),
  k(.3,'out',{g:[.36,-.06,.12],b:[.05,.15,.99],e:[0,-1,.15],l:{g:[-.28,.12,.4],b:[.1,.3,.95],e:[0,-.95,.3]}},B(daggerStance,{ty:.32,ry:.12,hy:-.25,hz:-.04})),
  kA(.42,'in',{g:[.22,2.32,1.3],b:[-.08,0,1],e:[0,-1,0],l:{g:[-.4,2.15,.6],b:[0,.4,.92],e:[0,-.92,.4]}},B(daggerStance,{ty:-.3,ry:-.15,tx:.24,hy:-.28,hz:.14,f0z:.38})),
  kA(.5,'lin',{g:[.22,2.3,1.3],b:[-.08,-.03,1],e:[0,-1,0],l:{g:[-.4,2.15,.6],b:[0,.4,.92],e:[0,-.92,.4]}},B(daggerStance,{ty:-.3,ry:-.15,tx:.24,hy:-.28,hz:.14,f0z:.38})),
  k(.66,'out',{g:[.24,.16,.62],b:[0,.12,.99],e:[0,-1,.12],l:{g:[-.3,.02,.28],b:[0,.35,.94],e:[0,-.94,.35]}},B(daggerStance,{ty:-.22,ry:-.1,tx:.2,hy:-.26,hz:.1,f0z:.34})),
  k(1,'io',daggerGuard,daggerStance)]),
 attack2:move('attack2','Return strike · left cross slash',.42,.43,[
  k(0,'io',daggerGuard,daggerStance),
  k(.3,'out',{g:[.36,0,.2],b:[0,.4,.92],e:[0,-.92,.4],l:{g:[.02,.28,.28],b:[.72,.2,.66],e:[-1,0,.3]}},B(daggerStance,{ty:-.38,ry:-.15,hy:-.24})),
  kA(.43,'in',{g:[.45,2.0,.55],b:[0,.4,.92],e:[0,-.92,.4],l:{g:[-.12,2.3,1.2],b:[-.15,0,.99],e:[-1,0,-.15]}},B(daggerStance,{ty:.2,ry:.1,tx:.22,hy:-.27,hz:.12,f0z:.34})),
  kA(.52,'lin',{g:[.45,2.0,.55],b:[0,.4,.92],e:[0,-.92,.4],l:{g:[-.2,2.3,1.18],b:[-.26,0,.97],e:[-1,0,-.26]}},B(daggerStance,{ty:.22,ry:.11,tx:.22,hy:-.27,hz:.12,f0z:.34})),
  k(.68,'out',{g:[.36,0,.24],b:[0,.4,.92],e:[0,-.92,.4],l:{g:[-.48,.2,.3],b:[-.92,0,-.25],e:[-.25,0,-1]}},B(daggerStance,{ty:.42,ry:.2,tx:.18,hy:-.26,hz:.08,f0z:.32})),
  k(1,'io',daggerGuard,daggerStance)],0),
 attack3:move('attack3','Finisher · twin X-cross',.72,.5,[
  k(0,'io',daggerGuard,daggerStance),
  k(.32,'out',{g:[-.04,.56,.22],b:[-.45,.62,.64],e:[-.3,.6,-.3],l:{g:[.04,.6,.18],b:[.45,.62,.64],e:[.3,.6,-.3]}},B(daggerStance,{hy:-.32,tx:-.04,f0y:.04})),
  k(.42,'io',{g:[-.06,.6,.18],b:[-.48,.66,.58],e:[-.3,.6,-.3],l:{g:[.06,.64,.14],b:[.48,.66,.58],e:[.3,.6,-.3]}},B(daggerStance,{hy:-.3,tx:-.08,lift:.06})),
  kA(.5,'in',{g:[.35,2.12,1.15],b:[.3,-.22,.93],e:[.6,-.8,0],l:{g:[-.35,2.12,1.15],b:[-.3,-.22,.93],e:[-.6,-.8,0]}},B(daggerStance,{hy:-.36,tx:.32,hz:.2,travel:.16,f0z:.42})),
  kA(.58,'lin',{g:[.4,2.06,1.12],b:[.38,-.28,.88],e:[.6,-.8,0],l:{g:[-.4,2.06,1.12],b:[-.38,-.28,.88],e:[-.6,-.8,0]}},B(daggerStance,{hy:-.37,tx:.33,hz:.2,travel:.16,f0z:.42})),
  k(.74,'out',{g:[.45,-.2,.38],b:[.8,-.5,.2],e:[.3,-.3,-.9],l:{g:[-.45,-.2,.38],b:[-.8,-.5,.2],e:[-.3,-.3,-.9]}},B(daggerStance,{hy:-.4,tx:.36,hz:.2,travel:.16,f0z:.42})),
  k(1,'io',daggerGuard,daggerStance)]),
 recovery:move('recovery','Recovery · reverse-grip twirl',.55,.5,[
  k(0,'io',daggerGuard,daggerStance),
  k(.3,'out',{g:[.34,.02,.4],b:[.8,-.3,.5],e:[.3,-.6,-.6],l:{g:[-.34,.02,.36],b:[-.8,-.3,.5],e:[-.3,-.6,-.6]}},B(daggerStance,{hy:-.2})),
  k(.55,'io',{g:[.32,.04,.36],b:[0,-.92,.38],e:[0,-.38,-.92],l:{g:[-.32,.04,.34],b:[0,-.92,.38],e:[0,-.38,-.92]}},B(daggerStance,{hy:-.24})),
  k(1,'io',daggerGuard,daggerStance)]),
}};

export const moveSets:Record<string,MoveSet>={'pulse-katana':katana,'heavy-blade':heavy,'impact-hammer':hammer,'riot-bat':bat,'twin-daggers':daggers};

/* V4 integration: V3 timing, easing, body choreography and recoveries; corrected
 * V2 rotational facing-space strike paths. No lunge, leap or accumulated translation.
 * Convert the corrected grips AFTER balancing the body, so foot IK and hands agree. */
for(const [weapon,set] of Object.entries(moveSets)){
 const balance=(b:Pose):Pose=>({...b,hx:0,hz:0,travel:0,lift:0,hy:Math.max(-.32,b.hy??0),tx:(b.tx??0)*.55,ry:(b.ry??0)*.65,ty:(b.ty??0)*.8,f0y:0,f1y:0,foot0:0,foot1:0,f0z:.16,f1z:-.16});
 set.stance=balance(set.stance);
 const toKey=(action:string,phase:number,b:Pose,s=1):WeaponKey=>{const g=meleeGrip(weapon,action,phase),D=(q:T.Quaternion,v:V)=>new T.Vector3(...v).applyQuaternion(q).toArray() as V;return aimed(b,{g:g.pos.toArray() as V,b:D(g.rot,[0,0,1]),e:D(g.rot,[0,-1,0]),s,l:{g:g.left.toArray() as V,b:D(g.leftRot,[0,0,1]),e:D(g.leftRot,[0,-1,0])}});};
 set.guard=toKey('idle',0,set.stance);
 for(const move of Object.values(set.moves)){
  const ci=move.keys.findIndex(k=>k.t===move.contact),wind=move.keys[Math.max(0,ci-1)].t,follow=move.keys[Math.min(move.keys.length-2,ci+2)].t;
  for(const key of move.keys){key.body=balance(key.body);
   if(move.id==='recovery')continue;
   const t=key.t,phase=t<=wind?t/wind*.28:t<=move.contact?.28+(t-wind)/(move.contact-wind)*.22:t<=follow?.5+(t-move.contact)/(follow-move.contact)*.22:.72+(t-follow)/(1-follow)*.28;
   key.w=toKey(move.id,phase,key.body,key.w.s??1);
  }
  // Recovery retains the V3 flourish with the corrected shared start/end guard.
  move.keys[0].w=set.guard;move.keys.at(-1)!.w=set.guard;
 }
}
moveSets['impact-hammer'].moves.attack1.name='Sideways hammer swing';
moveSets['impact-hammer'].moves.attack2.name='Diagonal hammer strike';
moveSets['impact-hammer'].moves.attack3.name='Overhead hammer slam';
moveSets['twin-daggers'].moves.attack1.name='Right-hand slash';
moveSets['twin-daggers'].moves.attack2.name='Left-hand counter slash';
moveSets['twin-daggers'].moves.attack3.name='Alternating dagger finisher';
moveSets['pulse-katana'].moves.attack3.name='Wide finishing slash';
moveSets['heavy-blade'].moves.attack2.name='Wide diagonal strike';

/* ---------- sampling ---------- */
const m4=new T.Matrix4(),X=new T.Vector3(),Y=new T.Vector3(),Z=new T.Vector3();
/** Build a holder orientation from blade direction (+Z of the holder) and edge direction (−Y of the holder). */
export function gripQuat(b:V,e:V,out=new T.Quaternion()){Z.set(...b).normalize();Y.set(...e).multiplyScalar(-1);Y.addScaledVector(Z,-Y.dot(Z));if(Y.lengthSq()<1e-6)Y.set(0,1,0).addScaledVector(Z,-Z.y);Y.normalize();X.crossVectors(Y,Z).normalize();m4.makeBasis(X,Y,Z);return out.setFromRotationMatrix(m4);}
type Cached={q:T.Quaternion[];lq:T.Quaternion[]};const cache=new WeakMap<Move,Cached>();
function cached(m:Move){let c=cache.get(m);if(!c){const q:T.Quaternion[]=[],lq:T.Quaternion[]=[];for(const key of m.keys){const a=gripQuat(key.w.b,key.w.e);if(q.length&&a.dot(q[q.length-1])<0)a.set(-a.x,-a.y,-a.z,-a.w);q.push(a);const l=key.w.l??dL;const b=gripQuat(l.b,l.e);if(lq.length&&b.dot(lq[lq.length-1])<0)b.set(-b.x,-b.y,-b.z,-b.w);lq.push(b);}c={q,lq};cache.set(m,c);}return c;}
const cr=(p0:number,p1:number,p2:number,p3:number,t:number)=>.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
const spline=(pts:V[],i:number,u:number,out:T.Vector3)=>{const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(pts.length-1,i+2)];return out.set(cr(a[0],b[0],c[0],d[0],u),cr(a[1],b[1],c[1],d[1],u),cr(a[2],b[2],c[2],d[2],u));};
export type WeaponSample={pos:T.Vector3;rot:T.Quaternion;left:T.Vector3;leftRot:T.Quaternion;support:number};
export function sampleGuard(set:MoveSet):WeaponSample{const l=set.guard.l??dL;return {pos:new T.Vector3(...set.guard.g),rot:gripQuat(set.guard.b,set.guard.e),left:new T.Vector3(...l.g),leftRot:gripQuat(l.b,l.e),support:set.support?set.guard.s??1:0};}
export function sampleMove(set:MoveSet,m:Move,phase:number):WeaponSample{const t=Math.max(0,Math.min(1,phase)),keys=m.keys,c=cached(m);let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=eases[b.ease]((t-a.t)/Math.max(1e-6,b.t-a.t));
 const pos=spline(keys.map(k=>k.w.g),i,u,new T.Vector3()),left=spline(keys.map(k=>(k.w.l??dL).g),i,u,new T.Vector3());
 return {pos,rot:c.q[i].clone().slerp(c.q[i+1],u),left,leftRot:c.lq[i].clone().slerp(c.lq[i+1],u),support:set.support?(a.w.s??1)+((b.w.s??1)-(a.w.s??1))*u:0};}
export function meleeMove(id:string,action:string){return moveSets[id]?.moves[action];}
export const bodyClipId=(weapon:string,action:string)=>`${weapon}:${action}`;

/* ---------- body clip registration (sampled by the existing Combat V2 motion system) ---------- */
function body(id:string,name:string,duration:number,keys:{t:number;ease:Ease;body:Pose}[],events:MotionEvent[]=[]):Motion{return {id,name,category:'Weapon motion',status:'implemented',duration,events,frames:keys.map(k=>({at:k.t,ease:eases[k.ease],values:new Float64Array(channels.map(c=>k.body[c]??0))}))};}
for(const [weapon,set] of Object.entries(moveSets)){
 const breathe=set.stance;registerMotion(body(bodyClipId(weapon,'idle'),'Weapon guard idle',2,[{t:0,ease:'io',body:breathe},{t:.5,ease:'io',body:{...breathe,hy:(breathe.hy??0)-.025,tx:(breathe.tx??0)+.02}},{t:1,ease:'io',body:breathe}]));
 for(const m of Object.values(set.moves))registerMotion(body(bodyClipId(weapon,m.id),m.name,m.duration,m.keys,m.events));
}
/* Firearm stances: staggered feet, slight forward lean into the gun. Kick is layered on top in attachment.ts. */
export const gunStance:Pose={hy:-.1,tx:.1,ty:-.18,ry:.1,f0z:.18,f1z:-.2,f0x:-.04,f1x:.06,headx:.05};
registerMotion(body('gun:aim','Firearm stance',1.2,[{t:0,ease:'io',body:gunStance},{t:.5,ease:'io',body:{...gunStance,hy:-.115}},{t:1,ease:'io',body:gunStance}]));
registerMotion(body('gun:reload','Firearm reload stance',1.7,[{t:0,ease:'io',body:gunStance},{t:.3,ease:'out',body:{...gunStance,hy:-.16,tx:.18,headx:.22,ty:-.08}},{t:.75,ease:'io',body:{...gunStance,hy:-.15,tx:.16,headx:.18,ty:-.1}},{t:1,ease:'io',body:gunStance}]));
/* Per-gun recoil feel: how hard the gun kicks back/up, how fast it settles, how much the body absorbs. */
export const recoilProfiles:Record<string,{back:number;rise:number;settle:number;body:number;climb:number;side:number}>={
 pistol:{back:.05,rise:.5,settle:.16,body:.03,climb:0,side:.04},
 'assault-rifle':{back:.045,rise:.14,settle:.1,body:.035,climb:.06,side:.05},
 shotgun:{back:.15,rise:.55,settle:.32,body:.16,climb:0,side:.03},
 'sniper-rifle':{back:.13,rise:.4,settle:.4,body:.13,climb:0,side:.02},
};
