import * as T from 'three';
import {MysteryCrateModel} from './MysteryCrateModel';
import {CRATE_PRESENTATION} from '../shared/mystery-crates';
import {POWERS,RARITIES,isPower} from '../shared/tag-run';
import type {RoomView} from '../shared/game';
import {VIEW} from '../shared/presentation';
/** One bounded model per authoritative slot; no client timers can create a collectible. */
export function createMysteryCrateEffects(scene:T.Scene){
 let template:MysteryCrateModel|null=null,lastItems:RoomView['mode']['items']|null=null;
 const entries=new Map<string,{model:MysteryCrateModel;generation:number;receipt:string;label:T.Sprite|null;lastSample:number}>();
 const clearLabel=(e:{label:T.Sprite|null})=>{if(e.label){e.label.material.map?.dispose();e.label.material.dispose();e.label.removeFromParent();e.label=null;}};
 const remove=(id:string)=>{const e=entries.get(id);if(e){clearLabel(e);e.model.dispose();entries.delete(id);}};
 return {update(room:RoomView,now:number,localId:string){
  const items=room.mode.items.filter(i=>i.source==='mystery'),ids=new Set(items.map(i=>i.id));for(const id of entries.keys())if(!ids.has(id))remove(id);
  for(const item of items){let e=entries.get(item.id);if(!e){template??=new MysteryCrateModel();const model=template.fork();model.root.name='MYSTERY_CRATE_WORLD';model.root.scale.setScalar(CRATE_PRESENTATION.scale);scene.add(model.root);e={model,generation:-1,receipt:'',label:null,lastSample:-Infinity};entries.set(item.id,e);}
   const self=room.players.find(p=>p.id===localId),distance=self?Math.hypot(item.x-self.x,item.y-self.y):0,collecting=item.state==='empty'&&item.collectedAt!==undefined&&now-item.collectedAt<4000;if(distance>700&&!collecting&&now-e.lastSample<200)continue;e.lastSample=now;
   const m=e.model;m.root.position.set(item.x*VIEW.scale,(item.elevation??0)*VIEW.scale,item.y*VIEW.scale);
   if(e.generation!==item.generation){clearLabel(e);e.generation=item.generation??0;e.receipt='';m.receipt={collectionId:'',eligible:false,rewardId:''};m.sample(0,false);}
   const collected=item.state==='empty'&&item.collectedAt!==undefined;
   const receipt=room.mode.crates?.receipts.find(r=>r.id===item.collectionId);
   if(collected){
    m.receipt={collectionId:item.collectionId??'',eligible:true,rewardId:receipt?.reward??''};
    if(receipt?.ownerId===localId&&isPower(receipt.reward)&&e.receipt!==receipt.id){clearLabel(e);e.receipt=receipt.id;const power=POWERS[receipt.reward],c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d')!;ctx.textAlign='center';ctx.fillStyle=RARITIES[power.rarity].color;ctx.shadowColor='#07121b';ctx.shadowBlur=10;ctx.font='bold 65px Arial';ctx.fillText(power.icon,256,72);ctx.font='bold 28px Arial';ctx.fillText(power.name.toUpperCase(),256,125);ctx.font='20px Arial';ctx.fillText(power.rarity.toUpperCase(),256,162);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));label.scale.set(2.7,1.02,1);m.reward.root.add(label);e.label=label;}
    m.sample(1.35+Math.max(0,now-item.collectedAt!)/1000,true);
   }else {m.receipt.eligible=false;m.sample(Math.max(0,now-(item.spawnedAt??now))/1000,false);m.root.visible=item.state==='opened';}
   m.sparks.visible=distance<350||collecting;Object.assign(m.root.userData,{crateId:item.id,generation:item.generation,state:collected?m.state.reveal?'reveal':m.state.fade>0?'collecting':'cooldown':'idle',serverAvailable:item.state==='opened',privateReward:e.receipt?receipt?.reward:undefined});
  }
 },stats(){return{models:entries.size,visible:[...entries.values()].filter(e=>e.model.root.visible).length};},dispose(){for(const id of [...entries.keys()])remove(id);template?.dispose();template=null;}};
}
