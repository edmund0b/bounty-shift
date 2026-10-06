import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../dist/server.js');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${game.server.address().port}`;const clients=[];
const wait=async fn=>{const until=Date.now()+5000;while(!fn()){if(Date.now()>until)throw Error('Bundle test timeout');await new Promise(r=>setTimeout(r,10));}};
try{
 assert.equal((await fetch(url+'/health')).status,200);const html=await(await fetch(url)).text();assert(html.includes('Bounty Shift'));const asset=html.match(/src="([^"]+\.js)"/);assert(asset);assert.equal((await fetch(url+asset[1])).status,200);
 for(let i=0;i<2;i++){const c={ws:new WebSocket(url.replace('http:','ws:')+'/ws'),room:null};clients.push(c);c.ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.room)c.room=m.room;});await new Promise(r=>c.ws.once('open',r));c.ws.send(JSON.stringify(i?{type:'join',name:'Guest',code:clients[0].room.code}:{type:'create',name:'Host'}));await wait(()=>!!c.room);}
 for(const c of clients)c.ws.send(JSON.stringify({type:'ready',ready:true}));await wait(()=>clients[0].room.players.every(p=>p.ready));clients[0].ws.send(JSON.stringify({type:'start'}));await wait(()=>clients.every(c=>c.room.phase==='arena'));assert.equal(clients[0].room.selectedGameMode,'tag');assert.equal(clients[0].room.mode.it,clients[1].room.mode.it);console.log('PASS: compiled production server serves client assets and starts synchronized two-player Tag over real WebSockets.');
}finally{for(const c of clients)c.ws.terminate();await game.close();}
