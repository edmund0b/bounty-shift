import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
import {CanyonRocks} from './outlaws-rocks';
export function canyonProps(k:PlazaKit,rocks:CanyonRocks){const wood=k.material('#72533a','wood'),light=k.material('#a58b62','wood'),iron=k.material('#443e34','metal'),cloth=k.material('#944b3c'),green=k.material('#747553'),lantern=k.material('#ffd398','glow');
 const cactus=(x:number,y:number,z:number,n:number)=>{k.cylinderAt(x,y,7,z,55+n*8,green);for(const s of [-1,1]){k.beam([x,z+25,y],[x+s*19,z+25,y],8,green);k.cylinderAt(x+s*19,y,4,z+25,22+(s+1)*8,green);}};
 for(const [i,x,y,z]of [[0,1120,1400,0],[1,1790,1640,0],[2,1850,2130,0],[3,2300,2730,0],[4,370,850,0],[5,1220,2680,0],[6,2550,800,0],[7,680,520,240],[8,2350,2510,240],[9,1740,2290,120],[10,2310,1150,120]] as const)cactus(x,y,z,i%3);
 for(let i=0;i<50;i++){const x=260+(i*347%2300),y=260+(i*571%2500);if((x<850&&y>900&&y<2020)||(x>900&&x<2000&&y>1100&&y<2200))continue;for(let j=0;j<3;j++)k.beam([x,0,y],[x+(j-1)*13,15+j*3,y+(j%2?8:-8)],1.5,light);}
 const barrel=(x:number,y:number,z:number)=>{k.cylinderAt(x,y,20,z,43,wood);for(const h of [5,33])k.cylinderAt(x,y,21,z+h,5,iron);};
 for(const [x,y,z]of [[530,2430,120],[840,2140,120],[2130,655,240],[350,1650,0],[2000,1990,0]])barrel(x,y,z);
 // Abandoned supply wagon with readable wheels and a broken drawbar.
 k.box(1870,1920,140,75,12,36,wood);for(const xx of [1890,1980])for(const yy of [1917,1998]){k.add(k.cylinder,iron,[xx,19,yy],[42,10,42],[Math.PI/2,0,0]);k.add(k.cylinder,light,[xx,19,yy-1],[30,11,30],[Math.PI/2,0,0]);}k.beam([2010,20,1955],[2070,4,1940],5,wood);
 // Outpost canopy, broken battens and territorial banners, clear of playable headroom.
 for(const x of [440,640]){k.beam([x,120,2130],[x,350,2130],9,wood);k.beam([x,120,2300],[x,325,2300],9,wood);}
 k.box(440,2130,210,180,345,4,cloth);for(let i=0;i<9;i++)k.box(405+i*25,2074,18,10,125,85-(i%3)*17,wood);
 for(const [x,y]of [[420,2080],[880,2480]]){k.beam([x,240,y],[x,345,y],7,wood);k.box(x,y,65,3,305,32,cloth);}
 k.sign('RUINED OUTPOST',550,2070,275,210,'#d5b581',Math.PI);k.sign('WANTED / BOUNTY TERRITORY',408,2310,190,90,'#d5b581',-Math.PI/2);
 // High lookout: four braced timber legs with an open viewing platform on the upper shelf.
 for(const y of [480,690]){k.beam([2028,245,y],[2278,410,y],9,wood);k.beam([2278,245,y],[2028,410,y],9,wood);}
 for(const x of [2028,2278])k.beam([x,245,480],[x,410,690],8,wood);
 for(let i=0;i<15;i++)k.box(2000+i*21,450,19,280,425,5,light);
 for(const y of [475,695]){k.box(2035,y,230,6,275,5,wood);k.box(2035,y,230,6,300,4,wood);}
 k.sign('WATCH TOWER',2145,445,330,155,'#d5b581',Math.PI);
 // Cave braces and lanterns sit along the sides, leaving a broad central route.
 for(const y of [1030,1270,1530]){for(const x of [310,560])k.beam([x,0,y],[x,170,y],10,wood);k.beam([310,170,y],[560,170,y],10,wood);k.box(317,y,14,14,95,23,iron);k.box(319,y-1,10,16,99,15,lantern);}
 for(let i=0;i<5;i++)rocks.add(245,985+i*150,55,65,0,80+i%2*35,i);
 k.sign('LAST CHANCE / CAVE',445,937,240,185,'#d5b581',Math.PI);
 // Small camp beside the lower route, not another town block.
 for(const x of [1050,1220])k.beam([x,0,2710],[x,100,2710],6,wood);
 k.add(k.plane,cloth,[1135,95,2750],[170,110,1],[-Math.PI/2-.15,0,0]);k.beam([1050,100,2710],[1220,100,2710],5,wood);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;rocks.add(1120+Math.cos(a)*28,2640+Math.sin(a)*28,13,13,0,10,i);}
 k.box(1117,2637,18,18,0,3,iron);
 // Sparse distant bird silhouettes use the same batched beams; no AI or gameplay entity.
 for(let i=0;i<4;i++){const x=1100+i*280,y=500+i*80,z=650+i%2*30;k.beam([x-18,z,y],[x,z-5,y],2,iron);k.beam([x,z-5,y],[x+18,z,y],2,iron);}
}
