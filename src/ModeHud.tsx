import React from 'react';
import {MODES,RULES,teamKey} from '../shared/modes';
import type {RoomView} from '../shared/game';
export function ModeHud({room,id}:{room:RoomView;id:string}){
 const p=room.players.find(p=>p.id===id),state=room.mode,key=teamKey(state,id),it=state.it===key;
 const label=(key:string|null)=>room.players.filter(p=>teamKey(state,p.id)===key).map(p=>p.name).join(' + ');
 const flag=state.flag,carrier=room.players.find(p=>p.id===flag.carrier);
 return <div className="objective mode-hud" role="status"><strong>{MODES[room.selectedGameMode].name} · {room.selectedFormat.toUpperCase()} <span>{room.round.remainingSeconds}s</span></strong>
 {room.selectedGameMode==='tag'?<><b className={it?'it-alert':''}>{it?'YOU ARE IT — TAG SOMEONE!':'AVOID IT'}</b><span>IT: {label(state.it)}</span><span>Attack to tag · freeze balls stop runners for 3s</span></>:room.selectedGameMode==='kill_race'?<><b>{room.selectedFormat==='duo'?'TEAM KILLS':'KILLS'} {state.scores[key]??0}{room.selectedFormat==='duo'?` / ${RULES.killTarget}`:''}</b><span>{Object.entries(state.scores).map(([k,n])=>`${label(k)}: ${n}`).join(' · ')}</span></>:<><b>{flag.state==='not_spawned'?`${flag.spawnAt-room.serverTime<=RULES.flagWarningMs?'FLAG INCOMING':'LOOT / FIGHT'} · ${Math.max(0,Math.ceil((flag.spawnAt-room.serverTime)/1000))}s`:flag.state==='carried'?`${carrier?.name??'Player'} HAS THE FLAG`: `FLAG ${flag.state.toUpperCase()}`}</b><span>{flag.carrier===id?'Deliver to the cyan capture ring.':'Recover the gold flag, then deliver to the cyan ring.'}</span></>}
 <span>Round wins: {state.matchPoints[key]??0} / 3 {room.selectedFormat==='duo'?`· TEAM: ${label(key)}`:''}</span><span>Item: {p?.heldItem?.replace('_',' ').toUpperCase()??'UNARMED'}</span><span className="action-help">R / USE: open, pick up · F / ATTACK: strike or throw</span>
 {p&&p.frozenUntil>room.serverTime&&<b className="freeze-alert">FROZEN · {Math.ceil((p.frozenUntil-room.serverTime)/1000)}s</b>}
 </div>;
}
