import {canonicalWeapon,allowedWeapon,weaponName} from '../shared/weapons';
import {hasCapacity} from '../shared/inventory';
import React from 'react';
import type {RoomView,Motion} from '../shared/game';
import {interactionItem,usableDistance} from '../shared/loot';
import {ACTION_KEYS} from '../shared/action-keys';
export function interactionLabel(room:RoomView,id:string,predicted:Motion|null){
 const player=room.players.find(p=>p.id===id);if(!player?.connected||!player.health||player.frozenUntil>room.serverTime)return null;
 const pos=predicted??player;
 if(room.selectedGameMode==='flag_run'&&['spawned','dropped'].includes(room.mode.flag.state)&&usableDistance(room.mapId,pos,room.mode.flag.position))return 'PICK UP';
 const item=interactionItem(room.mode.items,room.mapId,pos);if(!item)return null;if(item.state==='closed')return 'OPEN CHEST';if(!item.kind)return null;const weapon=canonicalWeapon(item.kind);if(weapon&&!allowedWeapon(room.selectedGameMode,weapon)||weapon&&player.inventory?.weapons?.some(w=>w?.weaponId===weapon)||item.kind==='freeze_ball'&&!hasCapacity(player,item.kind))return null;return `${hasCapacity(player,item.kind)?'PICK UP':'REPLACE'} · ${weaponName(item.kind)}`;
}
export function InteractionPrompt({room,id,predicted}:{room:RoomView;id:string;predicted:React.RefObject<Motion|null>}){
 const label=interactionLabel(room,id,predicted.current);if(!label)return null;
 return <div className="chest-interaction" role="status"><span className="chest-desktop-key">[{ACTION_KEYS.use.toUpperCase()}]</span> {label}</div>;
}
