import React from 'react';
import { MOVEMENT, type Motion, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { isCharacterId, characterName } from '../shared/characters';

// One status display and the existing authoritative/predicted state, at either HUD position.
export function PlayerStatus({ room, id, predicted }: { room: RoomView; id: string; predicted: React.RefObject<Motion | null> }) {
 const player = room.players.find(p => p.id === id);
 if (!player) return null;
 const motion = predicted.current ?? player;
 return <div className="game-hud player-status">
  {isCharacterId(player.characterId) ? <img className="player-portrait" src={`/portraits/${player.characterId}.png`} alt={`${characterName(player.characterId)} portrait`} data-character-id={player.characterId} width="512" height="640"/> : <span className="player-portrait portrait-pending" aria-label="Character portrait loading">◇</span>}
  <div className="status-bars">
   <div className="status-line health-line"><label htmlFor="health"><i aria-hidden="true">♥</i><span>{player.health} / {COMBAT.maxHealth}</span></label><progress aria-label="Health" id="health" max={COMBAT.maxHealth} value={player.health}/></div>
   <div className="status-line stamina-line"><label htmlFor="stamina"><i aria-hidden="true">ϟ</i></label><progress aria-label="Stamina" id="stamina" max={MOVEMENT.staminaMax} value={motion.stamina}/></div>
   {(player.health === 0 || player.protection > 0 || motion.exhausted) && <small className="player-condition">{player.health === 0 ? `KO · Respawn ${Math.ceil(player.koRemaining)}s` : player.protection > 0 ? `Protected ${player.protection.toFixed(1)}s` : 'Exhausted'}</small>}
  </div>
 </div>;
}

export function ActionIcon({ action }: { action: 'sprint' | 'dash' | 'attack' }) {
 return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
  {action === 'sprint' ? <><circle cx="21" cy="5" r="2" fill="currentColor" stroke="none"/><path d="M7 13L14 9L22 14L27 10M14 10L12 19L21 22L24 29M12 19L6 27M12 19L19 13"/></> : action === 'dash' ? <path d="M6 6L16 16L6 26M17 6L27 16L17 26"/> : <><path d="M11 22L25 5L29 3L27 10L13 24Z" fill="currentColor" strokeWidth="1"/><path d="M7 18L17 27M11 22L4 29"/></>}
 </svg>;
}
