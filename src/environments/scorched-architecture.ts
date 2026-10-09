import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
import {SCORCHED_SITES,SCORCHED_PROPS,SCORCHED_BRIDGES,CORE_HIGH} from '../../shared/maps/scorched-layout';
export function scorchedArchitecture(k:PlazaKit){const iron=k.material('#45413b','metal'),rust=k.material('#6e4936','metal'),ash=k.material('#777167'),dark=k.material('#211f1d'),warm=k.material('#e8bd83','glow'),cool=k.material('#9ebfc5','glow');
 for(const b of SCORCHED_SITES){const z=(b.levels-1)*120;
  // Exposed frames remain attached to foundation and roof corners, even where wall panels are missing.
  for(const x of [b.x+8,b.x+b.width-16])for(const y of [b.y+8,b.y+b.height-16])k.box(x,y,8,8,0,z+12,iron);
  for(const e of [117,z+3]){k.box(b.x-3,b.y-4,b.width+6,7,e,6,rust);k.box(b.x-3,b.y+b.height-3,b.width+6,7,e,6,rust);}
  for(const side of [0,1])for(let i=0;i<Math.floor(b.width/75);i++){const x=b.x+30+i*75,y=b.y+side*(b.height+2)-1;for(let level=0;level<b.levels-1;level++){const e=level*120+47; if(i===Math.floor((b.width-250)/150)||i>Math.floor(b.width/75)-3)continue;k.box(x,y,38,2,e,36,iron);k.box(x+3,y+(side?2:-2),32,2,e+3,30,(i+level)%3===0?cool:dark);if(b.damage!=='light'){k.beam([x,e,y],[x+37,e+35,y],2,ash);k.beam([x+12,e+28,y],[x+32,e+9,y],2,iron);}}}
  if(['warehouse','workshop'].includes(b.id))for(let t=30;t<b.height-25;t+=18)for(const x of [b.x-1,b.x+b.width+1])k.box(x,b.y+t,1,2,10,95,t%3?iron:rust);
  // Numbered, soot-darkened painted plaques rather than city neon advertising.
  k.sign(b.number+' / '+b.name,b.x+b.width*.42,b.y-7,88,Math.min(300,b.width-50),b.accent,Math.PI);
  k.sign(b.number+' / '+b.name,b.x+b.width*.42,b.y+b.height+8,88,Math.min(300,b.width-50),b.accent,0);
  for(const x of [b.x+26,b.x+b.width-26]){k.box(x,b.y+22,4,36,106,3,cool);k.box(x,b.y+b.height-58,4,36,106,3,cool);}
  for(let i=0;i<5;i++){const x=b.x+20+i*43;k.box(x,b.y+b.height-20,27,9,z+.2,1,ash);}
  // Localized, visibly grounded wreckage at missing walls; tiny fragments do not add collision clutter.
  if(b.damage!=='light')for(let i=0;i<16;i++){const x=b.x-18-i%3*9,y=b.y+252+i*8;k.add(k.sphere,i%2?ash:dark,[x,3+i%4,y],[12+i%3*5,6+i%4,10],[i*.3,0,i*.2]);}
  if(b.id==='mining'){k.sign('EVACUATE / MINE 04 CLOSED',b.x+100,b.y+b.height-14,73,150,'#d7b68c',Math.PI);k.box(b.x+50,b.y+50,5,4,z,120,iron);k.beam([b.x+30,z+80,b.y+52],[b.x+115,z+95,b.y+52],3,iron);k.box(b.x+12,b.y+280,4,65,36,40,ash);}
  if(b.id==='residential'){for(let i=0;i<4;i++){k.box(b.x+15,b.y+170+i*65,3,35,125,75,k.material('#55473c'));k.box(b.x+18,b.y+190+i*65,3,4,165,3,warm);}for(const y of [b.y+170,b.y+320]){k.beam([b.x+115,240,y],[b.x+215,163,y+45],7,iron);}k.sign('WORKER HOUSING / 02',b.x+145,b.y+16,74,200,'#b8a490',0);}
  if(b.id==='research'){const geo=k.track(new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2));k.add(geo,ash,[b.x+115,z+45,b.y+125],[55,40,55]);k.cylinderAt(b.x+115,b.y+125,57,z+35,10,iron);k.cylinderAt(b.x+115,b.y+125,40,z,38,dark);k.box(b.x+105,b.y+115,3,3,z+80,65,iron);k.sign('SEISMIC ALERT / SHUTDOWN',b.x+145,b.y+b.height-14,73,220,'#d08c64',Math.PI);}
  if(b.id==='workshop'){for(let x=b.x+20;x<b.x+b.width-220;x+=30)k.box(x,b.y+1,2,2,90,25,iron);k.sign('REPAIR BAY / LOCK OUT',b.x+150,b.y+15,76,220,'#d0b785',0);for(const x of [b.x+140,b.x+290])k.box(x,b.y+150,6,6,0,100,rust);k.beam([b.x+140,100,b.y+153],[b.x+290,100,b.y+153],9,iron);}
  if(b.id==='store'){k.box(b.x-8,b.y-28,b.width+16,33,94,6,rust);for(let i=0;i<6;i++)k.box(b.x+20+i*28,b.y-28,14,30,100,1,ash);for(let i=0;i<3;i++){k.box(b.x+13,b.y+235+i*32,20,25,0,68,iron);k.box(b.x+34,b.y+237+i*32,2,21,14,47,k.material('#617b7c','glass'));}k.sign('24 / SUPPLIES',b.x+230,b.y-33,104,170,'#d5cdb4',Math.PI);}
  if(b.id==='warehouse'){for(let y=b.y+100;y<b.y+b.height-80;y+=100){k.beam([b.x+12,242,y],[b.x+180,287,y],6,rust);k.beam([b.x+180,287,y],[b.x+b.width-12,242,y],6,iron);}for(let i=0;i<4;i++)k.add(k.cube,iron,[b.x+135+i*42,243,b.y+155],[28,3,70],[0,0,.12*i]);k.sign('CARGO / DO NOT ENTER COLLAPSE',b.x+155,b.y+15,80,240,'#c0a789',0);}
  if(b.id==='power'){k.sign('CONTAINMENT / MANUAL OVERRIDE',b.x+160,b.y+16,76,230,'#c9b48d',0);for(const x of [b.x+170,b.x+280]){k.cylinderAt(x,b.y+75,18,z,180,iron);k.cylinderAt(x,b.y+75,20,z+120,9,rust);k.cylinderAt(x,b.y+75,19,z+160,3,k.material('#cf7046','glow'));} }
 }
 for(const p of SCORCHED_PROPS){const {x,y,width:w,height:d,bottom:z,top}=p,h=top-z;
 if(p.kind==='tank'){k.cylinderAt(x+w/2,y+d/2,w*.46,z,h,iron);for(const e of [z+12,top-20])k.cylinderAt(x+w/2,y+d/2,w*.49,e,6,rust);k.cylinderAt(x+w/2,y+d/2,12,top,20,iron);for(let i=0;i<5;i++)k.box(x+10+i*15,y,4,3,z+h*.65,6,warm);continue;}
 if(p.kind==='car'){k.box(x,y,w,d,z+7,h-10,dark);k.box(x+8,y+d*.28,w-16,d*.4,z+h-8,15,iron);for(const xx of [x-2,x+w-8])for(const yy of [y+20,y+d-35])k.box(xx,yy,10,23,z,15,dark);k.add(k.cube,rust,[x+w/2,z+h+3,y+10],[w,3,40],[.6,0,0]);continue;}
 if(p.kind==='shelf'){for(const xx of [x,x+w-4])k.box(xx,y,4,d,z,h,iron);for(let i=0;i<3;i++){k.box(x,y,w,d,z+i*h/3,3,rust);for(let j=0;j<4;j++)k.box(x+10,y+7+j*18,w-20,10,z+i*h/3+3,7,j%2?ash:dark);}continue;}
 if(p.kind==='sofa'){k.box(x,y,w,d,z,15,dark);k.box(x,y,w,14,z+15,h-15,k.material('#594a41'));for(const xx of [x,x+w-12])k.box(xx,y,12,d,z+15,20,iron);continue;}
 k.box(x,y,w,d,z,h,p.kind==='crate'?rust:iron);if(p.kind==='console'||p.kind==='desk'){k.box(x+4,y+4,w-8,d-8,top,3,ash);for(let i=0;i<3;i++){k.box(x+8,y+8+i*22,28,17,top+3,14,dark);k.box(x+7,y+10+i*22,2,13,top+6,8,cool);}}else if(p.kind==='machine'){for(let i=0;i<5;i++)k.box(x+5,y-1,w-10,2,z+8+i*6,2,dark);k.cylinderAt(x+w*.5,y+d*.5,18,top,5,rust);}else for(const xx of [x+6,x+w-12])k.box(xx,y-1,6,d+2,z,h,iron);
 }
 for(const b of [...SCORCHED_BRIDGES,...CORE_HIGH]){const h=b.width>b.height;for(let i=0;i<Math.ceil((h?b.width:b.height)/110);i++){const x=h?b.x+i*110+30:b.x+15,y=h?b.y+15:b.y+i*110+30;for(const [xx,yy] of [[x,y],[h?x:b.x+b.width-15,h?b.y+b.height-15:y]])k.box(xx,yy,9,9,-12,b.elevation+2,iron);}for(let i=0;i<(h?b.width:b.height);i+=16)k.box(b.x+(h?i:0),b.y+(h?0:i),h?2:b.width,h?b.height:2,b.elevation+.1,.5,dark);}
}
