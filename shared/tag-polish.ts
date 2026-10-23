/** Tag-only playtest tuning. Other modes retain their existing pair/crate values. */
export const TAG_POLISH={
 crates:{initialActive:3,maxActive:5,respawnMs:10000,spawnIntervalMs:250},
 sticky:{lifetimeMs:45000},
 smoke:{durationMs:14000,radius:95*1.25,height:70,expandMs:350,fadeMs:700,puffs:16},
 portal:{radius:30,reentryMs:1000,exitPadding:4},
} as const;
const smooth=(x:number)=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
/** The same boundary drives smoke presentation and the existing line-of-sight concealment. */
export function smokeEnvelope(createdAt:number,endsAt:number,now:number){if(now<createdAt||now>=endsAt)return 0;return smooth((now-createdAt)/TAG_POLISH.smoke.expandMs)*smooth((endsAt-now)/TAG_POLISH.smoke.fadeMs);}
export const smokeRadiusAt=(createdAt:number,endsAt:number,now:number)=>TAG_POLISH.smoke.radius*smokeEnvelope(createdAt,endsAt,now);
