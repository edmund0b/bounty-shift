import * as THREE from 'three';
import {WORLD} from '../shared/map';
import {VIEW,CONTROLLER} from '../shared/presentation';
// Reuse vectors/intersection storage; the previous footprint allocated clones and
// sorted result arrays for every ray, four times per rendered frame.
const cache=new WeakMap<THREE.Raycaster,{direction:THREE.Vector3;right:THREE.Vector3;up:THREE.Vector3;origin:THREE.Vector3;hits:THREE.Intersection[];sweep:THREE.Box3;candidates:THREE.Object3D[]}>();
const boxes=new WeakMap<THREE.Object3D,{matrix:THREE.Matrix4;box:THREE.Box3}>();
const offsets=[[0,0],[.15,0],[-.15,0],[0,.15],[0,-.15]];
export function constrainOrbit(point:THREE.Vector3,target:THREE.Vector3,solids:THREE.Object3D[],ray=new THREE.Raycaster(),bounds=WORLD,floorElevation=0){
 let c=cache.get(ray);if(!c){c={direction:new THREE.Vector3(),right:new THREE.Vector3(),up:new THREE.Vector3(),origin:new THREE.Vector3(),hits:[],sweep:new THREE.Box3(),candidates:[]};cache.set(ray,c);}
 point.x=THREE.MathUtils.clamp(point.x,.15,bounds.width*VIEW.scale-.15);point.z=THREE.MathUtils.clamp(point.z,.15,bounds.height*VIEW.scale-.15);point.y=Math.max(floorElevation+CONTROLLER.floorClearance,point.y);
 const direction=c.direction.copy(point).sub(target),length=direction.length();if(length<.01)return;direction.normalize();
 c.right.set(-direction.z,0,direction.x);if(c.right.lengthSq()<1e-8)c.right.set(1,0,0);else c.right.normalize();c.up.crossVectors(direction,c.right).normalize();
 // Conservative swept footprint broad phase: raycast only solids near this camera arm.
 c.sweep.min.copy(target).min(point).addScalar(-.16);c.sweep.max.copy(target).max(point).addScalar(.16);c.candidates.length=0;
 for(const solid of solids){let b=boxes.get(solid);if(!b||!b.matrix.equals(solid.matrixWorld)){b={matrix:solid.matrixWorld.clone(),box:new THREE.Box3().setFromObject(solid)};boxes.set(solid,b);}if(b.box.intersectsBox(c.sweep))c.candidates.push(solid);}
 let distance=length;const far=ray.far,near=ray.near;ray.near=0;ray.far=length;
 for(const [x,y] of offsets){c.origin.copy(target).addScaledVector(c.right,x).addScaledVector(c.up,y);ray.set(c.origin,direction);c.hits.length=0;ray.intersectObjects(c.candidates,false,c.hits);const hit=c.hits[0];if(hit)distance=Math.min(distance,Math.max(.1,hit.distance-CONTROLLER.obstructionPadding));}
 ray.far=far;ray.near=near;point.copy(target).addScaledVector(direction,distance);
}
