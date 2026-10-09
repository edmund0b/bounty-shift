import * as T from 'three';
import type {MapDefinition} from '../../shared/maps/types';
import {FJORD_TERRACES,FJORD_HUTS} from '../../shared/maps/fjord-layout';
import {PlazaKit} from './central-plaza-kit';
import {FjordKit} from './fjord-kit';
import {settlement,dockyard} from './fjord-settlement';
export function buildVikingsFjord(scene:T.Scene,map:MapDefinition){const k=new PlazaKit(scene),f=new FjordKit(k);k.root.name='vikings-fjord-environment';
 k.box(0,0,3000,3300,-22,22,f.snow);k.box(200,1970,2600,1190,-.7,2.7,f.ice);
 // Packed paths read differently from fresh snow, while remaining exactly the same support height.
 const packed=f.surface('#b0c5cf',.89,'packed');for(const [x,y,w,d,z]of [[790,1220,1430,180,120],[1130,1380,600,550,120],[201,1180,180,1250,0],[2570,750,200,1820,0],[650,2575,1760,120,0]])k.box(x,y,w,d,z+.1,.2,packed);
 const terraces=new Set(FJORD_TERRACES.map(p=>p.id)),huts=new Set(FJORD_HUTS.map(p=>p.id));
 for(const b of map.blocks){k.solid(b);
  if(b.id==='hall-table')continue;
  if(b.id==='hall-hearth'){f.rockAt(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,false);continue;}
  if(b.id==='hall-roof-camera'||b.id.startsWith('longship-'))continue;
  if(b.id==='cave-west'||b.id==='cave-east'){for(let t=0;t<b.height;t+=65){const h=b.top*(.95+Math.sin(t)*.035);k.add(f.column,f.rock,[b.x+b.width/2,h/2,b.y+t+32],[b.width+10,h,95],[0,t*.02,0]);}continue;}
  if(b.id==='cave-roof'){for(let t=0;t<b.height;t+=85){k.add(f.column,f.rock,[b.x+b.width/2,b.bottom+35,b.y+t+40],[b.width+18,90,125],[0,.2,0]);k.add(f.column,f.snow,[b.x+b.width/2,b.top+3,b.y+t+40],[b.width+12,7,120],[0,.2,0]);}continue;}
  if(b.kind==='building'){f.timberWall(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom);continue;}
  if(b.id.startsWith('boundary-')){const along=b.width>b.height;for(let i=0;i<3;i++){const w=along?b.width/3+8:b.width,d=along?b.height:b.height/3+8;const x=b.x+(along?i*b.width/3:0)+w/2,y=b.y+(along?0:i*b.height/3)+d/2,h=b.top*(.88+i*.07);k.add(f.column,f.rock,[x,h/2,y],[w*1.14,h,d*1.14],[0,i*.7,0]);k.add(f.column,f.snow,[x,h+2,y],[w*.98,8,d*.98],[0,i*.7,0]);}continue;}
  if(b.kind==='rail'){const along=b.width>b.height,len=along?b.width:b.height;for(let t=0;t<len;t+=90)k.box(b.x+(along?t:0),b.y+(along?0:t),9,9,b.bottom,35,f.beam);k.box(b.x,b.y,b.width,b.height,b.top-6,6,f.wood);k.box(b.x,b.y,b.width,b.height,b.top,3,f.snow);continue;}
  if(b.id==='ice-bridge'){k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,f.ice);for(let i=0;i<16;i++){k.add(f.crag,f.ice,[b.x+22+i*46,b.bottom-10,b.y+(i%2?b.height:0)],[55,50,28]);k.add(f.crag,f.snow,[b.x+25+i*46,b.top+2,b.y+(i%2?b.height-10:10)],[48,5,26]);}continue;}
  if(b.kind==='deck'&&!terraces.has(b.id)){k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,f.wood);continue;}
  if(b.kind==='crate'){f.cargo(b.x,b.y,b.bottom,b.width,b.height,b.top-b.bottom);continue;}
  if(b.shape==='ellipse'){k.add(k.sphere,f.rock,[b.x+b.width/2,(b.bottom+b.top)/2,b.y+b.height/2],[b.width,b.top-b.bottom,b.height]);k.add(k.sphere,f.snow,[b.x+b.width/2,b.top-4,b.y+b.height/2],[b.width*.9,12,b.height*.9]);continue;}
  f.rockAt(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom);
 }
 for(const s of map.surfaces.filter(s=>s.ramp)){const ice=s.id.startsWith('ice-');k.slope(s,ice?f.ice:f.wood,ice?f.snow:f.snow);if(s.id!=='east-village-landing')for(const side of [0,1]){const r=s.ramp!;if(r.axis==='y')k.beam([s.x+(side?s.width:0),r.from+30,s.y],[s.x+(side?s.width:0),r.to+30,s.y+s.height],4,f.beam);else k.beam([s.x,r.from+30,s.y+(side?s.height:0)],[s.x+s.width,r.to+30,s.y+(side?s.height:0)],4,ice?f.ice:f.beam);}}
 // Frost curtains and clustered icicles soften the cave; the central camera corridor stays clear.
 for(let i=0;i<10;i++){const y=1550+i*75;for(const x of [285,590]){k.add(f.column,f.ice,[x,100,y],[40,190,94],[0,i*.7,0]);k.add(f.cone,f.ice,[x+15,165,y],[19,65,19],[Math.PI,0,0]);}k.add(f.column,f.ice,[430,207+(i%3)*4,y],[265,30,115],[0,i*.13,0]);}
 // Frozen runoff appears on cliff exteriors rather than covering traversal faces.
 for(let i=0;i<14;i++)k.add(f.crag,f.ice,[2580,140+i%3*15,750+i*73],[35,230+i%3*18,60]);
 // Timber flooring stays dry inside the longhouse; packed lanes remain visible above snow caps.
 for(let y=470;y<975;y+=25)k.box(820,y,610,23,121,1,f.wood);
 for(const [x,y,ww,dd]of [[1120,1250,630,120],[1350,1490,220,440]])k.box(x,y,ww,dd,121.1,.3,packed);
 // Broken snowy rock shelves articulate the terrace edges without narrowing stair approaches.
 for(let i=0;i<8;i++){const x=1210+i*83;k.add(f.column,f.rock,[x,54,1950],[82,112,30]);k.add(f.column,f.snow,[x,120,1940],[80,3,40]);}
 settlement(f);dockyard(f);
 // Sparse trees frame existing solid buildings/terrain; no hidden clutter in chase lanes.
 for(const [x,y,z,h]of [[480,320,240,210],[920,300,240,175],[2420,420,240,200],[2490,610,240,190],[2700,400,0,185],[2720,570,0,165],[2650,2200,0,190],[2650,3020,0,170]])f.pine(x,y,z,h);
 for(let i=0;i<18;i++){f.pine(95,250+i*160,420,170+i%3*35);f.pine(2900,280+i*150,420,180+i%4*25);}
 // Jagged distant peaks stay outside the authored play space and use shared low-poly geometry.
 for(let i=0;i<13;i++){const x=-550+i*350,h=650+i%4*130;for(const y of [-380,3690]){if(y===3690&&i>=3&&i<=9)continue;k.add(f.peak,f.rock,[x,h/2-80,y],[600,h,650],[0,i*.37,0]);k.add(f.peak,f.snow,[x+h*.045,h*.76-80,y],[295,h*.48,320],[0,i*.37,0]);}}
 for(let i=0;i<8;i++)for(const x of [-420,3400]){const h=570+i%3*140;k.add(f.peak,f.rock,[x,h/2,200+i*420],[640,h,760]);k.add(f.peak,f.snow,[x+h*.05,h*.8,200+i*420],[260,h*.4,300]);}
 // The southern basin opens into a distant fjord, with low ice-pressure banks marking the playable limit.
 const water=f.surface('#244d65',.24,'water');k.box(200,3300,2600,1800,-25,1,water);
 for(let i=0;i<25;i++){const x=450+i*149%2200,y=3400+i*213%1100;k.add(k.sphere,f.ice,[x,-23,y],[90+i%4*40,4,65+i%3*40]);k.add(k.sphere,f.snow,[x,-21,y],[72+i%4*35,2,50+i%3*35]);}
 // Thin snow shelves/ice floes sit within the non-lethal basin, never create new physics.
 for(let i=0;i<35;i++){const x=700+i*193%1800,y=2300+i*137%790;k.add(k.sphere,f.snow,[x,1,y],[25+i%4*18,2,24+i%3*23]);}
 // One render-driven particle layer; no timers, listeners, physics or accumulating effects.
 const n=360,positions=new Float32Array(n*3);for(let i=0;i<n;i++){positions[i*3]=(230+i*157%2530)*.03;positions[i*3+1]=2+i%41*.31;positions[i*3+2]=(200+i*229%2900)*.03;}
 const geo=k.track(new T.BufferGeometry());geo.setAttribute('position',new T.BufferAttribute(positions,3));const mat=k.track(new T.PointsMaterial({color:'#edf7ff',size:.065,transparent:true,opacity:.65,depthWrite:false}));const snow=new T.Points(geo,mat);snow.name='fjord-snowfall';snow.frustumCulled=false;snow.onBeforeRender=()=>{const t=performance.now()*.001;for(let i=0;i<n;i++){positions[i*3]=(230+i*157%2530)*.03+Math.sin(t*.18+i)*.8;positions[i*3+1]=((i%41*.31-t*.6)%13+13)%13+1;}geo.attributes.position.needsUpdate=true;};k.root.add(snow);
 k.root.traverse(o=>{const m=(o as T.Mesh).material;if(m instanceof T.MeshBasicMaterial&&m.map)m.side=T.FrontSide;});k.finish();return{solids:k.solids,dispose:()=>k.dispose()};
}
