import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
import {AERIE_SITES} from '../../shared/maps/aerie-layout';
export function aerieArchitecture(k:PlazaKit,night:boolean){
 const white=k.material('#cbd8df','metal'),dark=k.material('#394f63','metal'),glass=k.material('#477d96','glass'),cyan=k.material('#7bdded','glow'),warm=k.material('#f6d19c','glow'),green=k.material('#557d69'),pink=k.material('#c788a2');
 const ring=k.track(new T.TorusGeometry(1,.028,5,48));
 const arc=k.track(new T.TorusGeometry(1,.02,5,32,Math.PI));
 const dome=k.track(new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2));
 const clear=k.track(new T.MeshStandardMaterial({color:'#91d9e7',transparent:true,opacity:night?.18:.24,roughness:.2,metalness:.1,side:T.DoubleSide,depthWrite:false}));
 const tree=(x:number,y:number,z:number,bloom=false)=>{k.cylinderAt(x,y,8,z,70,dark);k.add(k.sphere,bloom?pink:green,[x,z+85,y],[85,90,85]);k.add(k.sphere,bloom?pink:green,[x+20,z+110,y],[65,50,60]);};
 const bench=(x:number,y:number,z:number)=>{k.box(x,y,58,20,z+18,6,white);for(const dx of [5,47])k.box(x+dx,y+2,6,16,z,18,dark);};
 for(const s of AERIE_SITES){const cx=s.x+s.width/2,cy=s.y+s.height/2;
  k.sign(s.number+' / '+s.name,cx,s.y+s.height+2,285,240,'#b0edf4');
  k.sign(s.name,cx,s.y-2,285,220,'#b0edf4',Math.PI);
  // Laminated platform fascia and suspended service supports give each pod mass.
  for(const z of [-35,-15]){k.box(s.x-40,s.y-42,s.width+80,9,z,10,dark);k.box(s.x-40,s.y+s.height+33,s.width+80,9,z,10,dark);}
  for(const x of [s.x+55,s.x+s.width-55])for(const y of [s.y+55,s.y+s.height-55]){k.cylinderAt(x,y,22,-210,200,dark);k.beam([cx,-250,cy],[x,-30,y],20,white);k.cylinderAt(x,y,30,-220,12,cyan);}
  for(const z of [120,240]){k.box(s.x,s.y-3,s.width,3,z-5,3,cyan);k.box(s.x,s.y+s.height,s.width,3,z-5,3,cyan);}
  for(const x of [s.x+40,s.x+300]){bench(x,s.y+45,0);k.box(x,s.y+70,65,24,0,22,white);tree(x+32,s.y+82,22,s.id==='garden');}
  // Panel seams, dock markings and window bands establish human scale without extra collisions.
  for(let yy=s.y+35;yy<s.y+s.height;yy+=70){k.box(s.x+5,yy,s.width-10,1.5,.25,.4,dark);}
  for(let xx=s.x+30;xx<s.x+s.width;xx+=90){k.box(xx,s.y+5,1.5,s.height-10,.25,.4,dark);}
  for(const z of [120,240])for(let yy=s.y+35;yy<s.y+s.height;yy+=90){k.box(s.x+15,yy,70,2,z+.25,.5,dark);}
  for(const yy of [s.y+22,s.y+s.height-22])for(let xx=s.x+25;xx<s.x+s.width-25;xx+=70){k.box(xx,yy,28,5,1,1,warm);}
  for(const xx of [s.x+12,s.x+s.width-24])for(const yy of [s.y+25,s.y+s.height-40]){k.box(xx,yy,12,15,0,225,dark);for(const z of [30,150])k.box(xx-1,yy-1,14,3,z,50,cyan);}
  if(['mall','residential','control'].includes(s.id))for(const z of [0,120]){
   for(const yy of [s.y-1,s.y+s.height+1])for(const xx of [s.x+10,s.x+252]){k.box(xx,yy,60,2,z+28,58,glass);k.box(xx,yy-1,60,3,z+86,3,warm);}
   for(const xx of [s.x-1,s.x+s.width])for(const yy of [s.y+188,s.y+s.height-172])if(!(s.id==='mall'&&z===120&&xx===s.x-1&&yy===s.y+s.height-172))k.box(xx,yy,2,80,z+26,60,glass);
  }
  // Under-slung utility lines and bracing belong to each floating hull.
  for(const yy of [s.y+50,s.y+s.height-50]){k.beam([s.x,-70,yy],[s.x+s.width,-70,yy],9,dark);k.beam([s.x,-70,yy],[s.x+s.width/2,-180,yy],8,white);k.beam([s.x+s.width,-70,yy],[s.x+s.width/2,-180,yy],8,white);}
  if(s.id==='mall'||s.id==='residential'){
   for(const z of [0,120])for(let i=0;i<3;i++){const yy=s.y+165+i*125;k.box(s.x+13,yy,5,80,z+20,66,glass);k.box(s.x+18,yy,4,80,z+89,5,warm);k.sign(s.id==='mall'?['SKY SUPPLY','CLOUD CAFE','TRANSIT GOODS'][i]:['RESIDENCES / A','SKY LOUNGE','HOME / 05'][i],s.x+21,yy+40,z+62,65,'#f3d9b2',Math.PI/2);}
   for(const z of [0,120]){k.box(s.x+40,s.y+220,65,65,z,38,dark);k.box(s.x+40,s.id==='mall'&&z===120?s.y+s.height-90:s.y+360,65,65,z,38,dark);}
   if(s.id==='residential'){for(const z of [280,340,400]){k.box(s.x+25,s.y+215,145,140,z,10,white);k.box(s.x+28,s.y+212,135,3,z+20,26,glass);}k.cylinderAt(s.x+95,s.y+285,22,430,35,cyan);}
   else {k.box(s.x+20,s.y+30,270,35,255,12,white);k.sign('SKY MALL / GALLERIA',s.x+175,s.y+26,277,240,'#ffe0b2',Math.PI);}
  }
  if(s.id==='observation'){
   k.add(dome,clear,[s.x+180,240,cy],[220,180,245]);
   for(let i=0;i<8;i++)k.add(arc,white,[s.x+180,240,cy],[220,180,245],[0,i*Math.PI/4,0]);
   for(const z of [240,295])k.add(ring,white,[s.x+180,z,cy],[z===240?220:200,z===240?245:218,1],[Math.PI/2,0,0]);
   k.sign('PANORAMA / OBSERVATION',s.x+170,s.y+115,170,200,'#b0edf4');
   for(const yy of [s.y+220,s.y+400]){k.cylinderAt(s.x+65,yy,7,240,45,dark);k.beam([s.x+65,285,yy],[s.x+25,305,yy],12,white);}
  }
  if(s.id==='control'){
   k.box(s.x+50,s.y+190,90,90,240,370,dark);
   for(const x of [s.x+54,s.x+126])k.box(x,s.y+186,10,8,260,345,cyan);
   k.box(s.x+10,s.y+150,170,170,550,14,white);k.box(s.x+20,s.y+160,150,150,564,40,glass);k.box(s.x,s.y+140,190,190,606,16,white);
   k.cylinderAt(s.x+95,s.y+235,5,622,95,dark);k.cylinderAt(s.x+95,s.y+235,10,712,8,cyan);
   for(const z of [0,120])for(const yy of [s.y+220,s.y+360]){k.box(s.x+35,yy,65,65,z+30,8,dark);k.box(s.x+40,yy+5,50,20,z+40,24,cyan);}
  }
  if(s.id==='hangar'){
   // Ribbed barrel canopy leaves both ends open; catwalks remain above the aircraft floor.
   for(let i=0;i<6;i++){const yy=s.y+80+i*100;k.beam([s.x,240,yy],[s.x+90,360,yy],12,white);k.beam([s.x+90,360,yy],[s.x+s.width-90,360,yy],12,white);k.beam([s.x+s.width-90,360,yy],[s.x+s.width,240,yy],12,white);}
   k.box(s.x+80,s.y+65,s.width-160,s.height-120,362,10,glass);
   for(const yy of [s.y+130,s.y+550])k.box(s.x+15,yy,300,7,320,5,warm);
   for(const yy of [s.y+245,s.y+385]){k.box(s.x+35,yy,65,65,0,38,dark);k.box(s.x+36,yy,64,4,20,8,cyan);}
   craft(k,s.x+145,s.y+360,0,1);
   k.sign('BERTH 06 / FLIGHT OPERATIONS',cx,s.y+4,275,360,'#f6d19c',Math.PI);
  }
  if(s.id==='garden'){
   for(const z of [0,120,240])for(const yy of [s.y+240,s.y+380]){k.box(s.x+30,yy-20,75,85,z,38,white);tree(s.x+66,yy+20,z+38,true);}
   for(let i=0;i<5;i++)k.box(s.x+110+i*36,s.y+40,12,90,330,12,white);
   for(const xx of [s.x+110,s.x+266])k.cylinderAt(xx,s.y+65,6,240,90,dark);
  }
  if(s.id==='arrival'){
   k.add(ring,cyan,[s.x+180,1,s.y+290],[125,145,1],[Math.PI/2,0,0]);
   k.sign('AERIE SKY-PORT',s.x+170,s.y+150,285,250,'#b0edf4');
   k.box(s.x+35,s.y+220,65,65,0,38,dark);k.box(s.x+35,s.y+220,65,5,38,42,cyan);
   for(const xx of [s.x+70,s.x+270])k.beam([xx,240,s.y+60],[xx,330,s.y+180],12,white);
   k.box(s.x+60,s.y+180,225,180,325,10,white);
   k.sign('ARRIVALS / DEPARTURES',s.x+170,s.y+175,290,210,'#f6d19c',Math.PI);
  }
 }
 // A slender three-fin energy mast above an open public hub, not a solid tower room.
 k.cylinderAt(1620,1660,30,0,850,dark);k.cylinderAt(1620,1660,36,15,820,cyan);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=1620+Math.cos(a)*65,y=1660+Math.sin(a)*65;k.beam([x,30,y],[x,640,y],18,white);k.beam([x,640,y],[1620,930,1660],14,white);}
 for(const z of [10,90,360,620])k.add(ring,cyan,[1620,z,1660],[z===10?190:65,z===10?190:65,1],[Math.PI/2,0,0]);
 for(const r of [250,350])k.add(ring,dark,[1620,.8,1660],[r,r,1],[Math.PI/2,0,0]);
 for(const [x,y]of [[1410,1510],[1800,1740],[1200,2800],[2110,2550]])tree(x+50,y+27,38);
 k.sign('CENTRAL TRANSIT SPIRE',1620,1570,285,240,'#b0edf4',Math.PI);
}
export function craft(k:PlazaKit,x:number,y:number,z:number,scale:number){const hull=k.material('#bacbd7','metal'),dark=k.material('#354b61','metal'),blue=k.material('#79dff6','glow');
 k.add(k.sphere,hull,[x,z+34*scale,y],[125*scale,65*scale,240*scale]);k.add(k.sphere,dark,[x,z+53*scale,y-43*scale],[85*scale,37*scale,95*scale]);
 for(const side of [-1,1]){k.add(k.cube,hull,[x+side*82*scale,z+22*scale,y+20*scale],[100*scale,12*scale,100*scale],[0,side*.35,0]);k.add(k.sphere,dark,[x+side*70*scale,z+25*scale,y+85*scale],[36*scale,35*scale,85*scale]);k.box(x+side*70*scale-10*scale,y+123*scale,20*scale,3*scale,z+15*scale,20*scale,blue);}
}
