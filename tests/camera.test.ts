import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {constrainOrbit} from '../src/camera';
import {CONTROLLER, VIEW} from '../shared/presentation';
import {WORLD} from '../shared/map';
test('camera obstruction compresses before a wall, respects floor/bounds, and restores unobstructed orbit',()=>{
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,5,2),new THREE.MeshBasicMaterial());wall.position.set(10,2.5,10);wall.updateMatrixWorld(true);
 const target=new THREE.Vector3(10,1.3,13),blocked=new THREE.Vector3(10,3,7);constrainOrbit(blocked,target,[wall]);assert(blocked.z>11,'Camera remains in front of wall');
 const clear=new THREE.Vector3(10,3,18);constrainOrbit(clear,target,[wall]);assert.equal(clear.z,18);
 const outside=new THREE.Vector3(-100,-100,1000);constrainOrbit(outside,target,[]);assert(outside.x>=0&&outside.z<=WORLD.height*VIEW.scale);assert(outside.y>=CONTROLLER.floorClearance-1e-9);
 wall.geometry.dispose();(wall.material as THREE.Material).dispose();
});
