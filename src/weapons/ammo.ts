/** Workshop-only, persistent per-weapon ammunition. Scrubbing never mutates this state. */
export const ammoConfig:Record<string,{magazine:number;reserve:number;reloadAt:number[]}>={
 pistol:{magazine:12,reserve:48,reloadAt:[.55]},
 'assault-rifle':{magazine:30,reserve:30,reloadAt:[.6]},
 shotgun:{magazine:6,reserve:18,reloadAt:Array.from({length:6},(_,i)=>.14+(i+.7)*.11)},
 'sniper-rifle':{magazine:5,reserve:15,reloadAt:[.6]},
};
export class AmmoBank{
 states=new Map<string,{magazine:number;reserve:number}>();
 get(id:string){const config=ammoConfig[id];if(!config)return undefined;let state=this.states.get(id);if(!state){state={magazine:config.magazine,reserve:config.reserve};this.states.set(id,state);}return state;}
 fire(id:string){const state=this.get(id);if(!state||state.magazine<=0)return false;state.magazine--;return true;}
 reload(id:string){const state=this.get(id),config=ammoConfig[id];if(!state||!config)return 0;const amount=Math.min(config.magazine-state.magazine,state.reserve,id==='shotgun'?1:Infinity);state.magazine+=amount;state.reserve-=amount;return amount;}
 reset(){this.states.clear();}
}
export const workshopAmmo=new AmmoBank();
