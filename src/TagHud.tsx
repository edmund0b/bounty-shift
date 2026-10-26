import {isPair} from '../shared/pair-powerups';
import React from 'react';
import type {RoomView} from '../shared/game';
import {POWERS,RARITIES,isPower,ESCAPE_POWERS} from '../shared/tag-run';
export function TagHud({room,id,onUse}:{room:RoomView;id:string;onUse:()=>void}){
 const t=room.mode.tag,p=room.players.find(p=>p.id===id);if(room.selectedGameMode!=='tag'||!t||!p)return null;
 const now=room.serverTime,s=t.status[id]??{},power=p.inventory?.utility,config=isPower(power)?POWERS[power]:null;
 const sealLocked=power==='seal_tug'&&(room.round.endsAt-now<=6000||t.sealUsed[id]),blocked=room.mode.pair?.actions.some(a=>a.ownerId===id&&a.endsAt>now)||(isPower(power)&&ESCAPE_POWERS.includes(power)&&(s.escapeLock??0)>now)||(!!p.airborne&&['sticky_trap','jump_pad','trap_clone','portal_pair','seal_tug'].includes(power??''))||(s.utilityCooldown??0)>now||p.frozenUntil>now||(s.sealed??0)>now||(s.invisible??0)>now||sealLocked;
 const contact=t.events.filter(e=>e.kind==='tag'&&now>=e.at&&now-e.at<1200).at(-1),announcement=contact?.targetId===id?'TAG PASSED · '+t.announcement:contact?.ownerId===id?'YOU ARE IT · TAG SOMEONE!':t.announcement;
 const timers=Object.entries(s).filter(([k,v])=>typeof v==='number'&&v>now&&['speed','slow','tracker','ghost','magnet','invisible','sealed','phase','flash','freezeImmune'].includes(k));
 return <><div className={`tag-chase ${room.round.remainingSeconds<=20?'frenzy':''}`} aria-live="polite">{room.round.remainingSeconds<=20&&<strong>FINAL CHASE {room.round.remainingSeconds<=5&&<b>{room.round.remainingSeconds}</b>}</strong>}{now-t.announcementAt<1800&&<span data-tag-confirmed={contact?.id}>{announcement}</span>}</div>
 {config&&<aside className="tag-utility" aria-label="Power-up" style={{'--rarity-color':RARITIES[config.rarity].color} as React.CSSProperties}><div><b>{config.icon}</b><span>{config.name}<em>{config.rarity.toUpperCase()}</em></span></div><p>{config.description}</p><button aria-label="Use power-up" disabled={!!blocked||room.phase!=='arena'} onPointerDown={e=>{e.preventDefault();onUse();}}>{sealLocked?'SEAL LOCKED':blocked?'UNAVAILABLE':'USE'}<small>3 + F / CLICK</small></button></aside>}
 <div className="tag-status">{room.mode.pair?.traps.filter(f=>f.ownerId===id&&!f.triggeredAt&&f.endsAt>now).map(f=><span key={f.id}>STICKY TRAP {Math.ceil((f.endsAt-now)/1000)}s</span>)}{(room.mode.pair?.status[id]?.slowUntil??0)>now&&<span>STICKY {Math.ceil((room.mode.pair!.status[id].slowUntil-now)/1000)}s</span>}{t.fields.filter(f=>f.ownerId===id&&f.endsAt>now&&f.kind in POWERS).map(f=><span key={f.id}>{POWERS[f.kind as keyof typeof POWERS].name.toUpperCase()} {Math.ceil((f.endsAt-now)/1000)}s</span>)}{timers.map(([k,v])=><span key={k}>{k.replace('freezeImmune','FREEZE IMMUNITY').toUpperCase()} {Math.ceil(((v as number)-now)/1000)}s</span>)}</div>
 {(s.flash??0)>now&&<div className="tag-flash" aria-label="Flash Pop vision disruption"/>}{(s.sealed??0)>now&&<div className="tag-sealed"><b>SEALED</b><span>{Math.ceil((s.sealed!-now)/1000)}s · returning to the same position</span></div>}
 </>;
}

/** Other modes use the same utility slot/button, with no second inventory state. */
export function PairHud({room,id,onUse}:{room:RoomView;id:string;onUse:()=>void}){
 const p=room.players.find(p=>p.id===id),power=p?.inventory?.utility,now=room.serverTime,s=room.mode.pair?.status[id],pending=room.mode.pair?.actions.some(a=>a.ownerId===id&&a.endsAt>now);
 if(room.selectedGameMode==='tag'||!p)return null;const config=isPair(power)?POWERS[power]:null,blocked=p.health<=0||p.frozenUntil>now||pending||(s?.cooldownUntil??0)>now||(power==='sticky_trap'&&p.airborne);
 return <>{config&&<aside className="tag-utility" aria-label="Power-up" style={{'--rarity-color':RARITIES[config.rarity].color} as React.CSSProperties}><div><b>{config.icon}</b><span>{config.name}<em>{config.rarity.toUpperCase()}</em></span></div><p>{config.description}</p><button aria-label="Use power-up" disabled={!!blocked||room.phase!=='arena'} onPointerDown={e=>{e.preventDefault();onUse();}}>{pending?'PREPARING':blocked?'UNAVAILABLE':'USE'}<small>3 + F / CLICK</small></button></aside>}
 {(s?.slowUntil??0)>now&&<div className="tag-status">{room.mode.pair?.traps.filter(f=>f.ownerId===id&&!f.triggeredAt&&f.endsAt>now).map(f=><span key={f.id}>STICKY TRAP {Math.ceil((f.endsAt-now)/1000)}s</span>)}{(room.mode.pair?.status[id]?.slowUntil??0)>now&&<span>STICKY {Math.ceil((room.mode.pair!.status[id].slowUntil-now)/1000)}s</span>}<span>STICKY {Math.ceil((s!.slowUntil-now)/1000)}s</span></div>}</>;
}
