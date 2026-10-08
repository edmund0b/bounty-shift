export const CONTROL_TIMING={doublePressMs:240,slideHoldMs:220};
export const BINDINGS={jump:' ',crouch:'x',dodge:'z',interact:'e',attack:'f',map:'m',hints:'h',cameraLeft:'q',cameraRight:'r',slot1:'1',slot2:'2',slot3:'3'};
export type ControlAction='jump'|'dash'|'dodge'|'slide'|'crouch'|'interact'|'attack'|'map'|'hints'|'slot1'|'slot2'|'slot3';
// Edge-triggered actions stay separate from held movement. Cancel never turns a hold into a tap.
export class ControlInput {
 held=new Set<string>(); private spaceAt=-Infinity; private crouchAt:number|null=null; private slid=false;
 constructor(private action:(action:ControlAction)=>void){}
 down(key:string,now:number,repeat=false){
  if(repeat||this.held.has(key))return;this.held.add(key);
  if(key===BINDINGS.jump){if(now-this.spaceAt<=CONTROL_TIMING.doublePressMs){this.action('dash');this.spaceAt=-Infinity;}else{this.spaceAt=now;this.action('jump');}}
  else if(key===BINDINGS.crouch){this.crouchAt=now;this.slid=false;}
  else {const action=({[BINDINGS.dodge]:'dodge',[BINDINGS.interact]:'interact',[BINDINGS.attack]:'attack',[BINDINGS.map]:'map',[BINDINGS.hints]:'hints',[BINDINGS.slot1]:'slot1',[BINDINGS.slot2]:'slot2',[BINDINGS.slot3]:'slot3'} as Record<string,ControlAction>)[key];if(action)this.action(action);}
 }
 update(now:number){if(this.crouchAt!==null&&!this.slid&&now-this.crouchAt>=CONTROL_TIMING.slideHoldMs){this.slid=true;this.action('slide');}}
 up(key:string,now:number){this.update(now);this.held.delete(key);if(key===BINDINGS.crouch&&this.crouchAt!==null){if(!this.slid)this.action('crouch');this.crouchAt=null;}}
 cancel(){this.held.clear();this.spaceAt=-Infinity;this.crouchAt=null;this.slid=false;}
}

