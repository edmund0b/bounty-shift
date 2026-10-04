import { randomBytes, randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { ARENA, COLORS, MAX_PLAYERS, RECONNECT_MS, advanceMotion, freshMotion, type Motion, type RoomView, type ServerMessage } from '../shared/game.js';

import { SPAWNS } from '../shared/map.js';

type Player = Motion & { id: string; token: string; name: string; color: string; ready: boolean; x: number; y: number; ack: number; seq: number; dx: number; dy: number; lastInput: number; sprint: boolean; dashId: number; disconnectedAt: number; socket: WebSocket|null };
type Room = { code: string; hostId: string; phase: 'lobby'|'arena'; players: Player[]; tick: number; notice: string };
export class RoomServer {
 rooms = new Map<string, Room>();
 sessions = new Map<WebSocket, { room: Room; player: Player }>();
 send(ws: WebSocket, message: ServerMessage) { if (ws.readyState===1) ws.send(JSON.stringify(message)); }
 view(room: Room): RoomView {
  return { code:room.code, hostId:room.hostId, phase:room.phase, tick:room.tick, notice:room.notice, serverTime:Date.now(), players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,ready:p.ready,connected:!!p.socket,x:p.x,y:p.y,ack:p.ack,stamina:p.stamina,regenWait:p.regenWait,exhausted:p.exhausted,dashCooldown:p.dashCooldown,dashRemaining:p.dashRemaining,dashX:p.dashX,dashY:p.dashY,facingX:p.facingX,facingY:p.facingY,dashSeen:p.dashSeen,sprinting:p.sprinting})) };
 }
 broadcast(room: Room) { const message:ServerMessage={type:'state',room:this.view(room)}; for(const p of room.players) if(p.socket) this.send(p.socket,message); }
 fail(ws:WebSocket,message:string,fatal=false) { this.send(ws,{type:'error',message,fatal}); }
 name(value:unknown) { if(typeof value!=='string') return null; const s=value.trim().replace(/\s+/g,' '); return /^[\p{L}\p{N} _.-]{1,20}$/u.test(s)?s:null; }
 message(ws:WebSocket,raw:string) {
  let m:any; try {m=JSON.parse(raw);} catch {this.fail(ws,'Invalid message.');return;}
  if(!m || typeof m!=='object') return;
  if(m.type==='ping') {this.send(ws,{type:'pong'});return;}
  const session=this.sessions.get(ws);
  if(['create','join','resume'].includes(m.type)) {
   if(session) {this.fail(ws,'Leave your current room first.');return;}
   if(m.type==='resume') {
    const room=typeof m.code==='string'?this.rooms.get(m.code):undefined;
    const p=room?.players.find(p=>typeof m.token==='string' && p.token===m.token);
    if(!room || !p || (!p.socket && Date.now()-p.disconnectedAt>RECONNECT_MS)) {this.fail(ws,'Your room session expired. Create or join a room again.',true);return;}
    if(p.socket) {this.fail(ws,'This player is already connected in another tab.',true);return;}
    p.socket=ws;p.disconnectedAt=0;p.dx=0;p.dy=0;p.seq=p.ack;p.sprint=false;p.dashId=p.dashSeen;
    this.sessions.set(ws,{room,player:p});
    if(!room.players.some(x=>x.id===room.hostId && x.socket)) room.hostId=p.id;
    this.send(ws,{type:'welcome',id:p.id,token:p.token,room:this.view(room)});this.broadcast(room);return;
   }
   const name=this.name(m.name);
   if(!name) {this.fail(ws,'Use 1–20 letters, numbers, spaces, periods, hyphens, or underscores.');return;}
   let room:Room|undefined;
   if(m.type==='create') {
    if(this.rooms.size>=100) {this.fail(ws,'Server is full. Please try again later.');return;}
    let code:string; do {code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();} while(this.rooms.has(code));
    room={code,hostId:'',phase:'lobby',players:[],tick:0,notice:''};this.rooms.set(code,room);
   } else {
    const code=typeof m.code==='string'?m.code.trim().toUpperCase():''; room=this.rooms.get(code);
    if(!room) {this.fail(ws,'Room not found. Check the six-character code.');return;}
    if(room.phase!=='lobby') {this.fail(ws,'This test is already running. Ask the host to return to the lobby.');return;}
    if(room.players.length>=MAX_PLAYERS) {this.fail(ws,'This room is full (6 players).');return;}
    if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase())) {this.fail(ws,'That name is already in this room. Choose another name.');return;}
   }
   const color=COLORS.find(c=>!room!.players.some(p=>p.color===c)) || COLORS[0];
   const p:Player={...freshMotion(SPAWNS[0]),sprint:false,dashId:0,id:randomUUID(),token:randomBytes(24).toString('hex'),name,color,ready:false,ack:0,seq:0,dx:0,dy:0,lastInput:0,disconnectedAt:0,socket:ws};
   room.players.push(p);if(!room.hostId) room.hostId=p.id;room.notice='';this.sessions.set(ws,{room,player:p});
   this.send(ws,{type:'welcome',id:p.id,token:p.token,room:this.view(room)});this.broadcast(room);return;
  }
  if(!session) {this.fail(ws,'Join a room first.');return;}
  const {room,player:p}=session;
  if(m.type==='leave') {this.remove(room,p);this.send(ws,{type:'left'});return;}
  if(m.type==='ready' && room.phase==='lobby' && typeof m.ready==='boolean') {p.ready=m.ready;this.broadcast(room);return;}
  if(m.type==='start') {
   if(room.hostId!==p.id) {this.fail(ws,'Only the host can start the test.');return;}
   if(room.phase!=='lobby') return;
   if(room.players.length<2 || room.players.some(p=>!p.socket || !p.ready)) {this.fail(ws,'At least two connected players are needed, and everyone must be ready.');return;}
   room.phase='arena';room.notice='';room.tick=0;
   room.players.forEach((p,i)=>{Object.assign(p,freshMotion(SPAWNS[i]));p.dx=0;p.dy=0;p.sprint=false;p.dashId=0;p.seq=p.ack;p.lastInput=0;});
   this.broadcast(room);return;
  }
  if(m.type==='lobby') {if(room.hostId!==p.id) {this.fail(ws,'Only the host can return everyone to the lobby.');return;} this.toLobby(room,'Host returned the room to the lobby.');return;}
  if(m.type==='input' && room.phase==='arena') {
   if(!Number.isSafeInteger(m.seq) || m.seq<=p.seq || m.seq>p.seq+120 || !Number.isFinite(m.dx) || !Number.isFinite(m.dy) || Math.abs(m.dx)>1 || Math.abs(m.dy)>1) return;
   if(m.sprint!==undefined && typeof m.sprint!=='boolean')return;
   if(m.dashId!==undefined && (!Number.isSafeInteger(m.dashId)||m.dashId<p.dashId||m.dashId>p.dashId+120))return;
   p.seq=m.seq;p.dx=m.dx;p.dy=m.dy;p.sprint=m.sprint??false;p.dashId=m.dashId??p.dashId;p.lastInput=Date.now();
  }
 }
 toLobby(room:Room,notice:string) {room.phase='lobby';room.notice=notice;for(const p of room.players){p.ready=false;p.dx=0;p.dy=0;p.sprint=false;p.dashRemaining=0;}this.broadcast(room);}
 disconnect(ws:WebSocket) {const s=this.sessions.get(ws);if(!s)return;this.sessions.delete(ws);const {room,player:p}=s;p.socket=null;p.ready=false;p.dx=0;p.dy=0;p.sprint=false;p.dashRemaining=0;p.disconnectedAt=Date.now();this.transfer(room);this.broadcast(room);}
 transfer(room:Room) {if(!room.players.some(p=>p.id===room.hostId && p.socket)){const next=room.players.find(p=>p.socket);if(next)room.hostId=next.id;}}
 remove(room:Room,p:Player) {if(p.socket)this.sessions.delete(p.socket);room.players=room.players.filter(x=>x!==p);if(!room.players.length){this.rooms.delete(room.code);return;}this.transfer(room);if(room.phase==='arena' && room.players.length<2)this.toLobby(room,'Test ended: at least two players are needed.');else this.broadcast(room);}
 tick(now=Date.now()) {
  for(const room of this.rooms.values()) {
   for(const p of [...room.players]) if(!p.socket && now-p.disconnectedAt>=RECONNECT_MS)this.remove(room,p);
   if(!this.rooms.has(room.code))continue;
   room.tick++;
   if(room.phase==='arena') {
    for(const p of room.players) {if(!p.socket)continue;const active=now-p.lastInput<300;const motion=advanceMotion(p,{dx:active?p.dx:0,dy:active?p.dy:0,sprint:active&&p.sprint,dashId:active?p.dashId:p.dashSeen});Object.assign(p,motion);p.ack=p.seq;}
    if(room.tick%2===0)this.broadcast(room);
   }
  }
 }
}
