import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { RoomServer } from './rooms.js';
export async function createGameServer(production = process.env.NODE_ENV==='production' || fileURLToPath(import.meta.url).replaceAll('\\','/').endsWith('/dist/server.js')) {
 const app=express();app.disable('x-powered-by');
 const server=createServer(app);const rooms=new RoomServer();
 const wss=new WebSocketServer({noServer:true,maxPayload:2048});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/ws'){socket.destroy();return;}
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  if(wss.clients.size>=600){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  let count=0;let windowStart=Date.now();let alive=true;
  ws.on('pong',()=>{alive=true;});
  const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},5000);
  ws.on('message',raw=>{if(Date.now()-windowStart>=1000){count=0;windowStart=Date.now();}if(++count>90){ws.close(1008,'Too many messages');return;}rooms.message(ws,raw.toString());});
  ws.on('close',()=>{clearInterval(heartbeat);rooms.disconnect(ws);});ws.on('error',()=>{});
 });
 const timer=setInterval(()=>rooms.tick(),1000/30);
 app.get('/health',(_req,res)=>res.json({ok:true,phase:4}));
 let vite: any;
 if(production){const here=dirname(fileURLToPath(import.meta.url));app.use(express.static(resolve(here,'../dist/client')));app.get('/',(_req,res)=>res.sendFile(resolve(here,'../dist/client/index.html')));}
 else {const {createServer}=await import('vite');vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'spa'} as any);app.use(vite.middlewares);}
 return {server,rooms,close:async()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();await new Promise<void>(r=>wss.close(()=>r()));await new Promise<void>(r=>server.close(()=>r()));if(vite)await vite.close();}};
}
if(process.env.BOUNTY_TEST!=='1') {
 const game=await createGameServer();const port=Number(process.env.PORT)||3000;
 game.server.listen(port,'0.0.0.0',()=>console.log(`Bounty Shift Phase 4 listening on port ${port}`));
 for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void game.close().then(()=>process.exit(0));});
}
