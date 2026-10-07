import type {Position} from './game';
import type {WorldItem} from './modes';
import {RULES} from './modes';
import {MAPS} from './map';
import {clearAttackLine} from './combat';

// Shared eligibility is presentation guidance on the client and validation on the server.
export const CHEST_OPEN_MS=420;
export const pickupPosition=(item:WorldItem):Position=>item.pickupPosition??item;
export function usableDistance(mapId:string,a:Position,b:Position){return Math.hypot(a.x-b.x,a.y-b.y,(a.elevation??0)-(b.elevation??0))<=RULES.pickupRange&&clearAttackLine(a,b,MAPS[mapId]);}
export function interactionItem(items:WorldItem[],mapId:string,p:Position){return items.filter(i=>(i.state==='closed'||i.state==='opened'&&!!i.kind)&&usableDistance(mapId,p,i.state==='closed'?i:pickupPosition(i))).sort((a,b)=>Math.hypot(pickupPosition(a).x-p.x,pickupPosition(a).y-p.y)-Math.hypot(pickupPosition(b).x-p.x,pickupPosition(b).y-p.y))[0];}
