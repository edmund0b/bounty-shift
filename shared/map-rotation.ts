import {MAPS} from './map.js';
import type {MapDefinition} from './maps/types.js';
export const MAP_WEIGHTS={central_plaza:5,scorched_point:24,aerie_sky_port:24,outlaws_canyon:24,vikings_fjord:23} as const;
export const OPENING_MAP_ID='central_plaza';
// Selection randomness is supplied by the server. This helper never chooses independently in a client.
export function selectRoundMap(roundNumber:number,previous:string,chooseIndex:(size:number)=>number,registry:Readonly<Record<string,MapDefinition>>=MAPS):string{
 const ids=Object.keys(registry);if(!ids.length)throw new Error('No playable maps registered');
 if(roundNumber===1)return registry[OPENING_MAP_ID]?OPENING_MAP_ID:ids[0];
 const alternatives=roundNumber>=3?ids.filter(id=>id!==previous):ids,pool=alternatives.length?alternatives:ids;
 const weight=(id:string)=>MAP_WEIGHTS[id as keyof typeof MAP_WEIGHTS]??24,total=pool.reduce((n,id)=>n+weight(id),0);let roll=chooseIndex(total);
 if(!Number.isInteger(roll)||roll<0||roll>=total)throw new Error('Map random source outside weighted range');
 for(const id of pool){roll-=weight(id);if(roll<0)return id;}return pool[pool.length-1];
}

export function selectMapVariant(mapId:string,chooseIndex:(size:number)=>number):string|null {const variants=Object.keys(MAPS[mapId]?.variants??{});return variants.length?variants[chooseIndex(variants.length)]:null;}
