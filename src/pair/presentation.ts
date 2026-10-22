import * as T from 'three';
import type {Rig} from '../characters/rig';
import type {PlayerView,RoomView} from '../../shared/game';
import {PAIR,isPair} from '../../shared/pair-powerups';
import {canonicalWeapon} from '../../shared/weapons';
import {createPairModel} from './models';
import {pairPose,pairReaction} from './animation';
export class PairCharacter{
 private model:ReturnType<typeof createPairModel>|null=null;private id='';
 constructor(private rig:Rig){}
 update(p:PlayerView,room:RoomView,now:number){const action=room.mode.pair?.actions.find(a=>a.ownerId===p.id&&now>=a.startedAt&&now<a.endsAt),kind=isPair(p.heldItem)?p.heldItem:action?.kind,held=isPair(p.heldItem)&&p.health>0;
  if(!held||p.frozenUntil>now){if(this.model)this.model.root.visible=false;}else if(kind){if(!this.model||this.id!==kind){this.model?.dispose();this.model=createPairModel(kind);this.id=kind;this.rig.arms[1].wrist.add(this.model.root);}this.model.root.visible=!action?.released;}
  if(p.health<=0||p.frozenUntil>now)return;
  if(kind&&!canonicalWeapon(p.heldItem)&&!p.weaponAction&&!p.dashRemaining){pairPose(this.rig,kind,action?(now-action.startedAt)/1000:null,!!p.crouched);if(this.model&&held){const big=Math.max(1,this.rig.shape.shoulder/.5);this.model.root.scale.setScalar((kind==='bounce_bomb'?.29:.64)*big);if(kind==='sticky_trap'){const scale=.64*big;this.model.root.position.set(-.35*scale,-.08+.17*scale,0);this.model.root.rotation.set(0,0,0);}else{this.model.root.position.set(0,-.10,.075);this.model.root.rotation.set(0,0,0);}}}
  if(!p.weaponAction&&!p.ads)pairReaction(this.rig,room.mode.pair?.status[p.id],now);
 }
 dispose(){this.model?.dispose();this.model=null;}
}
/** V7 expanding orange/blue rings and adhesive strands, sampled from authoritative events. */
export function createPairEffects(scene:T.Scene){
 const objects=new Map<string,{root:T.Group;model?:ReturnType<typeof createPairModel>;materials?:T.Material[]}>(),geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();const torus=new T.TorusGeometry(1,.018,5,48);geos.add(torus);const blue=new T.MeshBasicMaterial({color:0x36baff,transparent:true,opacity:.6,depthWrite:false,toneMapped:false}),orange=blue.clone();orange.color.setHex(0xff9a32);mats.add(blue);mats.add(orange);
 const lineGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(0,.18,0),new T.Vector3(.20,.05,.15),new T.Vector3(.48,.025,0)]);geos.add(lineGeometry);const up=new T.Vector3(0,1,0),normal=new T.Vector3();
 const remove=(id:string)=>{const e=objects.get(id);if(e){e.root.removeFromParent();e.model?.dispose();e.materials?.forEach(m=>m.dispose());objects.delete(id);}};
 return {update(room:RoomView,now:number){const t=room.mode.pair,ids=new Set<string>();if(t){for(const shot of t.shots){ids.add(shot.id);let e=objects.get(shot.id);if(!e){const model=createPairModel('bounce_bomb'),root=model.root;root.scale.setScalar(.29);scene.add(root);e={root,model};objects.set(shot.id,e);}const extra=Math.min(.08,Math.max(0,now-shot.lastAt)/1000);e.root.position.set((shot.x+shot.vx*extra)*.03,((shot.elevation??0)+shot.vz*extra)*.03,(shot.y+shot.vy*extra)*.03);e.root.rotation.set(now*.006,now*.004,0);}
 for(const trap of t.traps){ids.add(trap.id);let e=objects.get(trap.id);if(!e){const model=createPairModel('sticky_trap'),root=new T.Group();model.root.scale.setScalar(.55);const box=new T.Box3().setFromObject(model.root);model.root.position.y=-box.min.y;root.add(model.root);model.kit.energy.emissiveIntensity=.1;model.root.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&o.material.emissiveIntensity>0)o.material.emissiveIntensity=.1;});scene.add(root);e={root,model};objects.set(trap.id,e);}e.root.position.set(trap.x*.03,(trap.elevation??0)*.03,trap.y*.03);e.root.quaternion.setFromUnitVectors(up,normal.set(trap.normal.x,trap.normal.y,trap.normal.z).normalize());e.root.visible=!trap.triggeredAt;}
 for(const event of t.events){const id='fx:'+event.id;ids.add(id);let e=objects.get(id);if(!e){const root=new T.Group(),b=blue.clone(),o=orange.clone();if(event.kind==='shockwave'){for(let i=0;i<3;i++){const m=new T.Mesh(torus,i===1?o:b);m.rotation.x=-Math.PI/2;m.position.y=.035+i*.015;root.add(m);}}else {for(let i=0;i<3;i++){const ring=new T.Mesh(torus,o);ring.rotation.x=-Math.PI/2;ring.position.y=.035+i*.015;ring.scale.setScalar(.42+i*.06);root.add(ring);}for(let i=0;i<6;i++){const line=new T.Line(lineGeometry,o);line.rotation.y=i*Math.PI/3;line.scale.set(1,1,1);root.add(line);}}scene.add(root);e={root,materials:[b,o]};objects.set(id,e);}const age=Math.max(0,(now-event.at)/1000);e.materials?.forEach(m=>{(m as T.MeshBasicMaterial).opacity=.6*Math.max(0,1-age/(event.kind==='shockwave'?.65:1.5));});e.root.position.set(event.x*.03,(event.elevation??0)*.03,event.y*.03);if(event.kind==='shockwave'){e.root.visible=age<.65;for(let i=0;i<3;i++)e.root.children[i].scale.setScalar(Math.min(event.radius*.03,.12+Math.max(0,age-i*.055)*event.radius*.03/.55));}else{const target=room.players.find(p=>p.id===event.targetIds[0]);if(target)e.root.position.set(target.x*.03,(target.elevation??0)*.03+.015,target.y*.03);e.root.visible=age<PAIR.sticky.effectMs/1000;e.root.scale.setScalar(.6+Math.min(1,age*8)*.4);}}
 }for(const id of objects.keys())if(!ids.has(id))remove(id);
 },visibleIds(){return [...objects].filter(([,e])=>e.root.visible).map(([id])=>id);},dispose(){for(const id of [...objects.keys()])remove(id);geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
