import React,{useEffect,useRef,useState} from 'react';
import type {RoomView} from '../shared/game';
import type {WeaponEffect} from '../shared/weapons';
/** Only server confirmations produce markers; this component never predicts damage. */
export function CombatFeedback({room,id}:{room:RoomView;id:string}){
 const seen=useRef(new Set<string>()),[hits,setHits]=useState<(WeaponEffect&{received:number})[]>([]),[last,setLast]=useState<WeaponEffect|null>(null);
 useEffect(()=>{const now=performance.now(),fresh=(room.mode.weaponEffects??[]).filter(e=>e.ownerId===id&&(e.type==='damage'||e.type==='elimination')&&!seen.current.has(e.id)&&room.serverTime-e.at<1500);for(const e of fresh)seen.current.add(e.id);if(fresh.length){setHits(h=>[...h,...fresh.map(e=>({...e,received:now}))].slice(-8));setLast(fresh.at(-1)!);}if(seen.current.size>256)seen.current=new Set((room.mode.weaponEffects??[]).map(e=>e.id));},[room.tick,id,room.match.id]);
 useEffect(()=>{if(!hits.length)return;const t=setTimeout(()=>setHits(h=>h.filter(e=>performance.now()-e.received<(e.type==='elimination'?1400:800))),100);return()=>clearTimeout(t);},[hits]);
 const marker=hits.filter(e=>e.type==='damage').at(-1);
 return <div className="combat-feedback" aria-live="polite" data-last-shot={last?.shotId} data-last-region={last?.region} data-last-elimination={last?.type==='elimination'?last.targetId:undefined}>{marker&&<span className={`gun-hit-marker ${marker.region==='head'?'headshot':''}`}>╳</span>}<div className="gun-damage">{hits.filter(e=>e.type==='damage').map(e=><output key={e.id} className={e.region==='head'?'headshot':''}>{e.region==='head'?'◇ ':''}{e.damage}</output>)}</div>{hits.filter(e=>e.type==='elimination').map(e=><div className="gun-elimination" key={e.id}>ELIMINATED · {room.players.find(p=>p.id===e.targetId)?.name??'PLAYER'}</div>)}</div>;
}
