// Rendering/control conversion only. Gameplay stays on the authoritative flat map.
export const VIEW = { scale:0.03, cameraDistance:5.8, cameraHeight:3.2, shoulder:0.65, fov:62, turnSpeed:1.8 };
export function cameraMovement(horizontal:number,forward:number,yaw:number){
 const x=horizontal*Math.cos(yaw)+forward*Math.sin(yaw),y=horizontal*Math.sin(yaw)-forward*Math.cos(yaw);
 const length=Math.max(1,Math.hypot(x,y));return {dx:x/length,dy:y/length};
}
export function cameraAim(yaw:number){return {x:Math.sin(yaw),y:-Math.cos(yaw)};}
