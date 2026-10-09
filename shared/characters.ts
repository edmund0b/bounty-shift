// Stable Workshop IDs. The server validates identifiers; models stay on the client.
export const CHARACTER_IDS=['voltrix','kirin','emberjack','mossbyte','novaa','gravel','lumi','shade'] as const;
export type CharacterId=typeof CHARACTER_IDS[number];
export const characterName=(id:CharacterId)=>id.toUpperCase();
export const isCharacterId=(value:unknown):value is CharacterId=>typeof value==='string'&&(CHARACTER_IDS as readonly string[]).includes(value);
export const SELECTION={chooseMs:30_000,totalMs:39_000};
export type CharacterSelection={startedAt:number;deadline:number;expiresAt:number;loadingAt:number|null;preparedIds:string[]};
