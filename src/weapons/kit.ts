import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Asset-local resource owner. Batches stay inside semantic parts for future rigging. */
export class WeaponKit{
 root=new T.Group();resources=new Set<{dispose:()=>void}>();
 steel:T.MeshStandardMaterial;dark:T.MeshStandardMaterial;edge:T.MeshStandardMaterial;rubber:T.MeshStandardMaterial;energy:T.MeshStandardMaterial;brass:T.MeshStandardMaterial;
 cube:T.BufferGeometry;cylinder:T.BufferGeometry;sphere:T.BufferGeometry;
 constructor(color:number){
  this.steel=this.mat(0x69727d,.65,.48);this.dark=this.mat(0x171d25,.7,.6);this.edge=this.mat(0xb5bdc7,.82,.32);this.rubber=this.mat(0x181a1e,.04,.94);this.energy=this.mat(color,.25,.32);this.energy.emissive.setHex(color);this.energy.emissiveIntensity=.85;this.energy.color.setHex(0x080808);this.energy.toneMapped=false;this.brass=this.mat(0x88705b,.76,.4);
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#c4c4c4';ctx.fillRect(0,0,256,256);for(let i=0;i<1800;i++){const x=i*73%256,y=i*137%256;ctx.fillStyle=i%4?'#ababab':'#eeeeee';ctx.fillRect(x,y,i%7+1,1);}const texture=this.track(new T.CanvasTexture(c));texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;this.steel.map=texture;this.steel.bumpMap=texture;this.steel.bumpScale=.008;}}
  this.cube=this.track(new T.BoxGeometry(1,1,1));this.cylinder=this.track(new T.CylinderGeometry(1,1,1,16));this.sphere=this.track(new T.IcosahedronGeometry(1,2));
 }
 track<R extends {dispose:()=>void}>(r:R):R{this.resources.add(r);return r;}
 mat(color:number,metalness=.5,roughness=.5){return this.track(new T.MeshStandardMaterial({color,metalness,roughness}));}
 mesh(parent:T.Object3D,geo:T.BufferGeometry,mat:T.Material,p:number[],s:number[],r=[0,0,0]){const m=new T.Mesh(geo,mat);m.position.set(p[0],p[1],p[2]);m.scale.set(s[0],s[1],s[2]);m.rotation.set(r[0],r[1],r[2]);parent.add(m);return m;}
 box(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material=this.steel,r=0){return this.mesh(p,this.cube,mat,[x,y,z],[w,h,d],[0,0,r]);}
 cylinderAt(p:T.Object3D,x:number,y:number,z:number,radius:number,length:number,mat:T.Material=this.steel,axis='x'){return this.mesh(p,this.cylinder,mat,[x,y,z],[radius,length,radius],axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0]);}
 ring(p:T.Object3D,x:number,y:number,z:number,radius:number,tube:number,mat:T.Material=this.edge,axis='x'){const g=this.track(new T.TorusGeometry(radius,tube,6,32));return this.mesh(p,g,mat,[x,y,z],[1,1,1],axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]);}
 shape(p:T.Object3D,points:number[][],depth:number,z=0,mat:T.Material=this.steel,bevel=.025){const shape=new T.Shape(points.map(q=>new T.Vector2(q[0],q[1])));const geo=this.track(new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:8}));geo.translate(0,0,z-depth/2);const mesh=new T.Mesh(geo,mat);p.add(mesh);return mesh;}
 beam(p:T.Object3D,a:number[],b:number[],width:number,mat:T.Material=this.edge){const from=new T.Vector3(...a as [number,number,number]),to=new T.Vector3(...b as [number,number,number]);const m=new T.Mesh(this.cube,mat);m.position.copy(from.clone().add(to).multiplyScalar(.5));m.scale.set(width,from.distanceTo(to),width);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());p.add(m);return m;}
 grip(p:T.Object3D,x=0,length=.55,r=.09){this.cylinderAt(p,x,0,0,r,length,this.rubber);for(let i=0;i<12;i++){const xx=x-length/2+i*length/11;this.ring(p,xx,0,0,r+.002,.01,i%3?this.dark:this.brass);}for(const xx of [x-length/2-.025,x+length/2+.025])this.cylinderAt(p,xx,0,0,r*1.2,.05,this.edge);}
 bolts(p:T.Object3D,points:number[][],z:number){for(const [x,y]of points)for(const side of [-1,1]){this.cylinderAt(p,x,y,side*z,.034,.018,this.edge,'z');this.cylinderAt(p,x,y,side*(z+.012),.013,.021,this.dark,'z');}}
 part(name:string,parent:T.Object3D=this.root){const group=new T.Group();group.name=name;parent.add(group);return group;}
 batch(part:T.Object3D){const batches=new Map<T.Material,T.BufferGeometry[]>();for(const child of [...part.children]){if(!(child instanceof T.Mesh)||Array.isArray(child.material)||child.userData.keep)continue;child.updateMatrix();let geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);const list=batches.get(child.material)??[];list.push(geo);batches.set(child.material,list);part.remove(child);}for(const [material,geos]of batches){const merged=mergeGeometries(geos,false)!;geos.forEach(g=>g.dispose());this.track(merged);const mesh=new T.Mesh(merged,material);mesh.name=part.name+'-surface';part.add(mesh);}}
 dispose(){this.root.removeFromParent();this.resources.forEach(r=>r.dispose());this.resources.clear();this.root.clear();}
}
