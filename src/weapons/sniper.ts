import {WeaponKit} from './kit';
/** Separate reference-based model. Existing firearm builders are unchanged. */
export function buildSniper(k:WeaponKit){
 const receiver=k.part('receiver');
 k.shape(receiver,[[-.46,.32],[-.46,.78],[1.25,.78],[1.42,.57],[1.18,.29]],.34,0,k.steel);
 k.shape(receiver,[[-.24,.3],[.09,.3],[.15,-.44],[-.19,-.44]],.23,0,k.rubber);
 for(let i=0;i<9;i++)k.box(receiver,-.035,-.35+i*.063,0,.29,.024,.26,k.dark,-.1);
 k.beam(receiver,[.12,.23,0],[.48,.18,0],.055);k.beam(receiver,[.48,.18,0],[.44,-.07,0],.055);k.beam(receiver,[.44,-.07,0],[.12,-.07,0],.055);k.box(receiver,.25,.12,0,.05,.16,.05,k.brass,-.15);
 for(const s of [-1,1]){k.box(receiver,.45,.59,s*.185,.85,.10,.035,k.dark);k.box(receiver,.45,.59,s*.21,.61,.035,.025,k.energy);k.bolts(receiver,[[-.35,.4],[.95,.38],[1.1,.69]],.19);}
 const barrel=k.part('barrel');k.cylinderAt(barrel,2.15,.57,0,.085,2.0,k.dark);k.cylinderAt(barrel,2.65,.57,0,.105,.58,k.edge);
 for(const x of [1.42,1.7,2.03,2.4,2.88]){k.cylinderAt(barrel,x,.57,0,.13,.075,k.edge);k.ring(barrel,x,.57,0,.132,.015,k.energy);}
 for(const s of [-1,1])k.box(barrel,2.61,.57,s*.098,.39,.035,.022,k.energy);
 k.cylinderAt(barrel,3.2,.57,0,.17,.46,k.dark);for(let i=0;i<4;i++)for(const s of [-1,1])k.box(barrel,3.04+i*.1,.58,s*.166,.035,.13,.02,k.steel);
 k.ring(barrel,3.45,.57,0,.17,.035,k.edge);k.ring(barrel,3.4,.57,0,.13,.018,k.energy);k.cylinderAt(barrel,3.29,.57,0,.105,.025,k.dark);
 const fore=k.part('handguard');k.shape(fore,[[.88,.3],[1.97,.3],[2.15,.47],[2.05,.8],[.92,.8]],.32,0,k.steel);
 for(const s of [-1,1])for(let i=0;i<5;i++){k.box(fore,1.08+i*.18,.57,s*.18,.12,.14,.02,k.dark,-.25);}
 for(const s of [-1,1])k.box(fore,1.5,.37,s*.18,.85,.025,.023,k.energy);
 const stock=k.part('stock');k.beam(stock,[-.4,.58,0],[-1.0,.58,0],.14,k.edge);k.shape(stock,[[-.9,.75],[-1.61,.7],[-1.65,.57],[-1.48,-.02],[-1.27,.04],[-.92,.37]],.28,0,k.dark);k.shape(stock,[[-1.02,.64],[-1.48,.59],[-1.33,.16]],.30,0,k.steel);k.box(stock,-1.54,.33,0,.11,.7,.34,k.rubber,.17);k.box(stock,-1.22,.82,0,.56,.15,.31,k.rubber);
 for(const s of [-1,1])k.box(stock,-1.2,.65,s*.17,.47,.025,.02,k.energy);
 const magazine=k.part('magazine');k.shape(magazine,[[.53,.29],[.9,.29],[.85,-.46],[.48,-.46]],.26,0,k.dark);for(const s of [-1,1])for(let i=0;i<3;i++)k.box(magazine,.57+i*.10,-.1,s*.145,.034,.53,.025,i===1?k.energy:k.edge);k.box(magazine,.68,-.44,0,.43,.08,.31,k.edge);
 const scope=k.part('scope');for(const x of [.05,.7]){k.box(scope,x,.91,0,.17,.25,.24,k.dark);k.ring(scope,x,1.2,0,.15,.025,k.edge);}k.cylinderAt(scope,.38,1.2,0,.14,1.3,k.dark);k.cylinderAt(scope,.99,1.2,0,.235,.38,k.steel);k.cylinderAt(scope,-.28,1.2,0,.19,.24,k.dark);for(const x of [-.38,-.2,.22,.56,.82,1.14])k.ring(scope,x,1.2,0,x>.8?.225:.153,.018,k.brass);k.cylinderAt(scope,1.19,1.2,0,.18,.018,k.energy);k.cylinderAt(scope,-.41,1.2,0,.14,.018,k.energy);k.cylinderAt(scope,.35,1.4,0,.11,.2,k.dark,'y');k.cylinderAt(scope,.35,1.2,.18,.09,.16,k.dark,'z');
 const bolt=k.part('bolt');k.beam(bolt,[.09,.68,.2],[.03,.61,.38],.055,k.edge);k.mesh(bolt,k.sphere,k.dark,[.03,.6,.39],[.08,.08,.08]);
 for(let i=0;i<21;i++)k.box(receiver,-.38+i*.115,.83,0,.055,.04,.26,k.dark);
 for(const part of k.root.children)k.batch(part);
}
