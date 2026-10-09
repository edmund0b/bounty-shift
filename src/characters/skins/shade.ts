import {baseBody,hands,boots,kneePads,belt,harness,sword,type SkinBuilder} from '../anatomy';
import {feature,type V} from '../construction';
export const shade:SkinBuilder=(b,r)=>{
 const cloth=b.mat(0x161820),seam=b.mat(0x30313b),leather=b.mat(0x202128,'leather'),armor=b.mat(0x343440,'armor'),black=b.mat(0x020308),metal=b.mat(0x656572,'metal'),violet=b.mat(0x784caf,'energy',.38);
 baseBody(b,r,cloth);hands(b,r,leather,armor);boots(b,r,leather,armor,violet);belt(b,r,leather,metal);kneePads(b,r,armor);harness(b,r,leather);sword(b,r,leather,armor);
 // A deep recessed oval sits inside a modeled hood opening; the face has no eyes.
 b.oval(r.head,[.233,.28,.205],black,[0,-.015,.028]);b.profile(r.head,[[-.3,.245,.22],[-.18,.28,.245],[.18,.26,.245],[.32,.19,.18],[.43,.025,.03]],cloth,[0,0,-.04]);
 // Front opening covers the hood's front surface with an inward bevel and dark recess.
 b.oval(r.head,[.215,.263,.046],black,[0,-.015,.226]);b.tube(r.head,[[-.21,-.25,.2],[-.255,-.06,.214],[-.2,.2,.23],[0,.36,.17],[.2,.2,.23],[.255,-.06,.214],[.21,-.25,.2]],.041,seam);b.tube(r.head,[[0,.4,-.04],[0,.24,-.27],[0,-.2,-.29]],.011,seam);
 b.profile(r.torso,[[-.43,.315,.225],[-.04,.33,.23],[.3,.43,.255],[.5,.35,.24]],cloth);b.strap(r.torso,[0,-.4,.243],[0,.47,.264],.016,metal);for(const s of [-1,1]){b.tube(r.torso,[[s*.22,.56,.13],[s*.15,.33,.27],[s*.13,.11,.27]],.011,seam);b.round(r.torso,[.17,.12,.035],leather,[s*.24,-.24,.221],[0,0,s*.18]);b.ring(r.hips,.065,.009,metal,[s*.2,-.06,.272]);b.round(r.legs[s<0?0:1].hip,[.16,.29,.09],leather,[s*.12,-.35,.145]);for(const y of [-.25,-.52])b.profile(r.legs[s<0?0:1].hip,[[y-.025,.191,.192],[y+.025,.191,.192]],leather);const tail=b.cloth(r.hips,'shadow-coat-tail-'+s,.21,.8,cloth,[s*.29,-.03,-.2],s*.22);b.cloth(tail,'torn-edge',.07,.81,seam,[s*.07,0,-.017]);}
 r.arms.forEach(a=>{b.round(a.shoulder,[.25,.19,.27],armor,[0,.015,0],[0,0,.07]);b.round(a.elbow,[.16,.27,.075],armor,[0,-.25,.105]);for(const y of [-.13,-.34])b.profile(a.elbow,[[y-.026,.131,.133],[y+.026,.131,.133]],leather);});
 // Static, joint-attached tendrils keep the shadow language without hiding the body.
 const shadow=b.group(r.torso,'shadow-tendrils');for(let i=0;i<7;i++){const s=i%2?-1:1,y=.43-i*.1;const points:V[]=[[s*.4,y,-.17],[s*.62,y+.12,-.25],[s*(.66+(i%3)*.045),y-.1,-.13],[s*.59,y-.26,-.24]];b.tube(shadow,points,.013,i%3===0?violet:seam,.03);}b.tube(r.head,[[-.17,.2,-.17],[-.38,.33,-.22],[-.43,.16,-.13],[-.37,.04,-.2]],.012,seam,.01);
 feature(r.root,'Deep faceless hood; cross-body harness; tactical cargo gear and rings; back scabbard; restrained shadow tendrils and violet soles');
};
