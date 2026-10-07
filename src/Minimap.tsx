import type {RoomView} from '../shared/game';
import React, {useEffect,useRef} from 'react';
import {MAPS,ACTIVE_MAP} from '../shared/map';
import type {Footprint} from '../shared/maps/types';
function MapShape({r,...props}:{r:Footprint;fill:string;stroke?:string;strokeWidth?:number;strokeDasharray?:string}){return r.shape==='ellipse'?<ellipse cx={r.x+r.width/2} cy={r.y+r.height/2} rx={r.width/2} ry={r.height/2} {...props}/>:<rect x={r.x} y={r.y} width={r.width} height={r.height} {...props}/>;}

// Geometry comes from the same definition as rendering/collision; no opponent state enters this component.
export const Minimap=React.memo(function Minimap({mapId,marker,room,open,setOpen}:{open:boolean;setOpen:(open:boolean)=>void;room:RoomView;mapId:string;marker:React.RefObject<SVGGElement|null>}){
 const map=MAPS[mapId]??ACTIVE_MAP,sky=map.environment.theme==='sky_port',canyon=map.environment.theme==='canyon',fjord=map.environment.theme==='fjord';
 const panel=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!open)return;panel.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setOpen(false);}else if(e.key==='Tab'){e.preventDefault();panel.current?.querySelector('button')?.focus();}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[open]);
 return <><div className={`map-backdrop ${open?'visible':''}`} onClick={()=>setOpen(false)}/><aside onClick={()=>{if(!open)setOpen(true);}} ref={panel} tabIndex={-1} role={open?'dialog':undefined} aria-modal={open?true:undefined} className={`minimap ${open?'expanded':''}`} aria-label={`${map.name} navigation map: local player and objective markers`}><div className="minimap-title"><b className="map-name">{map.name.toUpperCase()}</b> <span>N ↑</span><button className="map-expand" aria-label={open?'Close map':'Expand map'} onClick={e=>{e.stopPropagation();setOpen(!open);}}>{open?'×':'⛶'}</button></div><svg onClick={e=>{e.stopPropagation();setOpen(!open);}} viewBox={`0 0 ${map.bounds.width} ${map.bounds.height}`} aria-hidden="true">
  <rect x="12" y="12" width={map.bounds.width-24} height={map.bounds.height-24} fill={fjord?'#8ba9ba':canyon?'#392d25':sky?'#16263e':map.ground?'#431b0b':'#081421'} stroke="#37738a" strokeWidth="18"/>
  {map.ground?.map((r,i)=><MapShape key={i} r={r} fill={fjord?'#bfced5':canyon?'#8b7457':sky?'#60758a':'#332d29'} stroke={fjord?'#dbeaf0':canyon?'#b99b73':sky?'#a7c8dc':'#88604b'} strokeWidth={10}/>)}
  <MapShape r={map.plaza} fill={fjord?'#8daebd':canyon?'#a58961':sky?'#68869b':map.ground?'#654331':'#153140'} stroke={map.ground?map.environment.accent:'#357187'} strokeWidth={12}/>
  {map.surfaces.map(s=><MapShape key={s.id} r={s} fill={fjord?(s.ramp?'#adceda':'#506b7d'):canyon?(s.ramp?'#ae8b60':'#68513c'):s.ramp?'#4d627c':'#283d5a'} stroke={canyon?'#c7aa7b':'#63bace'} strokeWidth={10} strokeDasharray={s.ramp?'25 20':undefined}/>)}
  {map.blocks.filter(b=>b.kind!=='deck'&&b.kind!=='rail').map(b=><MapShape key={b.id} r={b} fill={fjord?(b.kind==='building'?'#384c58':'#648498'):b.kind==='building'?'#283348':'#355069'} stroke={b.accent} strokeWidth={b.kind==='building'?14:7}/>)}
  <g fill="#b1d4e1" fontSize="105" textAnchor="middle" fontFamily="Arial" fontWeight="600">{map.minimapLabels?map.minimapLabels.map(l=><text key={l.text} x={l.x} y={l.y} fontSize="85">{l.text}</text>):<><text x="1300" y="230">NORTH</text><text x="350" y="990">WEST</text><text x="2240" y="1120">EAST</text><text x="1300" y="2050">SOUTH</text></>}</g>
  {room.mode.items.filter(i=>i.state!=='empty').map(i=><circle key={i.id} cx={i.x} cy={i.y} r="25" fill={i.kind==='freeze_ball'?'#86f3ff':'#ffc65a'}/>)}
  {room.selectedGameMode==='flag_run'&&<><circle cx={room.mode.capture.x} cy={room.mode.capture.y} r="80" fill="none" stroke="#45ffff" strokeWidth="20"/>{room.mode.flag.state!=='not_spawned'&&<text x={room.mode.flag.position.x} y={room.mode.flag.position.y} fill="#ffe058" fontSize="150" textAnchor="middle">⚑</text>}</>}
  <g ref={marker}><circle r="60" fill="#091824" stroke="#c4f9ff" strokeWidth="12"/><path d="M 0 -85 L 50 50 L 0 25 L -50 50 Z" fill="#46e7ff" stroke="#e2ffff" strokeWidth="9"/></g>
 </svg></aside></>;
});

