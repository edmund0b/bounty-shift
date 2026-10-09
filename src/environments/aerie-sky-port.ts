import * as T from 'three';
import type {MapDefinition} from '../../shared/maps/types';
import {mapEnvironment} from '../../shared/map';
import {PlazaKit} from './central-plaza-kit';
import {aerieArchitecture,craft} from './aerie-architecture';
export function buildAerieSkyPort(scene:T.Scene,map:MapDefinition,variant:string|null){const k=new PlazaKit(scene);k.root.name='aerie-sky-port-environment';const env=mapEnvironment(map,variant),night=variant==='night';
 const white=k.material('#c8d5dc','metal'),floor=k.material('#637d90','metal'),dark=k.material('#354c60','metal'),cyan=k.material('#85d9e8','glow');
 for(const g of map.ground??[]){if(g.shape==='ellipse')k.add(k.cylinder,floor,[g.x+g.width/2,-12,g.y+g.height/2],[g.width,24,g.height]);else k.box(g.x,g.y,g.width,g.height,-24,24,floor);
  if(g.shape==='ellipse')k.add(k.cylinder,dark,[g.x+g.width/2,-55,g.y+g.height/2],[g.width*.9,60,g.height*.9]);else k.box(g.x+8,g.y+8,g.width-16,g.height-16,-60,36,dark);
 }
 for(const b of map.blocks){k.solid(b);if(['transit-spire','control-mast','hangar-craft','residential-penthouse'].includes(b.id))continue;
  const mat=b.kind==='rail'?white:b.kind==='deck'?floor:b.kind==='planter'?white:b.id.includes('furniture')?dark:white;
  k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,mat);
  if(b.kind==='rail')k.box(b.x,b.y,b.width,b.height,b.top-2,2,cyan);
 }
 for(const s of map.surfaces)if(s.ramp){k.slope(s,floor,white);for(const side of [0,1])k.beam([s.x+(side?s.width:0),s.ramp.from+28,s.y],[s.x+(side?s.width:0),s.ramp.to+28,s.y+s.height],3,white);}
 aerieArchitecture(k,night); // Labels are readable from their front; never mirror text through their back.
 k.root.traverse(o=>{const m=(o as T.Mesh).material;if(m instanceof T.MeshBasicMaterial&&m.map)m.side=T.FrontSide;});
 // Repeated under-deck pylons and tension struts visually carry long sky bridges.
 for(const s of map.surfaces.filter(s=>!s.ramp&&s.id.startsWith('hub-'))){for(const x of [s.x+16,s.x+s.width-16])k.cylinderAt(x,s.y+16,6,-130,s.elevation+120,dark);}
 const clouds=k.material(env.cloudColor??'#e0dce3'),shade=k.material(env.cloudShade??'#a2acc0');
 for(let i=0;i<70;i++){const a=i*2.39996,r=1350+(i%5)*230;k.add(k.sphere,i%3?clouds:shade,[1620+Math.cos(a)*r,-350-(i%7)*45,1660+Math.sin(a)*r],[480+(i%4)*100,130+(i%3)*40,370+(i%5)*90]);}
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=2450,x=1620+Math.cos(a)*r,y=1660+Math.sin(a)*r,z=-140+i%3*100;k.box(x-110,y-100,220,200,z,24,dark);k.box(x-45,y-40,90,80,z+24,170+i%3*70,white);k.cylinderAt(x,y,15,z-170,170,dark);k.box(x-40,y-43,80,4,z+120,8,cyan);}
 craft(k,3100,2250,120,.8);craft(k,0,1250,-40,.65);
 k.finish();const seen=new Set<T.Material>();k.root.traverse(o=>{const m=(o as T.Mesh).material;for(const mat of Array.isArray(m)?m:[m])if(mat instanceof T.MeshStandardMaterial&&!seen.has(mat)){seen.add(mat);mat.metalness=Math.min(mat.metalness,.22);mat.emissive.copy(mat.color);mat.emissiveIntensity=night?.10:.16;}});
 return{solids:k.solids,dispose:()=>k.dispose()};}
