// Live firearm rules. Presentation and server rays share these values.
export type GunId='pistol'|'assault-rifle'|'shotgun'|'sniper-rifle';
export const ADS={seconds:.18,blendSpeed:14};
export const GUNS:Record<GunId,{body:number;head:number;range:number;pellets:number;hip:number;ads:number;recoil:number;recovery:number;cameraKick:number;duration:number;event:number;fov:number;distance:number;shoulder:number}>={
 pistol:{body:10,head:20,range:1000,pellets:1,hip:.017,ads:.0018,recoil:.003,recovery:4,cameraKick:.014,duration:.35,event:.015,fov:48,distance:3.1,shoulder:1.25},
 'assault-rifle':{body:30,head:45,range:1400,pellets:1,hip:.026,ads:.003,recoil:.005,recovery:3,cameraKick:.010,duration:.12,event:.012,fov:44,distance:3,shoulder:1.25},
 shotgun:{body:5,head:8.5,range:550,pellets:10,hip:.055,ads:.038,recoil:.008,recovery:3.5,cameraKick:.042,duration:1.1,event:.025,fov:50,distance:3.2,shoulder:1.25},
 'sniper-rifle':{body:80,head:100,range:2200,pellets:1,hip:.036,ads:0,recoil:.009,recovery:2.7,cameraKick:.065,duration:1.3,event:.02,fov:16,distance:.65,shoulder:0},
};
export const gunId=(id:unknown):id is GunId=>typeof id==='string'&&Object.hasOwn(GUNS,id);
export const decayedHeat=(heat:number,at:number,now:number,id:GunId)=>Math.max(0,heat-Math.max(0,now-at)/1000*GUNS[id].recovery);
export const shotgunFalloff=(distance:number)=>distance<=100?1:distance<=240?1-(distance-100)/140*.4:Math.max(0,.6*(550-distance)/310);
