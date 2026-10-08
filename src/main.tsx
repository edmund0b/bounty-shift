import {BINDINGS,ControlInput,type ControlAction} from '../shared/control-input';
import type {Slot} from '../shared/inventory';
import {interactionLabel} from './InteractionPrompt';

import {InteractionPrompt} from './InteractionPrompt';
import {LoadoutHud} from './LoadoutHud';
import {ControlHints} from './ControlHints';
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

import './lobby-polish.css';
import './hud-polish.css';
import './loot-polish.css';
import './control-update.css';

type Session = { code: string; token: string; id: string };
const SESSION_KEY='bounty-shift-session';
function savedSession():Session|null{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function storeSession(value:Session|null){try{if(value)sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));else sessionStorage.removeItem(SESSION_KEY);}catch{/* In-memory reconnect still works when browser storage is unavailable. */}}
function App(){
 const [room,setRoom]=useState<RoomView|null>(null),[id,setId]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Connecting…'),[pending,setPending]=useState(false),[latency,setLatency]=useState<number|null>(null);
 const [mapOpen,setMapOpen]=useState(false),[hintsShown,setHintsShown]=useState(()=>{try{return localStorage.getItem('bounty-shift-control-hints')!=='hidden';}catch{return true;}});
 const mapRef=useRef(false),jumpId=useRef(0),crouch=useRef(false),control=useRef<ControlInput|null>(null);
 const dashStyle=useRef<'dash'|'dodge'|'slide'>('dash');
 const ws=useRef<WebSocket|null>(null),session=useRef<Session|null>(savedSession()),roomRef=useRef<RoomView|null>(null),idRef=useRef(''),seq=useRef(0),inputs=useRef<Input[]>([]),position=useRef<Motion|null>(null),touchPointers=useRef(new Map<number,string>()),touch=useRef(new Set<string>()),lastPing=useRef(0),reconnecting=useRef(false),dashId=useRef(0),attackId=useRef(0),aim=useRef({x:0,y:0}),yaw=useRef(0),look=useRef<CameraControl>({targetYaw:0,targetPitch:CONTROLLER.defaultPitch,pitch:CONTROLLER.defaultPitch}),stick=useRef({x:0,y:0});
 const holdTouch=(event:React.PointerEvent<HTMLButtonElement>,key:string)=>{event.preventDefault();if(reconnecting.current||ws.current?.readyState!==1||roomRef.current?.phase!=='arena'||!roomRef.current.players.find(p=>p.id===idRef.current)?.health)return;event.currentTarget.setPointerCapture(event.pointerId);touchPointers.current.set(event.pointerId,key);touch.current.add(key);};
 const releaseTouch=(event:React.PointerEvent<HTMLButtonElement>)=>{const key=touchPointers.current.get(event.pointerId);touchPointers.current.delete(event.pointerId);if(key&&![...touchPointers.current.values()].includes(key))touch.current.delete(key);};
 const playable=()=>{const r=roomRef.current,p=r?.players.find(p=>p.id===idRef.current);return !mapRef.current&&!reconnecting.current&&ws.current?.readyState===1&&r?.phase==='arena'&&!!p?.health&&p.frozenUntil<=r.serverTime;};
 const attack=()=>{if(!playable())return;aim.current=cameraAim(yaw.current);attackId.current++;};
 const send=(m:ClientMessage)=>{if(ws.current?.readyState!==WebSocket.OPEN)return false;ws.current.send(JSON.stringify(m));return true;};
 const clearControls=()=>{control.current?.cancel();touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};};
 const changeMap=(open:boolean)=>{mapRef.current=open;setMapOpen(open);clearControls();};
 const perform=(action:ControlAction)=>{
  if(action==='map'){changeMap(!mapRef.current);return;}
  if(action==='hints'){setHintsShown(v=>!v);return;}
  if(!playable())return;
  if(action==='attack')attack();
  else if(action==='jump'){jumpId.current++;crouch.current=false;}
  else if(action==='crouch')crouch.current=!crouch.current;
  else if(['dash','dodge','slide'].includes(action)){dashStyle.current=action as 'dash'|'dodge'|'slide';dashId.current++;crouch.current=false;}
  else {const r=roomRef.current!;if(action==='interact')send({type:'interact',matchId:r.match.id,roundNumber:r.match.roundNumber});else if(action.startsWith('slot'))send({type:'equip',slot:Number(action.slice(4)) as Slot,matchId:r.match.id,roundNumber:r.match.roundNumber});}
 };
 if(!control.current)control.current=new ControlInput(perform);
 useEffect(()=>{try{localStorage.setItem('bounty-shift-control-hints',hintsShown?'shown':'hidden');}catch{}},[hintsShown]);
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
      if(reconnecting.current || old?.phase!==next.phase || old?.mapId!==next.mapId || oldSelf?.spawnVersion!==self.spawnVersion || (!!oldSelf?.koRemaining)!==!!self.koRemaining){seq.current=self.ack;inputs.current=[];position.current={...self};dashId.current=self.dashSeen;jumpId.current=self.jumpSeen??0;crouch.current=!!self.crouched;control.current?.cancel();changeMap(false);attackId.current=self.attackSeen;aim.current={x:0,y:0};touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};reconnecting.current=false;}
      else {inputs.current=inputs.current.filter(i=>i.seq>self.ack);let pos:Motion={...self};if(self.health>0&&self.frozenUntil<=next.serverTime)for(const input of inputs.current)pos=advanceMotion(pos,input,STEP,MAPS[next.mapId]);position.current=pos;}
     }
     roomRef.current=next;setRoom(next);setPending(false);
    }
   };
   socket.onclose=()=>{clearTimeout(resumeRetry);if(stopped||socket!==ws.current)return;setStatus('Reconnecting…');setPending(false);setLatency(null);control.current?.cancel();touch.current.clear();touchPointers.current.clear();stick.current={x:0,y:0};inputs.current=[];retry=setTimeout(connect,Math.min(1000*2**attempt++,5000));};
   socket.onerror=()=>socket.close();
  };
  connect();
  const ping=setInterval(()=>{if(ws.current?.readyState===1){lastPing.current=performance.now();send({type:'ping'});}},2000);
  const step=setInterval(()=>{
   if(roomRef.current?.phase!=='arena'||ws.current?.readyState!==1||!position.current||reconnecting.current)return;
   control.current?.update(performance.now());
   const held=(...k:string[])=>k.some(v=>control.current?.held.has(v)||touch.current.has(v));
   look.current.targetYaw+=(Number(held(BINDINGS.cameraRight))-Number(held(BINDINGS.cameraLeft)))*VIEW.turnSpeed*STEP;
   let {dx,dy}=cameraMovement(Number(held('d','ArrowRight'))-Number(held('a','ArrowLeft'))+stick.current.x,Number(held('w','ArrowUp'))-Number(held('s','ArrowDown'))+stick.current.y,yaw.current);
   const player=roomRef.current.players.find(p=>p.id===idRef.current);const alive=!!player?.health&&player.frozenUntil<=roomRef.current.serverTime;if(document.hidden||!alive||mapRef.current){dx=0;dy=0;}
   const input={matchId:roomRef.current.match.id,roundNumber:roomRef.current.match.roundNumber,seq:++seq.current,dx,dy,jumpId:jumpId.current,crouch:crouch.current,sprint:alive&&!document.hidden&&!mapRef.current&&held('ShiftLeft'),dashId:dashId.current,dashStyle:dashStyle.current,attackId:attackId.current,aimX:aim.current.x,aimY:aim.current.y};send({type:'input',...input});inputs.current.push(input);if(inputs.current.length>120)inputs.current.shift();if(alive)position.current=advanceMotion(position.current,input,STEP,MAPS[roomRef.current.mapId]);
  },STEP*1000);
  const key=(event:KeyboardEvent)=>event.code==='ShiftLeft'?'ShiftLeft':event.key.length===1?event.key.toLowerCase():event.key;
  const keydown=(event:KeyboardEvent)=>{
   if(roomRef.current?.phase!=='arena'||(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable=true]')))return;
   const k=key(event);if(!['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft',...Object.values(BINDINGS)].includes(k))return;
   event.preventDefault();if(mapRef.current&&k!==BINDINGS.map&&k!==BINDINGS.hints)return;control.current?.down(k,performance.now(),event.repeat);
  };
  const keyup=(event:KeyboardEvent)=>control.current?.up(key(event),performance.now());
  const clear=clearControls;
  const presentation=window.matchMedia('(pointer:coarse)');presentation.addEventListener('change',clear);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{presentation.removeEventListener('change',clear);stopped=true;clearTimeout(retry);clearTimeout(resumeRetry);clearInterval(ping);clearInterval(step);ws.current?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
 },[]);
 const me=room?.players.find(p=>p.id===id),host=room?.hostId===id,canStart=!!room&&validTeams(room.selectedFormat,room.players.length)&&room.players.every(p=>p.connected&&p.ready);
 const action=(message:ClientMessage)=>{setError('');if(!send(message)){setError('Wait for the connection to return.');return;}setPending(true);};
 const inMatch=!!room&&room.phase!=='lobby';
 useEffect(()=>{document.documentElement.classList.toggle('match-open',inMatch);document.body.classList.toggle('match-open',inMatch);return()=>{document.documentElement.classList.remove('match-open');document.body.classList.remove('match-open');};},[inMatch]);
 const inLobby=!!room&&room.phase==='lobby';
 useEffect(()=>{document.documentElement.classList.toggle('lobby-open',inLobby);document.body.classList.toggle('lobby-open',inLobby);return()=>{document.documentElement.classList.remove('lobby-open');document.body.classList.remove('lobby-open');};},[inLobby]);
 return <main className={inMatch?'game-screen':inLobby?'entry-screen lobby-screen':'entry-screen'}>
  {inMatch&&room?<div className="hud-left">
   <header className="match-info"><div className="brand"><h1>Bounty Shift</h1><p>Arena · {MAPS[room.mapId].name}{room.mapVariant?` · ${room.mapVariant==='day'?'Day':'Night'}`:''}</p></div><div className="match-summary"><strong>ROUND {room.match.roundNumber} / {room.match.totalRounds}</strong><span>Room {room.code} · {room.players.filter(p=>p.connected).length} connected</span></div>
   <div className="match-tools">{status!=='Connected'&&<span role="status">{status}</span>}{host&&<button className="secondary" aria-label="Return everyone to lobby" title="Return everyone to lobby" disabled={status!=='Connected'||pending} onClick={()=>action({type:'lobby'})}>Lobby</button>}<button className="secondary" disabled={status!=='Connected'} onClick={()=>action({type:'leave'})}>Leave</button></div></header>
   {room.phase==='arena'&&<><ModeHud room={room} id={id}/><PlayerStatus room={room} id={id} predicted={position}/></>}
  </div>:null}
  {error&&<div className="error" role="alert">{inMatch?error:error.replace(/\btest\b/gi,'match')}</div>}
  {!inMatch?<EntryFlow room={room} id={id} name={name} code={code} status={status} latency={latency} pending={pending} setName={setName} setCode={setCode} action={action} canStart={canStart}/>:room?
   <section className="arena-section">{room.phase==='intermission'||room.phase==='complete'?<div className="panel" role="status"><h2>{room.phase==='complete'?'MATCH COMPLETE':'Round complete'}</h2>{room.phase==='complete'?<p>{room.match.winners.length>1?'MATCH TIED: ':'WINNER: '}{room.match.winners.map(p=>p.name).join(', ')}</p>:<p>NEXT ROUND IN {room.match.nextRoundSeconds} · {MAPS[room.nextMapId??room.mapId]?.name.toUpperCase()}</p>}<p>{room.mode.reason}</p><ol>{(room.phase==='complete'?room.match.results:room.round.results).map(p=><li key={p.id}>#{p.rank} {p.name}{p.id===id?' (you)':''} — {p.eliminations} {room.phase==='complete'?'round wins':room.selectedGameMode==='kill_race'?'eliminations':'round points'}</li>)}</ol>{room.phase==='complete'&&<p>The host can return everyone to the lobby.</p>}</div>:<><Arena room={room} id={id} predicted={position} yaw={yaw} look={look} stick={stick} onAttack={attack} mapOpen={mapOpen} onMapChange={changeMap}/><InteractionPrompt room={room} id={id} predicted={position}/><LoadoutHud room={room} id={id} onSelect={slot=>perform(`slot${slot}` as ControlAction)}/><ControlHints shown={hintsShown} onToggle={()=>perform('hints')}><div className="quick-bindings"><span><kbd>WASD</kbd> Move · <kbd>Shift</kbd> Sprint</span><span><kbd>Space</kbd> Jump · <kbd>Space ×2</kbd> Dash</span><span><kbd>X</kbd> Crouch / Hold Slide · <kbd>Z</kbd> Dodge</span><span><kbd>E</kbd> Interact · <kbd>F / Click</kbd> Attack</span><span><kbd>Mouse / Q R</kbd> Look · <kbd>Esc</kbd> Cursor</span><span><kbd>1 2 3</kbd> Loadout · <kbd>M</kbd> Map · <kbd>H</kbd> Hints</span></div></ControlHints>{me?.health===0&&<div className="respawn-countdown" role="status">RESPAWNING IN<b>{Math.ceil(me.koRemaining)}</b></div>}<div className="touch-controls" aria-label="Touch actions"><button className="touch-ability" aria-label="Jump" onPointerDown={e=>{e.preventDefault();perform('jump');}}>↑<span>Jump</span></button><button className="touch-ability" aria-label="Dash" onPointerDown={e=>{e.preventDefault();perform('dash');}}><ActionIcon action="dash"/><span>Dash</span></button><button className="touch-ability" aria-label="Sprint" onPointerDown={e=>holdTouch(e,'ShiftLeft')} onPointerUp={releaseTouch} onPointerCancel={releaseTouch} onLostPointerCapture={releaseTouch}><ActionIcon action="sprint"/><span>Sprint</span></button><button className="touch-ability" aria-label="Attack" onPointerDown={e=>{e.preventDefault();perform('attack');}}><ActionIcon action="attack"/><span>Attack</span></button></div><div className="touch-secondary"><button aria-label="Crouch or hold to slide" aria-pressed={!!me?.crouched} onPointerDown={e=>{e.preventDefault();if(playable()){e.currentTarget.setPointerCapture(e.pointerId);control.current?.down('x',performance.now());}}} onPointerUp={()=>control.current?.up('x',performance.now())} onPointerCancel={()=>control.current?.cancel()}>Crouch<small>Hold: Slide</small></button><button aria-label="Dodge" onPointerDown={e=>{e.preventDefault();perform('dodge');}}>Dodge</button><button aria-label="Contextual interaction" disabled={!interactionLabel(room,id,position.current)} onPointerDown={e=>{e.preventDefault();perform('interact');}}>{interactionLabel(room,id,position.current)??'INTERACT'}</button></div></>}</section>:null}

 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);


