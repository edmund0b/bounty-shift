import React from 'react';
import type {RoomView,Motion} from '../shared/game';
import {interactionItem,usableDistance} from '../shared/loot';
import {ACTION_KEYS} from '../shared/action-keys';
export function interactionLabel(room:RoomView,id:string,predicted:Motion|null){
 const player=room.players.find(p=>p.id===id);if(!player?.connected||!player.health||player.frozenUntil>room.serverTime)return null;
 const pos=predicted??player;
 if(room.selectedGameMode==='flag_run'&&['spawned','dropped'].includes(room.mode.flag.state)&&usableDistance(room.mapId,pos,room.mode.flag.position))return 'PICK UP';
 const item=interactionItem(room.mode.items,room.mapId,pos);return !item?null:item.state==='closed'?'OPEN':'PICK UP';
}
export function InteractionPrompt({room,id,predicted}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>}){
 const label=interactionLabel(room,id,predicted.current);if(!label)return null;
 return <div className="chest-interaction" role="status"><span className="chest-desktop-key">[{ACTION_KEYS.use.toUpperCase()}]</span> {label}</div>;
}
