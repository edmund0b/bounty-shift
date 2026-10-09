/** Fjord-only authoritative route plan. Heights use the unchanged player controller. */
export const FJORD_LEVELS={shore:0,village:120,cliff:240} as const;
export const FJORD_TERRACES=[
 {id:'village',x:800,y:1000,width:1400,height:950,elevation:120},
 {id:'hall-foundation',x:800,y:450,width:650,height:550,elevation:120},
 {id:'west-high',x:400,y:250,width:600,height:200,elevation:240},
 {id:'east-high',x:2000,y:250,width:550,height:450,elevation:240},
 {id:'cliff-path-north',x:2370,y:700,width:180,height:680,elevation:240},
 {id:'cliff-path-south',x:2370,y:1600,width:180,height:250,elevation:240},
 {id:'west-landing',x:440,y:1320,width:360,height:180,elevation:120},
 {id:'east-landing',x:2150,y:2170,width:400,height:180,elevation:120},
];
export const FJORD_WALKS=[
 {id:'cliff-path-crossing',x:2370,y:1380,width:180,height:220,elevation:240},
 {id:'north-bridge',x:1000,y:270,width:1000,height:180,elevation:240},
 {id:'hall-west-balcony',x:620,y:450,width:180,height:550,elevation:240},
 {id:'west-high-walk',x:440,y:450,width:180,height:550,elevation:240},
 {id:'hall-loft',x:800,y:450,width:650,height:170,elevation:240},
 {id:'hall-back-landing',x:1025,y:350,width:210,height:100,elevation:120},
 {id:'ice-bridge',x:1200,y:2400,width:750,height:180,elevation:120},
];
export const FJORD_STAIRS=[
 {id:'hall-back-stair',x:1235,y:350,width:320,height:100,axis:'x' as const,from:120,to:0},
 {id:'hall-inner-stair',x:1290,y:620,width:140,height:320,axis:'y' as const,from:240,to:120},
 {id:'west-high-stair',x:440,y:1000,width:180,height:320,axis:'y' as const,from:240,to:120},
 {id:'west-shore-stair',x:650,y:1500,width:150,height:320,axis:'y' as const,from:120,to:0},
 {id:'east-village-stair',x:2180,y:700,width:170,height:320,axis:'y' as const,from:240,to:120},
 {id:'east-village-landing',x:2180,y:1020,width:170,height:180,axis:'x' as const,from:120,to:120},
 {id:'village-east-descent',x:2200,y:1400,width:320,height:180,axis:'x' as const,from:120,to:0},
 {id:'village-dock-west',x:1000,y:1950,width:180,height:320,axis:'y' as const,from:120,to:0},
 {id:'village-dock-east',x:1900,y:1950,width:180,height:320,axis:'y' as const,from:120,to:0},
 {id:'cliff-south-stair',x:2370,y:1850,width:180,height:320,axis:'y' as const,from:240,to:120},
 {id:'cliff-shore-stair',x:2370,y:2350,width:180,height:320,axis:'y' as const,from:120,to:0},
 {id:'ice-west-access',x:880,y:2400,width:320,height:180,axis:'x' as const,from:0,to:120},
 {id:'ice-east-access',x:1950,y:2400,width:320,height:180,axis:'x' as const,from:120,to:0},
];
export const FJORD_HUTS=[
 {id:'smithy',x:1580,y:1010,width:340,height:280,bottom:120,top:295},
 {id:'market-store',x:840,y:1590,width:270,height:260,bottom:120,top:270},
 {id:'stable',x:1760,y:1610,width:390,height:260,bottom:120,top:285},
 {id:'net-house',x:650,y:2720,width:290,height:260,bottom:0,top:155},
 {id:'cliff-cabin',x:2090,y:280,width:230,height:220,bottom:240,top:385},
];
export const FJORD_LOCATIONS=[
 {id:'square',name:'VILLAGE SQUARE',x:1450,y:1530},
 {id:'longhouse',name:'LONGHOUSE',x:1125,y:730},
 {id:'tower',name:'WATCH TOWER',x:1540,y:360},
 {id:'docks',name:'DOCKYARD',x:1500,y:2850},
 {id:'ice',name:'ICE BRIDGE',x:1575,y:2490},
 {id:'cave',name:'CAVERN PASS',x:430,y:1950},
 {id:'cliff',name:'CLIFF PATH',x:2460,y:1500},
];
