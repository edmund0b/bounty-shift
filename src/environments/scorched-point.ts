import * as T from 'three';
import type {MapDefinition} from '../../shared/maps/types';
import {PlazaKit} from './central-plaza-kit';
import {SCORCHED_PROPS,SCORCHED_SITES} from '../../shared/maps/scorched-layout';
import {scorchedArchitecture} from './scorched-architecture';
import {scorchedTerrain,scorchedEffects} from './scorched-terrain';
export function buildScorchedPoint(scene:T.Scene,map:MapDefinition){const k=new PlazaKit(scene);k.root.name='scorched-point-environment';const props=new Set(SCORCHED_PROPS.map(p=>p.id)),iron=k.material('#504c47','metal'),ash=k.material('#80776b'),rust=k.material('#685245','metal'),heat=k.material('#ff9b37','glow');
 scorchedTerrain(k);
 for(const b of map.blocks){k.solid(b);if(props.has(b.id)||b.id==='crucible-core'||b.id==='research-observatory'||b.id.startsWith('power-stack-'))continue;const site=SCORCHED_SITES.find(s=>b.id.startsWith(s.id+'-'));const mat=b.kind==='rail'?iron:b.kind==='deck'?iron:site?.id==='residential'?k.material('#776357'):site?.id==='research'?ash:site?.id==='warehouse'||site?.id==='workshop'?rust:k.material('#615b52');if(b.shape==='ellipse')k.cylinderAt(b.x+b.width/2,b.y+b.height/2,b.width/2,b.bottom,b.top-b.bottom,mat);else k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,mat);}
 for(const s of map.surfaces)if(s.ramp)k.slope(s,iron,ash);
 // The core is a steel containment machine with a narrow internal heat chamber.
 k.cylinderAt(1600,1500,59,120,46,iron);k.cylinderAt(1600,1500,34,160,290,heat);for(const e of [162,220,320,440,470])k.cylinderAt(1600,1500,58,e,12,iron);for(let i=0;i<8;i++){const a=i*Math.PI/4,x=1600+Math.cos(a)*47,y=1500+Math.sin(a)*47;k.cylinderAt(x,y,7,155,320,rust);k.beam([x,470,y],[1600+Math.cos(a)*23,535,1500+Math.sin(a)*23],6,iron);}k.cylinderAt(1600,1500,29,525,15,iron);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=1600+Math.cos(a)*410,y=1500+Math.sin(a)*410;k.cylinderAt(x,y,8,-15,125,iron);}
 k.sign('THE CRUCIBLE',1600,1440,195,140,'#edbf7c',Math.PI);k.sign('CENTRAL GEOTHERMAL CORE',1600,1564,202,230,'#edbf7c',0);
 scorchedArchitecture(k);scorchedEffects(k);k.finish();const seen=new Set<T.Material>();k.root.traverse(o=>{const m=(o as T.Mesh).material;for(const mat of Array.isArray(m)?m:[m])if(mat instanceof T.MeshStandardMaterial&&!seen.has(mat)){seen.add(mat);mat.metalness=Math.min(mat.metalness,.28);mat.emissive.copy(mat.color);mat.emissiveIntensity=.22;}});return{solids:k.solids,dispose:()=>k.dispose()};}
