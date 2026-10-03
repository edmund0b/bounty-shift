import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ARENA, STEP, move, type Position, type Input, type ClientMessage, type ServerMessage, type RoomView } from '../shared/game';
import './style.css';

type Session = { code: string; token: string; id: string };
const SESSION_KEY='bounty-shift-session';
function savedSession():Session|null{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function App(){
 const [room,setRoom]=useState<RoomView|null>(null),[id,setId]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Connecting…'),[pending,setPending]=useState(false),[help,setHelp]=useState(false),[latency,setLatency]=useState<number|null>(null);
 const ws=useRef<WebSocket|null>(null),session=useRef<Session|null>(savedSession()),roomRef=useRef<RoomView|null>(null),idRef=useRef(''),seq=useRef(0),inputs=useRef<Input[]>([]),position=useRef<Position|null>(null),keys=useRef(new Set<string>()),touch=useRef(new Set<string>()),lastPing=useRef(0),reconnecting=useRef(false);
 const send=(m:ClientMessage)=>{if(ws.current?.readyState!==WebSocket.OPEN)return false;ws.current.send(JSON.stringify(m));return true;};
 useEffect(()=>{
  let stopped=false;let retry:ReturnType<typeof setTimeout>;let attempt=0;
  const connect=()=>{
   if(stopped)return;
   const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);ws.current=socket;
   socket.onopen=()=>{if(stopped){socket.close();return;}attempt=0;setStatus('Connected');setError('');if(session.current){reconnecting.current=true;send({type:'resume',code:session.current.code,token:session.current.token});}else setPending(false);};
   socket.onmessage=event=>{
    let message:ServerMessage;try{message=JSON.parse(event.data);}catch{return;}
    if(message.type==='pong'){setLatency(Math.round(performance.now()-lastPing.current));return;}
    if(message.type==='error'){setError(message.message);setPending(false);if(message.fatal){session.current=null;sessionStorage.removeItem(SESSION_KEY);roomRef.current=null;setRoom(null);idRef.current='';setId('');}return;}
    if(message.type==='left'){session.current=null;sessionStorage.removeItem(SESSION_KEY);roomRef.current=null;setRoom(null);idRef.current='';setId('');inputs.current=[];position.current=null;setPending(false);return;}
    if(message.type==='welcome'){
     session.current={code:message.room.code,id:message.id,token:message.token};sessionStorage.setItem(SESSION_KEY,JSON.stringify(session.current));idRef.current=message.id;setId(message.id);inputs.current=[];position.current=null;reconnecting.current=true;
    }
    if(message.type==='welcome'||message.type==='state'){
     const next=message.room;const old=roomRef.current;const self=next.players.find(p=>p.id===idRef.current);
     if(self){
      if(reconnecting.current || old?.phase!==next.phase){seq.current=self.ack;inputs.current=[];position.current={x:self.x,y:self.y};keys.current.clear();touch.current.clear();reconnecting.current=false;}
      else {inputs.current=inputs.current.filter(i=>i.seq>self.ack);let pos={x:self.x,y:self.y};for(const input of inputs.current)pos=move(pos,input.dx,input.dy);position.current=pos;}
     }
     roomRef.current=next;setRoom(next);setPending(false);
    }
   };
   socket.onclose=()=>{if(stopped)return;setStatus('Reconnecting…');setPending(false);setLatency(null);keys.current.clear();touch.current.clear();inputs.current=[];retry=setTimeout(connect,Math.min(1000*2**attempt++,5000));};
   socket.onerror=()=>socket.close();
  };
  connect();
  const ping=setInterval(()=>{if(ws.current?.readyState===1){lastPing.current=performance.now();send({type:'ping'});}},2000);
  const step=setInterval(()=>{
   if(roomRef.current?.phase!=='arena'||ws.current?.readyState!==1||!position.current||reconnecting.current)return;
   const held=(...k:string[])=>k.some(v=>keys.current.has(v)||touch.current.has(v));
   let dx=Number(held('d','ArrowRight'))-Number(held('a','ArrowLeft'));let dy=Number(held('s','ArrowDown'))-Number(held('w','ArrowUp'));
   if(document.hidden){dx=0;dy=0;}
   const input={seq:++seq.current,dx,dy};send({type:'input',...input});inputs.current.push(input);if(inputs.current.length>120)inputs.current.shift();position.current=move(position.current,dx,dy);
  },STEP*1000);
  const keydown=(event:KeyboardEvent)=>{if(roomRef.current?.phase!=='arena'||(event.target as HTMLElement)?.matches('input,textarea'))return;const key=event.key.length===1?event.key.toLowerCase():event.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){event.preventDefault();keys.current.add(key);}};
  const keyup=(event:KeyboardEvent)=>keys.current.delete(event.key.length===1?event.key.toLowerCase():event.key);
  const clear=()=>{keys.current.clear();touch.current.clear();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{stopped=true;clearTimeout(retry);clearInterval(ping);clearInterval(step);ws.current?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
 },[]);
 const me=room?.players.find(p=>p.id===id),host=room?.hostId===id,canStart=!!room&&room.players.length>=2&&room.players.every(p=>p.connected&&p.ready);
 const action=(message:ClientMessage)=>{setError('');if(!send(message)){setError('Wait for the connection to return.');return;}setPending(true);};
 return <main>
  <header><div><h1>Bounty Shift</h1><p>Phase 1 · Multiplayer movement test</p></div><div className="connection" role="status">{status}{latency!==null?` · ${latency} ms`:''}</div></header>
  {error&&<div className="error" role="alert">{error}</div>}
  {!room?<section className="panel menu"><h2>Join the same room. Move together.</h2><p>This development test checks rooms and live movement. The Bounty game rules will arrive in later phases.</p><label>Display name<input maxLength={20} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" autoComplete="nickname"/></label><button disabled={pending||status!=='Connected'||!name.trim()} onClick={()=>action({type:'create',name})}>Create room</button><div className="divider">or join a friend</div><label>Room code<input maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="6-character code" autoCapitalize="characters" spellCheck={false}/></label><button className="secondary" disabled={pending||status!=='Connected'||!name.trim()||code.trim().length!==6} onClick={()=>action({type:'join',name,code})}>Join room</button><button className="text" onClick={()=>setHelp(!help)}>How to test</button>{help&&<Instructions/>}</section>:
   room.phase==='lobby'?<section className="panel lobby"><div className="room-heading"><div><p>Room code</p><div className="code">{room.code}</div></div><span>{room.players.length} / 6 players</span></div><p>Share this code with another player on the same game URL.</p>{room.notice&&<p className="notice">{room.notice}</p>}<ul className="players">{room.players.map(p=><li key={p.id}><span className="swatch" style={{background:p.color}}/><span className="player-name">{p.name}{p.id===id?' (you)':''}{p.id===room.hostId?<small>HOST</small>:null}</span><span>{!p.connected?'Reconnecting…':p.ready?'Ready':'Not ready'}</span></li>)}</ul><div className="actions"><button disabled={pending||status!=='Connected'} onClick={()=>action({type:'ready',ready:!me?.ready})}>{me?.ready?'Cancel ready':'Ready up'}</button>{host?<button className="secondary" disabled={pending||!canStart||status!=='Connected'} onClick={()=>action({type:'start'})}>Start movement test</button>:<p>The host starts when everyone is ready.</p>}</div><p className="hint">2–6 players · Everyone, including the host, must be ready.</p><Instructions/><button className="text" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave room</button></section>:
   <section className="arena-section"><div className="arena-heading"><div><h2>Movement test</h2><p>Room {room.code} · {room.players.filter(p=>p.connected).length} connected</p></div><div className="actions">{host&&<button className="secondary" disabled={status!=='Connected'||pending} onClick={()=>action({type:'lobby'})}>Return everyone to lobby</button>}<button className="secondary" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave</button></div></div><Arena room={room} id={id} predicted={position}/><p className="hint">Move with WASD or arrow keys. Your player has a white ring. Watch your friend move.</p><div className="touch-controls" aria-label="Touch movement controls">{[['w','↑'],['a','←'],['s','↓'],['d','→']].map(([key,label])=><button key={key} aria-label={`Move ${key==='w'?'up':key==='s'?'down':key==='a'?'left':'right'}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);touch.current.add(key);}} onPointerUp={()=>touch.current.delete(key)} onPointerCancel={()=>touch.current.delete(key)} onLostPointerCapture={()=>touch.current.delete(key)}>{label}</button>)}</div><ul className="legend">{room.players.map(p=><li key={p.id}><span className="swatch" style={{background:p.color}}/>{p.name}{p.id===id?' (you)':''}{!p.connected?' · reconnecting':''}</li>)}</ul></section>}
  <footer>Development test only · No combat or Bounty rounds yet.</footer>
 </main>;
}
function Instructions(){return <div className="instructions"><h3>Test rules</h3><ol><li>Two or more players join the same room.</li><li>Everyone selects Ready up. The host starts the test.</li><li>Move inside the arena using WASD, arrow keys, or touch buttons.</li><li>Check that both screens show the same players and movement.</li></ol><p>There is no winner in this movement test.</p></div>;}
function Arena({room,id,predicted}:{room:RoomView;id:string;predicted:React.RefObject<Position|null>}){
 const canvas=useRef<HTMLCanvasElement|null>(null),current=useRef(room),display=useRef(new Map<string,Position>());current.current=room;
 useEffect(()=>{let frame=0;let last=performance.now();const draw=(now:number)=>{
  const node=canvas.current;const ctx=node?.getContext('2d');if(!node||!ctx)return;
  const elapsed=Math.min(0.1,(now-last)/1000);last=now;const dpr=Math.min(devicePixelRatio||1,2),width=node.clientWidth,height=width*ARENA.height/ARENA.width;
  if(node.width!==Math.round(width*dpr)||node.height!==Math.round(height*dpr)){node.width=Math.round(width*dpr);node.height=Math.round(height*dpr);}
  ctx.setTransform(node.width/ARENA.width,0,0,node.height/ARENA.height,0,0);ctx.fillStyle='#141e2b';ctx.fillRect(0,0,ARENA.width,ARENA.height);
  ctx.strokeStyle='#263447';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=ARENA.width;x+=60){ctx.moveTo(x,0);ctx.lineTo(x,ARENA.height);}for(let y=0;y<=ARENA.height;y+=60){ctx.moveTo(0,y);ctx.lineTo(ARENA.width,y);}ctx.stroke();ctx.strokeStyle='#6d8199';ctx.lineWidth=3;ctx.strokeRect(2,2,ARENA.width-4,ARENA.height-4);
  const present=new Set(current.current.players.map(p=>p.id));for(const key of display.current.keys())if(!present.has(key))display.current.delete(key);
  for(const p of current.current.players){let pos:Position;if(p.id===id){pos=predicted.current||p;}else{const prev=display.current.get(p.id)||p;const f=1-Math.exp(-elapsed*18);pos={x:prev.x+(p.x-prev.x)*f,y:prev.y+(p.y-prev.y)*f};display.current.set(p.id,pos);}
   ctx.globalAlpha=p.connected?1:0.4;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(pos.x,pos.y,ARENA.radius,0,Math.PI*2);ctx.fill();if(p.id===id){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,pos.y,ARENA.radius+4,0,Math.PI*2);ctx.stroke();}ctx.font='15px Arial';ctx.textAlign='center';ctx.fillStyle='#f4f7ff';ctx.fillText(p.name,Math.max(65,Math.min(ARENA.width-65,pos.x)),Math.max(18,pos.y-25));ctx.globalAlpha=1;
  }
  frame=requestAnimationFrame(draw);
 };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);},[id]);
 return <canvas ref={canvas} aria-label="Multiplayer movement test arena" role="img"/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
