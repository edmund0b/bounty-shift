import type {Position} from './game.js';
export const MODES = {
 tag:{name:'TAG',icon:'◉',description:'Avoid being IT at the buzzer. Find and throw freeze balls to stop other runners.'},
 flag_run:{name:'FLAG RUN',icon:'⚑',description:'Loot and fight, then recover the flag and deliver it to the marked capture zone.'},
 kill_race:{name:'KILL RACE',icon:'⚔',description:'Find weapons and earn eliminations. Duos race to 15; highest score wins at the buzzer.'},
} as const;
export type GameMode=keyof typeof MODES;
export type Format='solo'|'duo';
export type ItemKind='freeze_ball'|'blade'|'hammer';
export const RULES={freezeMs:3000,retagGraceMs:1200,flagSpawnMs:30000,flagWarningMs:5000,killTarget:15,pickupRange:65,ballSpeed:650,ballLifetimeMs:1600,itemRespawnMs:12000};
export const WEAPONS={blade:{damage:25,cooldown:.38},hammer:{damage:40,cooldown:.9}};
export type WorldItem=Position&{id:string;source:'chest'|'floor';state:'closed'|'opening'|'opened'|'empty';openedAt?:number;pickupPosition?:Position;kind:ItemKind|null;refreshAt:number};
export type Projectile=Position&{id:string;ownerId:string;teamId:string;dx:number;dy:number;expiresAt:number;bornAt?:number};
export type ModeEffect=Position&{id:string;type:'throw'|'ice_hit'|'ice_wall';at:number;ownerId:string;targetId?:string;dx:number;dy:number};
export type ModeState={teams:Record<string,string>;scores:Record<string,number>;matchPoints:Record<string,number>;it:string|null;tagAfter:number;items:WorldItem[];projectiles:Projectile[];effects:ModeEffect[];flag:{state:'not_spawned'|'spawned'|'carried'|'dropped'|'captured';carrier:string|null;position:Position;spawnAt:number};capture:Position;winnerKeys:string[];reason:string};
export function emptyMode():ModeState{return {teams:{},scores:{},matchPoints:{},it:null,tagAfter:0,items:[],projectiles:[],effects:[],flag:{state:'not_spawned',carrier:null,position:{x:0,y:0},spawnAt:0},capture:{x:0,y:0},winnerKeys:[],reason:''};}
export const validMode=(value:unknown):value is GameMode=>typeof value==='string'&&Object.hasOwn(MODES,value);
export const validFormat=(value:unknown):value is Format=>value==='solo'||value==='duo';
export const validTeams=(format:Format,count:number)=>format==='solo'?count>=2&&count<=6:count===4||count===6;
export function teamKey(state:ModeState,id:string){return state.teams[id]??id;}
