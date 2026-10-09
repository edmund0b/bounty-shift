import type {MapDefinition,MapBlock,Surface,Rect} from './types';
import {CANYON_BOUNDS,CANYON_MESAS,CANYON_RAMPS,CANYON_WOOD,CANYON_CAVE,CANYON_ROCKS,CANYON_LOCATIONS,OUTPOST} from './outlaws-layout';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,r:Rect,bottom:number,top:number,kind:MapBlock['kind']='monument'){blocks.push({...r,id,bottom,top,kind,name:'',accent:'#a88962'});}
function deck(id:string,r:Rect,z:number,bottom=z-12){surfaces.push({...r,id,elevation:z,style:'deck'});block(id,r,bottom,z,'deck');}
// Tall boundary formations enclose every ground approach; the visual rock kit breaks their silhouettes.
for(let i=0;i<9;i++){const x=i*320;block('wall-north-'+i,{x,y:0,width:325,height:190+(i%3)*12},0,420+(i%4)*55);block('wall-south-'+i,{x,y:2840,width:325,height:160},0,390+(i%3)*60);}
for(let i=0;i<9;i++){const y=160+i*300;block('wall-west-'+i,{x:0,y,width:180,height:310},0,450+(i%3)*50);block('wall-east-'+i,{x:2630,y,width:170,height:310},0,430+(i%4)*45);}
for(const m of CANYON_MESAS)deck(m.id,m,m.elevation,0);
for(const s of CANYON_RAMPS)surfaces.push({...s,elevation:Math.max(s.from,s.to),ramp:{axis:s.axis,from:s.from,to:s.to},style:s.wood?'stairs':'ramp'});
for(const p of CANYON_WOOD)deck(p.id,p,p.elevation);
// The outpost roof is split around the stairwell, rather than covering the ascent.
deck('outpost-roof-west',{x:400,y:2070,width:290,height:420},240);
deck('outpost-roof-east',{x:820,y:2070,width:80,height:420},240);
deck('outpost-roof-north',{x:690,y:2070,width:130,height:50},240);
deck('outpost-roof-south',{x:690,y:2440,width:130,height:50},240);
// Natural arch: broad high crossing with a tall opening beneath its central span.
deck('rock-bridge',{x:1020,y:500,width:800,height:180},240,205);
for(const [id,x,width,bottom]of [['west-root',1020,110,0],['west-haunch',1130,100,100],['west-arch',1230,100,150],['west-crown',1330,70,185],['east-crown',1440,70,185],['east-arch',1510,100,150],['east-haunch',1610,100,100],['east-root',1710,110,0]] as const)block('arch-'+id,{x,y:500,width,height:180},bottom,205);
for(const b of CANYON_CAVE)block(b.id,b,b.bottom,b.top);
for(const b of CANYON_ROCKS){block(b.id,b,b.bottom,b.top);blocks[blocks.length-1].shape='ellipse';}
 block('cave-rock-bend-a',{x:360,y:1320,width:105,height:140},0,185);blocks[blocks.length-1].shape='ellipse';
 block('cave-rock-bend-b',{x:490,y:1570,width:65,height:100},0,150);blocks[blocks.length-1].shape='ellipse';
// Ruined frontier structure: open sides, damaged wall slices and broad lower/mid routes.
for(const [i,x,y,width,height]of [[0,400,2070,20,420],[1,400,2070,240,15],[2,400,2475,100,15],[3,605,2475,70,15],[4,880,2070,20,140],[5,490,2210,100,12]] as const)block('outpost-wall-'+i,{x,y,width,height},120,225,'building');
for(const [i,x,y]of [[0,415,2085],[1,870,2085],[2,415,2450],[3,870,2450]] as const)block('outpost-post-'+i,{x,y,width:15,height:15},0,330,'building');
for(const [i,x,y]of [[0,2020,470],[1,2270,470],[2,2020,690],[3,2270,690]] as const)block('tower-post-'+i,{x,y,width:15,height:15},240,420,'building');
block('tower-shade',{x:2000,y:450,width:310,height:280},410,425,'building');
block('wagon-body',{x:1870,y:1920,width:140,height:75},0,48,'barrier');
for(const [i,x,y,z]of [[0,470,2340,120],[1,585,2150,120],[2,2100,630,240],[3,320,1670,0]] as const)block('supply-'+i,{x,y,width:55,height:55},z,z+43,'crate');
// Small visual rubble and vegetation deliberately do not obstruct movement.
export const outlawsCanyon:MapDefinition={id:'outlaws_canyon',name:"Outlaw's Canyon",bounds:CANYON_BOUNDS,plaza:{x:1030,y:1120,width:850,height:800},ground:[{x:180,y:190,width:2450,height:2650}],blocks,surfaces,
spawns:[{x:1270,y:1300},{x:1850,y:1230},{x:950,y:950},{x:2500,y:970},{x:960,y:2650},{x:1930,y:2710},{x:940,y:2130},{x:2510,y:2200}],
districts:CANYON_LOCATIONS.map(p=>({...p,accent:'#b29269'})),minimapLabels:CANYON_LOCATIONS.map(p=>({text:p.number,x:p.x,y:p.y})),
environment:{theme:'canyon',base:'#b0916c',fog:'#c8ad8c',accent:'#bc9565',lighting:{sky:'#f5e6cc',ground:'#73503a',sun:'#ffd09a',points:[{color:'#ffb85f',x:13.2,y:3.3,z:39,intensity:19,distance:12},{color:'#ffc57b',x:14,y:3.2,z:55.5,intensity:16,distance:12},{color:'#f5ac58',x:18,y:5,z:68,intensity:8,distance:9}]}}};
