import * as T from 'three';
import type {CharacterDefinition} from './registry';
import {Construction} from './construction';
import {skeleton,baseBody,hands,boots,type SkinBuilder} from './anatomy';
import {voltrix} from './skins/voltrix';
import {kirin} from './skins/kirin';
import {emberjack} from './skins/emberjack';
import {mossbyte} from './skins/mossbyte';
import {novaa} from './skins/novaa';
import {gravel} from './skins/gravel';
import {lumi} from './skins/lumi';
import {shade} from './skins/shade';
const builders:Record<string,SkinBuilder>={voltrix,kirin,emberjack,mossbyte,novaa,gravel,lumi,shade};
export function box(parent:T.Object3D,w:number,h:number,d:number,color:number,x=0,y=0,z=0,glow=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.48,metalness:.28,emissive:glow?color:0,emissiveIntensity:glow?1.3:0}));m.position.set(x,y,z);parent.add(m);return m;}
export function label(text:string,color='#b8eaff'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.font='600 34px monospace';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,58);const map=new T.CanvasTexture(canvas);const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true}));sprite.scale.set(2.1,.394,1);return sprite;}
export function createRig(c:CharacterDefinition,withLabel=false){
 const r=skeleton(c.id),b=new Construction();r.root.scale.setScalar(r.shape.scale*c.proportions.scale);
 const build=builders[c.id];if(build)build(b,r);else{const mat=b.mat(c.palette.body);baseBody(b,r,mat);b.oval(r.head,r.shape.head,mat);hands(b,r,mat);boots(b,r,mat,b.mat(c.palette.accent));}
 b.batch(r.root);
 const ring=new T.Mesh(new T.TorusGeometry(c.id==='gravel'?1.08:.82,.018,8,64),new T.MeshBasicMaterial({color:c.palette.glow}));ring.rotation.x=Math.PI/2;ring.position.y=.025;r.root.add(ring);
 if(withLabel){const tag=label(c.displayName);tag.name='character-label';tag.position.y=c.id==='emberjack'?3.95:3.85;r.root.add(tag);}
 const debug:T.Object3D[]=[];r.joints.forEach(j=>{const ball=new T.Mesh(new T.SphereGeometry(.045,8,8),new T.MeshBasicMaterial({color:0xffca6b,depthTest:false}));ball.visible=false;ball.renderOrder=10;j.add(ball);debug.push(ball);});const axes=new T.AxesHelper(1.7);axes.visible=false;r.root.add(axes);
 return {...r,debug,axes,ring};
}
export type Rig=ReturnType<typeof createRig>;
export function disposeTree(root:T.Object3D){const seen=new Set<{dispose:()=>void}>();root.traverse(o=>{const m=o as T.Mesh;if(o instanceof T.InstancedMesh)o.dispose();if(m.geometry)seen.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){seen.add(mat);for(const v of Object.values(mat))if(v instanceof T.Texture)seen.add(v);}});seen.forEach(r=>r.dispose());root.clear();}

