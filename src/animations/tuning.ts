/** Presentation tuning only; no main-game controller or balance is changed. */
export const movementConfig={
 jump:{height:.85,gravity:14,descentGravity:20,anticipation:.10,landing:.30,airControl:.65},
 slide:{entry:.20,duration:.72,recovery:.32,initialSpeed:4.8,endSpeed:1.3,cooldown:1.1,firearmsCanFire:true},
};
export const jumpVelocity=()=>Math.sqrt(2*movementConfig.jump.gravity*movementConfig.jump.height);
export const jumpRiseTime=()=>jumpVelocity()/movementConfig.jump.gravity;
export const jumpFallTime=()=>Math.sqrt(2*movementConfig.jump.height/movementConfig.jump.descentGravity);
export const jumpDuration=()=>movementConfig.jump.anticipation+jumpRiseTime()+jumpFallTime()+movementConfig.jump.landing;
export function jumpHeight(time:number){const j=movementConfig.jump,t=time-j.anticipation,rise=jumpRiseTime();return t<0?0:t<=rise?Math.max(0,jumpVelocity()*t-j.gravity*t*t/2):Math.max(0,j.height-j.descentGravity*(t-rise)**2/2);}
export const slideDistance=(t:number)=>{const s=movementConfig.slide,u=Math.max(0,Math.min(s.duration,t));return s.initialSpeed*u+(s.endSpeed-s.initialSpeed)*u*u/(2*s.duration);};

export const slideDuration=()=>movementConfig.slide.entry+movementConfig.slide.duration+movementConfig.slide.recovery;
export function slideTravel(t:number){const s=movementConfig.slide;if(t<s.entry)return s.initialSpeed*Math.max(0,t);const active=Math.min(s.duration,t-s.entry),u=Math.max(0,Math.min(1,(t-s.entry-s.duration)/s.recovery));return s.initialSpeed*s.entry+slideDistance(active)+s.endSpeed*s.recovery*(u-u*u/2);}
