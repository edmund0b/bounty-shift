export const ARENA = { width: 960, height: 600, radius: 14, speed: 220 };
export const STEP = 1 / 30;
export const MAX_PLAYERS = 6;
export const RECONNECT_MS = 10_000;
export const COLORS = ['#60cfff','#ffbc66','#b6a2ff','#77d8a4','#ff8da5','#e9df78'];
export type Position = { x: number; y: number };
export type Input = { seq: number; dx: number; dy: number };
export type PlayerView = Position & { id: string; name: string; color: string; ready: boolean; connected: boolean; ack: number };
export type RoomView = { code: string; hostId: string; phase: 'lobby'|'arena'; players: PlayerView[]; tick: number; serverTime: number; notice: string };
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
 | { type: 'error'; message: string; fatal?: boolean }
 | { type: 'left'|'pong' };
export function move(p: Position, dx: number, dy: number, dt = STEP): Position {
 const length = Math.hypot(dx, dy);
 if (length > 1) { dx /= length; dy /= length; }
 return { x: Math.max(ARENA.radius, Math.min(ARENA.width-ARENA.radius, p.x+dx*ARENA.speed*dt)), y: Math.max(ARENA.radius, Math.min(ARENA.height-ARENA.radius, p.y+dy*ARENA.speed*dt)) };
}
