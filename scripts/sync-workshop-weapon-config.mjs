// Run with: node --import tsx scripts/sync-workshop-weapon-config.mjs
// Extract immutable server data; never import the preview AmmoBank into the server.
import {writeFile} from 'node:fs/promises';
import {equipment} from '../src/weapons/registry.ts';
import {weaponActions,weaponEvents} from '../src/weapons/actions.ts';
import {ammoConfig} from '../src/weapons/ammo.ts';
const weapons=Object.fromEntries(equipment.filter(w=>w.category!=='power-ups').map(w=>[w.id,{name:w.name,category:w.category,actions:Object.fromEntries(weaponActions(w.id).filter(a=>['equip','attack1','attack2','attack3','fire','reload'].includes(a.id)).map(a=>[a.id,{duration:a.duration,events:weaponEvents(w.id,a.id)}]))}]));
await writeFile(new URL('../shared/workshop-weapons.ts',import.meta.url),'// Generated from supplied Workshop V5 registry/actions/ammo.\nexport const WORKSHOP_WEAPONS='+JSON.stringify(weapons,null,1)+' as const;\nexport const AMMO_CONFIG='+JSON.stringify(ammoConfig,null,1)+' as const;\n');
