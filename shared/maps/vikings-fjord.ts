import type {MapDefinition,MapBlock,Surface,Rect} from './types';
import {FJORD_TERRACES,FJORD_WALKS,FJORD_STAIRS,FJORD_HUTS,FJORD_LOCATIONS} from './fjord-layout';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,x:number,y:number,width:number,height:number,bottom:number,top:number,kind:MapBlock['kind']='monument',shape?:'ellipse'){blocks.push({id,x,y,width,height,bottom,top,kind,shape,name:'',accent:'#a7cddd'});}
function deck(r:Rect&{id:string;elevation:number},bottom:number){surfaces.push({...r,style:'deck'});block(r.id,r.x,r.y,r.width,r.height,bottom,r.elevation,'deck');}
for(const r of FJORD_TERRACES)deck(r,0);
for(const r of FJORD_WALKS)deck(r,r.elevation-14);
for(const r of FJORD_STAIRS)surfaces.push({...r,elevation:Math.max(r.from,r.to),ramp:{axis:r.axis,from:r.from,to:r.to},style:'stairs'});
// Snow-covered mountain walls bound the basin, while southern frozen water remains supported/non-lethal.
for(let i=0;i<10;i++){block('boundary-north-'+i,i*300,0,310,160,0,390+i%3*65);block('boundary-west-'+i,0,150+i*300,200,310,0,360+i%4*65);block('boundary-east-'+i,2800,150+i*300,200,310,0,350+i%3*80);}
for(let i=0;i<10;i++)block('boundary-south-'+i,i*300,3160,310,140,0,i>=3&&i<=6?24+i%3*9:100+i%3*35);
// Longhouse: two ground-floor doors, a full-height hall and a northern loft connected outdoors.
block('hall-west-wall',800,620,20,380,120,410,'building');
block('hall-west-loft-wall',800,450,20,45,120,410,'building');
block('hall-west-loft-wall-south',800,575,20,45,120,410,'building');
block('hall-east-wall',1430,450,20,550,120,410,'building');
for(const y of [450,980]){block('hall-door-left-'+y,820,y,205,20,120,410,'building');block('hall-door-right-'+y,1235,y,195,20,120,410,'building');block('hall-lintel-'+y,1025,y,210,20,285,410,'building');}
block('hall-roof-camera',790,440,670,570,410,425,'barrier');
block('hall-hearth',935,715,95,110,120,165,'monument');
block('hall-table',1190,740,85,150,120,157,'crate');
for(const h of FJORD_HUTS)block(h.id,h.x,h.y,h.width,h.height,h.bottom,h.top,'building');
// An open-ended natural cave: staggered icy columns bend the usable route without trapping the camera.
block('cave-west',240,1470,65,900,0,260);
block('cave-east',575,1500,65,840,0,265);
block('cave-roof',240,1550,400,740,190,275);
for(const [i,x,y]of [[0,295,1700],[1,525,1970],[2,290,2170]])block('cave-column-'+i,x,y,75,105,0,195,'monument','ellipse');
// Ice banks, timber cargo, village stone and moored ships shape readable cover.
for(const [i,x,y,ww,hh,z,t]of [[0,1410,1390,80,90,120,240],[1,1220,1690,105,75,120,175],[2,1840,1350,95,80,120,175],[3,1230,1140,85,65,120,168],[4,850,2080,90,150,0,65],[5,2570,1700,100,160,0,140],[6,2580,2380,110,100,0,85],[7,760,2540,70,85,0,55],[8,1730,2710,100,70,0,60]])block('cover-'+i,x,y,ww,hh,z,t,i%2?'crate':'monument',i%2?undefined:'ellipse');
block('longship-west',1080,2810,160,325,0,72,'monument','ellipse');block('longship-east',1830,2830,170,305,0,72,'monument','ellipse');
// Low upper rails protect long edges while keeping every stair mouth and junction open.
for(const [i,x,y,ww,hh,z]of [[0,1000,270,1000,10,240],[1,1000,440,1000,10,240],[2,2540,710,10,1130,240],[3,2370,1050,10,780,240],[4,620,450,10,550,240],[5,440,460,10,530,240]])block('rail-'+i,x,y,ww,hh,z,z+30,'rail');
export const vikingsFjord:MapDefinition={id:'vikings_fjord',name:"Viking's Fjord",bounds:{width:3000,height:3300},plaza:{x:1120,y:1280,width:630,height:620},ground:[{x:0,y:0,width:3000,height:3300}],blocks,surfaces,
 spawns:[{x:1470,y:1800,elevation:120},{x:870,y:1230,elevation:120},{x:2120,y:1280,elevation:120},{x:2670,y:1070},{x:470,y:2540},{x:1510,y:2710},{x:2630,y:2830},{x:1120,y:360,elevation:240}],
 districts:FJORD_LOCATIONS.map(l=>({...l,accent:'#a7cddd'})),minimapLabels:FJORD_LOCATIONS.map(l=>({text:l.name,x:l.x,y:l.y})),
 environment:{theme:'fjord',base:'#b7cbd6',fog:'#9aafc1',accent:'#b4d8e4',lighting:{sky:'#dcecff',ground:'#6a7985',sun:'#fff0d8',points:[{color:'#ffc078',x:29.5,y:5.8,z:23,intensity:12,distance:13},{color:'#ffc078',x:36,y:7.8,z:16,intensity:9,distance:12},{color:'#a7d9ec',x:13,y:3.2,z:58,intensity:5,distance:10},{color:'#ffc078',x:13.3,y:2.8,z:66,intensity:6,distance:8}]}}};
