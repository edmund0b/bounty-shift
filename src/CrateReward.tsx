import React from 'react';
import type {RoomView} from '../shared/game';
import {CRATE_PRESENTATION} from '../shared/mystery-crates';
import {POWERS,RARITIES,isPower} from '../shared/tag-run';
/** Private receipt, retained across reconnection; timing derives from server time, not an inventory roll. */
export function CrateReward({room,id}:{room:RoomView;id:string}){
 const receipt=room.mode.crates?.receipts.filter(r=>r.ownerId===id).at(-1),age=receipt?room.serverTime-receipt.at:Infinity;
 if(!receipt||!isPower(receipt.reward)||age<CRATE_PRESENTATION.openingMs||age>CRATE_PRESENTATION.openingMs+CRATE_PRESENTATION.revealMs)return null;
 const power=POWERS[receipt.reward];return <aside className="crate-reward" role="status" aria-label="Mystery Crate reward" style={{'--reward-color':RARITIES[power.rarity].color} as React.CSSProperties}><b>{power.icon}</b><div><small>MYSTERY CRATE · {power.rarity.toUpperCase()}</small><strong>{power.name}</strong><span>UTILITY SLOT · 3 + F / CLICK</span></div></aside>;
}
