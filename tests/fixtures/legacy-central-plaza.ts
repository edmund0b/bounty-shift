import type {MapDefinition,MapBlock,Surface} from '../../shared/maps/types.js';
const CYAN='#46dfff',PINK='#f077de';
const blocks:MapBlock[]=[];
function block(id:string,x:number,y:number,width:number,height:number,top:number,kind:MapBlock['kind']='crate',name='',accent=CYAN,bottom=0){blocks.push({id,x,y,width,height,top,bottom,kind,name,accent});}
// Deliberately asymmetric buildings leave outer lanes, forecourts, and multiple exits.
block('west-hall',180,500,350,200,210,'building','WEST DEPOT',PINK);
block('west-loading',180,1030,350,350,185,'building','',PINK);
block('east-store',2050,600,360,170,220,'building','EAST STORAGE',PINK);
block('east-service',2090,1130,300,300,185,'building','',PINK);
block('terminal',1030,1830,540,180,200,'building','SOUTH TERMINAL');
block('north-left',850,70,220,160,240,'building','');
block('north-right',1530,90,220,150,220,'building','');
block('signal-base',1220,970,160,160,22,'monument','CENTRAL PLAZA');
for(const [i,x,y,w,h,z] of [
 [0,400,800,100,100,55],[1,200,1510,160,70,48],[2,450,1410,100,90,64],
 [3,920,850,90,65,35],[4,1620,820,100,70,55],[5,970,1190,100,65,30],
 [6,1540,1210,100,85,55],[7,2150,900,160,80,60],[8,2350,1040,80,110,45],
 [9,1940,1000,90,150,65],[10,2170,1530,160,70,55],[11,890,1610,95,70,35],
 [12,1670,1640,95,70,35],[13,1130,1550,110,45,28],[14,1450,1540,110,45,28],
] as const)block(`cargo-${i}`,x,y,w,h,z,i>=11?'barrier':'crate','',i<3||i>=7&&i<=10?PINK:CYAN);
for(const [i,x,y] of [[0,580,460],[1,1900,470],[2,510,1750],[3,1970,1790]] as const)block(`planter-${i}`,x,y,95,80,25,'planter','',i%2?PINK:CYAN);
const surfaces:Surface[]=[
 {id:'north-bridge',x:650,y:280,width:1300,height:150,elevation:100,style:'deck'},
 {id:'west-catwalk',x:650,y:430,width:160,height:1090,elevation:100,style:'deck'},
 {id:'east-catwalk',x:1790,y:430,width:160,height:1090,elevation:100,style:'deck'},
 {id:'west-balcony',x:810,y:1380,width:220,height:140,elevation:100,style:'deck'},
 {id:'east-balcony',x:1570,y:1380,width:220,height:140,elevation:100,style:'deck'},
 {id:'north-stairs',x:1220,y:430,width:160,height:320,elevation:100,ramp:{axis:'y',from:100,to:0},style:'stairs'},
 {id:'west-stairs',x:650,y:1520,width:160,height:360,elevation:100,ramp:{axis:'y',from:100,to:0},style:'stairs'},
 {id:'east-ramp',x:1790,y:1520,width:160,height:360,elevation:100,ramp:{axis:'y',from:100,to:0},style:'ramp'},
];
for(const s of surfaces.filter(s=>!s.ramp))block(s.id,s.x,s.y,s.width,s.height,s.elevation,'deck','',CYAN,s.elevation-8);
// Rails protect upper edges while leaving broad stair mouths and junctions open.
for(const [i,x,y,w,h] of [
 [0,650,280,1300,9],[1,810,421,410,9],[2,1380,421,410,9],
 [3,650,430,9,1090],[4,801,430,9,950],[5,1941,430,9,1090],[6,1790,430,9,950],
 [7,810,1380,220,9],[8,810,1511,220,9],[9,1021,1380,9,140],
 [10,1570,1380,220,9],[11,1570,1511,220,9],[12,1570,1380,9,140],
] as const)block(`rail-${i}`,x,y,w,h,133,'rail','',CYAN,100);
export const centralPlaza:MapDefinition={id:'central_plaza',name:'Central Plaza',bounds:{width:2600,height:2100},plaza:{x:850,y:760,width:900,height:600},blocks,surfaces,
 spawns:[{x:950,y:1710},{x:1650,y:1710},{x:610,y:850},{x:2000,y:870},{x:1120,y:540},{x:1480,y:540},{x:400,y:1650},{x:2250,y:1740}],
 districts:[{id:'center',name:'CENTRAL PLAZA',x:1300,y:900,accent:CYAN},{id:'west',name:'WEST DEPOT',x:350,y:780,accent:PINK},{id:'east',name:'EAST STORAGE',x:2250,y:830,accent:PINK},{id:'south',name:'SOUTH TERMINAL',x:1300,y:1750,accent:CYAN},{id:'north',name:'NORTH BRIDGE',x:1300,y:320,accent:CYAN}],
 environment:{base:'#122337',fog:'#071223',accent:CYAN}};
