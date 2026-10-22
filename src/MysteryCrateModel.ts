/** Workshop V7 src/powerups/mystery.ts geometry/animation. Demo receipt and reward factory removed; server receipt adapter supplies the reveal. */
import * as T from 'three';
import {WeaponKit} from './weapons/kit';
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
/** Supplied presentation result, never a client-side roll or an inventory grant. */
export type CollectionReceipt={collectionId:string;eligible:boolean;rewardId:string};

export function collectionState(t:number,eligible:boolean){const accepted=eligible&&t>=1.35;return {accepted,reveal:accepted&&t>=2.55&&t<4.55,opening:accepted?smooth((t-1.35)/1.2):0,fade:accepted?1-smooth((t-4.55)/.6):1,rewardCount:accepted&&t>=2.55?1:0};}
export class MysteryCrateModel{
 kit=new WeaponKit(0x38e8ff);root=this.kit.root;capsule=new T.Group();caps=new T.Group();rings=new T.Group();symbol=new T.Group();panels:T.Group[]=[];sparks=new T.Group();beam:T.Mesh;reward;glass:T.Mesh;state=collectionState(0,false);
 constructor(public receipt:CollectionReceipt={collectionId:'',eligible:false,rewardId:''}){
  const k=this.kit,body=k.part('reinforced-chest'),purple=k.mat(0x54188b,.4,.4);purple.emissive.setHex(0xab36ff);purple.emissiveIntensity=1;const glass=k.mat(0x1a7eaa,.1,.15);glass.transparent=true;glass.opacity=.23;glass.depthWrite=false;
  k.box(body,0,.43,0,1.22,.8,.94,k.dark);k.box(body,0,.09,0,1.3,.13,1.02,k.steel);
  for(const x of [-.56,.56])for(const z of [-.42,.42]){k.box(body,x,.44,z,.16,.78,.16,k.edge);for(const y of [.13,.75]){k.mesh(body,k.track(new T.OctahedronGeometry(.15)),k.steel,[x,y,z],[1,.8,1]);k.cylinderAt(body,x,y,z+Math.sign(z)*.08,.04,.025,k.energy,'z');}}
  for(const side of [-1,1]){for(const x of [-.29,.29]){k.box(body,x,.43,side*.48,.48,.43,.035,k.steel);k.box(body,x,.43,side*.505,.41,.35,.025,k.dark);k.box(body,x,.57,side*.525,.23,.025,.02,purple);}for(const y of [.19,.68])k.box(body,0,y,side*.50,.89,.035,.026,k.energy);k.box(body,side*.62,.44,0,.026,.5,.7,k.steel);k.box(body,side*.64,.44,0,.015,.32,.026,k.energy);}
  for(const side of [-1,1]){const panel=k.part('top-platform-'+side);panel.position.set(side*.31,.85,0);k.box(panel,0,0,0,.61,.09,.94,k.dark);k.box(panel,0,.05,0,.48,.025,.8,k.steel);k.batch(panel);this.panels.push(panel);}
  k.cylinderAt(body,0,.91,0,.36,.05,k.energy,'y');for(const r of [.23,.30,.40])k.ring(body,0,.95,0,r,.012,k.energy,'y');k.batch(body);
  for(const side of [-1,1]){const led=k.part('travel-light-'+side);k.box(led,0,.70,side*.525,.11,.035,.02,k.energy);k.batch(led);}
  this.root.add(this.capsule,this.rings,this.sparks);this.capsule.add(this.caps,this.symbol);this.capsule.position.y=1.65;
  this.glass=k.mesh(this.capsule,k.track(new T.CylinderGeometry(.27,.27,.76,32,1,true)),glass,[0,0,0],[1,1,1]);
  for(const side of [-1,1]){const cap=k.part('capsule-cap-'+side,this.caps);cap.position.y=side*.42;k.cylinderAt(cap,0,0,0,.34,.15,k.steel,'y');k.cylinderAt(cap,0,side*.075,0,.29,.025,k.dark,'y');for(const y of [-.045,.045])k.ring(cap,0,y,0,.34,.018,k.energy,'y');for(let i=0;i<8;i++){const a=i*Math.PI/4;k.box(cap,Math.sin(a)*.32,0,Math.cos(a)*.32,.08,.13,.08,k.edge);}k.batch(cap);}
  const pts=[[-.10,.14],[-.09,.23],[.05,.26],[.14,.17],[.10,.08],[0,.02],[0,-.08]];for(const side of [1]){for(let i=1;i<pts.length;i++)k.beam(this.symbol,[pts[i-1][0]*side,pts[i-1][1],0],[pts[i][0]*side,pts[i][1],0],.035,k.energy);k.box(this.symbol,0,-.19,0,.045,.045,.03,k.energy);}k.batch(this.symbol);
  for(let i=0;i<2;i++){const g=k.part('energy-orbit-'+i,this.rings);g.rotation.x=.4+i*.8;k.ring(g,0,0,0,.48+i*.09,.018,i?purple:k.energy,'y');k.ring(g,0,0,0,.50+i*.09,.009,k.edge,'y');k.batch(g);}
  this.beam=k.mesh(this.root,k.track(new T.CylinderGeometry(.22,.34,.4,24,1,true)),glass.clone(),[0,1.15,0],[1,1,1]);k.track(this.beam.material as T.Material);
  for(let i=0;i<8;i++)k.box(this.sparks,Math.sin(i*2.4)*.55,1.1+i%7*.14,Math.cos(i*2.4)*.55,.018,.025,.018,i%3? k.energy:purple);
  k.batch(this.sparks);
  this.reward={root:new T.Group()};this.root.add(this.reward.root);this.reward.root.scale.setScalar(.45);this.reward.root.position.y=1.7;this.reward.root.visible=false;this.sample(0,false);
 }
 sample(t:number,collect:boolean){const state=this.state=collectionState(t,collect&&this.receipt.eligible),phase=t*Math.PI/2,open=state.opening;this.root.visible=state.fade>0;
  this.capsule.position.y=1.65+Math.sin(phase)*.035;this.capsule.rotation.y=state.accepted?open*6:Math.sin(phase)*.1;this.rings.position.y=this.capsule.position.y;
  this.rings.children.forEach((r,i)=>{r.rotation.y=phase*(i?-1:1)+open*9;r.rotation.z=Math.sin(phase)*.15;});
  this.caps.children.forEach((c,i)=>{c.position.y=(i?1:-1)*(.42+open*.35);c.scale.setScalar(1-smooth((open-.75)/.25));});
  this.glass.visible=this.symbol.visible=open<.99;this.glass.scale.y=1-open*.6;this.symbol.scale.setScalar(1+Math.sin(t*22)*.06*open);
  this.panels.forEach((p,i)=>{p.rotation.z=(i?1:-1)*open*.32;});this.beam.scale.set(1+open*.2,1+Math.sin(phase)*.04+open*.3,1+open*.2);(this.beam.material as T.Material).opacity=.15+open*.25;
  for(const part of this.root.children)if(part.name.startsWith('travel-light-'))part.position.x=Math.sin(phase)*.43;
  this.kit.energy.emissiveIntensity=.85+Math.sin(phase)*.15+open*.7;this.sparks.rotation.y=phase*.25;this.sparks.scale.setScalar(1+open*.35);this.reward.root.visible=state.reveal;this.reward.root.rotation.y=state.reveal?(t-2.55)*1.2:0;
 }
 fork(){
  const clone=Object.create(MysteryCrateModel.prototype) as MysteryCrateModel,root=this.root.clone(true),a:T.Object3D[]=[],b:T.Object3D[]=[];this.root.traverse(o=>a.push(o));root.traverse(o=>b.push(o));const nodes=new Map(a.map((o,i)=>[o,b[i]]));
  const energy=this.kit.energy.clone(),beamMaterial=(this.beam.material as T.Material).clone();root.traverse(o=>{if(o instanceof T.Mesh&&o.material===this.kit.energy)o.material=energy;});
  const kit=Object.create(WeaponKit.prototype) as WeaponKit;Object.assign(kit,this.kit,{root,energy,resources:new Set([energy,beamMaterial])});
  Object.assign(clone,{kit,root,receipt:{collectionId:'',eligible:false,rewardId:''},capsule:nodes.get(this.capsule),caps:nodes.get(this.caps),rings:nodes.get(this.rings),symbol:nodes.get(this.symbol),panels:this.panels.map(p=>nodes.get(p)),sparks:nodes.get(this.sparks),beam:nodes.get(this.beam),glass:nodes.get(this.glass),reward:{root:nodes.get(this.reward.root)},state:collectionState(0,false)});clone.beam.material=beamMaterial;clone.sample(0,false);return clone;
 }
 dispose(){this.kit.dispose();}
}

