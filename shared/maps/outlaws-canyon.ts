import type {MapDefinition,MapBlock,Surface} from './types.js';
const WOOD='#ad8656',blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,x:number,y:number,width:number,height:number,top:number,kind:MapBlock['kind']='crate',name='',bottom=0){blocks.push({id,x,y,width,height,top,bottom,kind,name,accent:WOOD});}
function deck(id:string,x:number,y:number,width:number,height:number,elevation:number){surfaces.push({id,x,y,width,height,elevation,style:'deck'});block(id,x,y,width,height,elevation,'deck','',elevation-10);}
function roof(id:string,x:number,y:number,width:number,height:number,elevation:number,name:string){block(id,x,y,width,height,elevation,'building',name);surfaces.push({id:id+'-roof',x,y,width,height,elevation,style:'deck'});}
function ramp(id:string,x:number,y:number,width:number,height:number,axis:'x'|'y',from:number,to:number){surfaces.push({id,x,y,width,height,elevation:Math.max(from,to),ramp:{axis,from,to},style:'stairs'});}
// Irregular canyon footprint: open north plaza, pinched settlement, wider southern crossing.
const ground=[{x:300,y:100,width:1300,height:650},{x:160,y:690,width:1580,height:570},{x:160,y:1160,width:1590,height:900},{x:280,y:1960,width:1350,height:500}];
roof('deadwood-saloon',400,480,300,320,160,'DEADWOOD SALOON');
roof('east-boardhouse',1200,420,240,300,160,'DUST-UP PLAZA');
deck('saloon-porch',380,800,430,180,80);
ramp('saloon-street-stairs',810,800,240,180,'x',80,0);
ramp('saloon-roof-stairs',710,480,180,320,'y',160,80);
deck('saloon-roof-landing',380,420,510,60,160);
deck('town-roof-bridge',700,300,500,180,160);
deck('east-roof-landing',1200,240,440,180,160);
ramp('east-roof-descent',1460,420,180,420,'y',160,0);
deck('mine-side-walkway',380,980,180,860,80);
deck('mine-overlook',200,1180,180,180,80);
ramp('west-crossing-stairs',380,1840,180,240,'y',80,0);
roof('west-renegade',160,1480,220,260,80,'RENEGADE OUTPOST');
roof('east-renegade',1250,1400,300,260,80,'RENEGADE OUTPOST');
deck('renegade-crossing-bridge',560,1580,690,180,80);
deck('east-outpost-landing',1250,1660,500,180,80);
ramp('east-outpost-stairs',1570,1380,180,280,'y',0,80);
// Solid architecture breaks sightlines; the mine pocket is open-ended rather than a tunnel maze.
block('mine-headframe',180,920,180,200,170,'building','LAST CHANCE MINE');
block('scrap-mine-store',170,700,180,150,150,'building','SCRAP CANYON MINE');
block('mine-backwall',170,1140,30,250,160,'barrier');
block('plaza-adobe',1010,120,170,170,140,'building',"OUTLAW'S CANYON");
block('west-plaza-store',320,150,200,190,130,'building');
block('east-plaza-store',1300,110,260,160,135,'building');
block('east-scrap-shed',1260,970,250,240,130,'building');
block('crossing-storefront',650,2090,240,170,145,'building','GHOST TOWN CROSSING');
block('abandoned-east-store',1350,2140,220,200,110,'building');
block('crossing-west-store',300,2230,170,170,100,'building');
// Gameplay cliff volumes track the irregular ground boundary; decorative rock layers stay outside.
for(const [i,x,y,w,h] of [
 [0,0,0,1900,90],[1,0,90,280,590],[2,1620,90,280,580],
 [3,0,680,140,1260],[4,1760,680,140,1380],
 [5,0,2070,260,530],[6,1650,2080,250,520],[7,0,2470,1900,130],
] as const)block(`canyon-cliff-${i}`,x,y,w,h,250+(i%3)*60,'monument');
// Cover density is concentrated at junctions, leaving 150+ unit navigation lanes.
for(const [i,x,y,w,h,top] of [
 [0,620,220,85,85,45],[1,760,560,70,100,40],[2,1050,660,100,70,55],
 [3,610,1120,95,75,60],[4,1020,1220,100,110,70],[5,900,1450,90,65,45],
 [6,650,1830,130,80,60],[7,1120,2020,110,80,45],[8,940,2300,100,75,50],
 [9,210,1980,95,65,55],[10,1570,1160,90,75,65],[11,1170,850,75,80,55],
] as const)block(`scrap-cover-${i}`,x,y,w,h,top,i%3===0?'barrier':'crate');
for(const [i,x,y,w,h,e] of [[0,440,560,80,65,160],[1,1240,500,65,80,160],[2,200,1540,65,65,80],[3,1320,1460,80,65,80]] as const)block(`upper-cover-${i}`,x,y,w,h,e+42,'crate','',e);
// Upper perimeter rails leave ramp mouths and bridge connections clear.
for(const [i,x,y,w,h,e] of [[0,380,420,320,8,160],[1,700,300,500,8,160],[2,890,472,310,8,160],[3,1200,240,440,8,160],[4,1632,240,8,180,160],[5,380,1000,8,180,80],[6,380,1360,8,120,80],[7,560,1580,690,8,80],[8,560,1752,690,8,80]] as const)block(`wood-rail-${i}`,x,y,w,h,e+27,'rail','',e);
// Prop collision uses the same footprint as the visible barrel/cart body.
for(const [i,x,y,w,h] of [[0,970,1100,150,80],[1,970,1880,130,70]] as const)block(`cart-body-${i}`,x-w/2,y-h/2,w,h,45,'barrier');
for(const [i,x,y] of [[0,720,1030],[1,1210,1260],[2,580,2000],[3,1480,1930]] as const){block(`barrel-body-${i}`,x-22.5,y-22.5,45,45,55,'barrier');blocks[blocks.length-1].shape='ellipse';}
export const outlawsCanyon:MapDefinition={id:'outlaws_canyon',name:"Outlaw's Canyon",bounds:{width:1900,height:2600},plaza:{x:550,y:150,width:690,height:570},ground,blocks,surfaces,
 spawns:[{x:580,y:390},{x:1150,y:350},{x:260,y:1370},{x:1550,y:1285},{x:300,y:1900},{x:1500,y:2010},{x:550,y:2380},{x:1200,y:2370}],
 districts:[{id:'dust',name:'DUST-UP PLAZA',x:950,y:350,accent:WOOD},{id:'mine',name:'LAST CHANCE MINE',x:260,y:1200,accent:WOOD},{id:'saloon',name:'DEADWOOD SALOON',x:550,y:730,accent:WOOD},{id:'west',name:'WEST RENEGADE',x:270,y:1600,accent:WOOD},{id:'east',name:'EAST RENEGADE',x:1400,y:1550,accent:WOOD},{id:'crossing',name:'GHOST TOWN CROSSING',x:1030,y:2280,accent:WOOD}],
 minimapLabels:[{text:'DUST-UP',x:950,y:360},{text:'PLAZA',x:950,y:470},{text:'LAST CHANCE',x:400,y:1130},{text:'MINE',x:420,y:1250},{text:'RENEGADE',x:900,y:1530},{text:'GHOST TOWN',x:1050,y:2230},{text:'CROSSING',x:1050,y:2340}],
 decorations:[{kind:'cart',x:970,y:1100,width:150,height:55,depth:80},{kind:'cart',x:970,y:1880,width:130,height:55,depth:70},{kind:'barrel',x:720,y:1030,width:45,height:55,depth:45},{kind:'barrel',x:1210,y:1260,width:45,height:55,depth:45},{kind:'barrel',x:580,y:2000,width:45,height:55,depth:45},{kind:'barrel',x:1480,y:1930,width:45,height:55,depth:45}],
 environment:{theme:'canyon',base:'#bca076',fog:'#d6bea0',accent:WOOD,lighting:{sky:'#f4e4c6',ground:'#766049',sun:'#ffe0b0',points:[{color:'#ffc078',x:16,y:3,z:25,intensity:9,distance:12},{color:'#efb777',x:7,y:3,z:35,intensity:7,distance:10}]}}};
