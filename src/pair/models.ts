import * as T from 'three';
import {WeaponKit} from '../weapons/kit';
import type {PairId} from '../../shared/pair-powerups';
/** Exact approved V7 gadget geometry for this pair, isolated from Workshop state. */
export function createPairModel(kind:PairId){const id=kind.replaceAll('_','-'),k=new WeaponKit(kind==='bounce_bomb'?0xff932a:0xff922f),p=k.part('device'),fx=k.part('presentation-effects');const gold=k.mat(0xd3a558,.8,.32),blue=k.mat(0x136dba,.6,.35),orange=k.mat(0xd86b17,.6,.4);
if(id==='bounce-bomb'){
  k.mesh(p,k.sphere,k.energy,[0,0,0],[.31,.31,.31]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;k.mesh(p,k.cube,blue,[Math.sin(a)*.31,0,Math.cos(a)*.31],[.23,.49,.14],[0,a,0]);k.mesh(p,k.cube,k.edge,[Math.sin(a)*.39,0,Math.cos(a)*.39],[.035,.32,.024],[0,a,0]);}
  for(const y of [-.25,.25])k.ring(p,0,y,0,.27,.04,orange,'y');k.cylinderAt(p,0,.33,0,.15,.15,k.dark,'y');k.box(p,.07,.42,0,.29,.04,.12,k.edge);k.ring(p,-.17,.36,0,.09,.012,gold,'z');
 }else if(id==='sticky-trap'){
  k.mesh(p,k.track(new T.CylinderGeometry(.50,.54,.12,6)),k.dark,[0,0,0],[1,1,1]);k.cylinderAt(p,0,.1,0,.19,.09,orange,'y');k.ring(p,0,.16,0,.14,.018,k.energy,'y');
  for(let i=0;i<6;i++){const a=i*Math.PI/3,g=k.part('trap-panel-'+i,p);g.position.set(Math.sin(a)*.27,.06,Math.cos(a)*.27);g.rotation.y=a;k.box(g,0,.025,.12,.22,.08,.30,orange);k.box(g,0,.075,.12,.13,.018,.21,k.dark);k.box(g,0,.09,.12,.027,.013,.14,k.energy);k.cylinderAt(g,0,0,0,.045,.25,k.edge,'x');k.batch(g);}
  k.beam(p,[-.3,-.18,0],[.3,-.18,0],.06,k.rubber);
 }
 k.batch(p);k.batch(fx);return{root:k.root,kit:k,dispose:()=>k.dispose()};}
