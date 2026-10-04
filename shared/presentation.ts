// Rendering/control conversion only. Gameplay stays on the authoritative flat map.
export const VIEW = { scale:0.03, cameraDistance:5.8, shoulder:0.65, fov:62, turnSpeed:1.8 };
export function cameraMovement(horizontal:number,forward:number,yaw:number){
 const x=horizontal*Math.cos(yaw)+forward*Math.sin(yaw),y=horizontal*Math.sin(yaw)-forward*Math.cos(yaw);
 const length=Math.max(1,Math.hypot(x,y));return {dx:x/length,dy:y/length};
}
export function cameraAim(yaw:number){return {x:Math.sin(yaw),y:-Math.cos(yaw)};}

// Local presentation tuning. Authoritative gameplay speeds stay in shared/game.ts.
export const CONTROLLER = {
 mouseSensitivity:0.0028, touchSensitivityX:0.006, touchSensitivityY:0.0045,
 minPitch:-55*Math.PI/180, maxPitch:70*Math.PI/180, defaultPitch:-0.18,
 lookSmoothing:30, avatarTurnSpeed:14, cameraSmoothing:18,
 lookHeight:1.3, cameraLift:0.85, floorClearance:0.35,
 obstructionPadding:0.32, joystickRadius:42, joystickDeadzone:0.12,
};
export type CameraControl={targetYaw:number;targetPitch:number;pitch:number};
export function clampPitch(pitch:number){return Math.max(CONTROLLER.minPitch,Math.min(CONTROLLER.maxPitch,pitch));}
export function turnLook(control:CameraControl,x:number,y:number,touch=false){
 control.targetYaw+=x*(touch?CONTROLLER.touchSensitivityX:CONTROLLER.mouseSensitivity);
 control.targetPitch=clampPitch(control.targetPitch-y*(touch?CONTROLLER.touchSensitivityY:CONTROLLER.mouseSensitivity));
}
export function smoothAngle(current:number,target:number,speed:number,dt:number){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+delta*(1-Math.exp(-speed*dt));
}
export function joystickInput(x:number,y:number){
 const length=Math.hypot(x,y),radius=CONTROLLER.joystickRadius;
 if(length<=radius*CONTROLLER.joystickDeadzone)return {x:0,y:0};
 const magnitude=Math.min(1,(length/radius-CONTROLLER.joystickDeadzone)/(1-CONTROLLER.joystickDeadzone));
 return {x:x/length*magnitude,y:-y/length*magnitude};
}
