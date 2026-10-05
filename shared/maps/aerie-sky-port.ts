import type {MapDefinition,MapEnvironment,MapBlock,Surface,Footprint} from './types.js';
const BLUE='#69c9ec';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,x:number,y:number,width:number,height:number,top:number,kind:MapBlock['kind']='crate',name='',bottom=0,shape?:'ellipse'){blocks.push({id,x,y,width,height,top,bottom,kind,name,accent:BLUE,shape});}
function deck(id:string,x:number,y:number,width:number,height:number,elevation:number,shape?:'ellipse'){surfaces.push({id,x,y,width,height,elevation,style:'deck',shape});block(id,x,y,width,height,elevation,'deck','',elevation-10,shape);}
function ramp(id:string,x:number,y:number,width:number,height:number,axis:'x'|'y',from:number,to:number){surfaces.push({id,x,y,width,height,elevation:Math.max(from,to),ramp:{axis,from,to},style:'stairs'});}
const ground:Footprint[]=[
 {x:720,y:820,width:760,height:760,shape:'ellipse'},
 {x:120,y:950,width:440,height:360},
 {x:500,y:1070,width:420,height:240},
 {x:1660,y:890,width:460,height:700},
 {x:1390,y:1070,width:330,height:240},
 {x:780,y:1880,width:640,height:380,shape:'ellipse'},
 {x:980,y:1510,width:240,height:450},
 {x:170,y:1560,width:440,height:370},
 {x:250,y:1260,width:200,height:400},
 {x:550,y:1660,width:550,height:180},
 {x:1150,y:1660,width:550,height:180},
 {x:1690,y:1480,width:200,height:400},
 {x:480,y:880,width:300,height:240},
 {x:1420,y:880,width:300,height:240},
];
// Suspended terminal and observation route: 0 / 90 / 180, with paired ascent/descent.
deck('cloudhaven-platform',760,140,680,480,90,'ellipse');
deck('north-bridge',1000,570,200,250,90);
ramp('terminal-main-stairs',1000,820,200,260,'y',90,0);
deck('sunset-upper-bridge',570,450,430,180,90);
ramp('sunset-side-stairs',570,630,180,270,'y',90,0);
deck('stardust-upper-bridge',1300,450,330,180,90);
ramp('stardust-side-stairs',1450,630,180,270,'y',90,0);
deck('terminal-observation',780,80,640,200,180);
ramp('observation-west-stairs',800,280,180,280,'y',180,90);
ramp('observation-east-stairs',1200,280,180,280,'y',180,90);
deck('terminal-west-landing',800,540,200,120,90);
deck('terminal-east-landing',1200,540,200,120,90);
deck('observatory-terrace',920,2050,360,140,90);
ramp('observatory-stairs',1020,1790,160,260,'y',0,90);
// Terminal/observatory pods are closed landmarks; circulation remains open on every side.
block('terminal-dome-base',950,220,300,240,210,'monument','CLOUDHAVEN TERMINAL',90,'ellipse');
block('observatory-dome-base',990,2090,200,100,205,'monument','HIGH OBSERVATORY',90,'ellipse');
block('navigation-beacon',1050,1150,100,100,75,'monument','AERIE PLAZA',0,'ellipse');
block('sunset-gate',150,970,110,95,160,'building','SUNSET GATE');
block('west-dock-kiosk',190,1760,95,95,100,'building','STARDUST DOCK');
block('east-dock-terminal',1980,940,120,130,145,'building','STARDUST DOCK');
for(const [i,x,y,w,h,top,bottom] of [
 [0,850,1020,90,65,45,0],[1,1280,1340,90,65,55,0],
 [2,930,1380,70,80,42,0],[3,1270,960,80,70,55,0],
 [4,375,1130,80,65,65,0],[5,410,1630,100,70,55,0],
 [6,1850,1160,100,75,55,0],[7,1990,1390,90,90,65,0],
 [8,1710,960,90,75,35,0],[9,810,2100,65,55,40,0],
 [10,1350,2100,50,50,42,0],[11,1250,170,65,65,220,180],
] as const)block(`terminal-cover-${i}`,x,y,w,h,top,i===2||i===8?'barrier':'crate','',bottom);
// Rails at upper exposed edges; unsupported support boundaries secure the remaining platform lips.
for(const [i,x,y,w,h,e] of [
 [0,780,80,640,8,180],[1,780,80,8,200,180],[2,1412,80,8,200,180],
 [3,980,272,220,8,180],[4,570,450,390,8,90],[5,750,622,50,8,90],
 [6,1370,450,260,8,90],[7,1400,622,50,8,90],
 [8,1000,660,8,160,90],[9,1192,660,8,160,90],
 [10,920,2050,100,8,90],[11,1180,2050,100,8,90],
 [12,920,2050,8,140,90],[13,1272,2050,8,140,90],
] as const)block(`sky-rail-${i}`,x,y,w,h,e+28,'rail','',e);
const day:MapEnvironment={theme:'sky_port',base:'#d3d0c4',fog:'#bfd8e8',accent:BLUE,cloudColor:'#eef0e8',cloudShade:'#c5d7e2',lighting:{sky:'#ecf4ff',ground:'#82725d',sun:'#fff1d3',points:[{color:'#a4ddff',x:33,y:4,z:36,intensity:12,distance:20},{color:'#ffdea6',x:10,y:4,z:33,intensity:8,distance:18}]}};
const night:MapEnvironment={theme:'sky_port',base:'#394b6b',fog:'#111a39',accent:'#83d9ff',cloudColor:'#32466b',cloudShade:'#263656',lighting:{sky:'#bdccff',ground:'#25304d',sun:'#acbcff',points:[{color:'#7fbdff',x:33,y:4,z:36,intensity:22,distance:22},{color:'#b8a6ff',x:33,y:5,z:12,intensity:18,distance:20}]}};
export const aerieSkyPort:MapDefinition={id:'aerie_sky_port',name:'Aerie Sky-Port',bounds:{width:2200,height:2400},plaza:{x:720,y:820,width:760,height:760,shape:'ellipse'},ground,blocks,surfaces,
 spawns:[{x:240,y:1140},{x:1950,y:1100},{x:900,y:600,elevation:90},{x:880,y:2070},{x:310,y:1740},{x:1940,y:1470},{x:1300,y:600,elevation:90},{x:1320,y:2080}],
 districts:[{id:'plaza',name:'AERIE PLAZA',x:1100,y:1200,accent:BLUE},{id:'terminal',name:'CLOUDHAVEN TERMINAL',x:1100,y:390,accent:BLUE},{id:'sunset',name:'SUNSET GATE',x:300,y:1100,accent:BLUE},{id:'west-dock',name:'STARDUST DOCK',x:350,y:1730,accent:BLUE},{id:'east-dock',name:'STARDUST DOCK',x:1900,y:1250,accent:BLUE},{id:'observatory',name:'HIGH OBSERVATORY',x:1100,y:2070,accent:BLUE}],
 minimapLabels:[{text:'TERMINAL',x:1100,y:700},{text:'PLAZA',x:1100,y:1400},{text:'SUNSET',x:335,y:1240},{text:'WEST DOCK',x:395,y:1850},{text:'STARDUST',x:1900,y:1550},{text:'OBSERVATORY',x:1100,y:2330}],
 decorations:[{kind:'dome',x:1100,y:340,elevation:210,width:300,height:130,depth:240},{kind:'dome',x:1090,y:2140,elevation:205,width:200,height:95,depth:100},{kind:'vent',x:1100,y:1200,elevation:75,width:80,height:80,depth:80},{kind:'shuttle',x:2040,y:1720,elevation:40,width:250,height:60,depth:130},{kind:'shuttle',x:260,y:700,elevation:140,width:200,height:50,depth:95}],
 environment:day,variants:{day,night}};
