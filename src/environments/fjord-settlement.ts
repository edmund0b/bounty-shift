import * as T from 'three';
import {FJORD_HUTS,FJORD_WALKS} from '../../shared/maps/fjord-layout';
import {FjordKit} from './fjord-kit';
export function settlement(f:FjordKit){const k=f.k;
 f.roof(800,450,650,550,410,175);
 for(let y=475;y<615;y+=23)k.box(820,y,610,20,240.2,1,f.wood);
 // Hearth canopy keeps warm light visually grounded rather than magical.
 k.box(942,727,82,90,290,12,f.iron);k.box(972,757,22,24,302,108,f.iron);
 // Raised ridge vent/chimney, frame braces, tall warm windows, and exterior balcony.
 k.box(910,675,52,55,470,150,f.rock);k.box(902,667,68,71,615,10,f.snow);
 for(const x of [870,1330])for(const y of [447,1002]){k.box(x,y,44,3,305,63,f.warm);k.box(x+19,y-1,5,5,305,63,f.beam);k.box(x,y-1,44,5,334,5,f.beam);}
 for(const y of [650,950]){k.beam([840,130,y],[840,407,y],12,f.beam);k.beam([1390,130,y],[1390,407,y],12,f.beam);k.beam([840,400,y],[1390,400,y],12,f.beam);k.beam([840,320,y],[900,400,y],8,f.beam);k.beam([1390,320,y],[1330,400,y],8,f.beam);}
 // Hearth, table/benches and small storage leave a wide central chase lane.
 k.box(950,735,65,60,163,5,f.iron);for(let i=0;i<5;i++)k.add(f.cone,f.warm,[961+i*10,176+i%2*6,755],[14,28,14]);
 k.box(1183,733,99,164,153,6,f.wood);for(const x of [1170,1290])k.box(x,750,15,120,120,24,f.wood);
 for(const x of [850,890])f.barrel(x,655,120);
 for(const y of [710,865]){k.add(k.cylinder,f.red,[824,270,y],[55,6,55],[0,0,Math.PI/2]);k.add(k.cylinder,f.iron,[828,270,y],[12,8,12],[0,0,Math.PI/2]);}
 k.sign('LONGHOUSE',1130,1003,330,150,'#dac7a7');f.banner(1480,970,120);f.lantern(1000,1030,120);f.lantern(1260,1030,120);
 for(const h of FJORD_HUTS){f.roof(h.x,h.y,h.width,h.height,h.top,h.id==='net-house'?95:115);for(const x of [h.x+45,h.x+h.width-80]){k.box(x,h.y+h.height+1,34,3,h.bottom+70,48,f.warm);k.box(x+15,h.y+h.height+3,4,2,h.bottom+70,48,f.beam);}k.box(h.x+h.width*.44,h.y+h.height+2,54,5,h.bottom,95,f.beam);f.lantern(h.x+h.width+25,h.y+h.height-20,h.bottom);}
 // Stable trough, hay bundles and smith's anvil are decorative beside blocked secondary buildings.
 k.box(2010,1880,125,35,120,25,f.wood);k.box(2020,1885,105,25,142,8,k.material('#ac986b'));k.box(1950,1120,65,35,120,35,f.iron);
 // Tower stands on the northern high bridge; cross-bracing and beams carry its platform.
 for(const x of [1420,1650])for(const y of [280,430]){k.box(x-8,y-8,16,16,0,408,f.beam);f.lantern(x,y,240);}
 for(const y of [280,430]){k.beam([1420,20,y],[1650,220,y],9,f.beam);k.beam([1650,20,y],[1420,220,y],9,f.beam);}
 f.roof(1400,255,270,200,408,95);f.banner(1690,430,240);
 // Wooden catwalk beams and poles. Ends stay open at every authored connection.
 for(const p of FJORD_WALKS.filter(p=>p.id!=='ice-bridge'&&p.id!=='hall-loft')){const along=p.width>p.height,len=along?p.width:p.height;for(let t=12;t<len;t+=28)k.box(p.x+(along?t:0),p.y+(along?0:t),along?25:p.width,along?p.height:25,p.elevation+.3,1.5,f.wood);for(let t=30;t<len;t+=190)for(const side of [0,1]){const x=p.x+(along?t:side?p.width-12:12),y=p.y+(along?side?p.height-12:12:t);k.box(x-6,y-6,12,12,0,p.elevation,f.beam);}}
 // Village market awnings, supplies and modest carved waystone.
 for(const [x,y]of [[1180,1300],[1770,1530]]){for(const xx of [x,x+140])for(const yy of [y,y+60])k.cylinderAt(xx,yy,4,120,102,f.beam);k.box(x,y,140,60,215,5,f.red);k.box(x,y,140,60,220,5,f.snow);f.cargo(x+10,y,120,48);f.barrel(x+105,y+20,120);}
 const stone=k.material('#6d7e85');k.box(1400,1380,100,110,120,12,stone);k.box(1435,1481,5,2,170,52,f.beam);k.beam([1437,205,1483],[1460,220,1483],4,f.beam);
 f.banner(1360,1410,120);f.banner(1530,1410,120);
 for(const [x,y,z]of [[1170,1870,120],[1750,1890,120],[550,1370,120],[2090,650,240],[2535,1790,240],[880,2690,0],[2100,2780,0],[335,1570,0],[535,2230,0]])f.lantern(x,y,z);
}
export function dockyard(f:FjordKit){const k=f.k;
 // Ground-level piers follow safe frozen water. Their plank tops are flush with support.
 for(const [x,y,w,d]of [[960,2710,1200,130],[1260,2840,150,290],[1660,2840,150,290]]){k.box(x,y,w,d,-12,14.5,f.beam);for(let t=0;t<d;t+=24)k.box(x,y+t,w,21,2.5,.9,f.wood);for(let a=15;a<w;a+=150)for(const yy of [y,y+d]){k.cylinderAt(x+a,yy,6,-25,60,f.beam);k.cylinderAt(x+a,yy,7,33,3,f.snow);}}
 for(const [x,y]of [[1000,2720],[1450,2780],[2070,2730]]){f.cargo(x,y,0,50);f.barrel(x+70,y+20,0);}
 // Two longships use a shared tapered hull, curved prows, oars and striped square sails.
 const hull=k.track(new T.SphereGeometry(.5,12,6)),sail=k.track(new T.PlaneGeometry(25,140,2,6));const pos=sail.attributes.position;for(let j=0;j<pos.count;j++)pos.setZ(j,Math.sin((pos.getY(j)+70)/140*Math.PI)*22);sail.computeVertexNormals();const sailMats=[f.snow,f.red].map(mat=>{const clone=k.track((mat as T.MeshStandardMaterial).clone());clone.side=T.DoubleSide;return clone;});
 for(const [x,y]of [[1160,2972],[1915,2982]]){k.add(hull,f.beam,[x,28,y],[160,90,325]);k.box(x-50,y-95,100,190,59,5,f.wood);
  for(const side of [-1,1]){k.beam([x+side*67,63,y-110],[x+side*67,63,y+110],8,f.wood);k.beam([x+side*67,68,y-110],[x+side*67,68,y+110],3,f.snow);for(let i=0;i<5;i++){const yy=y-80+i*40;k.add(k.cylinder,i%2?f.red:f.wood,[x+side*75,58,yy],[32,5,32],[0,0,Math.PI/2]);k.beam([x+side*35,65,yy],[x+side*130,10,yy-25],3,f.wood);}}
  for(const side of [-1,1]){k.beam([x,40,y+side*130],[x,110,y+side*160],13,f.beam);k.beam([x,110,y+side*160],[x,125,y+side*140],10,f.beam);}
  k.cylinderAt(x,y,5,50,240,f.beam);k.beam([x-105,260,y],[x+105,260,y],7,f.wood);k.beam([x,290,y],[x,72,y-130],2,f.iron);k.beam([x,290,y],[x,72,y+130],2,f.iron);
  for(let i=0;i<8;i++)k.add(sail,sailMats[i%2],[x-87.5+i*25,188,y],[1,1,1]);
 }
}
