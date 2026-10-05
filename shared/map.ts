import {aerieSkyPort} from './maps/aerie-sky-port.js';
import {centralPlaza} from './maps/central-plaza.js';
import {scorchedPoint} from './maps/scorched-point.js';
import type {MapDefinition} from './maps/types.js';
export type {MapDefinition,MapBlock,Surface} from './maps/types.js';
// Only completed maps enter the registry. Future IDs are reserved, not selectable.
export const MAPS:Readonly<Record<string,MapDefinition>>={central_plaza:centralPlaza,scorched_point:scorchedPoint,aerie_sky_port:aerieSkyPort};
export const ACTIVE_MAP=MAPS.central_plaza;
export const WORLD=ACTIVE_MAP.bounds;
export const BUILDINGS=ACTIVE_MAP.blocks;
export const SPAWNS=ACTIVE_MAP.spawns;
export const PLAZA=ACTIVE_MAP.plaza;
export const CAMERA={width:960,height:600};
export function cameraFor(p:{x:number;y:number},width=CAMERA.width,height=CAMERA.height){return {x:Math.max(0,Math.min(WORLD.width-width,p.x-width/2)),y:Math.max(0,Math.min(WORLD.height-height,p.y-height/2))};}

export function mapEnvironment(map:MapDefinition,variant:string|null=null){return (variant&&map.variants?.[variant])||map.environment;}
