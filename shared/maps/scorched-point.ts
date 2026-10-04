import type {MapDefinition,MapBlock,Surface,Footprint,Decoration} from './types.js';
const EMBER='#ff772b',IRON='#d69764';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];
const ground:Footprint[]=[
 {x:840,y:40,width:720,height:520}, // Refinery
 {x:110,y:400,width:490,height:430}, // Mines
 {x:80,y:930,width:480,height:500}, // Forge
 {x:1840,y:880,width:560,height:500}, // Hell's Depot
 {x:1800,y:350,width:600,height:410}, // Lava Fields
 {x:850,y:1680,width:700,height:440}, // Volcanic Depot
 {x:220,y:1550,width:620,height:550}, // Lower maintenance
 {x:1560,y:1500,width:840,height:600}, // Slag logistics
 {x:350,y:180,width:1700,height:160},
 {x:350,y:180,width:180,height:650},
 {x:240,y:780,width:220,height:280},
 {x:240,y:1370,width:220,height:300},
 {x:700,y:1930,width:1150,height:170},
 {x:2040,y:1280,width:180,height:400},
 {x:2050,y:700,width:180,height:240},
 {x:2290,y:700,width:110,height:1000},
 {x:1900,y:180,width:180,height:320},
];
function block(id:string,x:number,y:number,width:number,height:number,top:number,kind:MapBlock['kind']='crate',name='',bottom=0,shape?:'ellipse'){blocks.push({id,x,y,width,height,top,bottom,kind,name,accent:EMBER,shape});}
function deck(id:string,x:number,y:number,width:number,height:number,elevation:number,shape?:'ellipse'){
 surfaces.push({id,x,y,width,height,elevation,style:'deck',shape});block(id,x,y,width,height,elevation,'deck','',elevation-10,shape);
}
function ramp(id:string,x:number,y:number,width:number,height:number,axis:'x'|'y',from:number,to:number,style:'stairs'|'ramp'='stairs'){
 surfaces.push({id,x,y,width,height,elevation:Math.max(from,to),ramp:{axis,from,to},style});
}
// Three connected height bands: lower sectors, raised Crucible/bridges, upper refinery loop.
deck('crucible',860,760,680,680,90,'ellipse');
deck('north-approach',1100,750,200,250,90);
deck('south-approach',1100,1300,200,200,90);
deck('west-approach',560,1000,400,200,90);
deck('east-approach',1440,1000,400,200,90);
ramp('refinery-crucible',1100,510,200,240,'y',0,90);
ramp('depot-crucible',1100,1500,200,270,'y',90,0);
ramp('forge-crucible',300,1000,260,200,'x',0,90);
ramp('logistics-crucible',1840,1000,260,200,'x',90,0);
deck('west-maintenance',560,1100,180,680,90);
deck('east-maintenance',1660,1100,180,680,90);
deck('west-mid-landing',560,1600,280,180,90);
deck('east-mid-landing',1560,1600,280,180,90);
ramp('west-low-access',560,1780,200,260,'y',90,0);
ramp('east-low-access',1640,1780,200,260,'y',90,0);
deck('west-upper',660,560,180,740,190);
deck('east-upper',1560,560,180,740,190);
deck('refinery-overlook',660,560,1080,180,190);
ramp('west-upper-access',660,1300,180,300,'y',190,90);
ramp('east-upper-access',1560,1300,180,300,'y',190,90);
ramp('refinery-upper-access',900,60,180,500,'y',0,190);
// Machinery solids provide honest line-of-sight cover; decorations sit on these footprints.
block('refinery-furnace',1250,100,240,260,260,'building','MAGMA REFINERY');
block('mines-rock',120,410,140,220,190,'building','OBSIDIAN MINES');
block('forge-furnace',90,1250,200,160,230,'building',"HELL'S FORGE");
block('depot-hall',2150,880,160,160,215,'building',"HELL'S DEPOT");
block('fields-vent',2130,390,140,170,150,'building','LAVA FIELDS');
block('volcanic-machinery',950,1950,170,155,190,'building','VOLCANIC DEPOT');
block('slag-equipment',2030,1800,180,200,180,'building','');
block('crucible-core',1130,1030,140,140,185,'monument','THE CRUCIBLE',90,'ellipse');
for(const [i,x,y,w,h,top,bottom] of [
 [0,560,480,60,110,75,0],[1,300,670,100,70,65,0],[2,450,900,70,75,55,0],
 [3,190,1140,65,80,70,0],[4,2020,1230,100,70,55,0],[5,1860,480,85,100,65,0],
 [6,1900,1540,70,55,70,0],[7,1390,1810,75,70,55,0],[8,450,1680,80,100,55,0],
 [9,1010,950,70,55,140,90],[10,1350,1200,65,75,145,90],
 [11,680,820,50,70,240,190],[12,1680,1070,40,60,230,190],
 [13,1380,590,120,65,230,190],
] as const)block(`equipment-${i}`,x,y,w,h,top,i===9||i===13?'barrier':'crate','',bottom);
// Guard rails leave broad ramp mouths and junctions open. Unsupported edges also stop movement.
for(const [i,x,y,w,h,e] of [
 [0,560,1000,390,8,90],[1,1445,1000,395,8,90],
 [2,740,1192,195,8,90],[3,1465,1192,195,8,90],
 [4,1100,770,8,65,90],[5,1292,770,8,65,90],
 [6,1100,1390,8,110,90],[7,1292,1390,8,110,90],
 [8,560,1200,8,580,90],[9,1732,1200,8,580,90],
 [10,660,560,8,740,190],[11,832,740,8,560,190],
 [12,1732,560,8,740,190],[13,1560,740,8,560,190],
 [14,660,560,240,8,190],[15,1080,560,660,8,190],
 [16,840,732,720,8,190],
] as const)block(`guard-${i}`,x,y,w,h,e+30,'rail','',e);
const decorations:Decoration[]=[
 {kind:'tank',x:1365,y:230,width:130,height:320,depth:130},
 {kind:'stack',x:1290,y:180,width:55,height:450,depth:55},
 {kind:'stack',x:1450,y:170,width:50,height:380,depth:50},
 {kind:'tank',x:170,y:1320,width:90,height:300,depth:90},
 {kind:'pipe',x:1100,y:130,width:1050,height:35,depth:35},
 {kind:'pipe',x:130,y:1140,width:32,height:260,depth:32},
 {kind:'rock',x:185,y:520,width:140,height:240,depth:180},
 {kind:'vent',x:1200,y:1100,elevation:185,width:105,height:8,depth:105},
];
for(let i=0;i<14;i++)decorations.push({kind:i%3?'rock':'stack',x:i*180-60,y:i%2?-150:2350,width:140,height:280+i%4*100,depth:150});
for(let i=0;i<4;i++)decorations.push({kind:'lavafall',x:i*800-100,y:i%2?-100:2310,width:50,height:450,depth:35});
export const scorchedPoint:MapDefinition={id:'scorched_point',name:'Scorched Point',bounds:{width:2400,height:2200},plaza:{x:860,y:760,width:680,height:680,shape:'ellipse'},blocks,surfaces,ground,
 spawns:[{x:1190,y:390},{x:380,y:570},{x:2050,y:600},{x:180,y:980},{x:2210,y:1200},{x:1240,y:1900},{x:350,y:1880},{x:1900,y:1710}],
 districts:[{id:'crucible',name:'THE CRUCIBLE',x:1200,y:1100,accent:IRON},{id:'refinery',name:'MAGMA REFINERY',x:1350,y:230,accent:EMBER},{id:'mines',name:'OBSIDIAN MINES',x:350,y:550,accent:IRON},{id:'fields',name:'LAVA FIELDS',x:2030,y:520,accent:EMBER},{id:'forge',name:"HELL'S FORGE",x:300,y:1170,accent:EMBER},{id:'depot',name:"HELL'S DEPOT",x:2100,y:1170,accent:EMBER},{id:'volcanic',name:'VOLCANIC DEPOT',x:1250,y:1880,accent:IRON}],
 minimapLabels:[{text:'REFINERY',x:1200,y:430},{text:'MINES',x:360,y:780},{text:'FIELDS',x:2050,y:690},{text:'FORGE',x:300,y:1390},{text:'DEPOT',x:2100,y:1370},{text:'CRUCIBLE',x:1200,y:1270},{text:'VOLCANIC',x:1220,y:2080}],decorations,
 environment:{theme:'industrial',base:'#241e1b',fog:'#160e0b',accent:EMBER,lava:'#ffddaa',lighting:{sky:'#d8bba5',ground:'#261009',sun:'#ffc596',points:[{color:'#ff5010',x:36,y:3,z:33,intensity:28,distance:28},{color:'#ff6f25',x:36,y:4,z:9,intensity:20,distance:25}]}}};
