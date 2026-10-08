import type {PlayerView} from './game.js';
// Presentation hook only. Animations consume gameplay state; they never control its timing.
export type PlayerAction='idle'|'walk'|'sprint'|'dash'|'dodge'|'slide'|'jump'|'fall'|'crouch'|'attack'|'hit_reaction'|'ko'|'respawn'|'pickup'|'throw'|'frozen';
export function playerAction(player:PlayerView,serverTime:number):PlayerAction{
 if(player.health<=0)return 'ko';
 if(player.frozenUntil>serverTime)return 'frozen';
 if(player.hitFlash>0)return 'hit_reaction';
 if(player.attackFlash>0)return 'attack';
 if(player.protection>0)return 'respawn';
 return player.traversalState??'idle';
}
