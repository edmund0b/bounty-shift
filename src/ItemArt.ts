import * as THREE from 'three';
import type {WorldItem} from '../shared/modes';
import {CHEST_OPEN_MS,pickupPosition} from '../shared/loot';
import {VIEW} from '../shared/presentation';

type Track=<T extends {dispose:()=>void}>(resource:T)=>T;
export function createItemArt(track:Track){
 const cube=track(new THREE.BoxGeometry(1,1,1)),sphere=track(new THREE.IcosahedronGeometry(.19,1));
 const mat=(color:string,emissive=0)=>track(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:emissive,metalness:.5,roughness:.4}));
 const body=mat('#091426'),metal=mat('#35465c'),cyan=mat('#44dfff',1.2),white=mat('#d7faff',1.1),ice=mat('#a0eaff',.65),gold=mat('#cdb354',.25);
 const box=(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>{const m=new THREE.Mesh(cube,material);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
 // A shared ice motif stays recognizable on pickups, the held utility and its projectile.
 const vertices:number[]=[];for(let i=0;i<6;i++){const a=i*Math.PI/3,dx=Math.sin(a),dy=Math.cos(a);vertices.push(0,0,.195,dx*.155,dy*.155,.195);for(const side of [-1,1]){const x=dx*.1,y=dy*.1,b=a+side*.65;vertices.push(x,y,.195,x-Math.sin(b)*.05,y-Math.cos(b)*.05,.195);}}
 const snowGeometry=track(new THREE.BufferGeometry());snowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const snowMat=track(new THREE.LineBasicMaterial({color:'#efffff'}));
 const freezeBall=()=>{const group=new THREE.Group();group.add(new THREE.Mesh(sphere,ice));for(const angle of [0,Math.PI]){const snow=new THREE.LineSegments(snowGeometry,snowMat);snow.rotation.y=angle;group.add(snow);}return group;};
 // Item art is a registry; adding a later Lab model doesn't require changing the chest.
 const item=(kind:string)=>{if(kind==='freeze_ball')return freezeBall();const group=new THREE.Group();box(group,0,.02,0,.09,.65,.09,white);box(group,0,-.28,0,.15,.18,.14,body);if(kind==='hammer')box(group,0,.24,0,.42,.22,.2,gold);else box(group,0,-.18,0,.3,.04,.09,metal);return group;};
 const chest=()=>{
  const group=new THREE.Group();group.name='GAMEPLAY_LOOT_CHEST';
  box(group,0,.08,0,1.02,.16,.65,body);box(group,0,.32,.29,1.02,.4,.07,body);box(group,0,.32,-.29,1.02,.4,.07,body);for(const x of [-.48,.48])box(group,x,.32,0,.07,.4,.65,body);
  for(const x of [-.47,.47])for(const z of [-.29,.29]){box(group,x,.31,z,.105,.49,.1,metal);box(group,x,.31,z+.008,.04,.37,.108,cyan);}
  box(group,0,.48,.335,1.04,.055,.026,white);for(const x of [-.31,.31])box(group,x,.29,.335,.045,.3,.024,white);
  box(group,0,.31,-.34,1,.035,.018,cyan);
  const hinge=new THREE.Group();hinge.name='rear-hinge';hinge.position.set(0,.53,-.325);group.add(hinge);box(hinge,0,.055,.325,1.04,.11,.65,body);
  for(const x of [-.34,.34]){box(hinge,x,.12,.325,.085,.025,.63,white);box(hinge,x,.045,.66,.085,.1,.03,cyan);box(group,x,.53,-.33,.13,.085,.1,metal);}
  box(hinge,0,-.007,.325,.83,.012,.47,metal);for(const x of [-.41,.41])box(hinge,x,-.016,.325,.027,.012,.48,cyan);for(const z of [.09,.56])box(hinge,0,-.016,z,.84,.012,.025,white);
  const latch=box(hinge,0,-.01,.677,.15,.19,.045,metal);box(hinge,0,-.01,.705,.055,.1,.015,cyan);
  const interior=new THREE.Mesh(cube,track(new THREE.MeshBasicMaterial({color:'#6defff',transparent:true,opacity:0})));interior.position.set(0,.44,0);interior.scale.set(.86,.02,.47);group.add(interior);
  const beam=new THREE.Mesh(cube,track(new THREE.MeshBasicMaterial({color:'#8fefff',transparent:true,opacity:0,depthWrite:false})));beam.position.y=.64;beam.scale.set(.8,.65,.44);group.add(beam);
  return {group,hinge,latch,interior,beam,update(world:WorldItem,now:number){const elapsed=world.state==='closed'?0:Math.max(0,now-(world.openedAt??now-CHEST_OPEN_MS));const t=Math.min(1,elapsed/CHEST_OPEN_MS),ease=t*t*(3-2*t);hinge.rotation.x=t===0?0:-1.85*ease;interior.material.opacity=ease*.85;beam.material.opacity=.1*ease*Math.max(0,1-(elapsed-CHEST_OPEN_MS)/550);}};
 };
 return {chest,item,freezeBall,cube,cyan,white,ice,box};
}
export function revealPosition(world:WorldItem,now:number){const destination=pickupPosition(world),t=Math.min(1,Math.max(0,(now-(world.openedAt??now)-220)/320)),ease=t*t*(3-2*t);return new THREE.Vector3((world.x+(destination.x-world.x)*ease)*VIEW.scale,(world.elevation??0)*VIEW.scale+.6+Math.sin(t*Math.PI)*.22-(world.kind==='freeze_ball'?.35:.2)*ease,(world.y+(destination.y-world.y)*ease)*VIEW.scale);}
