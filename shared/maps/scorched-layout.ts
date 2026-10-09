import type {Rect,Footprint} from './types';
export const SP_LEVELS={ground:0,mid:120,high:240} as const;
export const SP_BOUNDS={width:3200,height:3000};
export type ScorchedSite=Rect&{id:string;number:string;name:string;damage:'light'|'medium'|'heavy';levels:number;accent:string};
export const SCORCHED_SITES:ScorchedSite[]=[
 {id:'mining',number:'01',name:'MINING OFFICE',x:250,y:2150,width:560,height:500,damage:'light',levels:3,accent:'#c4ad8d'},
 {id:'residential',number:'02',name:'RESIDENTIAL RUINS',x:220,y:680,width:540,height:560,damage:'heavy',levels:3,accent:'#b39176'},
 {id:'research',number:'03',name:'VOLCANIC RESEARCH',x:1150,y:180,width:600,height:500,damage:'light',levels:3,accent:'#a5c9d0'},
 {id:'workshop',number:'04',name:'ABANDONED WORKSHOP',x:2180,y:2280,width:600,height:500,damage:'medium',levels:3,accent:'#d5b275'},
 {id:'store',number:'05',name:'BURNED MARKET',x:200,y:1510,width:440,height:400,damage:'medium',levels:2,accent:'#bcb18d'},
 {id:'power',number:'06',name:'GEOTHERMAL POWER',x:2310,y:540,width:620,height:620,damage:'medium',levels:3,accent:'#c39472'},
 {id:'warehouse',number:'07',name:'COLLAPSED WAREHOUSE',x:2340,y:1510,width:620,height:540,damage:'heavy',levels:3,accent:'#a9a29a'},
];
export const SCORCHED_GROUND:Footprint[]=[
 {x:20,y:1120,width:170,height:440},{x:1500,y:2250,width:180,height:420},
 {x:2440,y:2020,width:240,height:250},
 {x:180,y:2070,width:700,height:660},{x:140,y:580,width:700,height:760},
 {x:1060,y:120,width:780,height:620},{x:2020,y:2210,width:880,height:640},
 {x:120,y:1440,width:720,height:510},{x:2220,y:420,width:820,height:850},
 {x:2280,y:1430,width:760,height:630},
 {x:740,y:400,width:150,height:2200},{x:700,y:380,width:1770,height:150},
 {x:2900,y:780,width:150,height:1890},{x:740,y:2620,width:2200,height:150},
 {x:790,y:1990,width:1600,height:170},{x:1330,y:660,width:560,height:160},
 {x:2270,y:1180,width:420,height:350},{x:650,y:1370,width:230,height:300},
];
export const SCORCHED_BRIDGES=[
 {id:'store-stair-landing',x:30,y:1510,width:170,height:120,elevation:120},
 {id:'residential-research-span',x:600,y:550,width:550,height:130,elevation:240},
 {id:'residential-fire-landing',x:600,y:550,width:130,height:130,elevation:240},
 {id:'research-power-catwalk',x:1750,y:580,width:560,height:130,elevation:120},
 {id:'power-warehouse-span',x:2670,y:1160,width:130,height:350,elevation:240},
 {id:'warehouse-workshop-catwalk',x:2570,y:2050,width:130,height:230,elevation:120},
 {id:'mining-core-span',x:810,y:2220,width:490,height:130,elevation:240},
 {id:'mining-core-north',x:1170,y:1700,width:130,height:650,elevation:240},
 {id:'mining-core-junction',x:1170,y:1700,width:230,height:100,elevation:240},
 {id:'store-core-crossing',x:640,y:1650,width:730,height:130,elevation:120},
 {id:'research-core-landing',x:1400,y:680,width:130,height:140,elevation:120},
];
export const CORE_HIGH=[{id:'core-upper-north',x:1300,y:1200,width:600,height:100,elevation:240},{id:'core-upper-south',x:1300,y:1700,width:600,height:100,elevation:240},{id:'core-upper-west',x:1300,y:1200,width:100,height:600,elevation:240},{id:'core-upper-east',x:1800,y:1200,width:100,height:600,elevation:240}];
export function scorchedStairs(b:ScorchedSite){if(b.id==='store')return[{id:'store-roof-stairs',x:30,y:1190,width:120,height:320,from:0,to:120}];const w=100,end=b.x+b.width-20,run=b.height-180;return[{id:b.id+'-ground-mid',x:end-w,y:b.y+90,width:w,height:run,from:0,to:120},{id:b.id+'-mid-roof',x:end-w*2-15,y:b.y+90,width:w,height:run,from:240,to:120}];}
export type ScorchedProp=Rect&{id:string;kind:'tank'|'console'|'crate'|'shelf'|'desk'|'car'|'machine'|'sofa'|'rubble';bottom:number;top:number};
export const SCORCHED_PROPS:ScorchedProp[]=[];
function prop(id:string,kind:ScorchedProp['kind'],x:number,y:number,width:number,height:number,bottom:number,rise:number){SCORCHED_PROPS.push({id,kind,x,y,width,height,bottom,top:bottom+rise});}
for(const b of SCORCHED_SITES){const kind=b.id==='mining'?'desk':b.id==='store'?'shelf':b.id==='research'||b.id==='power'?'console':b.id==='residential'?'sofa':b.id==='workshop'?'machine':'crate';prop(b.id+'-equipment-a',kind,b.x+35,b.y+140,70,90,0,45);prop(b.id+'-equipment-b',kind,b.x+40,b.y+b.height-145,70,70,0,45);if(b.levels===3)prop(b.id+'-upper-console',b.id==='residential'?'sofa':'console',b.x+35,b.y+150,70,70,120,40);prop(b.id+'-roof-equipment','machine',b.x+(b.id==='research'?250:40),b.y+b.height-130,90,65,(b.levels-1)*120,45);}
prop('power-tank-a','tank',2380,780,105,110,240,210);prop('power-tank-b','tank',2530,770,110,110,240,170);
prop('mining-truck','car',300,2075,85,130,0,50);prop('burned-car','car',150,1280,75,110,0,38);
prop('warehouse-cargo','crate',2590,1690,90,120,0,60);prop('workshop-hoist','machine',2420,2470,100,100,0,60);
prop('core-pump-west','machine',1430,1410,55,85,120,60);prop('core-pump-east','machine',1740,1510,55,85,120,60);
