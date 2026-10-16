export type Category='melee'|'firearms'|'power-ups';
export type Anchor={name:string;position:[number,number,number];direction:[number,number,number];part?:string};
export type Equipment={id:string;name:string;category:Category;type:string;classification:string;provisional?:boolean;color:number;scale:number;orientation:[number,number,number];status:string;model:string;description:string;anchors:Anchor[]};
const grip:Anchor={name:'main-grip',position:[0,0,0],direction:[1,0,0]};
const melee=(id:string,name:string,type:string,color:number,length:number,classification:string,provisional=false):Equipment=>({id,name,type,category:'melee',color,scale:1,orientation:[0,0,.18],classification,provisional,status:'Modeled · first pass',model:id,description:'Procedural concept interpretation. Grip pivot at origin; striking direction +X.',anchors:[grip,{name:'strike-region',position:[length,0,0],direction:[1,0,0]}]});
const gun=(id:string,name:string,length:number,classification:string):Equipment=>({id,name,type:id,category:'firearms',color:0xff8b22,scale:1,orientation:[0,0,0],classification,status:'Modeled · first pass',model:id,description:'Modular receiver, grip and muzzle. Local +X points forward; +Y points up.',anchors:[grip,{name:'muzzle',position:[length,.57,0],direction:[1,0,0]},...(id==='pistol'?[]:[{name:'secondary-grip',position:[1.1,.27,0] as [number,number,number],direction:[1,0,0] as [number,number,number]}]) ]});
const power=(id:string,name:string,color:number,type='sphere'):Equipment=>({id,name,type,category:'power-ups',color,scale:1,orientation:[0,0,0],classification:'Utility concept',status:'Modeled · first pass',model:id,description:'Presentation asset only. No gameplay effect, timing or balance is assigned.',anchors:[{name:'pickup-root',position:[0,0,0],direction:[0,1,0]},{name:'effect-origin',position:[0,type==='sphere'?.7:1.2,0],direction:[0,1,0]}]});
export const equipment:Equipment[]=[
 melee('heavy-blade','Heavy Futuristic Blade','cleaver',0xff8b22,2.25,'Heavy silhouette',true),
 melee('impact-hammer','Heavy Impact Hammer','hammer',0xff8b22,1.95,'Heavy silhouette',true),
 melee('riot-bat','Riot Bat','bat',0xff8b22,1.85,'Balanced'),
 {...melee('twin-daggers','Twin Daggers','dual blades',0x39ddff,1.35,'Fast'),description:'Independent left/right dagger groups, each with its own local grip pivot.',anchors:[{...grip,name:'left-grip',part:'left-dagger'},{...grip,name:'right-grip',part:'right-dagger'},{name:'left-strike',part:'left-dagger',position:[1.25,0,0],direction:[1,0,0]},{name:'right-strike',part:'right-dagger',position:[1.25,0,0],direction:[1,0,0]}]},
 melee('pulse-katana','Pulse Katana','katana',0x39ddff,2.95,'Balanced'),
 gun('pistol','Pistol',1.5,'Sidearm'),gun('assault-rifle','Assault Rifle',2.55,'Long gun'),gun('shotgun','Shotgun',2.25,'Heavy front assembly'),
 gun('sniper-rifle','Sniper Rifle',3.45,'Precision rifle'),
 power('freeze-ball','Freeze Ball',0x52dfff),power('gravity-bomb','Gravity Bomb',0xa655ff),power('clone-decoy','Clone Decoy',0x42e4ff,'projector'),power('bounce-bomb','Bounce Bomb',0xffa328),power('healing-burst','Healing Burst',0x65ff64),power('blink-beacon','Blink Beacon',0x8074ff,'beacon'),
];
export function equipmentById(id:string){const asset=equipment.find(w=>w.id===id);if(!asset)throw new Error(`Unknown equipment: ${id}`);return asset;}
export const categories:Category[]=['melee','firearms','power-ups'];
export const weaponState={id:'heavy-blade',category:'melee' as Category,exposure:1.15,light:1,rotation:0,autoRotate:false,wireframe:false,anchors:false,effects:true,mode:'studio'};
export function resetWeaponPresentation(){Object.assign(weaponState,{exposure:1.15,light:1,rotation:0,autoRotate:false,wireframe:false,anchors:false,effects:true,mode:'studio'});}
