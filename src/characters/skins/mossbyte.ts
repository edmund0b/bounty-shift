import type {SkinBuilder} from '../anatomy';
import {baseBody,hands,boots,kneePads,belt,harness,face} from '../anatomy';
import {feature} from '../construction';
import {serpentEmblem} from '../details';
export const mossbyte:SkinBuilder=(b,r)=>{
 const cloth=b.mat(0x1b2523),olive=b.mat(0x637145),armor=b.mat(0x37423b,'armor'),leather=b.mat(0x202723,'leather'),metal=b.mat(0x687465,'metal'),green=b.mat(0xa0f832,'energy',1),skin=b.mat(0x9c7354,'skin'),hair=b.mat(0x27231e,'hair');
 baseBody(b,r,cloth,skin);face(b,r,skin,green);hands(b,r,leather,armor);boots(b,r,leather,armor,green);belt(b,r,leather,metal);kneePads(b,r,armor,green);harness(b,r,leather);
 const braids=b.group(r.head,'cornrow-hair');for(let i=0;i<7;i++){const x=(i-3)*.051;b.tube(braids,[[x,.21,.14],[x,.29,.05],[x,.29,-.09],[x,.19,-.22],[x,.07,-.225]],.025,hair,.9);for(let j=0;j<5;j++)b.oval(braids,[.029,.02,.025],hair,[x,.275-Math.pow(j-2,2)*.012,.11-j*.062],undefined,8);}
 const mask=b.group(r.head,'dual-filter-respirator');b.plate(mask,[[-.12,-.015],[.12,-.015],[.13,-.15],[0,-.25],[-.13,-.15]],.1,leather,[0,0,.227]);for(const s of [-1,1]){b.oval(mask,[.095,.095,.065],armor,[s*.153,-.115,.23]);b.ring(mask,.071,.012,green,[s*.155,-.114,.29]);b.oval(mask,[.045,.045,.014],leather,[s*.155,-.115,.31]);b.tube(r.head,[[s*.15,.04,.216],[s*.092,.032,.234],[s*.045,.045,.216]],.012,green);}
 const hood=b.group(r.torso,'folded-olive-hood',[0,.55,-.07]);b.ring(hood,.205,.076,olive,[0,0,-.025],[Math.PI/2,0,0]);b.oval(hood,[.26,.23,.1],olive,[0,-.03,-.17]);for(const s of [-1,1]){b.plate(r.torso,[[s*.16,.42],[s*.34,.4],[s*.33,-.3],[s*.19,-.36],[s*.21,.16]],.045,olive,[0,0,.22]);b.round(r.torso,[.037,.52,.035],metal,[s*.215,.05,.26]);}
 r.arms.forEach((a,i)=>{const s=i?1:-1;b.oval(a.shoulder,[.185,.15,.17],armor,[s*.025,-.025,0]);b.round(a.elbow,[.19,.32,.075],armor,[0,-.23,.112]);b.round(a.elbow,[.035,.23,.026],green,[s*.055,-.23,.155]);b.profile(a.shoulder,[[-.4,.147,.15],[-.29,.15,.15]],olive);});serpentEmblem(b,r.arms[1].shoulder,metal,[0,-.025,.171]);
 for(const [i,l] of r.legs.entries()){const s=i?1:-1;b.round(l.hip,[.13,.31,.11],olive,[s*.15,-.27,.05]);for(const y of [-.24,-.48])b.profile(l.hip,[[y-.018,.184,.18],[y+.018,.184,.18]],leather);b.round(l.hip,[.038,.19,.023],green,[s*.15,-.27,.113]);b.plate(l.knee,[[-.1,-.2],[.1,-.2],[.07,-.53],[-.07,-.53]],.04,olive,[0,0,.13]);}
 const sensor=b.group(r.hips,'tracker-sensor',[.3,-.13,.21]);b.profile(sensor,[[-.11,.045,.045],[.11,.045,.045]],armor);b.round(sensor,[.038,.14,.027],green,[0,0,.047]);b.plate(r.torso,[[-.3,.36],[.3,.36],[.27,-.28],[-.27,-.28]],.03,olive,[0,0,-.222]);serpentEmblem(b,r.torso,green,[0,.025,-.253],true);
 feature(r.root,'cornrows / green eyes / circular respirator filters / olive hood / tracker sensor / rear serpent emblem');
};
