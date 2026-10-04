import React, { useEffect, useRef } from 'react';
import { ARENA, MOVEMENT, isWalkable, type Motion, type Position, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { BUILDINGS, CAMERA, PLAZA, cameraFor } from '../shared/map';

export function Arena({room,id,predicted,onAttack}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>;onAttack:(x:number,y:number)=>void}){
 const canvas=useRef<HTMLCanvasElement|null>(null),current=useRef(room),display=useRef(new Map<string,Position>()),versions=useRef(new Map<string,number>());current.current=room;
 const self=predicted.current||room.players.find(p=>p.id===id);const combatSelf=room.players.find(p=>p.id===id);
 useEffect(()=>{
  let frame=0,last=performance.now();
  const draw=(now:number)=>{
   const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx)return;
   const elapsed=Math.min(.1,(now-last)/1000);last=now;
   const width=node.clientWidth;if(!width){frame=requestAnimationFrame(draw);return;}
   const height=width*CAMERA.height/CAMERA.width,dpr=Math.min(devicePixelRatio||1,2);
   const worldWidth=width<650?640:CAMERA.width,worldHeight=worldWidth*CAMERA.height/CAMERA.width;
   if(node.width!==Math.round(width*dpr)||node.height!==Math.round(height*dpr)){node.width=Math.round(width*dpr);node.height=Math.round(height*dpr);}
   const local=predicted.current||current.current.players.find(p=>p.id===id)||{x:1000,y:720};
   const camera=cameraFor(local,worldWidth,worldHeight);
   ctx.setTransform(node.width/worldWidth,0,0,node.height/worldHeight,0,0);
   ctx.fillStyle='#101923';ctx.fillRect(0,0,worldWidth,worldHeight);
   ctx.save();ctx.translate(-camera.x,-camera.y);
   // Road lanes and the open plaza explain the routes without detailed art.
   ctx.fillStyle='#192735';
   for(const x of [65,640,1260,1860])ctx.fillRect(x,0,80,ARENA.height);
   for(const y of [65,490,900,1310])ctx.fillRect(0,y,ARENA.width,80);
   ctx.fillStyle='#233443';ctx.fillRect(PLAZA.x,PLAZA.y,PLAZA.width,PLAZA.height);
   ctx.strokeStyle='#374958';ctx.lineWidth=1;ctx.setLineDash([10,16]);
   ctx.beginPath();for(const y of [110,540,940,1350]){ctx.moveTo(0,y);ctx.lineTo(ARENA.width,y);}ctx.stroke();ctx.setLineDash([]);
   ctx.strokeStyle='#517588';ctx.lineWidth=2;ctx.strokeRect(PLAZA.x,PLAZA.y,PLAZA.width,PLAZA.height);
   ctx.font='18px Arial';ctx.textAlign='center';ctx.fillStyle='#92afbd';ctx.fillText('CENTRAL PLAZA',1000,730);
   for(const b of BUILDINGS){
    if(b.x+b.width<camera.x||b.y+b.height<camera.y||b.x>camera.x+worldWidth||b.y>camera.y+worldHeight)continue;
    ctx.fillStyle='#273142';ctx.fillRect(b.x,b.y,b.width,b.height);
    ctx.strokeStyle=b.accent;ctx.lineWidth=3;ctx.strokeRect(b.x,b.y,b.width,b.height);
    ctx.strokeStyle='#3a4657';ctx.lineWidth=1;ctx.strokeRect(b.x+12,b.y+12,b.width-24,b.height-24);
    if(b.name){ctx.fillStyle='#b1c0d0';ctx.font='18px Arial';ctx.fillText(b.name,b.x+b.width/2,b.y+b.height/2);}
   }
   ctx.strokeStyle='#668499';ctx.lineWidth=4;ctx.strokeRect(2,2,ARENA.width-4,ARENA.height-4);
   const present=new Set(current.current.players.map(p=>p.id));for(const key of display.current.keys())if(!present.has(key)){display.current.delete(key);versions.current.delete(key);}
   for(const p of current.current.players){
    if(versions.current.get(p.id)!==p.spawnVersion){display.current.delete(p.id);versions.current.set(p.id,p.spawnVersion);}
    let pos:Position;
    if(p.id===id)pos=predicted.current||p;
    else {const old=display.current.get(p.id)||p,f=1-Math.exp(-elapsed*18);const candidate={x:old.x+(p.x-old.x)*f,y:old.y+(p.y-old.y)*f};pos=Math.hypot(old.x-p.x,old.y-p.y)>180?p:isWalkable(candidate)?candidate:p;display.current.set(p.id,pos);}
    if(pos.x<camera.x-40||pos.y<camera.y-40||pos.x>camera.x+worldWidth+40||pos.y>camera.y+worldHeight+40)continue;
    const motion=p.id===id?(predicted.current||p):p;
    ctx.globalAlpha=p.health===0?.3:p.connected?1:.4;
    if(p.attackFlash>0){const angle=Math.atan2(p.attackY,p.attackX);ctx.fillStyle='#d7eeff55';ctx.beginPath();ctx.moveTo(pos.x,pos.y);ctx.arc(pos.x,pos.y,COMBAT.range,angle-COMBAT.halfAngle,angle+COMBAT.halfAngle);ctx.closePath();ctx.fill();}
    if(p.protection>0){ctx.strokeStyle='#f3da83';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(pos.x,pos.y,ARENA.radius+8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(motion.dashRemaining>0){ctx.strokeStyle=p.color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(pos.x-motion.dashX*36,pos.y-motion.dashY*36);ctx.lineTo(pos.x,pos.y);ctx.stroke();}
    ctx.fillStyle=p.hitFlash>0?'#ffffff':p.color;ctx.beginPath();ctx.arc(pos.x,pos.y,ARENA.radius,0,Math.PI*2);ctx.fill();
    if(p.id===id){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,pos.y,ARENA.radius+4,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#0e1822';ctx.beginPath();ctx.arc(pos.x+motion.facingX*7,pos.y+motion.facingY*7,3,0,Math.PI*2);ctx.fill();
    ctx.font='18px Arial';ctx.textAlign='center';ctx.fillStyle='#f4f7ff';ctx.fillText(p.health===0?`${p.name} · KO`:p.name,Math.max(camera.x+60,Math.min(camera.x+worldWidth-60,pos.x)),Math.max(camera.y+20,pos.y-25));ctx.globalAlpha=1;ctx.fillStyle='#0c111a';ctx.fillRect(pos.x-23,pos.y+24,46,6);ctx.fillStyle=p.protection>0?'#f3da83':'#83d6a6';ctx.fillRect(pos.x-23,pos.y+24,46*p.health/COMBAT.maxHealth,6);
   }
   ctx.restore();frame=requestAnimationFrame(draw);
  };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[id]);
 const clickAttack=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(event.pointerType!=='mouse'||event.button!==0||!combatSelf?.health)return;const node=event.currentTarget,rect=node.getBoundingClientRect(),local=predicted.current||combatSelf;const viewWidth=node.clientWidth<650?640:CAMERA.width,viewHeight=viewWidth*CAMERA.height/CAMERA.width,camera=cameraFor(local,viewWidth,viewHeight);const x=camera.x+(event.clientX-rect.left)/rect.width*viewWidth-local.x,y=camera.y+(event.clientY-rect.top)/rect.height*viewHeight-local.y,length=Math.hypot(x,y);onAttack(length?x/length:0,length?y/length:0);};
 return <><canvas ref={canvas} onPointerDown={clickAttack} aria-label="City arena with player-following camera" role="img"/>{combatSelf&&<div className="combat-hud"><div><label htmlFor="health">Health · {combatSelf.health} / {COMBAT.maxHealth}</label><progress id="health" max={COMBAT.maxHealth} value={combatSelf.health}/></div><span role="status">{combatSelf.health===0?`KNOCKED OUT · Respawn in ${Math.ceil(combatSelf.koRemaining)}s`:combatSelf.protection>0?`Spawn protection · ${combatSelf.protection.toFixed(1)}s`:combatSelf.attackCooldown>0?`Attack cooldown · ${combatSelf.attackCooldown.toFixed(1)}s`:'Attack READY · Click / F / touch Attack'}</span></div>}{self&&<div className="movement-hud"><div><label htmlFor="stamina">Stamina · {Math.round(self.stamina)}%</label><progress id="stamina" max={MOVEMENT.staminaMax} value={self.stamina}/><span>{self.exhausted?'Release sprint to recover':self.sprinting?'Sprinting':'Shift / hold Sprint'}</span></div><div className={self.dashCooldown<=0?'dash-ready':''}><span>Dash · {self.dashRemaining>0?'ACTIVE':self.dashCooldown>0?`${self.dashCooldown.toFixed(1)}s`:'READY'}</span><span>Space / tap Dash · {MOVEMENT.dashCooldown}s cooldown</span></div></div>}</>;
}
