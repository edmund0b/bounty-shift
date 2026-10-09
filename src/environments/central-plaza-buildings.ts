import type {PlazaKit} from './central-plaza-kit';
import {PLAZA_BUILDINGS,PLAZA_BRIDGES,PLAZA_BALCONIES,CP_LEVELS as L,type PlazaBuilding} from '../../shared/maps/central-plaza-layout';
export function buildingDetails(k:PlazaKit){
 const metal=k.material('#425465','metal'),dark=k.material('#152331','metal'),warm=k.material('#f2bd83','glow');
 for(const b of PLAZA_BUILDINGS.filter(b=>b.id!=='transit')){
  const neon=k.material(b.accent,'glow'),cx=b.x+b.width/2,cy=b.y+b.height/2;
  // Cornices, structural pilasters and weathered facade layers give the buildings depth.
  for(const height of [L.street+5,L.mid,L.roof]){k.box(b.x-4,b.y-6,b.width+8,18,height,5,metal);k.box(b.x-4,b.y+b.height-12,b.width+8,18,height,5,metal);for(const x of [b.x-5,b.x+b.width-10])k.box(x,b.y,15,b.height,height,5,metal);}
  for(const x of [b.x,b.x+b.width-14])for(const y of [b.y,b.y+b.height-14])k.box(x,y,14,14,L.street,240,metal);
  const glass=k.material(b.id==='club'?'#592b69':'#314756','glass');
  for(const elevation of [L.street,L.mid]){
   const center=b.x+(b.id==='warehouse'?245:0)+(b.width-(b.id==='parking'?330:245))/2;
   for(let x=b.x+36;x<b.x+b.width-40;x+=77){if(Math.abs(x-center)<88||x>b.x+b.width-240)continue;for(const y of [b.y-2,b.y+b.height+2]){k.box(x-19,y,38,2,elevation+53,44,dark);k.box(x-16,y+(y===b.y-2?-1:2),32,1,elevation+57,35,(Math.round(x/77)%3===0||b.id==='club')?glass:warm);k.box(x-19,y-2,38,6,elevation+51,3,metal);}}
   for(let y=b.y+145;y<b.y+b.height-60;y+=83){for(const x of [b.x-3,b.x+b.width+2]){if(b.openStairs&&x>b.x)continue;k.box(x,y-19,2,38,elevation+51,42,dark);k.box(x+(x<b.x?-1:2),y-16,1,32,elevation+55,34,Math.round(y/83)%3?warm:glass);}}
   // Ceiling strips illuminate the intended circulation slice visually without extra point lights.
   const roomX=b.x+(b.id==='warehouse'?330:90);for(const y of [b.y+120,b.y+b.height-120])k.box(roomX,y,85,7,elevation+112,2,warm);
  }
  const front=b.front,frontX=front==='east'?b.x+b.width+4:front==='west'?b.x-4:cx,frontY=front==='north'?b.y-4:front==='south'?b.y+b.height+4:cy;
  k.sign(b.name,frontX,frontY,L.mid+40,Math.min(330,(front==='east'||front==='west'?b.height:b.width)-60),b.accent,front==='north'?Math.PI:front==='east'?Math.PI/2:front==='west'?-Math.PI/2:0);
  k.sign(b.number,frontX+(front==='north'||front==='south'?-b.width*.34:0),frontY+(front==='east'||front==='west'?-b.height*.34:0),L.roof+16,85,b.accent,front==='north'?Math.PI:front==='east'?Math.PI/2:front==='west'?-Math.PI/2:0);
  const doorCenter=b.x+(b.id==='warehouse'?245:0)+(b.width-(b.id==='parking'?330:245))/2;
  for(const y of [b.y-1,b.y+b.height+1]){k.box(doorCenter-75,y-2,150,6,L.street+101,5,neon);for(const x of [doorCenter-75,doorCenter+70])k.box(x,y-2,5,6,L.street,105,metal);k.sign(y<b.y?'ENTER / 24H':'SERVICE EXIT',doorCenter,y,L.street+87,110,b.accent,y<b.y?Math.PI:0);}
  // Attached utility work, security camera and rooftop access marker.
  k.box(b.x-15,b.y+180,15,62,L.mid+22,30,metal);for(let i=0;i<5;i++)k.box(b.x-16,b.y+185+i*10,2,4,L.mid+26,23,dark);
  k.beam([b.x-8,L.street+8,b.y+105],[b.x-8,L.roof-6,b.y+105],5,metal);k.beam([b.x-8,L.roof-6,b.y+105],[b.x+55,L.roof-6,b.y+105],5,metal);
  k.box(b.x+12,b.y-8,4,20,L.street+100,5,metal);k.box(b.x+8,b.y-20,15,20,L.street+99,9,dark);k.box(b.x+12,b.y-22,6,2,L.street+102,4,neon);
  k.sign('ROOF ACCESS',b.x+b.width-150,b.y+90,L.roof+26,100,b.accent,0);
  for(const x of [b.x+40,b.x+b.width-45])k.box(x,b.y+40,5,5,L.roof,65,metal);
  // A visual maintenance ladder is paired with the working stairs, not a new climb mechanic.
  if(['warehouse','maintenance'].includes(b.id)){const x=b.x+b.width+10,y=b.y+130;for(const z of [y-17,y+17])k.box(x,z,4,4,L.street,240,metal);for(let h=L.street+10;h<L.roof;h+=13)k.box(x,y-17,4,38,h,3,metal);}
  uniqueInterior(k,b);
 }
 for(const b of [...PLAZA_BRIDGES,...PLAZA_BALCONIES]){const elevation='elevation' in b?b.elevation:L.mid,glow=k.material('#56bbd2','glow');for(const y of [b.y+3,b.y+b.height-3])k.box(b.x,y,b.width,2,elevation+29,2,glow);for(const x of [b.x+3,b.x+b.width-3])k.box(x,b.y,2,b.height,elevation+29,2,glow);}
 // Trussed bridge sides are visibly anchored at both buildings.
 for(const b of PLAZA_BRIDGES){const horizontal=b.width>b.height,length=horizontal?b.width:b.height,n=Math.ceil(length/65);for(let i=0;i<n;i++)for(const side of [0,1]){const a=i/n*length,c=(i+1)/n*length;k.beam(horizontal?[b.x+a,b.elevation-9,b.y+side*b.height]:[b.x+side*b.width,b.elevation-9,b.y+a],horizontal?[b.x+c,b.elevation+24,b.y+side*b.height]:[b.x+side*b.width,b.elevation+24,b.y+c],3,metal);}}
}
function uniqueInterior(k:PlazaKit,b:PlazaBuilding){const dark=k.material('#17212e','metal'),warm=k.material('#ffb87b','glow'),light=k.material(b.accent,'glow'),wood=k.material('#5b3934','wood');const x=b.x+165,y=b.y+b.height*.5;
 if(b.id==='club'){for(let i=0;i<5;i++)for(let j=0;j<5;j++)k.box(b.x+130+i*25,b.y+210+j*25,23,23,L.street+.4,.4,(i+j)%2?light:dark);k.sign('VIP / AFTER HOURS',b.x+160,b.y+b.height-15,L.mid+75,200,b.accent,Math.PI);for(const dx of [50,125]){k.box(b.x+dx,b.y+165,28,25,L.street+45,60,dark);k.cylinderAt(b.x+dx+14,b.y+172,8,L.street+87,3,light);}}
 if(b.id==='noodles'){k.sign('NOODLES / RAMEN',b.x+b.width*.35,b.y-15,L.street+68,240,b.accent,Math.PI);for(let i=0;i<5;i++){k.cylinderAt(b.x+142,b.y+170+i*42,11,L.street,28,dark);k.cylinderAt(b.x+142,b.y+170+i*42,14,L.street+28,4,wood);}for(let i=0;i<6;i++)k.cylinderAt(b.x+55+i*38,b.y+25,7,L.street+77,17,warm);k.sign('KITCHEN / COURTYARD',x,b.y+b.height-14,L.street+78,170,b.accent,Math.PI);}
 if(b.id==='hq'){k.sign('BOUNTY / OPERATIONS',b.x+170,b.y+b.height-14,L.street+72,210,b.accent,Math.PI);for(let i=0;i<3;i++){k.box(b.x+48,b.y+173+i*30,18,20,L.street+43,15,dark);k.box(b.x+47,b.y+175+i*30,2,17,L.street+47,10,light);}}
 if(b.id==='apartments'){k.sign('RESIDENTS / LOBBY',x,b.y+16,L.street+76,190,b.accent,0);for(let i=0;i<4;i++){k.box(b.x+13,b.y+160+i*55,4,32,L.mid,81,wood);k.box(b.x+18,b.y+171+i*55,2,7,L.mid+40,4,warm);}for(let i=0;i<8;i++)k.box(b.x+16,b.y+150+i*23,4,18,L.street+44,18,dark);}
 if(b.id==='store'){k.sign('OPEN 24 / MARKET',x,b.y+16,L.street+79,190,b.accent,0);for(let i=0;i<4;i++){k.box(b.x+13,b.y+175+i*38,16,31,L.street,75,dark);k.box(b.x+30,b.y+177+i*38,2,27,L.street+12,52,light);}k.sign('STORAGE',x,b.y+b.height-15,L.street+78,110,b.accent,Math.PI);}
 if(b.id==='electronics'){for(let i=0;i<5;i++){k.box(b.x+16,b.y+160+i*47,3,34,L.street+43,23,light);}k.sign('DISPLAY / SERVICE',x,b.y+15,L.street+79,190,b.accent,0);}
 if(b.id==='parking'){for(const elevation of [L.street,L.mid,L.roof])for(let i=0;i<4;i++){k.box(b.x+30,b.y+150+i*105,180,3,elevation+.5,.5,warm);k.sign('P '+(elevation===L.street?'01':elevation===L.mid?'02':'ROOF'),b.x+130,b.y+15,elevation+72,150,b.accent,0);}}
 if(b.id==='maintenance'){for(let i=0;i<4;i++){k.box(b.x+16,b.y+170+i*45,10,32,L.street,85,dark);for(let j=0;j<4;j++)k.box(b.x+27,b.y+177+i*45,2,14,L.street+20+j*13,3,light);}k.sign('UTILITY / ACCESS',x,b.y+14,L.street+80,200,b.accent,0);}
 if(b.id==='warehouse'){k.sign('LOADING / 08',b.x+375,b.y+14,L.street+82,150,b.accent,0);}
}
