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
