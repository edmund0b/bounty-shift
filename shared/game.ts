import type { RoundView, PrivateObjective, MatchView } from './rounds.js';
import type { CombatState } from './combat.js';
import { ACTIVE_MAP, WORLD, type MapDefinition } from './map.js';
import {walkable,nextPosition,TRAVERSAL} from './traversal.js';
export const ARENA = { ...WORLD, radius: TRAVERSAL.radius, speed: 220 };
export const STEP = 1 / 30;
export const MAX_PLAYERS = 6;
export const RECONNECT_MS = 10_000;
export const NETWORK = { inputTimeoutMs:300, maxInputAdvance:120, resumeRetryMs:1000, resumeAttempts:15 };
export const COLORS = ['#60cfff','#ffbc66','#b6a2ff','#77d8a4','#ff8da5','#e9df78'];
export const MOVEMENT = { sprintMultiplier: 1.5, staminaMax: 100, staminaDrain: 28, staminaRegen: 22, regenDelay: 0.6, dashSpeed: 850, dashDuration: 0.18, dashCooldown: 3 };
export type Position = { x: number; y: number; elevation?:number };
export type Input = { matchId: string; roundNumber: number; seq: number; dx: number; dy: number; sprint?: boolean; dashId?: number; attackId?: number; aimX?: number; aimY?: number };
export type Motion = Position & { elevation:number; stamina: number; regenWait: number; exhausted: boolean; dashCooldown: number; dashRemaining: number; dashX: number; dashY: number; facingX: number; facingY: number; dashSeen: number; sprinting: boolean };
export type PlayerView = Motion & CombatState & { id: string; name: string; color: string; ready: boolean; connected: boolean; ack: number };
export type RoomView = { mapId:string; nextMapId:string|null; code: string; hostId: string; phase: 'lobby'|'arena'|'intermission'|'complete'; match: MatchView; round: RoundView; objective: PrivateObjective; players: PlayerView[]; tick: number; serverTime: number; notice: string };
export type ClientMessage =
 | { type: 'create'; name: string }
 | { type: 'join'; name: string; code: string }
 | { type: 'resume'; code: string; token: string }
 | { type: 'ready'; ready: boolean }
 | { type: 'start'|'lobby'|'leave'|'ping' }
 | ({ type: 'input' } & Input);
export type ServerMessage =
 | { type: 'welcome'; id: string; token: string; room: RoomView }
 | { type: 'state'; room: RoomView }
 | { type: 'error'; message: string; fatal?: boolean; retryable?: boolean }
 | { type: 'left'|'pong' };
export function freshMotion(position:Position):Motion {
 return {...position,elevation:position.elevation??0,stamina:MOVEMENT.staminaMax,regenWait:0,exhausted:false,dashCooldown:0,dashRemaining:0,dashX:0,dashY:1,facingX:0,facingY:1,dashSeen:0,sprinting:false};
}
export function isWalkable(p:Position,map:MapDefinition=ACTIVE_MAP){return walkable(p,map);}
// Server and client prediction share the same floor/solid tests and <=5px steps.
export function move(p:Position,dx:number,dy:number,dt=STEP,speed=ARENA.speed,map:MapDefinition=ACTIVE_MAP):Position {
 const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 const totalX=dx*speed*dt,totalY=dy*speed*dt,steps=Math.max(1,Math.ceil(Math.max(Math.abs(totalX),Math.abs(totalY))/5));
 let point:Position={...p,elevation:p.elevation??0};
 for(let i=0;i<steps;i++){
  const x=Math.max(ARENA.radius,Math.min(map.bounds.width-ARENA.radius,point.x+totalX/steps));
  point=nextPosition(point,x,point.y,map)??point;
  const y=Math.max(ARENA.radius,Math.min(map.bounds.height-ARENA.radius,point.y+totalY/steps));
  point=nextPosition(point,point.x,y,map)??point;
 }
 return point;
}
export function advanceMotion(previous:Motion,input:Pick<Input,'dx'|'dy'|'sprint'|'dashId'>,dt=STEP,map:MapDefinition=ACTIVE_MAP):Motion {
 const s={...previous};s.dashCooldown=Math.max(0,s.dashCooldown-dt);
 s.regenWait=Math.max(0,s.regenWait-dt);
 let dx=input.dx,dy=input.dy;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 if(length>0){s.facingX=dx;s.facingY=dy;}
 if(!input.sprint)s.exhausted=false;
 const dashId=input.dashId??s.dashSeen;
 if(dashId>s.dashSeen){
  s.dashSeen=dashId;
  if(s.dashCooldown<=0){s.dashCooldown=MOVEMENT.dashCooldown;s.dashRemaining=MOVEMENT.dashDuration;s.dashX=length>0?dx:s.facingX;s.dashY=length>0?dy:s.facingY;}
 }
 s.sprinting=!!input.sprint&&length>0&&!s.exhausted&&s.stamina>0&&s.dashRemaining<=0;
 if(s.sprinting){s.stamina=Math.max(0,s.stamina-MOVEMENT.staminaDrain*dt);s.regenWait=MOVEMENT.regenDelay;if(s.stamina===0)s.exhausted=true;}
 else if(s.regenWait<=0)s.stamina=Math.min(MOVEMENT.staminaMax,s.stamina+MOVEMENT.staminaRegen*dt);
 let pos:Position;
 if(s.dashRemaining>0){const time=Math.min(dt,s.dashRemaining);pos=move(s,s.dashX,s.dashY,time,MOVEMENT.dashSpeed,map);s.dashRemaining=Math.max(0,s.dashRemaining-dt);}
 else pos=move(s,dx,dy,dt,ARENA.speed*(s.sprinting?MOVEMENT.sprintMultiplier:1),map);
 return {...s,...pos,elevation:pos.elevation??0};
}
