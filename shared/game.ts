import type {CharacterId,CharacterSelection} from './characters.js';
import type {GameMode,Format,ModeState,ItemKind} from './modes.js';
import type { RoundView, PrivateObjective, MatchView } from './rounds.js';
import type { CombatState } from './combat.js';
import { ACTIVE_MAP, WORLD, type MapDefinition } from './map.js';
import {walkable,nextPosition,blockedAt,inside,surfaceHeight,TRAVERSAL} from './traversal.js';
export const ARENA = { ...WORLD, radius: TRAVERSAL.radius, speed: 220 };
export const STEP = 1 / 30;
export const MAX_PLAYERS = 6;
export const RECONNECT_MS = 10_000;
export const NETWORK = { inputTimeoutMs:300, maxInputAdvance:120, resumeRetryMs:1000, resumeAttempts:15 };
export const COLORS = ['#60cfff','#ffbc66','#b6a2ff','#77d8a4','#ff8da5','#e9df78'];
export const MOVEMENT = { sprintMultiplier: 1.5, staminaMax: 100, staminaDrain: 28, staminaRegen: 22, regenDelay: 0.6, dashSpeed: 850, dashDuration: 0.18, dashCooldown: 3 };
export type Position = { x: number; y: number; elevation?:number };
export const JUMP={velocity:300,gravity:900};
export type Input = { matchId: string; roundNumber: number; seq: number; dx: number; dy: number; sprint?: boolean; jumpId?:number; crouch?:boolean; dashId?: number; dashStyle?: 'dash'|'dodge'|'slide'; attackId?: number; aimX?: number; aimY?: number };
export type Motion = Position & { jumpSeen?:number;airborne?:boolean;verticalVelocity?:number;jumpOrigin?:Position;crouched?:boolean;traversalState?:'idle'|'walk'|'sprint'|'dash'|'dodge'|'slide'|'jump'|'fall'|'crouch'; elevation:number; stamina: number; regenWait: number; exhausted: boolean; dashCooldown: number; dashRemaining: number; dashX: number; dashY: number; facingX: number; facingY: number; dashSeen: number; sprinting: boolean };
export type PlayerView = {characterId?:CharacterId|null;characterAutoAssigned?:boolean;frozenUntil:number;heldItem:ItemKind|null;inventory?:import('./inventory.js').Inventory;selectedSlot?:import('./inventory.js').Slot} & Motion & CombatState & { id: string; name: string; color: string; ready: boolean; connected: boolean; ack: number };
export type RoomView = { selectedGameMode:GameMode;selectedFormat:Format;mode:ModeState; mapId:string; mapVariant:string|null; nextMapId:string|null; nextMapVariant:string|null; code: string; hostId: string; phase: 'lobby'|'character_selection'|'match_loading'|'arena'|'intermission'|'complete'; selection?:CharacterSelection|null; match: MatchView; round: RoundView; objective: PrivateObjective; players: PlayerView[]; tick: number; serverTime: number; notice: string };
export type ClientMessage =
 | { type: 'create'; name: string }
 | { type: 'join'; name: string; code: string }
 | { type: 'resume'; code: string; token: string }
 | { type:'settings';mode:GameMode;format:Format }
 | {type:'equip';slot:import('./inventory.js').Slot;matchId:string;roundNumber:number}
 | {type:'interact';matchId:string;roundNumber:number}
 | { type:'choose_character';matchId:string;characterId:CharacterId }
 | { type:'character_prepared';matchId:string }
 | { type: 'ready'; ready: boolean }
 | { type: 'start'|'lobby'|'leave'|'ping' }
 | ({ type: 'input' } & Input);
export type ServerMessage =
 | { type: 'welcome'; id: string; token: string; room: RoomView }
 | { type: 'state'; room: RoomView }
 | { type: 'error'; message: string; fatal?: boolean; retryable?: boolean }
 | { type: 'left'|'pong' };
