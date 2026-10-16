import type {ItemKind} from './modes.js';
import {canonicalWeapon,createWeapon,type WeaponInstance,LOOT_CONFIG} from './weapons.js';
export type Slot=1|2|3;
export type Inventory={weapon:ItemKind|null;utility:ItemKind|null;weapons?:[WeaponInstance|null,WeaponInstance|null]};
export type Equipped={heldItem:ItemKind|null;inventory?:Inventory;selectedSlot?:Slot};
let fixtureId=0;
export function clearInventory(p:Equipped){p.inventory={weapon:null,utility:null,weapons:[null,null]};p.selectedSlot=1;p.heldItem=null;}
export function weaponSlots(p:Equipped){p.inventory??={weapon:null,utility:null};p.inventory.weapons??=[p.inventory.weapon&&canonicalWeapon(p.inventory.weapon)?createWeapon(canonicalWeapon(p.inventory.weapon)!,`legacy-${++fixtureId}`):null,null];return p.inventory.weapons;}
export function syncEquipped(p:Equipped){const weapons=weaponSlots(p);p.inventory!.weapon=weapons[(p.selectedSlot??1)===2?1:0]?.weaponId??weapons.find(Boolean)?.weaponId??null;p.heldItem=p.selectedSlot===3?p.inventory!.utility:weapons[p.selectedSlot===2?1:0]?.weaponId??null;}
export function activeWeapon(p:Equipped){return p.selectedSlot===3?null:weaponSlots(p)[p.selectedSlot===2?1:0];}
export function hasCapacity(p:Equipped,kind:ItemKind){return kind==='freeze_ball'?!p.inventory?.utility:weaponSlots(p).filter(Boolean).length<LOOT_CONFIG.capacity;}
export function pickup(p:Equipped,kind:ItemKind,instance?:WeaponInstance,replaceSlot?:1|2){
 p.inventory??={weapon:null,utility:null};if(kind==='freeze_ball'){if(p.inventory.utility)return false;p.inventory.utility=kind;p.selectedSlot=3;p.heldItem=kind;return true;}
 const canonical=canonicalWeapon(kind);if(!canonical)return false;const slots=weaponSlots(p);if(slots.some(w=>w?.weaponId===canonical))return false;
 const index=replaceSlot?replaceSlot-1:slots.findIndex(w=>!w);if(index<0)return false;
 slots[index]=instance??createWeapon(canonical,`legacy-${++fixtureId}`);p.selectedSlot=(index+1) as Slot;syncEquipped(p);
 // Legacy aliases are accepted for original fixture/source API compatibility, never emitted by new spawns.
 if(kind==='blade'||kind==='hammer'){p.inventory.weapon=kind;p.heldItem=kind;}
 return true;
}
export function equip(p:Equipped,slot:Slot,carry:boolean){p.inventory??={weapon:null,utility:null};const slots=weaponSlots(p);if(slot===3&&!p.inventory.utility||slot===2&&!slots[1]&&!carry)return false;p.selectedSlot=slot;syncEquipped(p);return true;}
export function consumeUtility(p:Equipped){if(p.inventory)p.inventory.utility=null;p.selectedSlot=1;syncEquipped(p);}
