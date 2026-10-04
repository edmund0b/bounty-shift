import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { STEP, advanceMotion, type Motion, type Input, type ClientMessage, type ServerMessage, type RoomView } from '../shared/game';
import './style.css';
import { Arena } from './Arena';

type Session = { code: string; token: string; id: string };
const SESSION_KEY='bounty-shift-session';
function savedSession():Session|null{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function App(){
 const [room,setRoom]=useState<RoomView|null>(null),[id,setId]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Connecting…'),[pending,setPending]=useState(false),[help,setHelp]=useState(false),[latency,setLatency]=useState<number|null>(null);
 const ws=useRef<WebSocket|null>(null),session=useRef<Session|null>(savedSession()),roomRef=useRef<RoomView|null>(null),idRef=useRef(''),seq=useRef(0),inputs=useRef<Input[]>([]),position=useRef<Motion|null>(null),keys=useRef(new Set<string>()),touch=useRef(new Set<string>()),lastPing=useRef(0),reconnecting=useRef(false),dashId=useRef(0);
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
      if(reconnecting.current || old?.phase!==next.phase){seq.current=self.ack;inputs.current=[];position.current={...self};dashId.current=self.dashSeen;keys.current.clear();touch.current.clear();reconnecting.current=false;}
      else {inputs.current=inputs.current.filter(i=>i.seq>self.ack);let pos:Motion={...self};for(const input of inputs.current)pos=advanceMotion(pos,input);position.current=pos;}
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
   const input={seq:++seq.current,dx,dy,sprint:!document.hidden&&held('Shift'),dashId:dashId.current};send({type:'input',...input});inputs.current.push(input);if(inputs.current.length>120)inputs.current.shift();position.current=advanceMotion(position.current,input);
  },STEP*1000);
  const keydown=(event:KeyboardEvent)=>{if(roomRef.current?.phase!=='arena'||(event.target as HTMLElement)?.matches('input,textarea'))return;const key=event.key.length===1?event.key.toLowerCase():event.key;if(key===' '){event.preventDefault();if(!event.repeat)dashId.current++;return;}if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(key)){event.preventDefault();keys.current.add(key);}};
  const keyup=(event:KeyboardEvent)=>keys.current.delete(event.key.length===1?event.key.toLowerCase():event.key);
  const clear=()=>{keys.current.clear();touch.current.clear();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{stopped=true;clearTimeout(retry);clearInterval(ping);clearInterval(step);ws.current?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
 },[]);
 const me=room?.players.find(p=>p.id===id),host=room?.hostId===id,canStart=!!room&&room.players.length>=2&&room.players.every(p=>p.connected&&p.ready);
 const action=(message:ClientMessage)=>{setError('');if(!send(message)){setError('Wait for the connection to return.');return;}setPending(true);};
 return <main>
  <header><div><h1>Bounty Shift</h1><p>Phase 2 · Arena movement test</p></div><div className="connection" role="status">{status}{latency!==null?` · ${latency} ms`:''}</div></header>
  {error&&<div className="error" role="alert">{error}</div>}
  {!room?<section className="panel menu"><h2>Join the same room. Move together.</h2><p>This development test checks city routes, collision, sprint, dash, and live movement. The Bounty game rules will arrive in later phases.</p><label>Display name<input maxLength={20} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" autoComplete="nickname"/></label><button disabled={pending||status!=='Connected'||!name.trim()} onClick={()=>action({type:'create',name})}>Create room</button><div className="divider">or join a friend</div><label>Room code<input maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="6-character code" autoCapitalize="characters" spellCheck={false}/></label><button className="secondary" disabled={pending||status!=='Connected'||!name.trim()||code.trim().length!==6} onClick={()=>action({type:'join',name,code})}>Join room</button><button className="text" onClick={()=>setHelp(!help)}>How to test</button>{help&&<Instructions/>}</section>:
   room.phase==='lobby'?<section className="panel lobby"><div className="room-heading"><div><p>Room code</p><div className="code">{room.code}</div></div><span>{room.players.length} / 6 players</span></div><p>Share this code with another player on the same game URL.</p>{room.notice&&<p className="notice">{room.notice}</p>}<ul className="players">{room.players.map(p=><li key={p.id}><span className="swatch" style={{background:p.color}}/><span className="player-name">{p.name}{p.id===id?' (you)':''}{p.id===room.hostId?<small>HOST</small>:null}</span><span>{!p.connected?'Reconnecting…':p.ready?'Ready':'Not ready'}</span></li>)}</ul><div className="actions"><button disabled={pending||status!=='Connected'} onClick={()=>action({type:'ready',ready:!me?.ready})}>{me?.ready?'Cancel ready':'Ready up'}</button>{host?<button className="secondary" disabled={pending||!canStart||status!=='Connected'} onClick={()=>action({type:'start'})}>Start movement test</button>:<p>The host starts when everyone is ready.</p>}</div><p className="hint">2–6 players · Everyone, including the host, must be ready.</p><Instructions/><button className="text" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave room</button></section>:
   <section className="arena-section"><div className="arena-heading"><div><h2>City arena test</h2><p>Room {room.code} · {room.players.filter(p=>p.connected).length} connected</p></div><div className="actions">{host&&<button className="secondary" disabled={status!=='Connected'||pending} onClick={()=>action({type:'lobby'})}>Return everyone to lobby</button>}<button className="secondary" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave</button></div></div><Arena room={room} id={id} predicted={position}/><p className="hint">WASD / arrows: move · Shift: sprint · Space: dash. Your player has a white ring.</p><div className="touch-controls" aria-label="Touch movement controls">{[['w','↑'],['a','←'],['s','↓'],['d','→']].map(([key,label])=><button key={key} aria-label={`Move ${key==='w'?'up':key==='s'?'down':key==='a'?'left':'right'}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);touch.current.add(key);}} onPointerUp={()=>touch.current.delete(key)} onPointerCancel={()=>touch.current.delete(key)} onLostPointerCapture={()=>touch.current.delete(key)}>{label}</button>)}<button className="touch-ability" aria-label="Sprint" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);touch.current.add('Shift');}} onPointerUp={()=>touch.current.delete('Shift')} onPointerCancel={()=>touch.current.delete('Shift')} onLostPointerCapture={()=>touch.current.delete('Shift')}>Sprint</button><button className="touch-ability" aria-label="Dash" disabled={status!=='Connected'} onPointerDown={e=>{e.preventDefault();dashId.current++;}}>Dash</button></div><ul className="legend">{room.players.map(p=><li key={p.id}><span className="swatch" style={{background:p.color}}/>{p.name}{p.id===id?' (you)':''}{!p.connected?' · reconnecting':''}</li>)}</ul></section>}
  <footer>Development test only · No combat or Bounty rounds yet.</footer>
 </main>;
}
function Instructions(){return <div className="instructions"><h3>Test rules</h3><ol><li>Two or more players join the same room.</li><li>Everyone selects Ready up. The host starts the test.</li><li>Move with WASD / arrows. Hold Shift to sprint; press Space to dash. Touch buttons are also available.</li><li>Buildings block all movement, including dash. Stamina recharges after sprinting; dash recharges in 3 seconds. Compare movement when both players are nearby.</li></ol><p>There is no winner in this movement test.</p></div>;}
createRoot(document.getElementById('root')!).render(<App/>);
