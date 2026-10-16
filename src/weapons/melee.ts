import type * as T from 'three';
import {WeaponKit} from './kit';
export function blade(k:WeaponKit,p:T.Group,kind:'cleaver'|'katana'|'dagger'){
 const dagger=kind==='dagger',katana=kind==='katana';k.grip(p,0,dagger?.42:.62,dagger?.075:.1);
 const guardX=dagger?.28:.39;k.shape(p,[[guardX-.07,-.22],[guardX+.09,-.26],[guardX+.14,-.1],[guardX+.11,.2],[guardX-.03,.24],[guardX-.1,.08]],.18,0,k.edge);k.ring(p,guardX,0,0,dagger?.13:.17,.025,k.dark);
 const pts=katana?[[.49,.13],[1.2,.11],[2.1,.05],[2.8,-.06],[3.4,.02],[3.05,-.22],[2.4,-.26],[1.5,-.18],[.52,-.13]]:dagger?[[.34,.16],[.7,.22],[1.55,-.04],[1.1,-.25],[.49,-.21],[.34,-.1]]:[[.52,.27],[1.35,.31],[2.15,.37],[2.52,.65],[2.7,.38],[2.55,-.05],[2.28,-.42],[1.5,-.5],[.53,-.33]];
 k.shape(p,pts,katana?.075:dagger?.09:.16,0,k.edge,.014);
 const armor=pts.map(([x,y])=>[.5+(x-.5)*.93,y*.66+.03]);k.shape(p,armor,katana?.09:dagger?.12:.19,0,k.dark,.018);
 for(const side of [-1,1]){const z=side*(katana?.058:dagger?.078:.118),end=katana?3.05:dagger?1.25:2.22;
  k.shape(p,[[.55,.04],[end*.7,.015],[end,-.035],[end-.22,-.09],[end*.65,-.045],[.55,-.03]],.012,z,k.energy,.003);
  k.shape(p,[[.62,.14],[.99,.18],[1.12,.12],[1.03,.06],[.7,.1]],.035,z,k.steel,.009);
  if(!dagger)for(let i=0;i<(katana?6:4);i++){const x=.7+i*.3;k.box(p,x,.18+(katana?-i*.015:i*.018),z,.15,.055,.035,k.steel,-.2);}
 }
 if(dagger)for(let i=0;i<5;i++)k.shape(p,[[.43+i*.115,.14],[.53+i*.115,.18],[.5+i*.115,.27]],.10,0,k.edge,.004);
 k.bolts(p,[[.48,.1],[.56,-.1],[.98,.11]],katana?.065:.12);
 if(kind==='cleaver'){k.beam(p,[-.32,-.1,0],[.25,-.4,0],.065,k.edge);k.beam(p,[.25,-.4,0],[.51,-.25,0],.065,k.edge);k.cylinderAt(p,.49,0,0,.105,.22,k.brass);}
 k.cylinderAt(p,dagger?-.28:-.4,0,0,dagger?.085:.12,.10,k.dark);k.box(p,dagger?-.285:-.42,0,.09,.04,.055,.035,k.energy);
}
export function buildMelee(k:WeaponKit,id:string){
 if(id==='twin-daggers'){for(const [name,y,angle]of [['left-dagger',.42,.17],['right-dagger',-.42,-.17]] as const){const p=k.part(name);p.position.y=y;p.rotation.z=angle;blade(k,p,'dagger');k.batch(p);}return;}
 const p=k.part('weapon-body');if(id==='heavy-blade'||id==='pulse-katana'){blade(k,p,id==='heavy-blade'?'cleaver':'katana');k.batch(p);return;}
 k.grip(p,0,.67,.11);k.cylinderAt(p,.7,0,0,.085,.78,k.steel);k.cylinderAt(p,-.43,0,0,.15,.14,k.dark);k.ring(p,-.44,0,0,.155,.023,k.edge);
 if(id==='riot-bat'){
  k.cylinderAt(p,1.47,0,0,.23,1.35,k.dark);for(let i=0;i<5;i++){const x=.93+i*.27;k.cylinderAt(p,x,0,0,.28,.065,k.edge);for(let j=0;j<6;j++){const a=j*Math.PI/3;k.mesh(p,k.cube,k.steel,[x+.11,Math.sin(a)*.225,Math.cos(a)*.225],[.19,.16,.09],[-a,0,0]);k.mesh(p,k.cube,k.energy,[x+.11,Math.sin(a)*.275,Math.cos(a)*.275],[.13,.025,.014],[-a,0,0]);}}
  k.cylinderAt(p,2.18,0,0,.30,.16,k.steel);k.cylinderAt(p,2.27,0,0,.25,.025,k.dark);k.ring(p,2.29,0,0,.21,.018,k.energy);
 }else{
  k.cylinderAt(p,1.2,0,0,.12,1.05,k.dark);for(const x of [.55,.85,1.4]){k.cylinderAt(p,x,0,0,.15,.09,k.edge);k.box(p,x+.07,.11,0,.11,.04,.08,k.energy);}
  k.box(p,1.93,0,0,.48,1.28,.55,k.dark);k.box(p,1.93,-.62,0,.7,.55,.72,k.steel);k.box(p,1.93,-.9,0,.74,.08,.76,k.edge);
  for(const y of [-.36,-.6,-.77])k.box(p,1.93,y,.37,.61,.045,.016,k.energy);
  k.cylinderAt(p,1.93,.21,0,.29,.62,k.brass,'y');k.cylinderAt(p,1.93,.21,.33,.15,.06,k.edge,'z');k.cylinderAt(p,1.93,.21,.375,.095,.03,k.dark,'z');
  k.shape(p,[[1.67,.45],[2.17,.45],[2.33,.62],[2.1,1.12],[1.94,.65]],.4,0,k.edge);k.shape(p,[[1.85,.51],[2.11,.55],[2.22,.69],[2.09,.9]],.42,0,k.dark);
  k.bolts(p,[[1.7,-.43],[2.16,-.43],[1.7,-.72],[2.16,-.72]],.39);
 }k.batch(p);
}
