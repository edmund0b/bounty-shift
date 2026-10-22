import type {GameMode} from './modes.js';
import type {PowerId} from './tag-run.js';
/** Opportunities count generated world pickups, not player drops or duplicate chest-open events. */
const common={enabled:true,initialDelayMs:0,respawnMs:14000,collectionCooldownMs:250,minSpacing:110,playerClearance:100,pickupClearance:85,objectiveClearance:130};
export const CRATE_CONFIG={
 tag:{...common,ratio:2,maxActive:16,spawnIntervalMs:500,stopBeforeEndMs:5000},
 flag_run:{...common,ratio:1,maxActive:8,spawnIntervalMs:1000,stopBeforeEndMs:0},
 kill_race:{...common,ratio:1,maxActive:8,spawnIntervalMs:1000,stopBeforeEndMs:0},
} satisfies Record<GameMode,typeof common&{ratio:number;maxActive:number;spawnIntervalMs:number;stopBeforeEndMs:number}>;
export const CRATE_PRESENTATION={scale:.8,openingMs:1200,revealMs:2000,fadeMs:600,receiptMs:20000};
export type CrateReceipt={id:string;crateId:string;generation:number;ownerId:string;at:number;reward?:PowerId};
export type CrateState={version:1;startedAt:number;nextSpawnAt:number;ended:boolean;weaponKeys:string[];weaponOpportunities:number;baseWeaponOpportunities:number;repeatingWeapons:number;referenceWeaponOpportunities:number;crateOpportunities:number;receipts:CrateReceipt[];collectionAfter:Record<string,number>};
/** Existing Tag abilities already work; other modes currently implement Freeze Ball only. */
export const crateRewardPool=(mode:GameMode):'existing_tag_roster'|readonly PowerId[]=>mode==='tag'?'existing_tag_roster':['freeze_ball'];
