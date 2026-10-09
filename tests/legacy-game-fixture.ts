// Frozen geometry for controller/combat rule regressions authored before the map upgrade.
// New authored layouts are separately tested by the Workshop and integration suites.
import {centralPlaza as legacy} from './fixtures/legacy-central-plaza';
import * as game from '../shared/game';
import * as combat from '../shared/combat';
import * as traversal from '../shared/traversal';
import {MAPS} from '../shared/map';
import {RoomServer as SelectionFixture} from './selection-fixture';
export * from '../shared/game';
export const isWalkable=(p:game.Position,map=legacy)=>game.isWalkable(p,map);
export const move=(p:game.Position,dx:number,dy:number,dt=game.STEP,speed=game.ARENA.speed,map=legacy)=>game.move(p,dx,dy,dt,speed,map);
export const advanceMotion=(p:game.Motion,input:Parameters<typeof game.advanceMotion>[1],dt=game.STEP,map=legacy)=>game.advanceMotion(p,input,dt,map);
export const safeSpawn=(p:game.Position[],map=legacy)=>combat.safeSpawn(p,map);
export const canHit=(a:game.Position,b:game.Position,x:number,y:number,map=legacy)=>combat.canHit(a,b,x,y,map);
export const clearAttackLine=(a:game.Position,b:game.Position,map=legacy)=>combat.clearAttackLine(a,b,map);
export const walkable=(p:game.Position,map=legacy)=>traversal.walkable(p,map);
export {surfaceHeight,TRAVERSAL} from '../shared/traversal';
export {COMBAT} from '../shared/combat';
export const ACTIVE_MAP=legacy,SPAWNS=legacy.spawns,WORLD=legacy.bounds,BUILDINGS=legacy.blocks;
export {MAPS} from '../shared/map';
export const cameraFor=(p:{x:number;y:number},width=960,height=600)=>({x:Math.max(0,Math.min(WORLD.width-width,p.x-width/2)),y:Math.max(0,Math.min(WORLD.height-height,p.y-height/2))});
(MAPS as Record<string,typeof legacy>).__legacy_plaza=legacy;
export class RoomServer extends SelectionFixture {
 override startRound(room:Parameters<SelectionFixture['startRound']>[0],now:number){const old=MAPS.central_plaza;(MAPS as any).central_plaza=legacy;try{super.startRound(room,now);}finally{(MAPS as any).central_plaza=old;}if(room.phase==='arena'&&room.match.roundNumber===1)room.mapId='__legacy_plaza';}
}
