import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MAPS} from '../shared/map';
import {buildEnvironment} from '../src/environment';
test('map builders share primitives, retain map-specific signs and dispose GPU resources on repeated replacement',()=>{
 const old=globalThis.document;
 const labels:string[]=[];
 const context=new Proxy({}, {get:(_target,key)=>key==='fillText'?(text:string)=>labels.push(text):()=>{}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})} as any;
 try{
  let skyRuns=0;for(const id of ['central_plaza','scorched_point','aerie_sky_port','aerie_sky_port','outlaws_canyon','aerie_sky_port','outlaws_canyon','central_plaza','scorched_point']){
   labels.length=0;const map=MAPS[id],scene=new THREE.Scene(),env=buildEnvironment(scene,map,id==='aerie_sky_port'?(skyRuns++%2?'night':'day'):null);
   assert.equal(env.solids.length,map.blocks.length+map.surfaces.filter(s=>s.ramp).length+(id==='aerie_sky_port'?2:0));
   assert(scene.children.some(o=>o instanceof THREE.InstancedMesh),'Trim/decorations remain batched');
   assert(labels.includes(id==='outlaws_canyon'?'DEADWOOD SALOON':id==='aerie_sky_port'?'AERIE SKY-PORT':id==='central_plaza'?'CENTRAL PLAZA':'THE CRUCIBLE'));assert(!labels.includes(id==='central_plaza'?'THE CRUCIBLE':'CENTRAL PLAZA'));
   const resources=new Set<any>();scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)resources.add(mesh.geometry);const material=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of material)if(m){resources.add(m);if((m as any).map)resources.add((m as any).map);}if(o instanceof THREE.InstancedMesh)resources.add(o);});
   const disposed=new Map<any,number>();for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,(disposed.get(r)??0)+1));
   env.dispose();for(const r of resources)assert.equal(disposed.get(r),1,`Undisposed ${r.type??r.constructor.name} in ${id}`);env.dispose();for(const r of resources)assert.equal(disposed.get(r),1,'Cleanup is idempotent');
  }
 }finally{globalThis.document=old;}
});
