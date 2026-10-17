import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../dist/server.js');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`,clients=[];
const wait=async fn=>{const end=Date.now()+6000;while(!fn()){assert(Date.now()<end,'socket state timeout');await new Promise(r=>setTimeout(r,15));}};
try{
 assert((await (await fetch(url+'/health')).json()).ok);const html=await (await fetch(url)).text(),assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m=>m[1]);assert(assets.length>=3);for(const path of assets)assert.equal((await fetch(url+path)).status,200);
 for(let i=0;i<2;i++){const c={ws:new WebSocket(url.replace('http:','ws:')+'/ws'),room:null,id:''};clients.push(c);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.room)c.room=m.room;if(m.id)c.id=m.id;});await new Promise(r=>c.ws.once('open',r));c.ws.send(JSON.stringify(i?{type:'join',name:'Archive Guest',code:clients[0].room.code}:{type:'create',name:'Archive Host'}));await wait(()=>c.id);}
 await wait(()=>clients.every(c=>c.room.players.length===2));assert.equal(clients[0].room.code,clients[1].room.code);for(const c of clients)c.ws.send(JSON.stringify({type:'leave'}));await wait(()=>game.rooms.rooms.size===0);console.log('PASS extracted production archive: health, index, all linked bundles, two real WebSocket create/join clients, cleanup');
}finally{for(const c of clients)c.ws.terminate();await game.close();}
