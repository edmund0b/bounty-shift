import type {Rect} from './types';
export const CANYON_LEVELS={floor:0,ledge:120,high:240} as const;
export const CANYON_BOUNDS={width:2800,height:3000};
export const CANYON_MESAS=[
 {id:'west-high',x:420,y:360,width:600,height:420,elevation:240},
 {id:'east-high',x:1820,y:360,width:620,height:420,elevation:240},
 {id:'west-ledge',x:650,y:1100,width:270,height:650,elevation:120},
 {id:'east-ledge',x:1950,y:1100,width:420,height:650,elevation:120},
 {id:'north-shelf',x:1050,y:600,width:800,height:260,elevation:120},
 {id:'south-shelf',x:1050,y:2220,width:800,height:300,elevation:120},
 {id:'southeast-high',x:2050,y:2350,width:480,height:330,elevation:240},
];
export const CANYON_RAMPS=[
 {id:'pit-north',x:1340,y:860,width:170,height:320,axis:'y' as const,from:120,to:0,wood:false},
 {id:'pit-south',x:1340,y:1900,width:170,height:320,axis:'y' as const,from:0,to:120,wood:false},
 {id:'pit-west',x:920,y:1430,width:320,height:160,axis:'x' as const,from:120,to:0,wood:false},
 {id:'pit-east',x:1630,y:1430,width:320,height:160,axis:'x' as const,from:0,to:120,wood:false},
 {id:'west-high-ascent',x:700,y:780,width:160,height:320,axis:'y' as const,from:240,to:120,wood:false},
 {id:'east-high-ascent',x:2090,y:780,width:160,height:320,axis:'y' as const,from:240,to:120,wood:false},
 {id:'west-lower-ascent',x:920,y:1600,width:320,height:140,axis:'x' as const,from:120,to:0,wood:true},
 {id:'east-lower-ascent',x:2180,y:1750,width:160,height:320,axis:'y' as const,from:120,to:0,wood:false},
 {id:'outpost-entry',x:420,y:2490,width:160,height:320,axis:'y' as const,from:120,to:0,wood:true},
 {id:'outpost-roof',x:690,y:2120,width:130,height:320,axis:'y' as const,from:240,to:120,wood:true},
 {id:'southeast-ascent',x:2350,y:2030,width:140,height:320,axis:'y' as const,from:120,to:240,wood:false},
];
export const CANYON_WOOD=[
 {id:'west-balcony',x:500,y:1100,width:150,height:650,elevation:120},
 {id:'west-outpost-walk',x:820,y:1750,width:100,height:320,elevation:120},
 {id:'outpost-main',x:400,y:2070,width:500,height:420,elevation:120},
 {id:'east-catwalk-junction',x:2200,y:1610,width:290,height:140,elevation:120},
 {id:'east-catwalk',x:2350,y:1750,width:140,height:280,elevation:120},
 {id:'southern-high-crossing',x:900,y:2400,width:1150,height:130,elevation:240},
];
export const CANYON_CAVE=[
 {id:'cave-west-wall',x:230,y:930,width:70,height:1040,bottom:0,top:310},
 {id:'cave-east-wall',x:570,y:960,width:70,height:760,bottom:0,top:310},
 {id:'cave-south-wall-a',x:230,y:1950,width:120,height:70,bottom:0,top:305},
 {id:'cave-south-wall-b',x:510,y:1950,width:110,height:70,bottom:0,top:305},
 {id:'cave-south-lintel',x:230,y:1950,width:580,height:70,bottom:185,top:305},
 {id:'cave-main-roof',x:230,y:960,width:410,height:760,bottom:185,top:310},
 {id:'cave-chamber-roof',x:230,y:1720,width:580,height:230,bottom:185,top:310},
];
export const CANYON_ROCKS=[
 {id:'pit-spire',x:1400,y:1610,width:140,height:170,bottom:0,top:205},
 {id:'pit-cover-west',x:1100,y:1220,width:95,height:130,bottom:0,top:65},
 {id:'pit-cover-east',x:1700,y:1770,width:110,height:100,bottom:0,top:75},
 {id:'floor-spire-east',x:2490,y:1260,width:110,height:190,bottom:0,top:330},
 {id:'floor-boulder-south',x:1700,y:2680,width:150,height:130,bottom:0,top:95},
 {id:'floor-boulder-west',x:1020,y:1910,width:110,height:160,bottom:0,top:80},
 {id:'north-spire',x:1490,y:250,width:120,height:180,bottom:0,top:460},
 {id:'bridge-cover-west',x:1170,y:500,width:80,height:50,bottom:240,top:310},
 {id:'bridge-cover-east',x:1620,y:630,width:90,height:50,bottom:240,top:292},
 {id:'upper-south-cover',x:1460,y:2400,width:100,height:42,bottom:240,top:294},
 {id:'high-west-cover',x:460,y:540,width:95,height:140,bottom:240,top:350},
 {id:'high-east-cover',x:2310,y:650,width:95,height:100,bottom:240,top:350},
 {id:'south-shelf-cover',x:1660,y:2250,width:115,height:85,bottom:120,top:205},
];
export const CANYON_LOCATIONS=[
 {id:'pit',number:'01',name:'CENTRAL PIT',x:1450,y:1500},
 {id:'bridge',number:'02',name:'ROCK BRIDGE',x:1410,y:590},
 {id:'outpost',number:'03',name:'RUINED OUTPOST',x:630,y:2290},
 {id:'cave',number:'04',name:'CAVE TUNNEL',x:435,y:1510},
 {id:'floor',number:'05',name:'CANYON FLOOR',x:1950,y:2010},
 {id:'tower',number:'06',name:'WATCH TOWER',x:2130,y:550},
];
export const OUTPOST:Rect={x:400,y:2070,width:500,height:420};
