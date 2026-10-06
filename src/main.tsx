import {ModeHud} from './ModeHud';
import {validTeams} from '../shared/modes';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { STEP, NETWORK, advanceMotion, type Motion, type Input, type ClientMessage, type ServerMessage, type RoomView } from '../shared/game';
import './style.css';
import { Arena } from './Arena';
import { PlayerStatus, ActionIcon } from './GameHud';
import {MAPS} from '../shared/map';
import {EntryFlow} from './EntryFlow';
import { cameraMovement, cameraAim, VIEW, CONTROLLER, type CameraControl } from '../shared/presentation';

type Session = { code: string; token: string; id: string };
const SESSION_KEY='bounty-shift-session';
function savedSession():Session|null{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function storeSession(value:Session|null){try{if(value)sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));else sessionStorage.removeItem(SESSION_KEY);}catch{/* In-memory reconnect still works when browser storage is unavailable. */}}
function App(){
 const [room,setRoom]=useState<RoomView|null>(null),[id,setId]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Connecting…'),[pending,setPending]=useState(false),[latency,setLatency]=useState<number|null>(null);
 const dashStyle=useRef<'dash'|'dodge'|'slide'>('dash');
 const ws=useRef<WebSocket|null>(null),session=useRef<Session|null>(savedSession()),roomRef=useRef<RoomView|null>(null),idRef=useRef(''),seq=useRef(0),inputs=useRef<Input[]>([]),position=useRef<Motion|null>(null),touchPointers=useRef(new Map<number,string>()),keys=useRef(new Set<string>()),touch=useRef(new Set<string>()),lastPing=useRef(0),reconnecting=useRef(false),dashId=useRef(0),attackId=useRef(0),aim=useRef({x:0,y:0}),yaw=useRef(0),look=useRef<CameraControl>({targetYaw:0,targetPitch:CONTROLLER.defaultPitch,pitch:CONTROLLER.defaultPitch}),stick=useRef({x:0,y:0});
 const holdTouch=(event:React.PointerEvent<HTMLButtonElement>,key:string)=>{event.preventDefault();if(reconnecting.current||ws.current?.readyState!==1||roomRef.current?.phase!=='arena'||!roomRef.current.players.find(p=>p.id===idRef.current)?.health)return;event.currentTarget.setPointerCapture(event.pointerId);touchPointers.current.set(event.pointerId,key);touch.current.add(key);};
 const releaseTouch=(event:React.PointerEvent<HTMLButtonElement>)=>{const key=touchPointers.current.get(event.pointerId);touchPointers.current.delete(event.pointerId);if(key&&![...touchPointers.current.values()].includes(key))touch.current.delete(key);};
 const attack=()=>{if(ws.current?.readyState!==1||roomRef.current?.phase!=='arena'||!roomRef.current.players.find(p=>p.id===idRef.current)?.health)return;aim.current=cameraAim(yaw.current);attackId.current++;};
 const send=(m:ClientMessage)=>{if(ws.current?.readyState!==WebSocket.OPEN)return false;ws.current.send(JSON.stringify(m));return true;};
 useEffect(()=>{
  let stopped=false;let retry:ReturnType<typeof setTimeout>;let resumeRetry:ReturnType<typeof setTimeout>;let attempt=0;let resumeAttempts=0;
  const connect=()=>{
   if(stopped)return;
   const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);ws.current=socket;
   socket.onopen=()=>{if(stopped){socket.close();return;}attempt=0;resumeAttempts=0;setStatus('Connected');setError('');if(session.current){reconnecting.current=true;send({type:'resume',code:session.current.code,token:session.current.token});}else setPending(false);};
   socket.onmessage=event=>{if(stopped||socket!==ws.current)return;
    let message:ServerMessage;try{message=JSON.parse(event.data);}catch{return;}
    if(message.type==='pong'){setLatency(Math.round(performance.now()-lastPing.current));return;}
    if(message.type==='error'){
     if(message.retryable&&session.current&&resumeAttempts++<NETWORK.resumeAttempts){setStatus('Recovering session…');clearTimeout(resumeRetry);resumeRetry=setTimeout(()=>{if(!stopped&&socket===ws.current&&socket.readyState===1&&session.current)send({type:'resume',code:session.current.code,token:session.current.token});},NETWORK.resumeRetryMs);setError(message.message);return;}
     if(message.retryable){message.fatal=true;message.message='This session is still active in another tab. Close the duplicate tab, or create/join as a different player.';}
     setStatus('Connected');setError(message.message);setPending(false);if(message.fatal){reconnecting.current=false;inputs.current=[];position.current=null;session.current=null;storeSession(null);roomRef.current=null;setRoom(null);idRef.current='';setId('');}return;}
    if(message.type==='left'){session.current=null;storeSession(null);roomRef.current=null;setRoom(null);idRef.current='';setId('');inputs.current=[];position.current=null;setPending(false);return;}
    if(message.type==='welcome'){clearTimeout(resumeRetry);resumeAttempts=0;setStatus('Connected');setError('');
     session.current={code:message.room.code,id:message.id,token:message.token};storeSession(session.current);idRef.current=message.id;setId(message.id);inputs.current=[];position.current=null;reconnecting.current=true;
    }
    if(message.type==='welcome'||message.type==='state'){
     const next=message.room;const old=roomRef.current;const self=next.players.find(p=>p.id===idRef.current);const oldSelf=old?.players.find(p=>p.id===idRef.current);
     if(self){
      if(next.phase==='arena'&&(old?.phase!==next.phase||old?.mapId!==next.mapId)){const plaza=MAPS[next.mapId]?.plaza,other=next.players.find(p=>p.id!==self.id);const focus=plaza?{x:plaza.x+plaza.width/2,y:plaza.y+plaza.height/2}:other;if(focus)yaw.current=look.current.targetYaw=Math.atan2(focus.x-self.x,-(focus.y-self.y));}
      if(reconnecting.current || old?.phase!==next.phase || old?.mapId!==next.mapId || oldSelf?.spawnVersion!==self.spawnVersion || (!!oldSelf?.koRemaining)!==!!self.koRemaining){seq.current=self.ack;inputs.current=[];position.current={...self};dashId.current=self.dashSeen;attackId.current=self.attackSeen;aim.current={x:0,y:0};keys.current.clear();touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};reconnecting.current=false;}
      else {inputs.current=inputs.current.filter(i=>i.seq>self.ack);let pos:Motion={...self};if(self.health>0&&self.frozenUntil<=next.serverTime)for(const input of inputs.current)pos=advanceMotion(pos,input,STEP,MAPS[next.mapId]);position.current=pos;}
     }
     roomRef.current=next;setRoom(next);setPending(false);
    }
   };
   socket.onclose=()=>{clearTimeout(resumeRetry);if(stopped||socket!==ws.current)return;setStatus('Reconnecting…');setPending(false);setLatency(null);keys.current.clear();touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};inputs.current=[];retry=setTimeout(connect,Math.min(1000*2**attempt++,5000));};
   socket.onerror=()=>socket.close();
  };
  connect();
  const ping=setInterval(()=>{if(ws.current?.readyState===1){lastPing.current=performance.now();send({type:'ping'});}},2000);
  const step=setInterval(()=>{
   if(roomRef.current?.phase!=='arena'||ws.current?.readyState!==1||!position.current||reconnecting.current)return;
   const held=(...k:string[])=>k.some(v=>keys.current.has(v)||touch.current.has(v));
   look.current.targetYaw+=(Number(held('e'))-Number(held('q')))*VIEW.turnSpeed*STEP;
   let {dx,dy}=cameraMovement(Number(held('d','ArrowRight'))-Number(held('a','ArrowLeft'))+stick.current.x,Number(held('w','ArrowUp'))-Number(held('s','ArrowDown'))+stick.current.y,yaw.current);
   const player=roomRef.current.players.find(p=>p.id===idRef.current);const alive=!!player?.health&&player.frozenUntil<=roomRef.current.serverTime;if(document.hidden||!alive){dx=0;dy=0;}
   const input={matchId:roomRef.current.match.id,roundNumber:roomRef.current.match.roundNumber,seq:++seq.current,dx,dy,sprint:alive&&!document.hidden&&held('Shift'),dashId:dashId.current,dashStyle:dashStyle.current,attackId:attackId.current,aimX:aim.current.x,aimY:aim.current.y};send({type:'input',...input});inputs.current.push(input);if(inputs.current.length>120)inputs.current.shift();if(alive)position.current=advanceMotion(position.current,input,STEP,MAPS[roomRef.current.mapId]);
  },STEP*1000);
  const keydown=(event:KeyboardEvent)=>{if(roomRef.current?.phase!=='arena'||(event.target as HTMLElement)?.matches('input,textarea,button,a,select'))return;const key=event.key.length===1?event.key.toLowerCase():event.key;if(key==='r'){event.preventDefault();if(!event.repeat&&roomRef.current)send({type:'interact',matchId:roomRef.current.match.id,roundNumber:roomRef.current.match.roundNumber});return;}if(key==='f'){event.preventDefault();if(!event.repeat)attack();return;}if([' ','z','x'].includes(key)){event.preventDefault();if(!event.repeat){dashStyle.current=key==='z'?'dodge':key==='x'?'slide':'dash';dashId.current++;}return;}if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift','q','e'].includes(key)){event.preventDefault();keys.current.add(key);}};
  const keyup=(event:KeyboardEvent)=>keys.current.delete(event.key.length===1?event.key.toLowerCase():event.key);
  const clear=()=>{keys.current.clear();touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};};
  const presentation=window.matchMedia('(pointer:coarse)');presentation.addEventListener('change',clear);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{presentation.removeEventListener('change',clear);stopped=true;clearTimeout(retry);clearTimeout(resumeRetry);clearInterval(ping);clearInterval(step);ws.current?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
 },[]);
 const me=room?.players.find(p=>p.id===id),host=room?.hostId===id,canStart=!!room&&validTeams(room.selectedFormat,room.players.length)&&room.players.every(p=>p.connected&&p.ready);
 const action=(message:ClientMessage)=>{setError('');if(!send(message)){setError('Wait for the connection to return.');return;}setPending(true);};
 const inMatch=!!room&&room.phase!=='lobby';
 useEffect(()=>{document.documentElement.classList.toggle('match-open',inMatch);document.body.classList.toggle('match-open',inMatch);return()=>{document.documentElement.classList.remove('match-open');document.body.classList.remove('match-open');};},[inMatch]);
 return <main className={inMatch?'game-screen':'entry-screen'}>
  {inMatch&&room?<div className="hud-left">
   <header className="match-info"><div className="brand"><h1>Bounty Shift</h1><p>Arena · {MAPS[room.mapId].name}{room.mapVariant?` · ${room.mapVariant==='day'?'Day':'Night'}`:''}</p></div><div className="match-summary"><strong>ROUND {room.match.roundNumber} / {room.match.totalRounds}</strong><span>Room {room.code} · {room.players.filter(p=>p.connected).length} connected</span></div>
   <div className="match-tools">{status!=='Connected'&&<span role="status">{status}</span>}{host&&<button className="secondary" aria-label="Return everyone to lobby" title="Return everyone to lobby" disabled={status!=='Connected'||pending} onClick={()=>action({type:'lobby'})}>Lobby</button>}<button className="secondary" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave</button></div></header>
   {room.phase==='arena'&&<><ModeHud room={room} id={id}/><PlayerStatus room={room} id={id} predicted={position}/></>}
  </div>:null}
  {error&&<div className="error" role="alert">{inMatch?error:error.replace(/\btest\b/gi,'match')}</div>}
  {!inMatch?<EntryFlow room={room} id={id} name={name} code={code} status={status} latency={latency} pending={pending} setName={setName} setCode={setCode} action={action} canStart={canStart}/>:room?
   <section className="arena-section">{room.phase==='intermission'||room.phase==='complete'?<div className="panel" role="status"><h2>{room.phase==='complete'?'MATCH COMPLETE':'Round complete'}</h2>{room.phase==='complete'?<p>{room.match.winners.length>1?'MATCH TIED: ':'WINNER: '}{room.match.winners.map(p=>p.name).join(', ')}</p>:<p>NEXT ROUND IN {room.match.nextRoundSeconds} · {MAPS[room.nextMapId??room.mapId]?.name.toUpperCase()}</p>}<p>{room.mode.reason}</p><ol>{(room.phase==='complete'?room.match.results:room.round.results).map(p=><li key={p.id}>#{p.rank} {p.name}{p.id===id?' (you)':''} — {p.eliminations} {room.phase==='complete'?'round wins':room.selectedGameMode==='kill_race'?'eliminations':'round points'}</li>)}</ol>{room.phase==='complete'&&<p>The host can return everyone to the lobby.</p>}</div>:<><Arena room={room} id={id} predicted={position} yaw={yaw} look={look} stick={stick} onAttack={attack}/><div className="movement-extras"><button disabled={!me?.health||status!=='Connected'} onPointerDown={e=>{e.preventDefault();dashStyle.current='dodge';dashId.current++;}}>DODGE <small>Z</small></button><button disabled={!me?.health||status!=='Connected'} onPointerDown={e=>{e.preventDefault();dashStyle.current='slide';dashId.current++;}}>SLIDE <small>X</small></button></div><button className="item-use" disabled={status!=='Connected'||!me?.health} onClick={()=>send({type:'interact',matchId:room.match.id,roundNumber:room.match.roundNumber})}>USE <small>[R]</small></button>{me?.health===0&&<div className="respawn-countdown" role="status">RESPAWNING IN<b>{Math.ceil(me.koRemaining)}</b></div>}<div className="touch-controls" aria-label="Touch movement controls"><button className="touch-ability" aria-label="Sprint" onPointerDown={e=>holdTouch(e,'Shift')} onPointerUp={releaseTouch} onPointerCancel={releaseTouch} onLostPointerCapture={releaseTouch}><ActionIcon action="sprint"/><span>Sprint</span></button><button className="touch-ability" aria-label="Dash" disabled={status!=='Connected'||!me?.health} onPointerDown={e=>{e.preventDefault();if(roomRef.current?.phase==='arena'&&!reconnecting.current){dashStyle.current='dash';dashId.current++;}}}><ActionIcon action="dash"/><span>Dash</span></button><button className="touch-ability" aria-label="Attack" disabled={status!=='Connected'||!me?.health} onPointerDown={e=>{e.preventDefault();attack();}}><ActionIcon action="attack"/><span>Attack</span></button></div></>}</section>:null}

 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
