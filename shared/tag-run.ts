import type {Position,Motion,Input} from './game.js';
import {advanceMotion} from './game.js';
import type {MapDefinition} from './map.js';
import {nextPosition,blockedAt,walkable} from './traversal.js';
export const TAG={roundMs:135000,immunityMs:2000,freezeMs:2000,freezeImmunityMs:3000,pickupRespawnMs:14000,unitsPerMeter:1/.03,fieldRadius:4/.03,blinkRange:7/.03,tagRange:80};
export const RARITIES={common:{weight:55,color:'#9bccd9'},rare:{weight:30,color:'#4bafff'},epic:{weight:13,color:'#be84ff'},legendary:{weight:2,color:'#ffcf65'}};
const ability=(name:string,rarity:keyof typeof RARITIES,duration:number,description:string,icon:string)=>({name,rarity,duration,description,icon,range:TAG.fieldRadius,cooldown:1000});
export const POWERS={
 smoke_screen:ability('Smoke Screen','common',4000,'Smoke hides players and nameplates.','≋'),
 speed_surge:ability('Speed Surge','common',3000,'20% faster movement; normal stamina costs.','↟'),
 sticky_trap:ability('Sticky Trap','common',5000,'First opponent is slowed 35% for 1.5s.','▧'),
 jump_pad:ability('Jump Pad','common',8000,'Launch upward and forward.','⇡'),
 footprint_tracker:ability('Footprint Tracker','common',5000,'Reveal nearby recent movement trails.','⋯'),
 healing_burst:ability('Healing Burst','common',0,'Restore 35 stamina and clear ordinary slows.','✚'),
 bounce_bomb:ability('Bounce Bomb','common',1600,'Throw a radial shockwave. Launch opponents or yourself.','↗'),
 freeze_ball:ability('Freeze Ball','rare',2000,'Freeze for 2s, followed by 3s freeze immunity.','❄'),
 gravity_bomb:ability('Gravity Bomb','rare',2500,'A 4m field pulls opponents without crossing walls.','◎'),
 ghost_step:ability('Ghost Step','rare',5000,'Silent footsteps; no movement trails. Still taggable.','◇'),
 flash_pop:ability('Flash Pop','rare',1250,'Briefly disrupt nearby opponents’ vision.','✦'),
 magnet_boots:ability('Magnet Boots','rare',5000,'70% knockback resistance and stable traction.','⊓'),
 reverse_pulse:ability('Reverse Pulse','rare',0,'Push nearby opponents away in a 4m wave.','⊙'),
 trap_clone:ability('Trap Clone','rare',5000,'An attacked decoy bursts into a slowing cloud.','♟'),
 blink_beaker:ability('Blink Beaker','rare',0,'Blink up to 7m along a safe, clear route.','↦'),
 clone_decoy:ability('Clone Decoy','epic',4000,'Moving clone; you are invisible and cannot tag.','♙'),
 phase_dash:ability('Phase Dash','epic',400,'Fast directional dash; never crosses walls.','»'),
 portal_pair:ability('Portal Pair','epic',8000,'Two linked safe portals; 1s reentry lockout.','◉'),
 time_bubble:ability('Time Bubble','epic',3000,'Opponents inside move 25% slower.','◷'),
 seal_tug:ability('Seal Tug','legendary',6000,'Protected and stationary for 6s. Unusable in final 6s.','⬡'),
} as const;
export type PowerId=keyof typeof POWERS;
export const ESCAPE_POWERS:PowerId[]=['speed_surge','blink_beaker','clone_decoy','phase_dash','portal_pair','seal_tug'];
export const POWER_IDS=Object.keys(POWERS) as PowerId[];
export const isPower=(v:unknown):v is PowerId=>typeof v==='string'&&Object.hasOwn(POWERS,v);
export const pickupCount=(players:number)=>[0,0,2,3,4,4,5][Math.min(6,Math.max(2,players))];
export type TagStatus={utilityCooldown?:number;speed?:number;slow?:number;bubble?:number;tracker?:number;ghost?:number;magnet?:number;flash?:number;invisible?:number;sealed?:number;freezeImmune?:number;portalLock?:number;padLock?:number;escapeLock?:number;forceImmune?:number;phase?:number;phaseX?:number;phaseY?:number;origin?:Position;impulseX?:number;impulseY?:number;impulseUntil?:number};
export type TagField=Position&{id:string;kind:PowerId|'slow_cloud';ownerId:string;team:string;endsAt:number;createdAt:number;dx:number;dy:number;other?:Position;characterId?:string};
export type TagProjectile=Position&{id:string;kind:'freeze_ball'|'bounce_bomb';ownerId:string;team:string;endsAt:number;dx:number;dy:number};
export type TagEvent=Position&{id:string;kind:'tag'|'pickup'|'power'|'freeze'|'burst';at:number;ownerId:string;targetId?:string;power?:PowerId};
export type TagRank={key:string;survived:boolean;itMs:number;tags:number;collected:number;used:number};
export type TagState={version:2;startedAt:number;clock:number;spent:Record<string,number>;tags:Record<string,number>;collected:Record<string,number>;used:Record<string,number>;immunity:Record<string,number>;status:Record<string,TagStatus>;fields:TagField[];shots:TagProjectile[];events:TagEvent[];trails:(Position&{ownerId:string;at:number})[];pings:Position[];pingAt:number;trailAt:number;lastTransferAt:number;serial:number;consumed:Record<string,string>;announcement:string;announcementAt:number;sealSpawned:boolean;sealUsed:Record<string,boolean>;totalTime:Record<string,number>;totalTags:Record<string,number>;totalCollected:Record<string,number>;totalUsed:Record<string,number>;rankings:TagRank[];ended:boolean};
export function tagSweep(p:Position,dx:number,dy:number,map:MapDefinition,air=false):Position{
 let point={...p,elevation:p.elevation??0};const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
 for(let n=0;n<steps;n++){const q={...point,x:point.x+dx/steps,y:point.y+dy/steps};if(q.x<20||q.y<20||q.x>map.bounds.width-20||q.y>map.bounds.height-20)break;const next=air?!blockedAt(q,map)?q:null:nextPosition(point,q.x,q.y,map);if(!next||!air&&!walkable(next,map))break;point={...next,elevation:next.elevation??0};}return point;
}
export function tagMultiplier(s:TagStatus|undefined,now:number){return (s?.speed&&s.speed>now?1.2:1)*Math.min(s?.slow&&s.slow>now?.65:1,s?.bubble&&s.bubble>now?.75:1);}
export function advanceTagMotion(p:Motion,input:Pick<Input,'dx'|'dy'|'sprint'|'dashId'|'dashStyle'|'jumpId'|'crouch'>,s:TagStatus|undefined,now:number,dt:number,map:MapDefinition):Motion{
 if(s?.sealed&&s.sealed>now)return {...p,...(s.origin??p),sprinting:false,dashRemaining:0};
 const result=advanceMotion(p,input,dt,map),factor=tagMultiplier(s,now);
 if(factor!==1){const next=tagSweep(p,(result.x-p.x)*factor,(result.y-p.y)*factor,map,!!result.airborne);result.x=next.x;result.y=next.y;if(!result.airborne)result.elevation=next.elevation??result.elevation;}
 return result;
}
