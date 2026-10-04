import React, { useEffect, useRef, useState } from 'react';
import { MOVEMENT, type Motion, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { createArenaScene } from './scene';

export function Arena({room,id,predicted,yaw,onAttack}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>;yaw:React.RefObject<number>;onAttack:()=>void}){
 const canvas=useRef<HTMLCanvasElement|null>(null),current=useRef(room),drag=useRef<number|null>(null),[error,setError]=useState('');current.current=room;
 const self=predicted.current||room.players.find(p=>p.id===id),p=room.players.find(p=>p.id===id);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;let scene:ReturnType<typeof createArenaScene>;
  try{scene=createArenaScene(node);}catch{setError('3D rendering needs WebGL 2. Enable hardware acceleration or try a supported browser.');return;}
  let frame=0,last=performance.now(),stopped=false;
  const draw=(now:number)=>{if(stopped)return;const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden)scene.update(current.current,id,predicted.current,yaw.current,dt,now/1000);frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);
  const lost=(event:Event)=>{event.preventDefault();setError('Graphics context lost. Reload to restore the 3D view and reconnect.');};node.addEventListener('webglcontextlost',lost);
  return()=>{stopped=true;cancelAnimationFrame(frame);node.removeEventListener('webglcontextlost',lost);scene.dispose();};
 },[id]);
 return <><div className="viewport"><canvas ref={canvas} aria-label="Third-person neon city arena" onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===2){drag.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);}else if(e.pointerType==='mouse'&&e.button===0)onAttack();}} onPointerMove={e=>{if(drag.current===e.pointerId)yaw.current+=e.movementX*.006;}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null}/><div className="reticle" aria-hidden="true"/>{error&&<div className="graphics-error" role="alert">{error}</div>}<div className="view-note">Right-drag / Q E to turn · Attack follows center reticle</div></div>{p&&self&&<div className="game-hud"><div><label htmlFor="health">Health · {p.health} / {COMBAT.maxHealth}</label><progress id="health" max={COMBAT.maxHealth} value={p.health}/><span>{p.health===0?`KO · Respawn ${Math.ceil(p.koRemaining)}s`:p.protection>0?`Protected ${p.protection.toFixed(1)}s`:'Stay moving'}</span></div><div><label htmlFor="stamina">Stamina · {Math.round(self.stamina)}%</label><progress id="stamina" max={MOVEMENT.staminaMax} value={self.stamina}/><span>{self.exhausted?'Release sprint to recover':'Shift / hold Sprint'}</span></div><div><label>Attack {p.attackCooldown>0?`${p.attackCooldown.toFixed(1)}s`:'READY'}</label><span>Click / F / touch Attack</span></div><div><label>Dash {self.dashRemaining>0?'ACTIVE':self.dashCooldown>0?`${self.dashCooldown.toFixed(1)}s`:'READY'}</label><span>Space / tap Dash · {MOVEMENT.dashCooldown}s</span></div></div>}</>;
}
