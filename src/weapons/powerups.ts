import * as T from 'three';
import {WeaponKit} from './kit';
export function buildPowerup(k:WeaponKit,id:string){const p=k.part('device'),effects=k.part('presentation-effects');effects.userData.previewOnly=true;
 if(id==='clone-decoy'||id==='blink-beacon'){
  k.cylinderAt(p,0,-.12,0,.49,.24,k.dark,'y');k.cylinderAt(p,0,.08,0,.36,.22,k.steel,'y');k.ring(p,0,.22,0,.27,.025,k.energy,'y');
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.sin(a),z=Math.cos(a);k.beam(p,[x*.25,.2,z*.25],[x*.61,-.34,z*.61],.16,k.steel);k.beam(p,[x*.34,.11,z*.34],[x*.52,-.27,z*.52],.035,k.energy);k.box(p,x*.6,-.34,z*.6,.24,.07,.24,k.dark);}
  if(id==='blink-beacon'){const crystal=k.track(new T.OctahedronGeometry(.28,0));k.mesh(p,crystal,k.energy,[0,.8,0],[.7,2.5,.7]);for(const z of [-.36,.36]){k.beam(p,[-.26,-.01,z],[0,.36,z],.04,k.edge);k.beam(p,[0,.36,z],[.26,-.01,z],.04,k.edge);k.beam(p,[.26,-.01,z],[-.26,-.01,z],.04,k.energy);}for(const y of [.5,1.1])k.ring(effects,0,y,0,.42,.013,k.energy,'y');}
  else{
   k.cylinderAt(p,0,.32,0,.22,.28,k.dark,'y');for(let i=0;i<6;i++){const a=i*Math.PI/3;k.mesh(p,k.cube,k.energy,[Math.sin(a)*.23,.31,Math.cos(a)*.23],[.10,.18,.025],[0,a,0]);}
   const holo=k.mat(0x48dfff,.05,.5);holo.transparent=true;holo.opacity=.38;holo.emissive.setHex(0x1ba3ce);holo.emissiveIntensity=.8;holo.depthWrite=false;
   k.mesh(effects,k.sphere,holo,[0,1.72,0],[.12,.14,.11]);k.box(effects,0,1.39,0,.32,.45,.16,holo);for(const side of [-1,1]){k.beam(effects,[side*.10,1.15,0],[side*.15,.62,0],.095,holo);k.beam(effects,[side*.22,1.55,0],[side*.27,1.2,.13],.08,holo);}k.box(effects,.2,1.25,.2,.48,.075,.09,holo);for(const y of [.61,.99,1.4,1.8])k.ring(effects,0,y,0,.34,.007,k.energy,'y');
  }
 }else{
  const core=k.mat(id==='freeze-ball'?0x3e9cb4:0x202635,.7,.27);core.emissive.copy(k.energy.emissive);core.emissiveIntensity=.4;k.mesh(p,k.sphere,core,[0,0,0],[.62,.62,.62]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;for(const yy of [-.30,.3]){k.mesh(p,k.cube,k.steel,[Math.sin(a)*.49,yy,Math.cos(a)*.49],[.32,.28,.16],[0,a,yy>0?-.12:.12]);}k.mesh(p,k.cube,k.dark,[Math.sin(a)*.62,0,Math.cos(a)*.62],[.18,.3,.15],[0,a,0]);k.mesh(p,k.cube,k.energy,[Math.sin(a)*.707,0,Math.cos(a)*.707],[.085,.21,.015],[0,a,0]);}
  for(const y of [-.51,.51]){k.cylinderAt(p,0,y,0,.32,.12,k.dark,'y');k.ring(p,0,y*1.1,0,.28,.025,k.edge,'y');k.cylinderAt(p,0,y*1.16,0,.19,.03,k.energy,'y');}
  k.cylinderAt(p,0,0,.63,.34,.09,k.dark,'z');k.ring(p,0,0,.69,.31,.045,k.edge,'z');k.ring(p,0,0,.718,.265,.012,k.energy,'z');
  if(id==='healing-burst'){k.box(p,0,0,.74,.1,.36,.018,k.energy);k.box(p,0,0,.74,.36,.1,.018,k.energy);}
  if(id==='bounce-bomb')for(const y of [-.12,.08]){k.beam(p,[-.15,y,.74],[0,y+.12,.74],.045,k.energy);k.beam(p,[0,y+.12,.74],[.15,y,.74],.045,k.energy);}
  if(id==='freeze-ball'){for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a),y=Math.sin(a);k.beam(p,[0,0,.74],[x*.21,y*.21,.74],.022,k.energy);for(const side of [-1,1])k.beam(p,[x*.13,y*.13,.74],[x*.09-y*side*.06,y*.09+x*side*.06,.74],.018,k.energy);}for(let i=0;i<18;i++)k.mesh(effects,k.sphere,k.energy,[Math.sin(i*2.4)*(.7+i%3*.03),-.62+i%4*.05,Math.cos(i*2.4)*.7],[.018,.018,.018]);}
  if(id==='gravity-bomb'){for(let i=0;i<4;i++){const ring=k.ring(effects,0,0,.73,.06+i*.05,.012,k.energy,'z');ring.scale.y=.65;ring.rotation.z=i*.7;}for(const angle of [-.45,.4]){const ring=k.ring(effects,0,0,0,.85,.012,k.energy,'y');ring.rotation.z=angle;}for(let i=0;i<7;i++)k.mesh(effects,k.sphere,k.steel,[Math.sin(i)*.95,Math.cos(i)*.25,Math.cos(i)*.95],[.045,.04,.05]);}
 }
 k.batch(p);k.batch(effects);return effects;
}
