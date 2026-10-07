import React from 'react';
import type {RoomView,Motion} from '../shared/game';
import {interactionItem,usableDistance} from '../shared/loot';
import {ACTION_KEYS} from '../shared/action-keys';
export function InteractionPrompt({room,id,predicted}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>}){
 const player=room.players.find(p=>p.id===id);if(!player||!player.connected||!player.health||player.frozenUntil>room.serverTime)return null;
 const pos=predicted.current??player;
 if(room.selectedGameMode==='flag_run'&&['spawned','dropped'].includes(room.mode.flag.state)&&usableDistance(room.mapId,pos,room.mode.flag.position))return null;
 const item=interactionItem(room.mode.items,room.mapId,pos);if(item?.source!=='chest'||item.state!=='closed')return null;
 return <div className="chest-interaction" role="status" aria-label="Loot chest in range"><span className="chest-desktop-key">[{ACTION_KEYS.use.toUpperCase()}]</span><span className="chest-touch-key">USE ·</span> OPEN CHEST</div>;
}
