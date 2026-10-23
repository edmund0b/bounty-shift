import {TAG_POLISH} from './tag-polish.js';
import {PAIR} from './pair-powerups.js';
import type {GameMode} from './modes.js';
import type {PowerId} from './tag-run.js';
/** Opportunities count generated world pickups, not player drops or duplicate chest-open events. */
const common={enabled:true,initialActive:2,initialDelayMs:0,respawnMs:40000,collectionCooldownMs:250,minSpacing:550,playerClearance:100,pickupClearance:85,objectiveClearance:130};
export const CRATE_CONFIG={
 tag:{...common,...TAG_POLISH.crates,ratio:2,stopBeforeEndMs:5000},
 flag_run:{...common,ratio:1,maxActive:2,respawnMs:50000,spawnIntervalMs:2500,stopBeforeEndMs:0},
 kill_race:{...common,ratio:1,maxActive:2,respawnMs:50000,spawnIntervalMs:2500,stopBeforeEndMs:0},
} satisfies Record<GameMode,typeof common&{ratio:number;maxActive:number;spawnIntervalMs:number;stopBeforeEndMs:number}>;
export const CRATE_PRESENTATION={scale:.8,openingMs:1200,revealMs:2000,fadeMs:600,receiptMs:20000};
export type CrateReceipt={id:string;crateId:string;generation:number;ownerId:string;at:number;reward?:PowerId};
export type CrateState={version:1;startedAt:number;nextSpawnAt:number;ended:boolean;weaponKeys:string[];weaponOpportunities:number;baseWeaponOpportunities:number;repeatingWeapons:number;referenceWeaponOpportunities:number;crateOpportunities:number;receipts:CrateReceipt[];collectionAfter:Record<string,number>};
/** Temporary eligible roster; original rarity weights are unchanged. */
export const crateRewardPool=(mode:GameMode):'existing_tag_roster'|readonly PowerId[]=>mode==='tag'?'existing_tag_roster':PAIR.enabledRewards?['freeze_ball','bounce_bomb','sticky_trap']:['freeze_ball'];
