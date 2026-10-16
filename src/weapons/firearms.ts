import {WeaponKit} from './kit';
export function buildFirearm(k:WeaponKit,id:string){const p=k.part('receiver'),pistol=id==='pistol',rifle=id==='assault-rifle',end=pistol?1.5:rifle?2.55:2.25;
 // Shared local convention: grip origin, muzzle +X and sights +Y.
 k.shape(p,[[-.22,-.43],[.14,-.43],[.04,.24],[-.28,.24]],.24,0,k.rubber,.035);k.shape(p,[[-.29,-.43],[.15,-.43],[.18,-.35],[-.24,-.34]],.28,0,k.edge,.02);
 for(let i=0;i<8;i++)for(const side of [-1,1])k.box(p,-.06-i*.014,-.32+i*.065,side*.132,.23,.025,.02,k.dark,-.15);
 k.beam(p,[.08,.26,-.13],[.48,.18,-.13],.055,k.edge);k.beam(p,[.48,.18,-.13],[.44,-.04,-.13],.055,k.edge);k.beam(p,[.44,-.04,-.13],[.12,-.04,-.13],.055,k.edge);k.box(p,.24,.12,0,.045,.16,.05,k.brass,-.2);
 k.shape(p,[[-.37,.26],[-.44,.63],[-.3,.82],[.20,.82],[.20,.29]],.35,0,k.steel,.025);
 k.box(p,.51,.78,0,.63,.10,.35,k.steel);k.box(p,.51,.34,0,.63,.10,.35,k.steel);
 k.cylinderAt(p,.52,.57,0,.11,.49,k.energy);for(const x of [.27,.77])k.cylinderAt(p,x,.57,0,.15,.075,k.edge);
 for(const side of [-1,1]){k.shape(p,[[-.32,.28],[.06,.28],[.22,.4],[.05,.49],[-.32,.44]],.025,side*.21,k.steel);k.box(p,-.12,.68,side*.22,.32,.03,.025,k.energy);k.bolts(p,[[-.31,.31],[.72,.32]],.23);}
 const barrel=k.part('barrel');k.cylinderAt(barrel,(.9+end)/2,.57,0,pistol?.15:rifle?.11:.19,end-.9,k.dark);
 if(pistol){k.shape(barrel,[[.79,.29],[1.35,.29],[1.48,.42],[1.48,.74],[1.31,.84],[.8,.82]],.39,0,k.steel);for(let i=0;i<3;i++)for(const side of [-1,1])k.box(barrel,.93+i*.15,.57,side*.215,.035,.21,.025,k.energy,-.45);for(let i=0;i<6;i++)k.box(p,-.36+i*.065,.61,.212,.025,.2,.024,k.dark,-.12);k.box(p,-.27,.91,0,.13,.08,.18,k.dark);k.box(barrel,1.31,.91,0,.065,.065,.13,k.dark);}
 else{
  const fore=k.part('handguard');k.shape(fore,[[.79,.32],[1.77,.29],[1.98,.43],[1.92,.76],[.85,.84]],rifle?.36:.5,0,k.steel);
  for(let i=0;i<(rifle?7:10);i++){const x=.95+i*.085;for(const side of [-1,1])k.box(fore,x,.46,side*(rifle?.21:.28),.035,.24,.055,k.dark,-.08);}
  for(const side of [-1,1]){k.box(fore,1.4,.69,side*(rifle?.202:.275),.65,.035,.035,k.energy);if(!rifle)k.box(fore,1.35,.28,side*.22,.85,.16,.12,k.dark);}
  const stock=k.part('stock');k.beam(stock,[-.42,.58,0],[-.99,.56,0],.12,k.edge);k.shape(stock,[[-.85,.79],[-1.5,.75],[-1.58,.62],[-1.4,-.04],[-1.17,.04],[-.85,.39]],.28,0,k.steel);k.shape(stock,[[-1.02,.48],[-1.35,.52],[-1.28,.18]],.31,0,k.dark);k.box(stock,-1.46,.33,0,.12,.71,.34,k.rubber,.15);for(const side of [-1,1])k.box(stock,-1.15,.68,side*.162,.48,.026,.022,k.energy);
  if(rifle){const mag=k.part('magazine');k.shape(mag,[[.46,.29],[.78,.29],[.67,-.64],[.32,-.6]],.27,0,k.dark);for(const side of [-1,1]){k.box(mag,.53,-.23,side*.15,.075,.59,.025,k.steel,.13);k.box(mag,.61,-.13,side*.17,.022,.32,.012,k.energy,.13);}k.box(mag,.49,-.61,0,.43,.10,.35,k.edge,.09);
   k.box(p,.12,1.0,0,.48,.15,.26,k.dark);k.shape(p,[[-.12,1.01],[-.12,1.32],[.3,1.32],[.38,1.16],[.33,1.01]],.23,0,k.edge);k.box(p,.13,1.16,.13,.28,.17,.02,k.dark);k.box(p,.13,1.16,.147,.16,.09,.012,k.energy);
  }else{for(const side of [-1,1]){k.box(p,.38,.9,side*.12,.32,.06,.045,k.dark);k.box(fore,1.18,.38,side*.32,.045,.15,.025,k.energy,-.4);}k.box(p,-.23,.9,0,.12,.13,.15,k.dark);}
  for(let i=0;i<17;i++)k.box(p,-.32+i*.13,.86,0,.075,.045,.24,k.dark);
 }
 // Open muzzle ring with recessed bore instead of a solid capped cylinder.
 k.ring(barrel,end-.05,.57,0,pistol?.16:rifle?.16:.23,.04,k.edge);k.ring(barrel,end-.15,.57,0,pistol?.17:rifle?.17:.24,.02,k.energy);k.cylinderAt(barrel,end-.19,.57,0,pistol?.12:rifle?.12:.18,.035,k.dark);
 for(const part of k.root.children)k.batch(part);
}
