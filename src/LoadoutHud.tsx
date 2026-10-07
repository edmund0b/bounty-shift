import React, {useEffect,useRef,useState} from 'react';
import type {RoomView} from '../shared/game';
import type {ItemKind} from '../shared/modes';

const names:Record<ItemKind,string>={blade:'BLADE',hammer:'HAMMER',freeze_ball:'FREEZE BALL'};
function ItemIcon({kind}:{kind:string}){return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{kind==='freeze_ball'?<><circle cx="16" cy="16" r="11"/><path d="M16 7v18M8 12l16 8M8 20l16-8m-11-1 3 3 3-3m-6 14 3-3 3 3"/></>:kind==='blade'?<><path d="m9 23 17-18 1 6-14 16M6 20l9 9M10 24l-5 5"/></>:kind==='hammer'?<><path d="m9 28 12-19M14 6l5-4 11 7-3 6Z"/></>:kind==='flag'?<><path d="M8 29V4m0 1c6-5 9 5 17 0v13c-8 5-11-5-17 0"/></>:kind==='empty'?<path d="M10 16h12m-6-6v12"/>:<><path d="m10 24-4-9 2-3 4 5V7h4v9-11h4v11-8h4v10-5h3v9l-5 6H12Z"/></>}</svg>;}

// A read-only view of heldItem and flag possession, not a second inventory.
export function LoadoutHud({room,id}:{room:RoomView;id:string}){
 const player=room.players.find(p=>p.id===id),held=player?.heldItem??null;
 const identity=`${room.match.id}:${room.match.roundNumber}:${player?.spawnVersion}`;
 const previous=useRef({identity,held});
 const [acquired,setAcquired]=useState<ItemKind|null>(null);
 useEffect(()=>{
  const sameLife=previous.current.identity===identity;
  if(sameLife&&held&&held!==previous.current.held)setAcquired(held);else if(!held||!sameLife)setAcquired(null);
  previous.current={identity,held};
 },[held,identity]);
 useEffect(()=>{if(!acquired)return;const timer=setTimeout(()=>setAcquired(null),1500);return()=>clearTimeout(timer);},[acquired]);
 const tag=room.selectedGameMode==='tag',weapon=held==='blade'||held==='hammer'?held:null,ball=held==='freeze_ball';
 const flag=room.selectedGameMode==='flag_run'&&room.mode.flag.carrier===id&&room.mode.flag.state==='carried';
 const slots=[
  {category:tag?'TAG':'MELEE',kind:weapon??'hand',name:weapon?names[weapon]:tag?'TAG':'UNARMED',occupied:true,equipped:!ball},
  {category:'CARRY',kind:flag?'flag':'empty',name:flag?'FLAG':'EMPTY',occupied:flag,equipped:false},
  {category:'UTILITY',kind:ball?'freeze_ball':'empty',name:ball?'FREEZE BALL':'EMPTY',occupied:ball,equipped:ball},
 ];
 return <section className="loadout-hud" aria-label="Loadout"><div className="loadout-heading"><strong>LOADOUT</strong><span className="pickup-feedback" role="status">{acquired?`${names[acquired]} ACQUIRED`:''}</span></div><ol className="loadout-slots">{slots.map((slot,i)=><li key={slot.category} className={`loadout-slot ${slot.equipped?'equipped':''} ${slot.occupied?'occupied':'empty'} ${acquired===slot.kind?'acquired':''}`} aria-label={`${slot.category}: ${slot.name}${slot.equipped?', equipped':''}`} data-item={slot.kind} data-equipped={slot.equipped}><span className="slot-category"><span>{i+1}</span> {slot.category}</span><ItemIcon kind={slot.kind}/><span className="slot-name">{slot.name}</span><span className="slot-state">{slot.equipped?'EQUIPPED':slot.kind==='hand'?'READY':slot.occupied?'CARRIED':'—'}</span></li>)}</ol></section>;
}
