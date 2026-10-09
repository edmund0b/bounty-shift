import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {characters} from '../src/characters/registry';
import {createRig,disposeTree} from '../src/characters/rig';
import {animate,defaults} from '../src/animations/player';
import {CHARACTER_IDS} from '../shared/characters';
test('exact Workshop eight-character registry matches authoritative roster and skins have real articulated detail',()=>{
 assert.deepEqual(characters.map(c=>c.id),[...CHARACTER_IDS]);
 for(const c of characters){const r=createRig(c);assert.equal(r.root.name,c.id);const box=new T.Box3().setFromObject(r.root);assert(box.min.y>-.1&&box.min.y<.1,c.id+' feet datum');assert(box.max.y>3.2&&box.max.y<5,c.id+' proportions');let meshes=0,vertices=0;r.root.traverse(o=>{if(o instanceof T.Mesh){meshes++;vertices+=o.geometry.getAttribute('position').count;}});assert(meshes>50&&vertices>10000,c.id+' source details');for(const id of ['idle','walk','run','sprint','dash','attack','hit']){animate(r,id,.5,defaults);r.root.updateMatrixWorld(true);r.joints.forEach(j=>assert(j.matrixWorld.elements.every(Number.isFinite),c.id+' '+id));}disposeTree(r.root);assert.equal(r.root.children.length,0);}
});
