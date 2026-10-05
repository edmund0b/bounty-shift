import type {MapDefinition,MapBlock,Surface} from './types.js';
const ICE='#a4d9e5',blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,x:number,y:number,width:number,height:number,top:number,kind:MapBlock['kind']='barrier',name='',bottom=0){blocks.push({id,x,y,width,height,top,bottom,kind,name,accent:ICE});}
function deck(id:string,x:number,y:number,width:number,height:number,elevation:number){surfaces.push({id,x,y,width,height,elevation,style:'deck'});block(id,x,y,width,height,elevation,'deck','',elevation-10);}
function ramp(id:string,x:number,y:number,width:number,height:number,axis:'x'|'y',from:number,to:number){surfaces.push({id,x,y,width,height,elevation:Math.max(from,to),ramp:{axis,from,to},style:'stairs'});}
// An irregular fjord basin: narrow northern stronghold, broad village, rocky eastern cove,
// and a southern coastal shelf. Ice is ordinary supported terrain, never a new physics mode.
const ground=[{x:620,y:100,width:900,height:660},{x:170,y:620,width:1760,height:720},{x:220,y:1240,width:1710,height:670},{x:400,y:1800,width:1400,height:420},{x:650,y:2120,width:950,height:260}];
block('valhalla-hall',820,330,420,300,220,'building','VALHALLA HALLS');
block('fortress-gatehouse',650,80,150,80,230,'building','FJORD FORTRESS');
block('western-guardhouse',190,710,180,260,200,'building','FJORD FORTRESS');
block('armory-hall',1560,740,270,260,200,'building','FROST-BITTEN ARMORY');
block('cove-longhouse',1570,1760,220,180,160,'building',"RAIDER'S COVE");
// Ground-to-mid stairs on both sides of the great hall; an upper northern circuit has two descents.
deck('valhalla-front',720,630,620,190,90);
ramp('hall-front-stairs',910,820,240,270,'y',90,0);
deck('west-hall-route',560,340,260,480,90);
ramp('west-village-stairs',560,820,240,270,'y',90,0);
deck('east-hall-route',1240,340,250,480,90);
ramp('east-village-stairs',1250,820,240,270,'y',90,0);
ramp('west-battlement-stairs',560,340,240,300,'y',180,90);
ramp('east-battlement-stairs',1250,340,240,300,'y',180,90);
deck('west-battlement',560,170,260,170,180);
deck('north-wall-walk',820,170,430,150,180);
deck('east-battlement',1250,170,240,170,180);
// Western fortress loop reaches the village by stairs at both ends.
deck('western-fortress',370,700,190,560,90);
ramp('fortress-south-stairs',370,1260,190,270,'y',90,0);
deck('armory-terrace',1490,1000,360,200,90);
ramp('armory-south-stairs',1610,1200,220,270,'y',90,0);
ramp('armory-west-stairs',1220,1100,270,180,'x',0,90);
// Cove is a short open-ended ice passage with a high ceiling, not a subterranean maze.
block('cave-west-wall',1370,1360,45,320,210);
block('cave-east-wall',1830,1360,45,320,240);
block('cave-ice-roof',1415,1420,415,200,215,'barrier','',170);
// Raised dock loop: climb either side, cross the timber quay, return to the frozen basin.
ramp('dock-west-stairs',700,1820,220,240,'y',0,80);
ramp('dock-east-stairs',1300,1820,220,240,'y',0,80);
deck('frost-guard-quay',700,2060,820,180,80);
deck('dock-west-finger',700,2240,220,110,80);
deck('dock-east-finger',1300,2240,220,110,80);
block('plaza-runestone',1000,1580,75,95,140,'monument','RUNESTONE PLAZA');
// Fortifications/ice pillars shape approaches while the middle remains a connected frozen crossing.
for(const [i,x,y,w,h,t] of [
 [0,180,1040,130,160,150],[1,700,1190,130,180,140],[2,1090,1240,90,100,80],
 [3,370,1610,150,150,155],[4,1210,1740,100,95,65],[5,1730,1110,90,85,140],
 [6,600,1700,85,85,60],[7,940,1960,90,80,60],[8,1550,2020,100,100,65],
 [9,720,1450,100,65,50],[10,1240,1460,85,80,55],[11,1060,900,70,90,50],
] as const)block(`frost-cover-${i}`,x,y,w,h,t,i%3===0?'monument':'crate');
for(const [i,x,y,w,h,e] of [[0,760,700,70,65,90],[1,1260,650,45,50,90],[2,890,200,75,65,180],[3,1510,1030,70,65,90],[4,1080,2080,80,55,80]] as const)block(`upper-cargo-${i}`,x,y,w,h,e+45,'crate','',e);
// Rails guard exposed upper edges and leave every stair/bridge mouth open.
for(const [i,x,y,w,h,e] of [[0,560,170,260,10,180],[1,820,170,430,10,180],[2,1250,170,240,10,180],[3,1480,180,10,150,180],[4,720,630,100,10,90],[5,1240,630,100,10,90],[6,700,2230,220,10,80],[7,920,2230,380,10,80],[8,1300,2230,220,10,80]] as const)block(`fjord-rail-${i}`,x,y,w,h,e+30,'rail','',e);
// Visible cliff volumes follow the ground outline. Distant mountains remain visual only.
for(const [i,x,y,w,h] of [[0,0,0,2200,80],[1,0,80,600,530],[2,1540,80,660,530],[3,0,610,150,720],[4,1950,610,250,1320],[5,0,1340,200,460],[6,0,1810,380,410],[7,0,2230,630,270],[8,1620,2240,580,260],[9,0,2390,2200,110]] as const)block(`ice-cliff-${i}`,x,y,w,h,300+(i%3)*70,'monument');
export const vikingsFjord:MapDefinition={id:'vikings_fjord',name:"Viking's Fjord",bounds:{width:2200,height:2500},plaza:{x:700,y:1480,width:650,height:430},ground,blocks,surfaces,
 spawns:[{x:990,y:150},{x:1450,y:730,elevation:90},{x:270,y:1280},{x:1850,y:850},{x:1570,y:1310},{x:1800,y:1660},{x:480,y:1930},{x:1230,y:2310}],
 districts:[{id:'fortress',name:'FJORD FORTRESS',x:1030,y:230,accent:ICE},{id:'hall',name:'VALHALLA HALLS',x:1030,y:570,accent:ICE},{id:'armory',name:'FROST-BITTEN ARMORY',x:1680,y:900,accent:ICE},{id:'cove',name:"RAIDER'S COVE",x:1560,y:1500,accent:ICE},{id:'runes',name:'RUNESTONE PLAZA',x:1030,y:1700,accent:ICE},{id:'docks',name:'FROST-GUARD DOCKS',x:1120,y:2150,accent:ICE}],
 minimapLabels:[{text:'FORTRESS',x:1070,y:125},{text:'VALHALLA',x:1030,y:510},{text:'ARMORY',x:1670,y:950},{text:'COVE',x:1570,y:1570},{text:'RUNESTONE',x:1040,y:1820},{text:'DOCKS',x:1110,y:2320}],
 environment:{theme:'fjord',base:'#bacdd5',fog:'#b0c6d4',accent:ICE,lighting:{sky:'#e5f2ff',ground:'#627e92',sun:'#dfeeff',points:[{color:'#ffd39d',x:30.9,y:3.3,z:19.5,intensity:8,distance:9},{color:'#a2efff',x:46.8,y:2.2,z:45,intensity:6,distance:9}]}}};
