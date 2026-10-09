/** Central Plaza's architectural plan, shared by its collision and visual builders. */
export const CP_LEVELS={transit:0,street:110,mid:230,roof:350} as const;
export const CP_BOUNDS={width:3200,height:3200};
export type PlazaBuilding={id:string;number:string;name:string;use:string;x:number;y:number;width:number;height:number;accent:string;front:'north'|'south'|'east'|'west';openStairs?:boolean};
export const PLAZA_BUILDINGS:PlazaBuilding[]=[
 {id:'hq',number:'01',name:'BOUNTY HQ',use:'Lobby · offices · skybridge',x:250,y:2240,width:640,height:520,accent:'#46dfff',front:'east'},
 {id:'apartments',number:'02',name:'APARTMENTS',use:'Lobby · upper corridor · fire escape',x:250,y:1110,width:560,height:640,accent:'#d9ac7c',front:'east',openStairs:true},
 {id:'club',number:'03',name:'NIGHTCLUB',use:'Dance floor · bar · VIP',x:300,y:250,width:600,height:600,accent:'#e84bd1',front:'south'},
 {id:'store',number:'04',name:'CONVENIENCE',use:'Shop · storage · rear alley',x:1230,y:250,width:640,height:520,accent:'#66dce7',front:'south'},
 {id:'parking',number:'05',name:'PARKING',use:'Two decks · broad ramps · roof',x:2360,y:990,width:580,height:680,accent:'#ef657c',front:'west',openStairs:true},
 {id:'noodles',number:'06',name:'NOODLE SHOP',use:'Restaurant · kitchen · courtyard',x:1160,y:2510,width:620,height:500,accent:'#ff925c',front:'north'},
 {id:'electronics',number:'07',name:'ELECTRONICS',use:'Display floor · backroom · balcony',x:2340,y:1870,width:580,height:500,accent:'#63aafa',front:'west'},
 {id:'warehouse',number:'08',name:'WAREHOUSE',use:'Loading dock · storage · roof',x:2540,y:2570,width:520,height:500,accent:'#cba97a',front:'west'},
 {id:'transit',number:'09',name:'TRANSIT',use:'Station · service passage · second exit',x:1850,y:2440,width:370,height:600,accent:'#8dddef',front:'north'},
 {id:'maintenance',number:'10',name:'MAINTENANCE',use:'Utility rooms · catwalk · roof',x:2220,y:250,width:560,height:520,accent:'#71bbc6',front:'south',openStairs:true},
];
export const TRANSIT_STAIRS=[
 {id:'transit-main-stairs',x:1900,y:2490,width:150,height:360},
 {id:'transit-service-stairs',x:2990,y:2210,width:150,height:360},
];
export const TRANSIT_GROUND=[...TRANSIT_STAIRS,
 {x:1900,y:2990,width:1240,height:140},
 {x:1900,y:2850,width:150,height:280},
 {x:2990,y:2570,width:150,height:560},
];
export const PLAZA_BRIDGES=[
 {id:'club-store-roof',x:900,y:300,width:330,height:110,elevation:350},
 {id:'store-maintenance-mid',x:1870,y:250,width:350,height:100,elevation:230},
 {id:'maintenance-parking-roof',x:2550,y:770,width:110,height:220,elevation:350},
 {id:'parking-electronics-mid',x:2460,y:1670,width:120,height:200,elevation:230},
 {id:'apartments-hq-roof',x:480,y:1750,width:120,height:490,elevation:350},
 {id:'hq-noodles-roof',x:890,y:2630,width:270,height:110,elevation:350},
 {id:'electronics-warehouse-roof',x:2710,y:2370,width:110,height:200,elevation:350},
];
export type PlazaProp={id:string;kind:'planter'|'bench'|'kiosk'|'car'|'dumpster'|'vending'|'counter'|'shelf'|'crate'|'hvac'|'tank';x:number;y:number;width:number;height:number;bottom:number;top:number;accent:string};
export const PLAZA_PROPS:PlazaProp[]=[];
function prop(id:string,kind:PlazaProp['kind'],x:number,y:number,width:number,height:number,bottom:number,rise:number,accent='#6eced9'){PLAZA_PROPS.push({id,kind,x,y,width,height,bottom,top:bottom+rise,accent});}
for(const [i,x,y] of [[0,1240,1270],[1,1900,1270],[2,1240,1930],[3,1900,1930]])prop('plaza-tree-'+i,'planter',x,y,110,80,110,30);
for(const [i,x,y] of [[0,1330,1150],[1,1780,1150],[2,1320,2100],[3,1810,2100]])prop('plaza-bench-'+i,'bench',x,y,105,32,110,25);
prop('plaza-directory','kiosk',2060,1550,45,65,110,100);
prop('plaza-west-kiosk','kiosk',1110,1510,55,75,110,100,'#dc70c9');
for(const b of PLAZA_BUILDINGS.filter(b=>b.id!=='transit')){
 prop(b.id+'-roof-hvac','hvac',b.x+55,b.y+b.height-155,105,75,350,40,b.accent);
 prop(b.id+'-roof-tank','tank',b.x+50,b.y+145,75,75,350,78,b.accent);
 if(b.id==='parking'){prop('parking-car','car',b.x+55,b.y+230,90,175,110,48,b.accent);prop('parking-upper-car','car',b.x+50,b.y+230,90,175,230,48,'#9aaec1');continue;}
 prop(b.id+'-service-bin','dumpster',b.x+30,b.y+b.height+25,65,45,110,48);
 const kind=b.id==='warehouse'?'crate':b.id==='store'||b.id==='electronics'?'shelf':'counter';
 prop(b.id+'-interior-a',kind,b.x+(b.id==='warehouse'?280:45),b.y+160,70,125,110,b.id==='warehouse'?75:42,b.accent);
 prop(b.id+'-interior-b',kind,b.x+(b.id==='warehouse'?280:45),b.y+b.height-175,75,95,110,42,b.accent);
 prop(b.id+'-upper-equipment',b.id==='maintenance'?'shelf':'counter',b.x+(b.id==='warehouse'?280:45),b.y+200,70,90,230,45,b.accent);
}
prop('street-delivery-van','car',980,2600,90,175,110,62,'#4f739a');
prop('club-street-vending','vending',990,400,50,45,110,78,'#db53b5');
prop('transit-vending','vending',2110,2460,50,40,110,80);
prop('warehouse-pallet','crate',2430,2780,65,80,110,46,'#987b53');
export const PLAZA_BALCONIES=[
 {id:'hq-balcony',x:890,y:2240,width:130,height:150,attached:'west'},
 {id:'apartments-fire-escape',x:810,y:1110,width:130,height:150,attached:'west'},
 {id:'club-vip-terrace',x:410,y:850,width:300,height:110,attached:'north'},
 {id:'electronics-balcony',x:2210,y:1870,width:130,height:150,attached:'east'},
 {id:'noodles-upper-gallery',x:1220,y:2400,width:300,height:110,attached:'south'},
 {id:'maintenance-catwalk',x:2260,y:770,width:300,height:110,attached:'north'},
 {id:'parking-overlook',x:2230,y:1220,width:130,height:210,attached:'east'},
] as const;