export function freshMotion(position:Position):Motion {
 return {...position,jumpOrigin:{...position,elevation:position.elevation??0},jumpSeen:0,airborne:false,verticalVelocity:0,crouched:false,traversalState:'idle',elevation:position.elevation??0,stamina:MOVEMENT.staminaMax,regenWait:0,exhausted:false,dashCooldown:0,dashRemaining:0,dashX:0,dashY:1,facingX:0,facingY:1,dashSeen:0,sprinting:false};
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
export function advanceMotion(previous:Motion,input:Pick<Input,'dx'|'dy'|'sprint'|'dashId'|'dashStyle'|'jumpId'|'crouch'>,dt=STEP,map:MapDefinition=ACTIVE_MAP):Motion {
 const s={...previous};s.crouched=!!input.crouch;const jump=input.jumpId??s.jumpSeen??0;if(jump>(s.jumpSeen??0)){s.jumpSeen=jump;if(!s.airborne&&walkable(s,map)){s.airborne=true;s.verticalVelocity=JUMP.velocity;s.jumpOrigin={x:s.x,y:s.y,elevation:s.elevation};}}s.dashCooldown=Math.max(0,s.dashCooldown-dt);
 s.regenWait=Math.max(0,s.regenWait-dt);
 let dx=input.dx,dy=input.dy;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 if(length>0){s.facingX=dx;s.facingY=dy;}
 if(!input.sprint)s.exhausted=false;
 const dashId=input.dashId??s.dashSeen;
 if(dashId>s.dashSeen){
  s.dashSeen=dashId;
  if(s.dashCooldown<=0&&(input.dashStyle!=='slide'||length>0)){s.traversalState=input.dashStyle??'dash';s.dashCooldown=MOVEMENT.dashCooldown;s.dashRemaining=s.traversalState==='slide'?.42:s.traversalState==='dodge'?.24:MOVEMENT.dashDuration;s.dashX=length>0?dx:s.facingX;s.dashY=length>0?dy:s.facingY;}
 }
 s.sprinting=!!input.sprint&&length>0&&!s.exhausted&&s.stamina>0&&s.dashRemaining<=0;
 if(s.sprinting){s.stamina=Math.max(0,s.stamina-MOVEMENT.staminaDrain*dt);s.regenWait=MOVEMENT.regenDelay;if(s.stamina===0)s.exhausted=true;}
 else if(s.regenWait<=0)s.stamina=Math.min(MOVEMENT.staminaMax,s.stamina+MOVEMENT.staminaRegen*dt);
 // The grounded path remains unchanged. Air movement uses the same solid/bounds checks in tiny steps.
 const travel=(dx:number,dy:number,time:number,speed:number):Position=>{
  if(!s.airborne)return move(s,dx,dy,time,speed,map);
  let p:Position={x:s.x,y:s.y,elevation:s.elevation};const steps=Math.max(1,Math.ceil(speed*time/5));
  for(let i=0;i<steps;i++){for(const axis of ['x','y'] as const){const q={...p,[axis]:p[axis]+(axis==='x'?dx:dy)*speed*time/steps};if(!blockedAt(q,map))p=q;}}
  return p;
 };
 let pos:Position;
 if(s.dashRemaining>0){const time=Math.min(dt,s.dashRemaining);pos=travel(s.dashX,s.dashY,time,s.traversalState==='slide'?400:s.traversalState==='dodge'?580:MOVEMENT.dashSpeed);s.dashRemaining=Math.max(0,s.dashRemaining-dt);}
 else pos=travel(dx,dy,dt,ARENA.speed*(s.sprinting?MOVEMENT.sprintMultiplier:1));
 if(s.dashRemaining<=0)s.traversalState=s.sprinting?'sprint':length>0?'walk':'idle';
 if(s.airborne){
  const old=s.elevation;s.verticalVelocity=(s.verticalVelocity??0)-JUMP.gravity*dt;const next=old+s.verticalVelocity*dt;
  const landings=[0,...map.surfaces.filter(v=>inside(pos,v)).map(v=>surfaceHeight(v,pos))].sort((a,b)=>b-a);
  const floor=s.verticalVelocity<=0?landings.find(z=>z<=old+.01&&z>=next-.01&&walkable({...pos,elevation:z},map)):undefined;
  if(floor!==undefined){pos.elevation=floor;s.airborne=false;s.verticalVelocity=0;}
  else if(next<0){pos=s.jumpOrigin??pos;s.airborne=false;s.verticalVelocity=0;}
  else {const steps=Math.max(1,Math.ceil(Math.abs(next-old)/3));let z=old;for(let i=0;i<steps;i++){const candidate=z+(next-old)/steps;if(blockedAt({...pos,elevation:candidate},map)){if((s.verticalVelocity??0)<0){pos=s.jumpOrigin??pos;z=pos.elevation??0;s.airborne=false;}s.verticalVelocity=0;break;}z=candidate;}pos.elevation=z;}
  if(s.airborne&&s.dashRemaining<=0)s.traversalState=(s.verticalVelocity??0)>0?'jump':'fall';
 }
 if(!s.airborne&&s.crouched&&s.dashRemaining<=0)s.traversalState='crouch';
 return {...s,...pos,elevation:pos.elevation??0};
}

