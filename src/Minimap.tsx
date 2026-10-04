import React from 'react';
import {MAPS,ACTIVE_MAP} from '../shared/map';

// Geometry comes from the same definition as rendering/collision; no opponent state enters this component.
export const Minimap=React.memo(function Minimap({mapId,marker}:{mapId:string;marker:React.RefObject<SVGGElement|null>}){
 const map=MAPS[mapId]??ACTIVE_MAP;
 return <aside className="minimap" aria-label={`${map.name} navigation map: local player only`}><div className="minimap-title">{map.name.toUpperCase()} <span>N ↑</span></div><svg viewBox={`0 0 ${map.bounds.width} ${map.bounds.height}`} aria-hidden="true">
  <rect x="12" y="12" width={map.bounds.width-24} height={map.bounds.height-24} fill="#081421" stroke="#37738a" strokeWidth="18"/>
  <rect {...map.plaza} fill="#153140" stroke="#357187" strokeWidth="12"/>
  {map.surfaces.map(s=><rect key={s.id} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.ramp?'#4d627c':'#283d5a'} stroke="#63bace" strokeWidth="10" strokeDasharray={s.ramp?'25 20':undefined}/>)}
  {map.blocks.filter(b=>b.kind!=='deck'&&b.kind!=='rail').map(b=><rect key={b.id} x={b.x} y={b.y} width={b.width} height={b.height} fill={b.kind==='building'?'#283348':'#355069'} stroke={b.accent} strokeWidth={b.kind==='building'?14:7}/>)}
  <g fill="#b1d4e1" fontSize="105" textAnchor="middle" fontFamily="Arial" fontWeight="600"><text x="1300" y="230">NORTH</text><text x="350" y="990">WEST</text><text x="2240" y="1120">EAST</text><text x="1300" y="2050">SOUTH</text></g>
  <g ref={marker}><circle r="60" fill="#091824" stroke="#c4f9ff" strokeWidth="12"/><path d="M 0 -85 L 50 50 L 0 25 L -50 50 Z" fill="#46e7ff" stroke="#e2ffff" strokeWidth="9"/></g>
 </svg></aside>;
});
