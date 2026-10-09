import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
/** Pooled Nordic materials and silhouettes. No shared-map material is modified. */
export class FjordKit{
 readonly rock:T.MeshStandardMaterial;readonly snow:T.MeshStandardMaterial;readonly ice:T.MeshStandardMaterial;
 readonly wood:T.Material;readonly beam:T.Material;readonly warm:T.Material;readonly iron:T.Material;readonly red:T.Material;
 readonly column:T.BufferGeometry;readonly peak:T.BufferGeometry;readonly crag:T.BufferGeometry;readonly cone:T.BufferGeometry;readonly gable:T.BufferGeometry;
 constructor(public k:PlazaKit){
  this.rock=this.surface('#536774',.94,'rock');this.snow=this.surface('#e3edf1',.9,'snow');this.ice=this.surface('#537f98',.28,'ice');
  this.wood=k.material('#80654d','wood');this.beam=k.material('#40352d','wood');this.warm=k.material('#ffbe72','glow');this.iron=k.material('#434b51','metal');this.red=k.material('#753c3c');
  this.crag=k.track(new T.BoxGeometry(1,1,1,3,3,3));const p=this.crag.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=Math.sin(x*19+z*11+y*13)*.045;p.setXYZ(i,x+n,y+n*.5,z+n);}this.crag.computeVertexNormals();
  this.column=k.track(new T.CylinderGeometry(.43,.5,1,9,3));const cp=this.column.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),n=Math.sin(x*27+z*17+y*8)*.06;cp.setXYZ(i,x+n,y,z+n*.7);}this.column.computeVertexNormals();
  this.peak=k.track(new T.ConeGeometry(.5,1,7,3));const pp=this.peak.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);pp.setXYZ(i,x+y*.18+Math.sin(z*20+y*13)*.04,y,z+Math.sin(x*20+y*9)*.05);}this.peak.computeVertexNormals();
  this.cone=k.track(new T.ConeGeometry(.5,1,7,1));
  this.gable=k.track(new T.BufferGeometry());this.gable.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,.5,0,.5,0,1,.5],3));this.gable.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);this.gable.computeVertexNormals();
 }
 surface(color:string,roughness:number,kind:string){const m=this.k.track(new T.MeshStandardMaterial({color,roughness,metalness:kind==='ice'?.2:.02}));m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFjord;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 fjp=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nfjp=instanceMatrix*fjp;\n#endif\nvFjord=(modelMatrix*fjp).xyz;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFjord;\nfloat fjnoise(vec3 p){return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453);}') .replace('#include <color_fragment>',`#include <color_fragment>
 float grain=fjnoise(vFjord*18.0);float broad=sin(vFjord.x*1.7+sin(vFjord.z*2.3))*sin(vFjord.z*.7+vFjord.y*1.9);
 diffuseColor.rgb*=.91+grain*.11+broad*${kind==='rock'?'.12':'.025'};
 ${kind==='ice'?'vec2 cell=vFjord.xz*.55,base=floor(cell),uv=fract(cell);float nearA=10.0,nearB=10.0;for(int a=-1;a<=1;a++){for(int b=-1;b<=1;b++){vec2 step=vec2(float(a),float(b)),seed=base+step;vec2 jitter=fract(sin(vec2(dot(seed,vec2(127.1,311.7)),dot(seed,vec2(269.5,183.3))))*43758.5453);float dist=length(step+jitter-uv);if(dist<nearA){nearB=nearA;nearA=dist;}else if(dist<nearB){nearB=dist;}}}float fissure=1.0-smoothstep(.004,.014,nearB-nearA);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.72,.79),fissure*.48);':''}`);};m.customProgramCacheKey=()=>`fjord-${kind}`;return m;}
 rockAt(x:number,y:number,w:number,d:number,bottom:number,h:number,snow=true){this.k.add(this.crag,this.rock,[x+w/2,bottom+h/2,y+d/2],[w,h,d]);if(snow)this.k.add(this.crag,this.snow,[x+w/2,bottom+h+.5,y+d/2],[w+3,1,d+3]);}
 roof(x:number,y:number,w:number,d:number,z:number,rise:number){const k=this.k; k.add(this.gable,this.wood,[x+w/2,z,y+d/2],[w,rise,d]);const run=w/2+22,angle=Math.atan2(rise,run),len=Math.hypot(run,rise);for(const side of [-1,1]){k.add(k.cube,this.beam,[x+w/2+side*run/2,z+rise/2,y+d/2],[len,8,d+38],[0,0,-side*angle]);k.add(k.cube,this.snow,[x+w/2+side*run/2,z+rise/2+7,y+d/2],[len+3,9,d+40],[0,0,-side*angle]);for(let a=-8;a<d+20;a+=44)k.beam([x+w/2,z+rise+13,y+a],[x+(side<0?-20:w+20),z+12,y+a],3,this.beam);}
  for(const yy of [y-18,y+d+18]){k.beam([x-30,z-10,yy],[x+w/2+35,z+rise+35,yy],9,this.beam);k.beam([x+w+30,z-10,yy],[x+w/2-35,z+rise+35,yy],9,this.beam);}k.beam([x+w/2,z+rise+12,y-40],[x+w/2,z+rise+12,y+d+40],10,this.beam);
 }
 timberWall(x:number,y:number,w:number,d:number,b:number,h:number){const k=this.k;k.box(x,y,w,d,b,h,this.wood);const horizontal=w>d;for(let z=b+15;z<b+h;z+=20)k.box(x-.7,y-.7,w+1.4,d+1.4,z,2,this.beam);const n=Math.max(1,Math.floor((horizontal?w:d)/105));for(let i=0;i<=n;i++)k.box(x+(horizontal?(w-9)*i/n:0)-1,y+(horizontal?0:(d-9)*i/n)-1,horizontal?9:w+2,horizontal?d+2:9,b,h,this.beam);}
 lantern(x:number,y:number,z:number){const k=this.k;k.cylinderAt(x,y,3,z,78,this.beam);k.box(x-8,y-8,16,16,z+65,23,this.iron);k.box(x-5,y-5,10,10,z+68,17,this.warm);k.add(this.cone,this.iron,[x,z+94,y],[25,12,25]);k.add(this.cone,this.snow,[x,z+97,y],[23,8,23]);}
 pine(x:number,y:number,z:number,h:number){const k=this.k;k.cylinderAt(x,y,7,z,h*.85,this.beam);const green=k.material('#314e48');for(let i=0;i<3;i++){const hh=h*(.62-i*.09),ww=h*(.56-i*.13),e=z+h*(.32+i*.21);k.add(this.cone,green,[x,e,y],[ww,hh,ww]);k.add(this.cone,this.snow,[x,e+hh*.1,y],[ww*.88,hh*.84,ww*.88]);}}
 cargo(x:number,y:number,z:number,w=45,d=w,h=w*.8){const k=this.k;k.box(x,y,w,d,z,h,this.wood);for(const a of [5,w-8]){k.box(x+a,y-1,3,d+2,z,h,this.iron);k.box(x-1,y+(a===5?5:d-8),w+2,3,z,h,this.iron);}k.box(x-2,y-2,w+4,d+4,z+h,3,this.snow);}
 barrel(x:number,y:number,z:number){const k=this.k;k.cylinderAt(x,y,14,z,35,this.wood);for(const e of [4,26])k.cylinderAt(x,y,14.6,z+e,3,this.iron);k.cylinderAt(x,y,14,z+35,3,this.snow);}
 banner(x:number,y:number,z:number){const k=this.k;k.cylinderAt(x,y,4,z,165,this.beam);k.beam([x-25,z+155,y],[x+60,z+155,y],5,this.beam);k.box(x+5,y,48,3,z+65,90,this.red);k.box(x+26,y+3,4,1,z+85,55,k.material('#c4ac81'));}
}
