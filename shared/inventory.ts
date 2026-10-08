import type {ItemKind} from './modes.js';
export type Slot=1|2|3;
export type Inventory={weapon:ItemKind|null;utility:ItemKind|null};
export type Equipped={heldItem:ItemKind|null;inventory?:Inventory;selectedSlot?:Slot};
export function clearInventory(p:Equipped){p.inventory={weapon:null,utility:null};p.selectedSlot=1;p.heldItem=null;}
export function pickup(p:Equipped,kind:ItemKind){p.inventory??={weapon:null,utility:null};const utility=kind==='freeze_ball';p.inventory[utility?'utility':'weapon']=kind;p.selectedSlot=utility?3:1;p.heldItem=kind;}
export function equip(p:Equipped,slot:Slot,carry:boolean){p.inventory??={weapon:null,utility:null};if(slot===2&&!carry||slot===3&&!p.inventory.utility)return false;p.selectedSlot=slot;p.heldItem=slot===1?p.inventory.weapon:slot===3?p.inventory.utility:null;return true;}
export function consumeUtility(p:Equipped){if(p.inventory)p.inventory.utility=null;p.heldItem=null;p.selectedSlot=1;p.heldItem=p.inventory?.weapon??null;}
