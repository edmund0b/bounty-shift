import * as T from 'three';
import type {RoomView} from '../shared/game';
import {freshMotion} from '../shared/game';
import {freshCombat} from '../shared/combat';
import {TAG} from '../shared/tag-run';
import {teamKey} from '../shared/modes';
import {createRig,disposeTree} from './characters/rig';
import {characterById} from './characters/registry';
import {GameplayAnimator} from './animations/gameplay';
import {createEquipment} from './weapons/models';
type Track=<R extends {dispose:()=>void}>(r:R)=>R;
export function createTagVisuals(scene:T.Scene,track:Track){
 const fields=new Map<string,{group:T.Group;rig?:ReturnType<typeof createRig>;anim?:GameplayAnimator}>(),seen=new Set<string>(),templates=new Map<string,T.Object3D>();
 const ring=track(new T.TorusGeometry(1,.025,6,32)),sphere=track(new T.SphereGeometry(1,12,8)),line=track(new T.CylinderGeometry(.025,.025,1,6));
 const materials=new Map<string,T.MeshBasicMaterial>();const mat=(color:string,opacity=.6)=>{const key=color+opacity;let m=materials.get(key);if(!m){m=track(new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));materials.set(key,m);}return m;};
 const pool=Array.from({length:220},()=>{const m=new T.Mesh(sphere,mat('#b9f6ff'));m.visible=false;scene.add(m);return m;});
 let audio:AudioContext|null=null,lastBeat=0,lastWarning=0,lastStep=0,beat=0;const unlock=()=>{try{audio??=new AudioContext();void audio.resume();}catch{}};window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
 const tone=(hz:number,duration=.1,volume=.018)=>{if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(hz,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(audio.destination);o.start();o.stop(now+duration);o.onended=()=>{o.disconnect();g.disconnect();};};
 function update(room:RoomView,id:string,now:number){const t=room.mode.tag;pool.forEach(m=>m.visible=false);if(!t){for(const f of fields.values())f.group.visible=false;return;}
  const self=room.players.find(p=>p.id===id),ids=new Set(t.fields.map(f=>f.id));for(const [id,f] of fields)if(!ids.has(id)){scene.remove(f.group);if(f.rig)disposeTree(f.rig.root);fields.delete(id);}
  for(const f of t.fields){let view=fields.get(f.id);if(!view){const group=new T.Group();scene.add(group);view={group};fields.set(f.id,view);
   if(f.kind==='clone_decoy'||f.kind==='trap_clone'){const rig=createRig(characterById(f.characterId??'voltrix'));rig.root.scale.multiplyScalar(.55);rig.ring.visible=false;group.add(rig.root);view.rig=rig;view.anim=new GameplayAnimator(rig);}
   else if(f.kind==='smoke_screen'||f.kind==='slow_cloud'){for(let i=0;i<5;i++){const m=new T.Mesh(sphere,mat(f.kind==='smoke_screen'?'#6c8290':'#896db0',.2));m.scale.setScalar(f.kind==='smoke_screen'?2:1.1);m.position.set(Math.sin(i*2.4)*.8,.9+Math.cos(i)*.25,Math.cos(i*2.4)*.8);group.add(m);}}
   else {const color=f.kind==='gravity_bomb'?'#c080ff':f.kind==='time_bubble'?'#82c5ff':f.kind==='sticky_trap'?'#ffba72':'#63edff',m=new T.Mesh(ring,mat(color));m.rotation.x=-Math.PI/2;m.position.y=.05;const radius=['time_bubble','gravity_bomb','reverse_pulse'].includes(f.kind)?TAG.fieldRadius*.03:f.kind==='portal_pair'?.7:f.kind==='jump_pad'?.7:.5;m.scale.setScalar(radius);group.add(m);
    if(f.kind==='portal_pair'&&f.other){m.rotation.x=0;m.position.y=.8;const other=m.clone();other.position.set((f.other.x-f.x)*.03,.8,(f.other.y-f.y)*.03);group.add(other);}
    const asset=f.kind==='gravity_bomb'?'gravity-bomb':f.kind==='jump_pad'?'blink-beacon':null;if(asset){let template=templates.get(asset);if(!template){const model=createEquipment(asset);model.kit.resources.forEach(track);template=model.root;template.scale.setScalar(.25);templates.set(asset,template);}group.add(template.clone(true));}
   }
  }
  view.group.visible=true;view.group.position.set(f.x*.03,(f.elevation??0)*.03,f.y*.03);view.group.rotation.y=view.rig?Math.atan2(f.dx,f.dy):0;
  if(view.anim)view.anim.update({...freshMotion(f),...freshCombat(),spawnVersion:1},f.kind==='clone_decoy'?120:0,1/30,(f.elevation??0)*.03);
  if(f.kind==='reverse_pulse'){const age=(now-f.createdAt)/400;view.group.scale.setScalar(.3+age*.7);}
 }
 let index=0;const dot=(p:{x:number;y:number;elevation?:number},color:string,scale:number)=>{const m=pool[index++];if(!m)return;m.visible=true;m.material=mat(color);m.position.set(p.x*.03,(p.elevation??0)*.03+.15,p.y*.03);m.scale.setScalar(scale);};
 for(const trail of t.trails)dot(trail,'#92f3ff',.055);
 for(const ball of t.shots)dot(ball,ball.kind==='freeze_ball'?'#a4eeff':'#ffa057',.18);
 for(const e of t.events){if(e.kind==='tag'){const age=(now-e.at)/1600;dot(e,'#ff5378',.2+age*.8);}if(!seen.has(e.id)){seen.add(e.id);if(now-e.at<1500){if(e.kind==='tag')for(const h of [440,660,880])tone(h,.14,.012);else if(e.ownerId===id)tone(e.kind==='pickup'?720:520,.12);}}}
 if(seen.size>128){seen.clear();t.events.forEach(e=>seen.add(e.id));}
 if(room.phase==='arena'&&self){const frenzy=room.round.remainingSeconds<=20,interval=room.round.remainingSeconds<=5?250:frenzy?450:1250;
  if(now-lastBeat>interval){lastBeat=now;tone([110,130.81,110,164.81][beat++%4],.18,frenzy?.014:.006);}
  if(teamKey(room.mode,id)!==room.mode.it&&room.players.some(p=>!p.concealed&&teamKey(room.mode,p.id)===room.mode.it&&Math.hypot(p.x-self.x,p.y-self.y)<300)&&now-lastWarning>(frenzy?500:1000)){lastWarning=now;tone(230,.1,.012);}
  if(now-lastStep>450){lastStep=now;for(const actor of room.players)if(!actor.concealed&&!(t.status[actor.id]?.ghost!>now)&&['walk','sprint'].includes(actor.traversalState??'')&&Math.hypot(actor.x-self.x,actor.y-self.y)<180)tone(70,.04,actor.id===id?.004:.002);}
 }
 }
 return {update,dispose(){for(const f of fields.values()){scene.remove(f.group);if(f.rig)disposeTree(f.rig.root);}fields.clear();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);void audio?.close().catch(()=>{});}};
}
