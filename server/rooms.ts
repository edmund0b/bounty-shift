import { randomBytes, randomUUID, randomInt } from 'node:crypto';
import type { WebSocket } from 'ws';
import { STEP, NETWORK, COLORS, MAX_PLAYERS, RECONNECT_MS, advanceMotion, freshMotion, type Motion, type RoomView, type ServerMessage } from '../shared/game.js';

import { COMBAT, freshCombat, canHit, safeSpawn, type CombatState } from '../shared/combat.js';
import { ROUND, MATCH, emptyMatch, type MatchView, type RoundView } from '../shared/rounds.js';
import { SPAWNS } from '../shared/map.js';

type Player = { targetId: string|null; eliminations: number; matchEliminations: number } & Motion & CombatState & { id: string; token: string; name: string; color: string; ready: boolean; x: number; y: number; ack: number; seq: number; dx: number; dy: number; lastInput: number; sprint: boolean; dashId: number; attackId: number; aimX: number; aimY: number; disconnectedAt: number; socket: WebSocket|null };
type Room = { code: string; hostId: string; phase: 'lobby'|'arena'|'intermission'|'complete'; match: MatchView; round: RoundView; roster: Player[]; players: Player[]; tick: number; notice: string };
export class RoomServer {
 rooms = new Map<string, Room>();
 sessions = new Map<WebSocket, { room: Room; player: Player }>();
 send(ws: WebSocket, message: ServerMessage) { if (ws.readyState===1) {try{ws.send(JSON.stringify(message));}catch{this.disconnect(ws);}} }
 view(room: Room, recipient?:Player): RoomView {
  const target=room.players.find(p=>p.id===recipient?.targetId);
  return { match:room.match, round:room.round, objective:{target:target?{id:target.id,name:target.name}:null,eliminations:recipient?.eliminations??0,matchEliminations:recipient?.matchEliminations??0}, code:room.code, hostId:room.hostId, phase:room.phase, tick:room.tick, notice:room.notice, serverTime:Date.now(), players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,ready:p.ready,connected:!!p.socket,x:p.x,y:p.y,ack:p.ack,stamina:p.stamina,regenWait:p.regenWait,exhausted:p.exhausted,dashCooldown:p.dashCooldown,dashRemaining:p.dashRemaining,dashX:p.dashX,dashY:p.dashY,facingX:p.facingX,facingY:p.facingY,dashSeen:p.dashSeen,sprinting:p.sprinting,health:p.health,koRemaining:p.koRemaining,protection:p.protection,attackCooldown:p.attackCooldown,attackSeen:p.attackSeen,attackFlash:p.attackFlash,hitFlash:p.hitFlash,attackX:p.attackX,attackY:p.attackY,spawnVersion:p.spawnVersion})) };
 }
 broadcast(room: Room) { for(const p of room.players) if(p.socket) this.send(p.socket,{type:'state',room:this.view(room,p)}); }
 fail(ws:WebSocket,message:string,fatal=false) { this.send(ws,{type:'error',message,fatal}); }
 name(value:unknown) { if(typeof value!=='string') return null; const s=value.trim().replace(/\s+/g,' '); return /^[\p{L}\p{N} _.-]{1,20}$/u.test(s)?s:null; }
 message(ws:WebSocket,raw:string) {
  let m:any; try {m=JSON.parse(raw);} catch {this.fail(ws,'Invalid message.');return;}
  if(!m || typeof m!=='object'||Array.isArray(m)) return;
  if(m.type==='ping') {this.send(ws,{type:'pong'});return;}
  const session=this.sessions.get(ws);
  if(['create','join','resume'].includes(m.type)) {
   if(session) {this.fail(ws,'Leave your current room first.');return;}
   if(m.type==='resume') {
    const room=typeof m.code==='string'?this.rooms.get(m.code):undefined;
    const p=room?.players.find(p=>typeof m.token==='string' && p.token===m.token);
    if(!room || !p || (!p.socket && Date.now()-p.disconnectedAt>RECONNECT_MS)) {this.fail(ws,'Your room session expired. Create or join a room again.',true);return;}
    if(p.socket) {this.send(ws,{type:'error',message:'This player is already connected. Waiting for the previous connection to close; close any duplicate tab.',retryable:true});return;}
    p.socket=ws;p.disconnectedAt=0;p.lastInput=0;p.dx=0;p.dy=0;p.seq=p.ack;p.sprint=false;p.dashId=p.dashSeen;p.attackId=p.attackSeen;p.aimX=0;p.aimY=0;
    this.sessions.set(ws,{room,player:p});
    if(!room.players.some(x=>x.id===room.hostId && x.socket)) room.hostId=p.id;
    this.send(ws,{type:'welcome',id:p.id,token:p.token,room:this.view(room,p)});this.broadcast(room);return;
   }
   const name=this.name(m.name);
   if(!name) {this.fail(ws,'Use 1–20 letters, numbers, spaces, periods, hyphens, or underscores.');return;}
   let room:Room|undefined;
   if(m.type==='create') {
    if(this.rooms.size>=100) {this.fail(ws,'Server is full. Please try again later.');return;}
    let code:string; do {code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();} while(this.rooms.has(code));
    room={code,hostId:'',phase:'lobby',match:emptyMatch(),round:{endsAt:0,remainingSeconds:0,returnAt:0,results:[]},roster:[],players:[],tick:0,notice:''};this.rooms.set(code,room);
   } else {
    const code=typeof m.code==='string'?m.code.trim().toUpperCase():''; room=this.rooms.get(code);
    if(!room) {this.fail(ws,'Room not found. Check the six-character code.');return;}
    if(room.phase!=='lobby') {this.fail(ws,'This test is already running. Ask the host to return to the lobby.');return;}
    if(room.players.length>=MAX_PLAYERS) {this.fail(ws,'This room is full (6 players).');return;}
    if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase())) {this.fail(ws,'That name is already in this room. Choose another name.');return;}
   }
   const color=COLORS.find(c=>!room!.players.some(p=>p.color===c)) || COLORS[0];
   const p:Player={targetId:null,eliminations:0,matchEliminations:0,...freshMotion(SPAWNS[0]),...freshCombat(),sprint:false,dashId:0,attackId:0,aimX:0,aimY:0,id:randomUUID(),token:randomBytes(24).toString('hex'),name,color,ready:false,ack:0,seq:0,dx:0,dy:0,lastInput:0,disconnectedAt:0,socket:ws};
   room.players.push(p);if(!room.hostId) room.hostId=p.id;room.notice='';this.sessions.set(ws,{room,player:p});
   this.send(ws,{type:'welcome',id:p.id,token:p.token,room:this.view(room,p)});this.broadcast(room);return;
  }
  if(!session) {if(m.type==='leave'){this.send(ws,{type:'left'});return;}this.fail(ws,'Join a room first.');return;}
  const {room,player:p}=session;
  if(this.rooms.get(room.code)!==room||!room.players.includes(p)||p.socket!==ws){this.sessions.delete(ws);this.fail(ws,'Your room session expired.',true);return;}
  if(m.type==='leave') {this.remove(room,p);this.send(ws,{type:'left'});return;}
  if(m.type==='ready' && room.phase==='lobby' && typeof m.ready==='boolean') {p.ready=m.ready;this.broadcast(room);return;}
  if(m.type==='start') {
   if(room.hostId!==p.id) {this.fail(ws,'Only the host can start the test.');return;}
   if(room.phase!=='lobby') return;
   if(room.players.length<2 || room.players.some(p=>!p.socket || !p.ready)) {this.fail(ws,'At least two connected players are needed, and everyone must be ready.');return;}
   room.match={...emptyMatch(),id:randomUUID()};room.roster=[...room.players];
   for(const p of room.players)p.matchEliminations=0;
   this.startRound(room,Date.now());return;
  }
  if(m.type==='lobby') {if(room.hostId!==p.id) {this.fail(ws,'Only the host can return everyone to the lobby.');return;} this.toLobby(room,'Host returned the room to the lobby.');return;}
  if(m.type==='input' && room.phase==='arena') {
   if(m.matchId!==room.match.id||m.roundNumber!==room.match.roundNumber||Date.now()>=room.round.endsAt)return;
   if(!Number.isSafeInteger(m.seq) || m.seq<=p.seq || m.seq>p.seq+NETWORK.maxInputAdvance || !Number.isFinite(m.dx) || !Number.isFinite(m.dy) || Math.abs(m.dx)>1 || Math.abs(m.dy)>1) return;
   if(m.sprint!==undefined && typeof m.sprint!=='boolean')return;
   if(m.dashId!==undefined && (!Number.isSafeInteger(m.dashId)||m.dashId<p.dashId||m.dashId>p.dashId+NETWORK.maxInputAdvance))return;
   if(m.attackId!==undefined&&(!Number.isSafeInteger(m.attackId)||m.attackId<p.attackId||m.attackId>p.attackId+NETWORK.maxInputAdvance))return;
   if((m.aimX!==undefined&&(!Number.isFinite(m.aimX)||Math.abs(m.aimX)>1))||(m.aimY!==undefined&&(!Number.isFinite(m.aimY)||Math.abs(m.aimY)>1)))return;
   p.attackId=m.attackId??p.attackId;p.aimX=m.aimX??0;p.aimY=m.aimY??0;
   p.seq=m.seq;p.dx=m.dx;p.dy=m.dy;p.sprint=m.sprint??false;p.dashId=m.dashId??p.dashId;p.lastInput=Date.now();
  }
 }
 toLobby(room:Room,notice:string) {if(room.phase==='lobby'){this.broadcast(room);return;}room.match=emptyMatch();room.round={endsAt:0,remainingSeconds:0,returnAt:0,results:[]};room.roster=[];room.phase='lobby';room.notice=notice;for(const p of room.players){Object.assign(p,freshMotion(SPAWNS[0]),freshCombat());p.dashSeen=p.dashId;p.attackSeen=p.attackId;p.targetId=null;p.eliminations=0;p.matchEliminations=0;p.ready=false;p.dx=0;p.dy=0;p.sprint=false;p.dashRemaining=0;p.attackFlash=0;p.hitFlash=0;p.attackSeen=p.attackId;}this.broadcast(room);}
 disconnect(ws:WebSocket) {const s=this.sessions.get(ws);if(!s)return;this.sessions.delete(ws);const {room,player:p}=s;p.socket=null;p.ready=false;p.dx=0;p.dy=0;p.sprint=false;p.dashRemaining=0;p.disconnectedAt=Date.now();this.transfer(room);this.broadcast(room);}
 transfer(room:Room) {if(!room.players.some(p=>p.id===room.hostId && p.socket)){const next=room.players.find(p=>p.socket);if(next)room.hostId=next.id;}}
 remove(room:Room,p:Player) {if(this.rooms.get(room.code)!==room||!room.players.includes(p))return;if(p.socket)this.sessions.delete(p.socket);p.socket=null;p.dx=0;p.dy=0;p.lastInput=0;p.targetId=null;room.players=room.players.filter(x=>x!==p);if(!room.players.length){this.rooms.delete(room.code);return;}this.transfer(room);if((room.phase==='arena'||room.phase==='intermission') && room.players.length<2)this.toLobby(room,'Test ended: at least two players are needed.');else {for(const other of room.players)if(other.targetId===p.id)this.assignTarget(room,other,p.id);this.broadcast(room);}}
 assignTarget(room:Room,p:Player,previous:string|null) {
  const all=room.players.filter(o=>o!==p);
  const connected=all.filter(o=>o.socket);const others=connected.length?connected:all;
  const different=others.filter(o=>o.id!==previous);
  const pool=different.length?different:others;
  const living=pool.filter(o=>o.health>0);const choices=living.length?living:pool;
  p.targetId=choices.length?choices[randomInt(choices.length)].id:null;
 }
 startRound(room:Room,now:number) {
  if(this.rooms.get(room.code)!==room||!room.match.id||!['lobby','intermission'].includes(room.phase)||room.match.roundNumber>=MATCH.rounds)return;
  if(room.players.length<2){this.toLobby(room,'Match ended: at least two players are needed.');return;}
  for(const p of room.roster)p.eliminations=0;
  room.phase='arena';room.notice='';room.match.roundNumber++;room.match.nextRoundSeconds=0;
  room.round={endsAt:now+ROUND.durationMs,remainingSeconds:ROUND.durationMs/1000,returnAt:0,results:[]};
  room.players.forEach((p,i)=>{const version=p.spawnVersion+1;Object.assign(p,freshMotion(SPAWNS[i]),freshCombat());p.spawnVersion=version;p.targetId=null;p.eliminations=0;p.dx=0;p.dy=0;p.sprint=false;p.dashId=0;p.attackId=0;p.aimX=0;p.aimY=0;p.seq=p.ack;p.lastInput=0;});
  // Generate a new random assignment each round; repeats are allowed, especially with two players.
  const order=[...room.players];for(let i=order.length-1;i>0;i--){const j=randomInt(i+1);[order[i],order[j]]=[order[j],order[i]];}
  order.forEach((p,i)=>p.targetId=order[(i+1)%order.length].id);
  this.broadcast(room);
 }
 ranking(players:Player[],match=false) {
  const score=(p:Player)=>match?p.matchEliminations:p.eliminations;
  const sorted=[...players].sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
  return sorted.map(p=>({id:p.id,name:p.name,eliminations:score(p),rank:sorted.findIndex(o=>score(o)===score(p))+1}));
 }
 endRound(room:Room,now:number) {
  if(this.rooms.get(room.code)!==room||room.phase!=='arena')return;
  room.round.remainingSeconds=0;room.round.results=this.ranking(room.roster);
  room.match.history.push(room.round.results.map(p=>({...p})));
  if(room.match.roundNumber>=MATCH.rounds){
   room.phase='complete';room.round.returnAt=0;room.match.nextRoundSeconds=0;
   room.match.results=this.ranking(room.roster,true);room.match.winners=room.match.results.filter(p=>p.rank===1).map(p=>({id:p.id,name:p.name}));
  }else{room.phase='intermission';room.round.returnAt=now+ROUND.resultsMs;room.match.nextRoundSeconds=ROUND.resultsMs/1000;}
  for(const p of room.players){p.dx=0;p.dy=0;p.sprint=false;p.sprinting=false;p.dashRemaining=0;p.attackSeen=p.attackId;p.ack=p.seq;}
  this.broadcast(room);
 }
 tick(now=Date.now()) {
  for(const room of this.rooms.values()) {
   for(const p of [...room.players]) if(!p.socket && now-p.disconnectedAt>=RECONNECT_MS)this.remove(room,p);
   if(!this.rooms.has(room.code))continue;
   room.tick++;
   if(room.phase==='intermission'){room.match.nextRoundSeconds=Math.max(0,Math.ceil((room.round.returnAt-now)/1000));if(now>=room.round.returnAt)this.startRound(room,now);else if(room.tick%2===0)this.broadcast(room);continue;}
   if(room.phase==='arena'&&now>=room.round.endsAt){this.endRound(room,now);continue;}
   if(room.phase==='arena') {
    room.round.remainingSeconds=Math.max(0,Math.ceil((room.round.endsAt-now)/1000));
    for(const p of room.players) {
     p.attackCooldown=Math.max(0,p.attackCooldown-STEP);p.protection=Math.max(0,p.protection-STEP);p.attackFlash=Math.max(0,p.attackFlash-STEP);p.hitFlash=Math.max(0,p.hitFlash-STEP);
     if(p.koRemaining>0){p.koRemaining=Math.max(0,p.koRemaining-STEP);p.ack=p.seq;p.dashSeen=p.dashId;p.attackSeen=p.attackId;
      if(p.koRemaining<1e-8){const point=safeSpawn(room.players.filter(o=>o!==p&&o.health>0).map(o=>({x:o.x,y:o.y})));const version=p.spawnVersion+1;Object.assign(p,freshMotion(point),freshCombat());p.spawnVersion=version;p.protection=COMBAT.protection;p.dashSeen=p.dashId;p.attackSeen=p.attackId;p.dx=0;p.dy=0;p.sprint=false;p.lastInput=0;}continue;
     }
     if(!p.socket)continue;const active=now-p.lastInput<NETWORK.inputTimeoutMs;const motion=advanceMotion(p,{dx:active?p.dx:0,dy:active?p.dy:0,sprint:active&&p.sprint,dashId:active?p.dashId:p.dashSeen});Object.assign(p,motion);p.ack=p.seq;
    }
    // Gather all eligible swings before applying damage: simultaneous hits can trade.
    const attacks:Player[]=[];
    for(const p of room.players){if(p.attackId<=p.attackSeen)continue;p.attackSeen=p.attackId;
     if(!p.socket||p.health<=0||p.attackCooldown>1e-8||now-p.lastInput>=NETWORK.inputTimeoutMs)continue;
     const length=Math.hypot(p.aimX,p.aimY);p.attackX=length>1e-6?p.aimX/length:p.facingX;p.attackY=length>1e-6?p.aimY/length:p.facingY;
     p.attackCooldown=COMBAT.cooldown;p.attackFlash=COMBAT.attackFlash;p.protection=0;attacks.push(p);
    }
    const damage=new Map<Player,Player[]>();
    for(const attacker of attacks){const targets=room.players.filter(p=>p!==attacker&&p.health>0&&p.protection<=0&&canHit(attacker,p,attacker.attackX,attacker.attackY));targets.sort((a,b)=>Math.hypot(a.x-attacker.x,a.y-attacker.y)-Math.hypot(b.x-attacker.x,b.y-attacker.y)||a.id.localeCompare(b.id));const target=targets[0];if(target)damage.set(target,[...(damage.get(target)||[]),attacker]);}
    const completions:Player[]=[];
    for(const [p,hitters] of damage){
     // Stable ID order defines the final damage contributor within a simultaneous tick.
     hitters.sort((a,b)=>a.id.localeCompare(b.id));const killer=hitters[Math.ceil(p.health/COMBAT.damage)-1];
     if(killer&&killer.targetId===p.id)completions.push(killer);
     p.health=Math.max(0,p.health-hitters.length*COMBAT.damage);p.hitFlash=COMBAT.hitFlash;if(p.health===0){p.koRemaining=COMBAT.respawnDelay;p.dx=0;p.dy=0;p.sprint=false;p.sprinting=false;p.dashRemaining=0;p.attackSeen=p.attackId;p.dashSeen=p.dashId;}}
    // Resolve all relationships before changing any target, preserving mutual KO credit.
    for(const p of completions){p.eliminations++;p.matchEliminations++;this.assignTarget(room,p,p.targetId);}

    if(room.tick%2===0)this.broadcast(room);
   }
  }
 }
}
