import {MAPS} from './map.js';
import type {MapDefinition} from './maps/types.js';
export const OPENING_MAP_ID='central_plaza';
// Selection randomness is supplied by the server. This helper never chooses independently in a client.
export function selectRoundMap(roundNumber:number,previous:string,chooseIndex:(size:number)=>number,registry:Readonly<Record<string,MapDefinition>>=MAPS):string{
 const ids=Object.keys(registry);if(!ids.length)throw new Error('No playable maps registered');
 if(roundNumber===1)return registry[OPENING_MAP_ID]?OPENING_MAP_ID:ids[0];
 const alternatives=ids.filter(id=>id!==previous),pool=alternatives.length?alternatives:ids;
 return pool[chooseIndex(pool.length)];
}
