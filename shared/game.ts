import type { RoundView, PrivateObjective, MatchView } from './rounds.js';
import type { CombatState } from './combat.js';
import { BUILDINGS, WORLD } from './map.js';
export const ARENA = { ...WORLD, radius: 14, speed: 220 };
export const STEP = 1 / 30;
export const MAX_PLAYERS = 6;
export const RECONNECT_MS = 10_000;
export const NETWORK = { inputTimeoutMs:300, maxInputAdvance:120, resumeRetryMs:1000, resumeAttempts:15 };
export const COLORS = ['#60cfff','#ffbc66','#b6a2ff','#77d8a4','#ff8da5','#e9df78'];
export const MOVEMENT = { sprintMultiplier: 1.5, staminaMax: 100, staminaDrain: 28, staminaRegen: 22, regenDelay: 0.6, dashSpeed: 850, dashDuration: 0.18, dashCooldown: 3 };
export type Position = { x: number; y: number };
export type Input = { matchId: string; roundNumber: number; seq: number; dx: number; dy: number; sprint?: boolean; dashId?: number; attackId?: number; aimX?: number; aimY?: number };
export type Motion = Position & { stamina: number; regenWait: number; exhausted: boolean; dashCooldown: number; dashRemaining: number; dashX: number; dashY: number; facingX: number; facingY: number; dashSeen: number; sprinting: boolean };
export type PlayerView = Motion & CombatState & { id: string; name: string; color: string; ready: boolean; connected: boolean; ack: number };
export type RoomView = { code: string; hostId: string; phase: 'lobby'|'arena'|'intermission'|'complete'; match: MatchView; round: RoundView; objective: PrivateObjective; players: PlayerView[]; tick: number; serverTime: number; notice: string };
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
 return {...position,stamina:MOVEMENT.staminaMax,regenWait:0,exhausted:false,dashCooldown:0,dashRemaining:0,dashX:0,dashY:1,facingX:0,facingY:1,dashSeen:0,sprinting:false};
}
export function isWalkable(p:Position) {
 const r=ARENA.radius;
 return p.x>=r && p.y>=r && p.x<=ARENA.width-r && p.y<=ARENA.height-r && !BUILDINGS.some(w=>p.x>w.x-r && p.x<w.x+w.width+r && p.y>w.y-r && p.y<w.y+w.height+r);
}
// Axis sliding in <=5px steps prevents a fast dash crossing even a thin wall.
export function move(p:Position,dx:number,dy:number,dt=STEP,speed=ARENA.speed):Position {
 const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 const totalX=dx*speed*dt,totalY=dy*speed*dt;
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(totalX),Math.abs(totalY))/5));
 let x=p.x,y=p.y;const r=ARENA.radius;
 for(let i=0;i<steps;i++){
  let nx=Math.max(r,Math.min(ARENA.width-r,x+totalX/steps));
  for(const w of BUILDINGS){if(y<=w.y-r||y>=w.y+w.height+r)continue;
   if(totalX>0&&x<=w.x-r&&nx>w.x-r)nx=Math.min(nx,w.x-r);
   if(totalX<0&&x>=w.x+w.width+r&&nx<w.x+w.width+r)nx=Math.max(nx,w.x+w.width+r);
  }x=nx;
  let ny=Math.max(r,Math.min(ARENA.height-r,y+totalY/steps));
  for(const w of BUILDINGS){if(x<=w.x-r||x>=w.x+w.width+r)continue;
   if(totalY>0&&y<=w.y-r&&ny>w.y-r)ny=Math.min(ny,w.y-r);
   if(totalY<0&&y>=w.y+w.height+r&&ny<w.y+w.height+r)ny=Math.max(ny,w.y+w.height+r);
  }y=ny;
 }
 return {x,y};
}
export function advanceMotion(previous:Motion,input:Pick<Input,'dx'|'dy'|'sprint'|'dashId'>,dt=STEP):Motion {
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
 if(s.dashRemaining>0){const time=Math.min(dt,s.dashRemaining);pos=move(s,s.dashX,s.dashY,time,MOVEMENT.dashSpeed);s.dashRemaining=Math.max(0,s.dashRemaining-dt);}
 else pos=move(s,dx,dy,dt,ARENA.speed*(s.sprinting?MOVEMENT.sprintMultiplier:1));
 return {...s,...pos};
}
