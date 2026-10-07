import React from 'react';
import { MOVEMENT, type Motion, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';

// One status display and the existing authoritative/predicted state, at either HUD position.
export function PlayerStatus({ room, id, predicted }: { room: RoomView; id: string; predicted: React.RefObject<Motion | null> }) {
 const player = room.players.find(p => p.id === id);
 if (!player) return null;
 const motion = predicted.current ?? player;
 return <div className="game-hud player-status">
  <svg className="player-portrait" viewBox="0 0 56 64" role="img" aria-label={`${player.name}'s avatar`}>
   <rect x="1" y="1" width="54" height="62" rx="5" fill="#102132" stroke="#4d8195"/>
   <path d="M12 63V40L20 35H36L44 40V63M5 63V43L12 40M51 63V43L44 40" fill="#27333e" stroke="#07121c" strokeWidth="3"/>
   <path d="M17 13L22 8H35L40 13V32L35 37H22L17 32Z" fill="#424c56" stroke="#0c1721" strokeWidth="2"/>
   <path d="M19 17H38V28H19Z" fill="#d3eef1"/><path d="M22 20H26V24H22ZM31 20H35V24H31Z" fill="#46e7ff"/>
   <path d="M13 43V54M43 43V54M23 58H33" stroke="#46e7ff" strokeWidth="3"/>
  </svg>
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
