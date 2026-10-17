import {GUNS,gunId} from './gun-config.js';
import {WORKSHOP_WEAPONS,AMMO_CONFIG} from './workshop-weapons.js';
import type {GameMode} from './modes.js';
export {AMMO_CONFIG};
export type WeaponId=keyof typeof WORKSHOP_WEAPONS;
export const WEAPON_IDS=Object.keys(WORKSHOP_WEAPONS) as WeaponId[];
export const isWeapon=(id:unknown):id is WeaponId=>typeof id==='string'&&Object.hasOwn(WORKSHOP_WEAPONS,id);
export const canonicalWeapon=(id:unknown):WeaponId|null=>id==='blade'?'heavy-blade':id==='hammer'?'impact-hammer':isWeapon(id)?id:null;
export const isGun=(id:unknown)=>!!canonicalWeapon(id)&&WORKSHOP_WEAPONS[canonicalWeapon(id)!].category==='firearms';
export const weaponName=(id:unknown)=>id==='freeze_ball'?'FREEZE BALL':canonicalWeapon(id)?WORKSHOP_WEAPONS[canonicalWeapon(id)!].name.toUpperCase():'UNARMED';
export const MODE_EQUIPMENT:Record<GameMode,{melee:boolean;firearms:boolean;powerUps:boolean}>={tag:{melee:true,firearms:false,powerUps:true},flag_run:{melee:true,firearms:true,powerUps:true},kill_race:{melee:true,firearms:true,powerUps:true}};
export const allowedWeapon=(mode:GameMode,id:unknown)=>!!canonicalWeapon(id)&&MODE_EQUIPMENT[mode][isGun(id)?'firearms':'melee'];
export const GROUND_WEAPONS:WeaponId[]=['heavy-blade','impact-hammer'];
export const CHEST_WEAPONS:WeaponId[]=['riot-bat','twin-daggers','pulse-katana','pistol','assault-rifle','shotgun','sniper-rifle'];
export const LOOT_CONFIG={groundCount:4,chestCount:4,utilityCount:2,respawnMs:12000,droppedLifetimeMs:60000,capacity:2,weights:Object.fromEntries(CHEST_WEAPONS.map(id=>[id,1])) as Record<WeaponId,number>,clearOnKO:true,clearOnRound:true};
// Initial integration balance, separate from V5's presentation-only data; world distances use game units.
export const WEAPON_BALANCE:Record<WeaponId,{damage:number;range:number;pellets:number;spread:number}>={
 'heavy-blade':{damage:25,range:105,pellets:1,spread:0},'impact-hammer':{damage:40,range:110,pellets:1,spread:0},'riot-bat':{damage:22,range:100,pellets:1,spread:0},'twin-daggers':{damage:12,range:75,pellets:1,spread:0},'pulse-katana':{damage:28,range:120,pellets:1,spread:0},
 ...Object.fromEntries(Object.entries(GUNS).map(([id,g])=>[id,{damage:g.body,range:g.range,pellets:g.pellets,spread:g.hip}])) as Record<import('./gun-config.js').GunId,{damage:number;range:number;pellets:number;spread:number}>,
};
export type WeaponInstance={instanceId:string;weaponId:WeaponId;magazine:number;reserve:number};
export type WeaponAction={serial:number;weaponId:WeaponId;instanceId:string;clip:string;startedAt:number;endsAt:number;nextEvent:number;aimX:number;aimY:number;aimZ:number;origin?:{x:number;y:number;elevation:number}};
export type WeaponEffect={id:string;ownerId:string;weaponId:WeaponId;type:'shot'|'damage'|'elimination'|'melee_hit'|'melee_miss';instanceId?:string;heat?:number;shotId?:string;region?:'head'|'body';damage?:number;spread?:number;surface?:boolean;at:number;x:number;y:number;elevation:number;toX:number;toY:number;toZ:number;targetId?:string};
export function weaponAction(id:WeaponId,clip:string){if(gunId(id)&&clip==='fire'){const g=GUNS[id];return{duration:g.duration,events:[{time:g.event,kind:'shot',hand:1}]};}const all=WORKSHOP_WEAPONS[id].actions as Record<string,{duration:number;events:readonly {time:number;kind:string;hand:number}[]}>;return all[clip]??all[isGun(id)?'fire':'attack1'];}
export function createWeapon(weaponId:WeaponId,instanceId:string):WeaponInstance{const ammo=(AMMO_CONFIG as Record<string,{magazine:number;reserve:number}>)[weaponId];return{instanceId,weaponId,magazine:ammo?.magazine??0,reserve:ammo?.reserve??0};}
