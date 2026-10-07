import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.js');
test('real WebSocket clients agree on mode, teams, state and three-round results at every supported roster',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');
 try{for(const mode of ['tag','kill_race','flag_run'])for(const [count,format] of [[2,'solo'],[4,'solo'],[6,'solo'],[4,'duo'],[6,'duo']] as const){
  const clients:{ws:WebSocket;room:any;id:string;messages:any[]}[]=[];
  const wait=async(fn:()=>boolean)=>{const until=Date.now()+5000;while(!fn()){if(Date.now()>until)throw Error(`Timeout ${mode} ${count} ${format}`);await new Promise(r=>setTimeout(r,10));}};
  try{
   for(let i=0;i<count;i++){const ws=new WebSocket(`ws://127.0.0.1:${address.port}/ws`);const c={ws,room:null as any,id:'',messages:[] as any[]};clients.push(c);ws.on('message',data=>{const m=JSON.parse(data.toString());c.messages.push(m);if(m.room)c.room=m.room;if(m.type==='welcome')c.id=m.id;});await new Promise<void>(r=>ws.once('open',r));ws.send(JSON.stringify(i?{type:'join',name:`P${i}`,code:clients[0].room.code}:{type:'create',name:'P0'}));await wait(()=>!!c.room);}
   const send=(i:number,m:any)=>clients[i].ws.send(JSON.stringify(m));send(1,{type:'settings',mode:'flag_run',format:'duo'});await wait(()=>clients[1].messages.some(m=>m.type==='error'));assert.equal(clients[0].room.selectedGameMode,'tag');
   send(0,{type:'settings',mode,format});await wait(()=>clients.every(c=>c.room.selectedGameMode===mode&&c.room.selectedFormat===format));clients.forEach((_,i)=>send(i,{type:'ready',ready:true}));await wait(()=>clients[0].room.players.every((p:any)=>p.ready));send(0,{type:'start'});await wait(()=>clients.every(c=>c.room.phase==='arena'));const room=game.rooms.rooms.get(clients[0].room.code)!;
   for(const c of clients){assert.deepEqual(c.room.mode.teams,clients[0].room.mode.teams);assert.equal(c.room.objective.target,null);}
   for(let round=1;round<=3;round++){game.rooms.tick(room.round.endsAt);await wait(()=>clients.every(c=>c.room.phase===(round===3?'complete':'intermission')));for(const c of clients)assert.deepEqual(c.room.match,clients[0].room.match);if(round<3){game.rooms.tick(room.round.returnAt);await wait(()=>clients.every(c=>c.room.phase==='arena'&&c.room.match.roundNumber===round+1));}}
   send(0,{type:'lobby'});await wait(()=>clients.every(c=>c.room.phase==='lobby'));assert(clients[0].room.players.every((p:any)=>!p.ready));
  }finally{for(const c of clients){c.ws.send(JSON.stringify({type:'leave'}));c.ws.close();}}
 }}finally{await game.close();}
});

test('real clients synchronize chest contention, physical loot and authoritative freeze/thaw',async()=>{
 const game=await createGameServer(true);await new Promise<void>(r=>game.server.listen(0,'127.0.0.1',r));const address=game.server.address();assert(address&&typeof address==='object');const clients:{ws:WebSocket;room:any;id:string;events:any[]}[]=[];
 const wait=async(fn:()=>boolean)=>{const end=Date.now()+6000;while(!fn()){if(Date.now()>end)throw Error('Chest/freeze network timeout');await new Promise(r=>setTimeout(r,10));}};
 try{
 for(let i=0;i<2;i++){const ws=new WebSocket(`ws://127.0.0.1:${address.port}/ws`),client={ws,room:null as any,id:'',events:[] as any[]};clients.push(client);ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.room){client.room=m.room;client.events.push(...m.room.mode.effects);}if(m.type==='welcome')client.id=m.id;});await new Promise<void>(r=>ws.once('open',r));ws.send(JSON.stringify(i?{type:'join',name:'Guest',code:clients[0].room.code}:{type:'create',name:'Host'}));await wait(()=>!!client.room);}
 const send=(i:number,m:any)=>clients[i].ws.send(JSON.stringify(m));clients.forEach((_,i)=>send(i,{type:'ready',ready:true}));await wait(()=>clients[0].room.players.every((p:any)=>p.ready));send(0,{type:'start'});await wait(()=>clients.every(c=>c.room.phase==='arena'));const room=game.rooms.rooms.get(clients[0].room.code)!,chest=room.mode.items.find(i=>i.source==='chest')!;room.players.forEach(p=>Object.assign(p,{x:chest.x,y:chest.y,elevation:chest.elevation??0}));const use={type:'interact',matchId:room.match.id,roundNumber:1};send(0,use);send(1,use);await wait(()=>clients.every(c=>c.room.mode.items.find((i:any)=>i.id===chest.id).state==='opening'));assert.equal(chest.kind,'freeze_ball');assert(room.players.every(p=>p.heldItem===null));assert.equal(clients[0].room.mode.items[0].openedAt,clients[1].room.mode.items[0].openedAt);
 await wait(()=>chest.state==='opened');room.players.forEach(p=>Object.assign(p,{...chest.pickupPosition,elevation:chest.elevation??0}));send(0,use);send(1,use);await wait(()=>chest.state==='empty');assert.equal(room.players.filter(p=>p.heldItem==='freeze_ball').length,1);await wait(()=>clients.every(c=>c.room.mode.items.find((i:any)=>i.id===chest.id).state==='empty'));
 const owner=room.players.findIndex(p=>p.heldItem==='freeze_ball'),target=1-owner,p=room.players[owner],q=room.players[target];Object.assign(p,{x:1000,y:700,elevation:0});Object.assign(q,{x:1080,y:700,elevation:0});send(owner,{type:'input',matchId:room.match.id,roundNumber:1,seq:p.seq+1,dx:0,dy:0,attackId:p.attackId+1,aimX:1,aimY:0});await wait(()=>clients.every(c=>c.events.some(e=>e.type==='ice_hit'&&e.targetId===q.id)));assert.equal(p.heldItem,null);const hit=clients[0].events.find(e=>e.type==='ice_hit'&&e.targetId===q.id);assert.equal(q.frozenUntil,hit.at+3000);assert(clients.every(c=>c.room.players.find((o:any)=>o.id===q.id).frozenUntil===q.frozenUntil));await wait(()=>Date.now()>q.frozenUntil&&clients.every(c=>c.room.mode.effects.length===0));assert.equal(chest.state,'empty');
 }finally{for(const c of clients)c.ws.terminate();await game.close();}
});
