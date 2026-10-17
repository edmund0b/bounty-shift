import {unit,type Vec3} from './weapon-ray.js';
export * from './gun-config.js';
export type HitRegion='head'|'body';
export function hitBoxes(p:{x:number;y:number;elevation?:number;crouched?:boolean;traversalState?:string;dashRemaining?:number}){
 const z=(p.elevation??0)-(p.traversalState==='slide'&&(p.dashRemaining??0)>0?25:p.crouched?14:0);
 return [{region:'head' as const,min:{x:p.x-8,y:p.y-8,z:z+49},max:{x:p.x+8,y:p.y+8,z:z+65}},{region:'body' as const,min:{x:p.x-19,y:p.y-19,z:z+4},max:{x:p.x+19,y:p.y+19,z:z+49}}];
}
// Orthonormal cone; sunflower pattern is stable and covers the pellet disk.
export function spreadDirection(base:Vec3,cone:number,index:number,count:number,sequence:number):Vec3{
 if(cone===0)return base;
 const ref=Math.abs(base.z)<.95?{x:0,y:0,z:1}:{x:0,y:1,z:0};
 const right=unit({x:base.y*ref.z-base.z*ref.y,y:base.z*ref.x-base.x*ref.z,z:base.x*ref.y-base.y*ref.x});
 const up={x:right.y*base.z-right.z*base.y,y:right.z*base.x-right.x*base.z,z:right.x*base.y-right.y*base.x};
 const angle=index*2.3999632297+sequence*1.61803398875,radius=cone*(count===1?1:Math.sqrt((index+.5)/count));
 return unit({x:base.x+radius*(Math.cos(angle)*right.x+Math.sin(angle)*up.x),y:base.y+radius*(Math.cos(angle)*right.y+Math.sin(angle)*up.y),z:base.z+radius*(Math.cos(angle)*right.z+Math.sin(angle)*up.z)});
}
export function plausibleCamera(origin:Vec3,chest:Vec3,aim:Vec3){
 const v={x:origin.x-chest.x,y:origin.y-chest.y,z:origin.z-chest.z},length=Math.hypot(aim.x,aim.y)||1,forward=(v.x*aim.x+v.y*aim.y)/length,side=(v.x*aim.y-v.y*aim.x)/length;
 return Object.values(origin).every(Number.isFinite)&&Math.hypot(v.x,v.y,v.z)<=270&&forward>=-245&&forward<=32&&Math.abs(side)<=85&&Math.abs(v.z)<=240;
}
