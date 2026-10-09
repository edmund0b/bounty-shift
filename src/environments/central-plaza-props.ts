import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
import {PLAZA_PROPS,PLAZA_BUILDINGS,TRANSIT_STAIRS,TRANSIT_GROUND,CP_LEVELS as L} from '../../shared/maps/central-plaza-layout';
export function plazaProps(k:PlazaKit){const steel=k.material('#475462','metal'),black=k.material('#14212b','metal'),wood=k.material('#765347','wood');
 for(const p of PLAZA_PROPS){const {x,y,width:w,height:d,bottom:z,top}=p,h=top-z,accent=k.material(p.accent,'glow');
  if(p.kind==='planter'){k.box(x,y,w,d,z,h,k.material('#435257'));k.box(x+6,y+6,w-12,d-12,top-4,4,k.material('#24352f'));k.cylinderAt(x+w/2,y+d/2,5,top,72,wood);const green=k.material('#345850');for(let i=0;i<4;i++)k.add(k.sphere,green,[x+w/2+Math.sin(i*2.3)*22,top+88+i%2*18,y+d/2+Math.cos(i*2.3)*16],[65,55,60]);continue;}
  if(p.kind==='bench'){for(const xx of [x+12,x+w-22])k.box(xx,y+5,8,d-10,z,h-5,steel);k.box(x,y,w,d,top-5,5,wood);k.box(x,y+d-5,w,5,top,22,wood);continue;}
  if(p.kind==='car'){k.box(x+8,y+4,w-16,d-8,z+11,h-16,k.material('#344454','metal'));k.box(x+13,y+d*.28,w-26,d*.43,z+h*.6,h*.35,k.material('#233344','glass'));for(const yy of [y+30,y+d-38])for(const xx of [x,x+w-10])k.box(xx,yy,10,29,z+3,22,black);for(const xx of [x+13,x+w-26])k.box(xx,y,13,3,z+23,7,k.material('#cceeff','glow'));k.box(x+15,y+d-2,w-30,3,z+21,6,k.material('#d65364','glow'));continue;}
  if(p.kind==='tank'){k.cylinderAt(x+w/2,y+d/2,w*.47,z+12,h-14,steel);for(const zz of [z+18,top-12])k.cylinderAt(x+w/2,y+d/2,w*.49,zz,3,black);for(const xx of [x+8,x+w-14])k.box(xx,y+d*.4,6,8,z,16,steel);continue;}
  if(p.kind==='hvac'){k.box(x,y,w,d,z,h,steel);for(let i=0;i<8;i++)k.box(x+5,y-1,w-10,2,z+6+i*4,2,black);for(const xx of [x+w*.3,x+w*.7]){k.cylinderAt(xx,y+d*.5,14,top,2,black);for(const angle of [0,Math.PI/2])k.add(k.cube,steel,[xx,top+2,y+d*.5],[22,2,3],[0,angle,0]);}continue;}
  if(p.kind==='vending'||p.kind==='kiosk'){k.box(x,y,w,d,z,h,black);k.box(x+4,y-2,w-8,3,z+17,h-24,accent);k.box(x+7,y-4,w-14,2,z+20,h*.4,k.material('#416274','glass'));for(let j=0;j<4;j++)for(let i=0;i<3;i++)k.box(x+10+i*(w-20)/3,y-6,5,2,z+27+j*10,6,k.material(i%2?'#d8b782':'#889cba'));k.sign(p.kind==='vending'?'DRINKS':'DISTRICT / 01',x+w/2,y-4,z+h-8,w-4,p.accent,0);continue;}
  if(p.kind==='dumpster'){k.box(x,y,w,d,z,h,steel);k.box(x-2,y-2,w+4,d+4,top-4,4,black);for(const xx of [x+8,x+w-15])k.box(xx,y+5,6,d-10,z-2,4,black);continue;}
  if(p.kind==='shelf'){for(const xx of [x,x+w-5])k.box(xx,y,5,d,z,h,steel);for(let i=0;i<3;i++){const e=z+7+i*(h-10)/3;k.box(x,y,w,d,e,4,wood);for(let j=0;j<5;j++)k.box(x+7,y+8+j*(d-14)/5,w-14,10,e+4,9,k.material(j%3?'#658184':'#a7866e'));}continue;}
  if(p.kind==='counter'){k.box(x,y,w,d,z,h,black);k.box(x-3,y-3,w+6,d+6,top-5,5,wood);k.box(x-1,y+6,2,d-12,z+12,4,accent);continue;}
  k.box(x,y,w,d,z,h,wood);for(const xx of [x+7,x+w-14])k.box(xx,y-1,7,d+2,z,h,steel);for(const zz of [z+6,top-10])k.box(x-1,y-1,w+2,d+2,zz,4,steel);
 }
}
export function transitDetails(k:PlazaKit){const tile=k.material('#6c7b81'),dark=k.material('#162633','metal'),blue=k.material('#7be4ef','glow'),amber=k.material('#e8b26c','glow');
 for(const r of TRANSIT_GROUND)k.box(r.x,r.y,r.width,r.height,-6,6,tile);
 for(const [i,s] of TRANSIT_STAIRS.entries()){const x=s.x+s.width/2;k.sign(i?'SERVICE / TRANSIT':'M / TRANSIT',x,s.y-15,L.street+113,155,'#81eaff',Math.PI);for(const xx of [s.x-9,s.x+s.width+3])k.box(xx,s.y-15,6,20,L.street,132,dark);k.box(s.x-14,s.y-22,s.width+28,58,L.street+130,7,dark);k.box(s.x-13,s.y-23,s.width+26,3,L.street+126,3,blue);for(const xx of [s.x+9,s.x+s.width-9]){k.beam([xx,L.street+31,s.y],[xx,31,s.y+s.height],3,amber);for(let j=0;j<6;j++){const t=j/5,z=L.street*(1-t),y=s.y+s.height*t;k.box(xx-1,y-1,2,2,z,30,dark);}}}
 k.sign('09 / SERVICE LINK',1975,2900,65,110,'#75dfec',Math.PI);k.sign('EXIT / EAST SERVICE',3065,2840,65,110,'#75dfec',0);
 for(let x=2080;x<2980;x+=160){k.box(x,3030,55,6,95,2,blue);k.beam([x,80,2998],[x+155,80,2998],4,dark);}for(let y=2630;y<2980;y+=100)k.box(3060,y,6,45,95,2,amber);
}
export function streetsAndSkyline(k:PlazaKit){const yellow=k.material('#baae7e'),steel=k.material('#36485c','metal'),white=k.material('#cceaf1','glow'),dark=k.material('#15202f');
 // Road markings and crossings are thin surface details, leaving circulation clear.
 for(const x of [140,970,2250,3070])for(let y=100;y<3100;y+=90)k.box(x,y,3,35,L.street+.4,.4,yellow);
 for(const y of [940,2410])for(let x=160;x<3060;x+=100)k.box(x,y,35,3,L.street+.4,.4,yellow);
 for(const [x,y,alongX] of [[970,1870,true],[2160,1820,true],[1430,950,false],[1470,2270,false]] as const)for(let i=0;i<8;i++)k.box(x+(alongX?0:i*14),y+(alongX?i*14:0),alongX?65:7,alongX?7:65,L.street+.6,.5,k.material('#849694'));
 for(const [i,x,y] of [[0,990,1080],[1,2200,1080],[2,980,2190],[3,2200,2230],[4,160,950],[5,2180,820],[6,1100,2430],[7,3060,1770]]){k.box(x,y,6,6,L.street,140,steel);k.beam([x+3,L.street+140,y+3],[x+42,L.street+140,y+3],5,steel);k.box(x+24,y-3,28,12,L.street+137,3,white);k.box(x-5,y-5,16,16,L.street,5,steel);}
 // Neon spill on the wet paving uses inexpensive translucent gradients, not screen-space ray tracing.
 const textureCanvas=document.createElement('canvas');textureCanvas.width=16;textureCanvas.height=64;const g=textureCanvas.getContext('2d')!;for(let y=0;y<64;y++){g.fillStyle=`rgba(255,255,255,${Math.pow(1-y/64,2)*.24})`;g.fillRect(0,y,16,1);}const tex=k.track(new T.CanvasTexture(textureCanvas));
 tex.colorSpace=T.SRGBColorSpace;for(const b of PLAZA_BUILDINGS){const mat=k.track(new T.MeshBasicMaterial({map:tex,color:b.accent,transparent:true,depthWrite:false,side:T.DoubleSide,opacity:.6}));const south=b.front==='south',north=b.front==='north';k.add(k.plane,mat,[south||north?b.x+b.width/2:b.front==='east'?b.x+b.width+60:b.x-60,L.street+.9,south?b.y+b.height+65:north?b.y-65:b.y+b.height/2],[130,170,1],[-Math.PI/2,0,0]);}
 // Skyline windows and silhouette towers share primitive batches.
 for(let i=0;i<44;i++){const side=i%4,t=120+(i>>2)*295,h=650+(i*73%720),x=side===0?-220:side===1?3330:t,y=side===2?-220:side===3?3330:t,w=100+i%3*22,d=110+i%4*20;k.box(x,y,w,d,-20,h,dark);k.box(x+12,y+12,w-24,d-24,h-20,70,steel);for(let z=100;z<h-40;z+=85)for(let j=0;j<3;j++){const light=k.material((i+j)%4?'#a2a9b1':'#ab78ba','glow');k.box(x+18+j*23,y+d+1,12,1,z,25,light);k.box(x+w+1,y+18+j*23,1,12,z,25,light);}}
 for(const b of PLAZA_BUILDINGS){const neon=k.material(b.accent,'glow');k.box(b.x+20,b.y-30,70,3,L.street+.4,.4,neon);}
}
