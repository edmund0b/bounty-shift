import {baseBody,hands,boots,face,belt,type SkinBuilder} from '../anatomy';
import {snowflake,longHair} from '../details';
import {feature} from '../construction';
export const lumi:SkinBuilder=(b,r)=>{
 const white=b.mat(0xdfe7ed),ice=b.mat(0x93bbd5,'shell'),silver=b.mat(0x8a9caf,'metal'),skin=b.mat(0xe1bcae,'skin'),hair=b.mat(0xd8dceb,'hair'),shine=b.mat(0xf0eff9,'hair'),glow=b.mat(0x68dfff,'energy',.55),dark=b.mat(0x3c5063,'leather'),fur=b.mat(0xe7e9e7);
 baseBody(b,r,skin);face(b,r,skin,b.mat(0x619bc1,'skin'),true);hands(b,r,white,silver);boots(b,r,white,ice,glow,true);longHair(b,r,hair,shine,true);
 // Cropped bodice and a separate short mantle leave a readable waist.
 b.profile(r.torso,[[.0,.245,.2],[.12,.32,.244],[.32,.34,.23],[.44,.28,.2]],white);
 for(const s of [-1,1]){b.strap(r.torso,[s*.24,.46,.19],[s*.13,.04,.246],.055,silver);b.strap(r.torso,[s*.13,.04,.246],[s*.25,.34,.22],.028,ice);b.plate(r.torso,[[0,.12],[.075,0],[0,-.11],[-.075,0]],.035,glow,[0,.36,.256]);}
 const collar=b.group(r.torso,'fur-collar',[0,.48,0]);for(let i=0;i<19;i++){const a=i/18*Math.PI*2;b.oval(collar,[.075,.08,.062],fur,[Math.sin(a)*.31,Math.cos(a*3)*.02,Math.cos(a)*.21],undefined,8);}
 r.arms.forEach((a,i)=>{b.profile(a.shoulder,[[-.37,.14,.14],[-.22,.17,.16],[-.04,.15,.15],[.1,.11,.12]],white);b.profile(a.shoulder,[[-.4,.135,.137],[-.34,.148,.149]],ice);b.plate(a.elbow,[[-.1,-.02],[.105,.015],[.075,-.42],[-.08,-.4]],.045,i?ice:silver,[0,-.01,.09]);b.round(a.elbow,[.035,.27,.025],glow,[0,-.22,.132]);b.ring(a.wrist,.08,.02,silver,[0,.05,0],[Math.PI/2,0,0]);});
 b.profile(r.hips,[[-.2,.33,.235],[.08,.3,.238]],white);belt(b,r,dark,silver);
 r.legs.forEach((l,i)=>{b.profile(l.hip,[[-.26,.165,.17],[.02,.195,.19]],white);if(i===0){for(const y of [-.31,-.4])b.profile(l.hip,[[y-.02,.162,.175],[y+.02,.162,.175]],ice);b.profile(l.knee,[[-.62,.103,.12],[-.33,.115,.14],[-.2,.116,.13]],white);}snowflake(b,l.ankle,[0,.13,.13],glow,.048);});
 for(const s of [-1,1]){const panel=b.cloth(r.hips,'ice-coat-tail-'+s,.33,s<0?1.16:.92,white,[s*.29,.015,-.19],s*.21,true);b.cloth(panel,'crystal-lining',.21,s<0?1.11:.88,ice,[0,-.015,-.022],0,true);for(let j=0;j<5;j++)snowflake(b,panel,[.015,-.13-j*.16,.025-j*.009],ice,.027);const side=b.cloth(r.hips,'asymmetric-skirt-'+s,.32,s<0?.57:.31,white,[s*.23,-.06,.18],s*.17,true);snowflake(b,side,[0,-.2,.029],ice,.045);b.round(r.hips,[.13,.23,.09],ice,[s*.36,-.13,.04]);snowflake(b,r.head,[s*.21,.08,.21],glow,.069);}
 const back=b.group(r.torso,'rear-ice-crest',[0,.26,-.244]);back.rotation.y=Math.PI;snowflake(b,back,[0,0,0],ice,.15);b.plate(back,[[0,.18],[.055,.03],[0,-.13],[-.055,.03]],.02,glow);
 feature(r.root,'Silver hair with braids and snowflake clips; fur collar; asymmetric crystalline coat tails; ice-tech forearms and boots');
};
