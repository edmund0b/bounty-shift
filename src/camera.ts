import * as THREE from 'three';
import { WORLD } from '../shared/map';
import { VIEW, CONTROLLER } from '../shared/presentation';

// A small five-ray camera footprint protects the near plane at wall corners.
export function constrainOrbit(point:THREE.Vector3,target:THREE.Vector3,solids:THREE.Object3D[],ray=new THREE.Raycaster()){
 point.x=THREE.MathUtils.clamp(point.x,.15,WORLD.width*VIEW.scale-.15);
 point.z=THREE.MathUtils.clamp(point.z,.15,WORLD.height*VIEW.scale-.15);
 point.y=Math.max(CONTROLLER.floorClearance,point.y);
 const direction=point.clone().sub(target),length=direction.length();if(length<.01)return;
 direction.normalize();let distance=length;
 for(const [x,y] of [[0,0],[.15,0],[-.15,0],[0,.15],[0,-.15]]){
  ray.set(target.clone().add(new THREE.Vector3(x,y,0)),direction);ray.far=length;
  const hit=ray.intersectObjects(solids,false)[0];if(hit)distance=Math.min(distance,Math.max(.1,hit.distance-CONTROLLER.obstructionPadding));
 }
 point.copy(target).addScaledVector(direction,distance);
}
