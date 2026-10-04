// One flat city block: a central plaza, two parallel inner alleys,
// cross streets, and an outside loop. All solid geometry is shared.
export const WORLD = { width: 2000, height: 1440 };
export type Building = { x: number; y: number; width: number; height: number; name: string; accent: string };
export const BUILDINGS: Building[] = [
 {x:160,y:180,width:440,height:280,name:'WEST DEPOT',accent:'#527ea0'},
 {x:160,y:600,width:440,height:260,name:'WORKSHOP',accent:'#527ea0'},
 {x:160,y:1000,width:440,height:260,name:'WEST STORAGE',accent:'#527ea0'},
 {x:760,y:180,width:480,height:280,name:'SIGNAL STATION',accent:'#5b9ca6'},
 {x:760,y:1000,width:480,height:260,name:'SOUTH TERMINAL',accent:'#5b9ca6'},
 {x:1400,y:180,width:440,height:280,name:'EAST DEPOT',accent:'#927aaa'},
 {x:1400,y:600,width:440,height:260,name:'ROOFTOP BLOCK',accent:'#927aaa'},
 {x:1400,y:1000,width:440,height:260,name:'EAST STORAGE',accent:'#927aaa'},
 {x:640,y:680,width:80,height:180,name:'',accent:'#527ea0'},
 {x:1280,y:640,width:80,height:160,name:'',accent:'#927aaa'},
];
export const PLAZA = { x: 760, y: 500, width: 480, height: 440 };
export const SPAWNS = [
 {x:850,y:580},{x:1150,y:580},{x:850,y:820},
 {x:1150,y:820},{x:1000,y:600},{x:1000,y:840},
];
export const CAMERA = { width: 960, height: 600 };
export function cameraFor(p:{x:number;y:number},width=CAMERA.width,height=CAMERA.height) {
 return {x:Math.max(0,Math.min(WORLD.width-width,p.x-width/2)),y:Math.max(0,Math.min(WORLD.height-height,p.y-height/2))};
}
