// Optional real-duration integration check: no fixture positions or accelerated timers.
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {setTimeout as delay} from 'node:timers/promises';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.ts');
const {MAPS}=await import('../shared/map.ts');
const {isWalkable}=await import('../shared/game.ts');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
const url=`ws://127.0.0.1:${game.server.address().port}/ws`,clients=[];
async function wait(condition,timeout=6000){const deadline=Date.now()+timeout;while(!condition()){assert(Date.now()<deadline,'Timed out waiting for synchronized state');await delay(30);}}
async function connect(){const c={ws:new WebSocket(url),room:null,id:null,token:null,errors:[]};c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.room)c.room=m.room;if(m.type==='welcome'){c.id=m.id;c.token=m.token;}if(m.type==='error')c.errors.push(m);});await new Promise((r,j)=>{c.ws.once('open',r);c.ws.once('error',j);});return c;}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
try{
 clients.push(await connect());send(clients[0],{type:'create',name:'Soak A'});await wait(()=>clients[0].room);
 const code=clients[0].room.code;
 for(let i=1;i<3;i++){clients.push(await connect());send(clients[i],{type:'join',name:`Soak ${i}`,code});await wait(()=>clients[i].room);}
 await wait(()=>clients.every(c=>c.room.players.length===3));clients.forEach(c=>send(c,{type:'ready',ready:true}));await wait(()=>clients[0].room.players.every(p=>p.ready));send(clients[0],{type:'start'});
 const started=Date.now();
 for(let n=1;n<=3;n++){
  await wait(()=>clients.every(c=>c.room.phase==='arena'&&c.room.match.roundNumber===n),10000);
  const mapId=n===2?'scorched_point':'central_plaza';assert(clients.every(c=>c.room.mapId===mapId));assert(clients.every(c=>c.room.round.endsAt===clients[0].room.round.endsAt));
  clients.forEach(c=>assert(c.room.players.every(p=>isWalkable(p,MAPS[mapId]))));
  console.log(`Real-time Round ${n}: ${mapId}; three WebSocket clients agree`);
  const c=clients[0],self=c.room.players.find(p=>p.id===c.id);let seq=self.ack;
  for(let i=0;i<18;i++){send(c,{type:'input',matchId:c.room.match.id,roundNumber:n,seq:++seq,dx:0,dy:.4,sprint:true,dashId:i>10?1:0});await delay(34);}
  await delay(150);assert(c.room.players.find(p=>p.id===c.id).stamina<100);assert(c.room.players.every(p=>isWalkable(p,MAPS[mapId])));
  if(n===2){const token=c.token,id=c.id;c.ws.close();await delay(150);const replacement=await connect();send(replacement,{type:'resume',code,token});await wait(()=>replacement.room);assert.equal(replacement.id,id);assert.equal(replacement.room.mapId,mapId);assert.equal(replacement.room.players.length,3);clients[0]=replacement;console.log('Real-time Round 2 reconnect restored the same identity/map');}
  await wait(()=>clients.every(c=>c.room.phase!=='arena'),100000);
  assert(clients.every(c=>c.room.match.roundNumber===n&&c.room.round.remainingSeconds===0));
  if(n<3){assert(clients.every(c=>c.room.phase==='intermission'));assert(clients.every(c=>c.room.nextMapId===(n===1?'scorched_point':'central_plaza')));}
 }
 assert(Date.now()-started>=279000,'All three real 90-second rounds and intermissions must run');
 assert(clients.every(c=>c.room.phase==='complete'));
 assert(clients.every(c=>JSON.stringify(c.room.match.mapHistory)==='["central_plaza","scorched_point","central_plaza"]'));
 assert(clients.every(c=>c.room.match.winners.length===3));const host=clients.find(c=>c.id===c.room.hostId);send(host,{type:'lobby'});await wait(()=>clients.every(c=>c.room.phase==='lobby'));
 clients.forEach(c=>send(c,{type:'ready',ready:true}));await wait(()=>host.room.players.every(p=>p.ready));send(host,{type:'start'});await wait(()=>clients.every(c=>c.room.phase==='arena'));assert(clients.every(c=>c.room.mapId==='central_plaza'&&c.room.match.roundNumber===1));
 assert(clients.every(c=>c.errors.length===0));console.log(`PASS: full-duration three-client match, ${((Date.now()-started)/1000).toFixed(1)} seconds, rotation/reconnect/results/fresh opening`);
}finally{clients.forEach(c=>c.ws.close());await game.close();}
