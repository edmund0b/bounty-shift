import {ARENA,isWalkable,type Motion} from '../shared/game';
import type {MapDefinition} from '../shared/map';
import {displayElevation} from '../shared/traversal';
/** Render-only interpolation. Authoritative state and predicted collision remain untouched. */
export class AvatarMotion {
 x=0;y=0;elevation=0;speed=0;private version=-1;
 update(p:Motion,dt:number,map:MapDefinition,version:number,local=false){
  const reset=this.version!==version||Math.hypot(this.x-p.x,this.y-p.y)>180;
  this.version=version;
  if(reset){this.x=p.x;this.y=p.y;this.elevation=p.elevation;this.speed=0;return;}
  if(!(dt>0))return;
  const oldX=this.x,oldY=this.y,f=1-Math.exp(-Math.min(dt,.1)*(local?30:18)),x=this.x+(p.x-this.x)*f,y=this.y+(p.y-this.y)*f,z=this.elevation+(p.elevation-this.elevation)*f;
  const elevation=p.airborne?z:displayElevation({x,y},z,map);
  if(elevation!==null&&(p.airborne||isWalkable({x,y,elevation},map))){this.x=x;this.y=y;this.elevation=elevation;}
  else {this.x=p.x;this.y=p.y;this.elevation=p.elevation;this.speed=0;return;}
  // Local prediction advances at 30 Hz. Deriving gait directly from its steps caused
  // alternating idle/run on 60+ Hz displays; smooth the actual translated velocity.
  const velocity=Math.min(ARENA.speed*4,Math.hypot(this.x-oldX,this.y-oldY)/dt);
  this.speed+=(velocity-this.speed)*(1-Math.exp(-dt*24));
  if(Math.hypot(this.x-p.x,this.y-p.y)<.1&&velocity<3){this.x=p.x;this.y=p.y;this.elevation=p.elevation;this.speed=0;}
 }
}
