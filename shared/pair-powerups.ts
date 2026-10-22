import type {Position,Motion,Input} from './game.js';
import {advanceMotion} from './game.js';
import {advanceTagMotion,tagSweep,type TagStatus} from './tag-run.js';
import type {MapDefinition} from './map.js';
export const PAIR={enabledRewards:true,releaseMs:640,actionMs:1350,cooldownMs:1000,
 bounce:{throwSpeed:300,gravity:650,lift:140,originHeight:32,projectileRadius:6,fuseMs:900,impact:true,radius:4/.03,horizontal:400,vertical:300,maxImpulse:450,impulseMs:600,selfMultiplier:1,friendlyFire:false,forceImmunityMs:200,falloffFloor:.25},
 sticky:{placeDistance:36,footprint:12,maxSlope:.4,armMs:350,radius:35,slow:.65,effectMs:1500,lifetimeMs:5000,maxPerPlayer:1,maxPerRound:6,friendlyFire:false,triggerVisualMs:1500},
} as const;
export type PairId='bounce_bomb'|'sticky_trap';export const isPair=(id:unknown):id is PairId=>id==='bounce_bomb'||id==='sticky_trap';
export type PairStatus={spawnVersion:number;slowUntil:number;slowAt:number;knockUntil:number;knockAt:number;vx:number;vy:number;immuneUntil:number;cooldownUntil:number};
export type PairAction={id:string;kind:PairId;ownerId:string;instanceId:string;startedAt:number;releaseAt:number;endsAt:number;released:boolean;dx:number;dy:number;dz:number};
export type PairShot=Position&{id:string;ownerId:string;team:string;vx:number;vy:number;vz:number;bornAt:number;lastAt:number;endsAt:number};
export type PairTrap=Position&{id:string;ownerId:string;ownerSpawnVersion:number;team:string;bornAt:number;armedAt:number;endsAt:number;normal:{x:number;y:number;z:number};triggeredAt?:number;targetId?:string};
export type PairEvent=Position&{id:string;kind:'shockwave'|'sticky';at:number;ownerId:string;targetIds:string[];radius:number};
export type PairState={version:1;ended:boolean;actions:PairAction[];shots:PairShot[];traps:PairTrap[];events:PairEvent[];status:Record<string,PairStatus>};
export const emptyPair=():PairState=>({version:1,ended:false,actions:[],shots:[],traps:[],events:[],status:{}});
/** Existing movement owns input, stamina, jump/landing; only pair-authored slow/force is overlaid. */
export function advancePairMotion(p:Motion,input:Pick<Input,'dx'|'dy'|'sprint'|'dashId'|'dashStyle'|'jumpId'|'crouch'>,s:PairStatus|undefined,now:number,dt:number,map:MapDefinition,tag?:TagStatus){
 const result=tag?advanceTagMotion(p,input,tag,now,dt,map):advanceMotion(p,input,dt,map);if(!s||s.spawnVersion!==((p as Motion&{spawnVersion?:number}).spawnVersion??0))return result;
 if(s.slowUntil>now){const existing=Math.min(tag?.slow!>now?.65:1,tag?.bubble!>now?.75:1),factor=Math.min(existing,PAIR.sticky.slow)/existing;const point=tagSweep(p,(result.x-p.x)*factor,(result.y-p.y)*factor,map,!!result.airborne);result.x=point.x;result.y=point.y;if(!result.airborne)result.elevation=point.elevation??result.elevation;}
 if(s.knockUntil>now){const fade=Math.max(0,(s.knockUntil-now)/PAIR.bounce.impulseMs),point=tagSweep(result,s.vx*dt*fade,s.vy*dt*fade,map,!!result.airborne);result.x=point.x;result.y=point.y;if(!result.airborne)result.elevation=point.elevation??result.elevation;}
 return result;
}
