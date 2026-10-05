import React, { useEffect, useRef, useState } from 'react';
import { MOVEMENT, type Motion, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { createArenaScene } from './scene';
import {Minimap} from './Minimap';
import {MAPS} from '../shared/map';
import { CONTROLLER, turnLook, smoothAngle, joystickInput, type CameraControl } from '../shared/presentation';

export function Arena({room,id,predicted,yaw,look,stick,onAttack}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>;yaw:React.RefObject<number>;look:React.RefObject<CameraControl>;stick:React.RefObject<{x:number;y:number}>;onAttack:()=>void}){
 const mapMarker=useRef<SVGGElement|null>(null),canvas=useRef<HTMLCanvasElement|null>(null),current=useRef(room),lookPointer=useRef<{id:number;x:number;y:number}|null>(null),fallback=useRef(false),mouseActive=useRef(false),[looking,setLooking]=useState(false),[error,setError]=useState('');current.current=room;
 const activate=()=>{const node=canvas.current;if(!node)return;node.focus();if(document.pointerLockElement===node||fallback.current){onAttack();return;}
  const fail=()=>{fallback.current=true;setLooking(true);};
  try{if(node.requestPointerLock){const request=node.requestPointerLock();request?.catch(fail);}else fail();}catch{fail();}
 };
 useEffect(()=>{
  const node=canvas.current;if(!node)return;
  const change=()=>{fallback.current=false;mouseActive.current=document.pointerLockElement===node;setLooking(mouseActive.current);};
  const fail=()=>{fallback.current=true;setLooking(true);};
  const move=(e:MouseEvent)=>{if((mouseActive.current&&document.pointerLockElement===node)||(fallback.current&&e.target===node))turnLook(look.current,e.movementX,e.movementY);};
  const reset=()=>{mouseActive.current=false;fallback.current=false;lookPointer.current=null;stick.current={x:0,y:0};setLooking(false);if(document.pointerLockElement===node)document.exitPointerLock();};
  const outside=(e:PointerEvent)=>{if(!node.contains(e.target as Node)&&!(e.target as HTMLElement).closest('.joystick')){fallback.current=false;setLooking(false);}};
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')reset();};
  document.addEventListener('pointerlockchange',change);document.addEventListener('pointerlockerror',fail);document.addEventListener('mousemove',move);document.addEventListener('pointerdown',outside);window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);window.addEventListener('keydown',esc);
  return()=>{document.removeEventListener('pointerlockchange',change);document.removeEventListener('pointerlockerror',fail);document.removeEventListener('mousemove',move);document.removeEventListener('pointerdown',outside);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',reset);window.removeEventListener('keydown',esc);if(document.pointerLockElement===node)document.exitPointerLock();stick.current={x:0,y:0};};
 },[id]);
 const self=predicted.current||room.players.find(p=>p.id===id),p=room.players.find(p=>p.id===id);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;let scene:ReturnType<typeof createArenaScene>;
  try{scene=createArenaScene(node,MAPS[current.current.mapId],current.current.mapVariant);}catch{setError('3D rendering needs WebGL 2. Enable hardware acceleration or try a supported browser.');return;}
  let frame=0,last=performance.now(),stopped=false;
  const draw=(now:number)=>{if(stopped)return;const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden){yaw.current=smoothAngle(yaw.current,look.current.targetYaw,CONTROLLER.lookSmoothing,dt);look.current.pitch+=(look.current.targetPitch-look.current.pitch)*(1-Math.exp(-CONTROLLER.lookSmoothing*dt));scene.update(current.current,id,predicted.current,yaw.current,look.current.pitch,dt,now/1000);const p=predicted.current??current.current.players.find(p=>p.id===id);if(p&&mapMarker.current)mapMarker.current.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${Math.atan2(p.facingX,-p.facingY)*180/Math.PI})`);}frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);
  const lost=(event:Event)=>{event.preventDefault();setError('Graphics context lost. Reload to restore the 3D view and reconnect.');};node.addEventListener('webglcontextlost',lost);
  return()=>{stopped=true;cancelAnimationFrame(frame);node.removeEventListener('webglcontextlost',lost);scene.dispose();};
 },[id,room.mapId,room.mapVariant]);
 return <><div className="viewport"><canvas ref={canvas} data-map-id={room.mapId} data-map-variant={room.mapVariant??undefined} tabIndex={0} aria-label="Third-person neon city arena" onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.preventDefault();if(e.pointerType==='mouse'){if(e.button===0)activate();}else if(e.clientX>e.currentTarget.getBoundingClientRect().left+e.currentTarget.clientWidth/2&&!lookPointer.current){lookPointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMove={e=>{const p=lookPointer.current;if(p?.id===e.pointerId){turnLook(look.current,e.clientX-p.x,e.clientY-p.y,true);p.x=e.clientX;p.y=e.clientY;}}} onPointerUp={e=>{if(lookPointer.current?.id===e.pointerId)lookPointer.current=null;}} onPointerCancel={e=>{if(lookPointer.current?.id===e.pointerId)lookPointer.current=null;}} onLostPointerCapture={e=>{if(lookPointer.current?.id===e.pointerId)lookPointer.current=null;}}/><Minimap mapId={room.mapId} marker={mapMarker}/><div className="reticle" aria-hidden="true"/>{error&&<div className="graphics-error" role="alert">{error}</div>}<div className="view-note">{looking?'Mouse-look · Esc: cursor · Click / F: attack':'Click arena: mouse-look · Touch: swipe right side to look'}</div><Joystick stick={stick} resetKey={`${p?.spawnVersion}:${p?.health===0}`} /></div>{p&&self&&<div className="game-hud"><div><label htmlFor="health">Health · {p.health} / {COMBAT.maxHealth}</label><progress id="health" max={COMBAT.maxHealth} value={p.health}/><span>{p.health===0?`KO · Respawn ${Math.ceil(p.koRemaining)}s`:p.protection>0?`Protected ${p.protection.toFixed(1)}s`:'Stay moving'}</span></div><div><label htmlFor="stamina">Stamina · {Math.round(self.stamina)}%</label><progress id="stamina" max={MOVEMENT.staminaMax} value={self.stamina}/><span>{self.exhausted?'Release sprint to recover':'Shift / hold Sprint'}</span></div><div><label>Attack {p.attackCooldown>0?`${p.attackCooldown.toFixed(1)}s`:'READY'}</label><span>Click / F / touch Attack</span></div><div><label>Dash {self.dashRemaining>0?'ACTIVE':self.dashCooldown>0?`${self.dashCooldown.toFixed(1)}s`:'READY'}</label><span>Space / tap Dash · {MOVEMENT.dashCooldown}s</span></div></div>}</>;
}

function Joystick({stick,resetKey}:{stick:React.RefObject<{x:number;y:number}>;resetKey:string}){
 const active=useRef<number|null>(null),[knob,setKnob]=useState({x:0,y:0});
 const reset=()=>{active.current=null;stick.current={x:0,y:0};setKnob({x:0,y:0});};
 useEffect(()=>{reset();window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);return()=>{window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',reset);stick.current={x:0,y:0};};},[resetKey]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{if(active.current!==e.pointerId)return;const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,scale=Math.min(1,CONTROLLER.joystickRadius/(Math.hypot(x,y)||1));stick.current=joystickInput(x,y);setKnob({x:x*scale,y:y*scale});};
 return <div className="joystick" role="group" aria-label="Movement joystick" onPointerDown={e=>{e.preventDefault();e.stopPropagation();if(active.current!==null)return;active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={move} onPointerUp={e=>{if(active.current===e.pointerId)reset();}} onPointerCancel={e=>{if(active.current===e.pointerId)reset();}} onLostPointerCapture={e=>{if(active.current===e.pointerId)reset();}}><span style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/></div>;
}
