import type {Rect,Footprint} from './types';
export const AERIE_LEVELS={lower:0,mid:120,high:240} as const;
export const AERIE_SITES=[
 {id:'arrival',number:'01',name:'ARRIVAL PLAZA',x:1000,y:2540,width:600,height:560},
 {id:'mall',number:'02',name:'SKY MALL',x:2250,y:2400,width:650,height:560},
 {id:'observation',number:'03',name:'OBSERVATION DOME',x:1100,y:150,width:600,height:600},
 {id:'control',number:'04',name:'CONTROL TOWER',x:2400,y:500,width:600,height:600},
 {id:'residential',number:'05',name:'RESIDENTIAL SPIRE',x:200,y:600,width:600,height:600},
 {id:'hangar',number:'06',name:'HANGAR BAY',x:2380,y:1400,width:620,height:680},
 {id:'garden',number:'07',name:'GARDEN TERRACE',x:200,y:1750,width:600,height:580},
] as const;
export type AerieSite=typeof AERIE_SITES[number];
export const AERIE_GROUND:Footprint[]=[...AERIE_SITES.map(s=>({x:s.x-40,y:s.y-40,width:s.width+80,height:s.height+80})),
 {x:800,y:700,width:180,height:2060},{x:700,y:750,width:1840,height:160},
 {x:2240,y:800,width:180,height:1960},{x:700,y:2500,width:1750,height:160},
 {x:1040,y:1080,width:1160,height:1160,shape:'ellipse'},
 {x:880,y:1530,width:480,height:180},{x:1920,y:1530,width:480,height:180},
 {x:1520,y:750,width:180,height:580},{x:1520,y:2060,width:180,height:550},
 {x:700,y:1840,width:260,height:180},{x:2310,y:1800,width:170,height:180},
 {x:1300,y:2290,width:280,height:220},
];
export function aerieStairs(s:Rect&{id:string}){return [
 {id:s.id+'-lower-mid',x:s.x+s.width-160,y:s.y+90,width:110,height:s.height-180,from:0,to:120},
 {id:s.id+'-mid-high',x:s.x+s.width-290,y:s.y+90,width:110,height:s.height-180,from:240,to:120},
 ];}
export const AERIE_BRIDGES=[
 {id:'residential-dome',x:800,y:650,width:300,height:120,elevation:120},
 {id:'dome-control',x:1700,y:620,width:700,height:120,elevation:240},
 {id:'control-hangar',x:2460,y:1100,width:120,height:300,elevation:120},
 {id:'hangar-mall',x:2460,y:2080,width:120,height:320,elevation:240},
 {id:'mall-arrival',x:1600,y:2720,width:650,height:120,elevation:120},
 {id:'arrival-garden-east',x:800,y:2180,width:320,height:120,elevation:240},
 {id:'arrival-garden-south',x:1000,y:2180,width:120,height:360,elevation:240},
 {id:'garden-residential',x:280,y:1200,width:120,height:550,elevation:120},
 {id:'hub-west-link',x:800,y:1840,width:480,height:120,elevation:120},
 {id:'hub-east-link',x:1960,y:1840,width:420,height:120,elevation:120},
 {id:'hub-north',x:1160,y:1240,width:920,height:120,elevation:120},
 {id:'hub-south',x:1160,y:1960,width:920,height:120,elevation:120},
 {id:'hub-west',x:1160,y:1240,width:120,height:840,elevation:120},
 {id:'hub-east',x:1960,y:1240,width:120,height:840,elevation:120},
 {id:'hub-high-north',x:1400,y:1400,width:440,height:100,elevation:240},
 {id:'hub-high-south',x:1400,y:1820,width:440,height:100,elevation:240},
 {id:'hub-high-west',x:1400,y:1400,width:100,height:520,elevation:240},
 {id:'hub-high-east',x:1740,y:1400,width:100,height:520,elevation:240},
 ];
export const AERIE_HUB_STAIRS=[
 {id:'hub-south-ascent',x:1740,y:2080,width:140,height:320,axis:'y' as const,from:120,to:0},
 {id:'hub-north-ascent',x:1740,y:920,width:140,height:320,axis:'y' as const,from:0,to:120},
 {id:'hub-upper-ascent',x:1840,y:1400,width:120,height:320,axis:'y' as const,from:240,to:120},
 ];
