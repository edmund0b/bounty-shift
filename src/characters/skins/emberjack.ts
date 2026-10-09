import type {SkinBuilder} from '../anatomy';
import {baseBody,hands,boots,kneePads,belt,harness,face} from '../anatomy';
import {feature,type V} from '../construction';
import {fireEmblem} from '../details';
export const emberjack:SkinBuilder=(b,r)=>{
 const cloth=b.mat(0x231d20),red=b.mat(0x8a302e),armor=b.mat(0x443438,'armor'),metal=b.mat(0x665252,'metal'),black=b.mat(0x17171c,'leather'),fire=b.mat(0xff6726,'energy',1.1),hair=b.mat(0x291d1a,'hair'),skin=b.mat(0x925f48,'skin');
 baseBody(b,r,cloth);face(b,r,skin,fire);hands(b,r,black,fire);boots(b,r,black,armor,fire);belt(b,r,black,metal);kneePads(b,r,armor,fire);harness(b,r,black);
 b.plate(r.head,[[-.19,-.025],[.19,-.025],[.15,-.21],[0,-.285],[-.15,-.21]],.08,black,[0,0,.23]);for(const s of [-1,1])b.tube(r.head,[[s*.15,-.055,.28],[s*.1,-.13,.293],[s*.08,-.21,.275]],.009,fire);
 const locks=b.group(r.head,'dreadlock-secondary');for(let i=0;i<17;i++){const angle=.72+i/16*(Math.PI*2-1.44),x=Math.sin(angle),z=Math.cos(angle);const g=b.group(locks,'dreadlock-'+i);const points:V[]=[[x*.13,.245,z*.13],[x*.29,.43+(i%3)*.035,z*.29],[x*.46,.3,z*.41],[x*(.51+(i%2)*.07),.11-(i%4)*.13,z*.5-.08]];b.tube(g,points,.046+(i%3)*.005,hair,.7);const end=points[3];b.oval(g,[.026,.037,.026],fire,end,undefined,8);}
 for(const s of [-1,1]){b.plate(r.torso,[[s*.12,.45],[s*.4,.43],[s*.38,-.2],[s*.17,-.12]],.065,red,[0,0,.23]);b.decal(r.torso,'07','#d8cbca',.15,.12,[s*.25,.29,.287]);}b.ring(r.torso,.21,.055,cloth,[0,.54,-.07],[Math.PI/2,0,0]);
 r.arms.forEach((a,i)=>{const s=i?1:-1;for(let j=0;j<3;j++)b.round(a.shoulder,[.32,.15,.31],armor,[s*.025,-.04-j*.12,0],[0,0,s*.2]);b.oval(a.elbow,[.18,.25,.18],armor,[0,-.23,0]);b.round(a.elbow,[.16,.31,.035],black,[0,-.23,.178]);for(const x of [-.05,.05])b.tube(a.elbow,[[x,-.075,.21],[x+.02,-.18,.22],[x-.01,-.32,.2]],.018,fire);for(let j=0;j<3;j++)b.round(a.elbow,[.26,.036,.05],metal,[0,-.08-j*.11,.19]);});
 for(let i=0;i<5;i++){const x=(i-2)*.145;const tail=b.cloth(r.hips,'scorched-waist-panel-'+i,.22,.57+(i%3)*.12,i%2?red:cloth,[x,-.09,i<2?.21:-.22],(i-2)*.09);b.cloth(tail,'red-torn-trim',.048,.5,red,[.07,-.02,.025],.08);}
 for(const l of r.legs){for(const y of [-.2,-.45])b.profile(l.hip,[[y-.025,.2,.19],[y+.025,.2,.19]],black);b.plate(l.knee,[[-.11,-.19],[.11,-.19],[.075,-.56],[-.1,-.52]],.055,armor,[0,0,.13]);b.round(l.hip,[.12,.22,.07],red,[.1,-.29,.17]);}
 b.plate(r.torso,[[-.33,.4],[.33,.4],[.28,-.3],[-.28,-.3]],.04,black,[0,0,-.235]);fireEmblem(b,r.torso,fire,[0,.1,-.267],true);
 feature(r.root,'charred dreadlocks / lower-face mask / 07 jacket / molten forearms / back fire emblem / torn panels');
};
