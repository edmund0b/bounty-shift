import * as THREE from 'three';
import type {MapDefinition} from '../shared/map';
import {surfaceHeight} from '../shared/traversal';
import {VIEW} from '../shared/presentation';

export function buildEnvironment(scene:THREE.Scene,map:MapDefinition){
 const S=VIEW.scale,industrial=map.environment.theme==='industrial',resources=new Set<{dispose:()=>void}>(),solids:THREE.Object3D[]=[];
 const track=<T extends {dispose:()=>void}>(r:T):T=>{resources.add(r);return r;};
 const cube=track(new THREE.BoxGeometry(1,1,1)),plane=track(new THREE.PlaneGeometry(1,1));
 const mats=new Map<string,THREE.Material>();
 const material=(color:string,glow=false)=>{const key=color+glow;if(!mats.has(key))mats.set(key,track(glow?new THREE.MeshBasicMaterial({color,toneMapped:false}):new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.4})));return mats.get(key)!;};
 const batches=new Map<THREE.Material,THREE.Mesh[]>();
 const navy=material(industrial?'#3b3532':'#21354e'),dark=material(industrial?'#161312':'#0a1422'),blue=material(industrial?map.environment.accent:'#46dfff',true),pink=material(industrial?'#b84d22':'#f077de',true),cargo=material(industrial?'#554639':'#304158');
 const cylinder=track(new THREE.CylinderGeometry(.5,.5,1,32)),circle=track(new THREE.CircleGeometry(.5,48));
 function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,solid=false){const mesh=new THREE.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);if(solid){scene.add(mesh);solids.push(mesh);}else{const list=batches.get(mat)??[];list.push(mesh);batches.set(mat,list);}return mesh;}
 const signTextures=new Map<string,THREE.Texture>();
 function sign(text:string,x:number,z:number,w:number,yaw:number,color:string,height:number){
  const key=text+color;let texture=signTextures.get(key);if(!texture){const c=document.createElement('canvas');c.width=1024;c.height=192;const g=c.getContext('2d')!;g.fillStyle='#071321';g.fillRect(0,0,1024,192);g.strokeStyle=color;g.lineWidth=8;g.strokeRect(4,4,1016,184);g.textAlign='center';g.font='600 64px Arial';g.fillStyle='#e5f6ff';g.fillText(text,512,112);g.fillStyle=color;g.fillRect(270,146,484,5);texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;signTextures.set(key,texture);}
  const mat=track(new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide})),mesh=new THREE.Mesh(plane,mat);mesh.scale.set(w,w*192/1024,1);mesh.position.set(x,height,z);mesh.rotation.y=yaw;scene.add(mesh);
 }
 // A single generated floor texture, reusable meshes, and emissive trim keep downloads/draw cost small.
 const c=document.createElement('canvas');c.width=2048;c.height=1654;const g=c.getContext('2d')!,fx=c.width/map.bounds.width,fy=c.height/map.bounds.height;
 g.fillStyle=map.environment.base;g.fillRect(0,0,c.width,c.height);g.strokeStyle='#203b54';g.lineWidth=1;
 for(let x=0;x<map.bounds.width;x+=80){g.beginPath();g.moveTo(x*fx,0);g.lineTo(x*fx,c.height);g.stroke();}
 for(let z=0;z<map.bounds.height;z+=80){g.beginPath();g.moveTo(0,z*fy);g.lineTo(c.width,z*fy);g.stroke();}
 g.strokeStyle='#3c7185';g.lineWidth=4;g.strokeRect(map.plaza.x*fx,map.plaza.y*fy,map.plaza.width*fx,map.plaza.height*fy);
 // Multiple street choices, not a single peripheral corridor.
 if(!industrial){for(const x of [110,570,870,1730,1990,2490]){g.strokeStyle=x===570||x===1990?'#735283':'#345569';g.lineWidth=3;g.beginPath();g.moveTo(x*fx,80*fy);g.lineTo(x*fx,2010*fy);g.stroke();}
 g.setLineDash([12,24]);g.strokeStyle='#587482';for(const y of [800,1480,1700]){g.beginPath();g.moveTo(80*fx,y*fy);g.lineTo(2520*fx,y*fy);g.stroke();}g.setLineDash([]);}
 const texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;
 const floorMat=track(new THREE.MeshStandardMaterial({map:texture,roughness:.32,metalness:.55}));
 if(map.ground){
  // Lava is a visual floor only. The shared ground union, not this plane, grants walkable support.
  const lavaCanvas=document.createElement('canvas');lavaCanvas.width=512;lavaCanvas.height=512;const l=lavaCanvas.getContext('2d')!;l.fillStyle='#b42e06';l.fillRect(0,0,512,512);
  for(let i=0;i<180;i++){const x=i*137%512,y=i*89%512;l.strokeStyle=i%3?'#ef570c':'#ff9c27';l.lineWidth=2+i%4;l.beginPath();l.moveTo(x,y);l.lineTo(x+14+i%29,y+10+i%23);l.lineTo(x+31,y-9);l.stroke();}
  const lavaTexture=track(new THREE.CanvasTexture(lavaCanvas));lavaTexture.wrapS=lavaTexture.wrapT=THREE.RepeatWrapping;lavaTexture.repeat.set(7,7);lavaTexture.colorSpace=THREE.SRGBColorSpace;
  const lava=new THREE.Mesh(plane,track(new THREE.MeshBasicMaterial({map:lavaTexture,color:map.environment.lava,toneMapped:false})));lava.scale.set(map.bounds.width*S,map.bounds.height*S,1);lava.rotation.x=-Math.PI/2;lava.position.set(map.bounds.width*S/2,-.45,map.bounds.height*S/2);scene.add(lava);
  // Tessellate the rectangle union once: no coplanar overlapping plates or per-tile draw calls.
  const rects=map.ground.filter(r=>!r.shape),xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b),vertices:number[]=[],uvs:number[]=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const x=xs[i],z=zs[j],right=xs[i+1],back=zs[j+1];if(!rects.some(r=>(x+right)/2>=r.x&&(x+right)/2<=r.x+r.width&&(z+back)/2>=r.y&&(z+back)/2<=r.y+r.height))continue;
   for(const [xx,zz] of [[x,z],[x,back],[right,back],[x,z],[right,back],[right,z]]){vertices.push(xx*S,0,zz*S);uvs.push(xx/map.bounds.width,1-zz/map.bounds.height);}
  }
  const groundGeometry=track(new THREE.BufferGeometry());groundGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));groundGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));groundGeometry.computeVertexNormals();scene.add(new THREE.Mesh(groundGeometry,floorMat));
  for(const r of map.ground){if(r.shape){const deck=new THREE.Mesh(circle,floorMat);deck.rotation.x=-Math.PI/2;deck.position.set((r.x+r.width/2)*S,0,(r.y+r.height/2)*S);deck.scale.set(r.width*S,r.height*S,1);scene.add(deck);}
   if(!r.shape){const x=(r.x+r.width/2)*S,z=(r.y+r.height/2)*S;box(x,-.15,z,r.width*S,.3,r.height*S,dark);for(const zz of [r.y,r.y+r.height])box(x,.01,zz*S,r.width*S,.025,.035,pink);}
  }
 }else{const floor=new THREE.Mesh(plane,floorMat);floor.scale.set(map.bounds.width*S,map.bounds.height*S,1);floor.rotation.x=-Math.PI/2;floor.position.set(map.bounds.width*S/2,0,map.bounds.height*S/2);scene.add(floor);}
 for(const b of map.blocks){
  const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,w=b.width*S,d=b.height*S,h=(b.top-b.bottom)*S,bottom=b.bottom*S,accent=b.accent.includes('f077')?pink:blue;
  if(b.shape==='ellipse'){
   const mesh=new THREE.Mesh(cylinder,navy);mesh.position.set(x,bottom+h/2,z);mesh.scale.set(w,h,d);scene.add(mesh);solids.push(mesh);
   const rim=new THREE.Mesh(track(new THREE.RingGeometry(.48,.5,48)),blue);rim.rotation.x=-Math.PI/2;rim.scale.set(w,d,1);rim.position.set(x,b.top*S+.025,z);scene.add(rim);continue;
  }
  box(x,bottom+h/2,z,w,h,d,b.kind==='crate'?cargo:b.kind==='rail'?dark:navy,true);
  if(b.kind==='rail'){box(x,bottom+h-.02,z,w,.035,d,accent);continue;}
  for(const zz of [z-d/2,z+d/2])box(x,bottom+h+.02,zz,w,.035,.045,accent);
  for(const xx of [x-w/2,x+w/2])box(xx,bottom+h+.02,z,.045,.035,d,accent);
  if(b.kind==='deck')continue;
  for(const zz of [z-d/2-.015,z+d/2+.015])box(x,bottom+.08,zz,w,.045,.035,accent);
  if(b.kind==='building'){
   box(x,bottom+h+.16,z,w+.2,.25,d+.2,dark);
   for(const xx of [x-w/2-.02,x+w/2+.02])box(xx,bottom+h/2,z,.05,h,.05,accent);
   if(b.name){sign(b.name,x,z+d/2+.035,Math.min(w-.7,11),0,b.accent,bottom+h*.67);sign(b.name,x,z-d/2-.035,Math.min(w-.7,11),Math.PI,b.accent,bottom+h*.67);}
   if(b.name==='WEST DEPOT')sign(b.name,x+w/2+.035,z,Math.min(d-.7,9),Math.PI/2,b.accent,bottom+h*.67);
   if(b.name==='EAST STORAGE')sign(b.name,x-w/2-.035,z,Math.min(d-.7,9),-Math.PI/2,b.accent,bottom+h*.67);
   // Door-like facade light panels remain closed, matching the solid building footprint.
   box(x,1.05,z+d/2+.025,1.5,2.1,.045,dark);box(x,2.12,z+d/2+.055,1.65,.045,.04,accent);
  }else if(b.kind==='crate'){
   for(const xx of [x-w*.35,x+w*.35])box(xx,bottom+h/2,z-d/2-.02,.04,h*.8,.035,dark);
  }
 }
 for(const s of map.surfaces.filter(s=>s.ramp)){
  const low=s.ramp!.to*S,high=s.ramp!.from*S,x=s.x*S,z=s.y*S,w=s.width*S,d=s.height*S,alongX=s.ramp!.axis==='x';
  // Solid wedge; tread markings sit on its smooth, authoritative slope.
  const corners=[[s.x,s.y],[s.x+s.width,s.y],[s.x+s.width,s.y+s.height],[s.x,s.y+s.height]];
  const geo=track(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute([...corners.flatMap(([cx,cz])=>[cx*S,surfaceHeight(s,{x:cx,y:cz})*S,cz*S]),...corners.flatMap(([cx,cz])=>[cx*S,0,cz*S])],3));geo.setIndex([0,3,2,0,2,1,4,1,5,4,0,1,5,2,6,5,1,2,6,3,7,6,2,3,7,0,4,7,3,0]);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,navy);scene.add(mesh);solids.push(mesh);
  const slope=Math.atan2(high-low,alongX?w:d),count=s.style==='stairs'?24:10;
  for(let i=0;i<=count;i++){const t=i/count,strip=new THREE.Mesh(plane,i%4===0?blue:material('#687f91'));strip.scale.set(alongX?d:w,.035,1);strip.rotation.set(-Math.PI/2+slope,0,0);if(alongX)strip.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));strip.position.set(alongX?x+w*t:x+w/2,high+(low-high)*t+.012,alongX?z+d/2:z+d*t);scene.add(strip);}
  if(alongX){for(const zz of [z+.03,z+d-.03]){const rail=box(x+w/2,(high+low)/2+.7,zz,Math.hypot(w,high-low),.055,.055,blue);rail.rotation.z=-slope;}}
  else for(const xx of [x+.03,x+w-.03]){const rail=box(xx,(high+low)/2+.7,z+d/2,.055,.055,Math.hypot(d,high-low),blue);rail.rotation.x=slope;}
 }
 if(!industrial){
 // Strong plaza landmark: solid plinth, slender twin energy pylons, concentric floor rings.
 const base=map.blocks.find(b=>b.kind==='monument')!,mx=(base.x+base.width/2)*S,mz=(base.y+base.height/2)*S;
 for(const x of [mx-1.8,mx+1.8]){box(x,4.15,mz,.36,7,.36,blue);box(x,.8,mz,.62,.5,.62,dark);}
 for(const radius of [3.2,4.1]){const ring=new THREE.Mesh(track(new THREE.RingGeometry(radius,radius+.035,64)),track(new THREE.MeshBasicMaterial({color:'#46dfff',side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.set(mx,.02,mz);scene.add(ring);}
 // Monument details are decorative; its shared solid plinth blocks feet and low melee.
 sign('CENTRAL PLAZA',mx,mz,6.5,0,'#46dfff',3.6);sign('CENTRAL PLAZA',mx,mz,6.5,Math.PI,'#46dfff',3.6);
 sign('NORTH BRIDGE',1300*S,281*S,8,Math.PI,'#46dfff',4.5);sign('NORTH BRIDGE',1300*S,428*S,8,0,'#46dfff',4.5);
 const trunk=track(new THREE.CylinderGeometry(.08,.13,1.4,6)),leaf=track(new THREE.IcosahedronGeometry(.8,0)),green=material('#285d50');
 for(const b of map.blocks.filter(b=>b.kind==='planter')){const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,tree=new THREE.Mesh(trunk,dark);tree.position.set(x,b.top*S+.7,z);scene.add(tree);const crown=new THREE.Mesh(leaf,green);crown.position.set(x,b.top*S+1.7,z);crown.scale.set(1,1.25,1);scene.add(crown);}
 }else{
  const center=map.plaza,x=(center.x+center.width/2)*S,z=(center.y+center.height/2)*S;
  const landmark=map.blocks.find(b=>b.kind==='monument')?.name??map.name.toUpperCase();
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])sign(landmark,x+Math.sin(a)*2.2,z+Math.cos(a)*2.2,6,a,'#ff772b',7.4);
  for(const r of [1.35,1.7,2.1]){const glow=new THREE.Mesh(track(new THREE.RingGeometry(r,r+.08,48)),blue);glow.rotation.x=-Math.PI/2;glow.position.set(x,5.58,z);scene.add(glow);}
  for(let i=0;i<16;i++){const a=i*Math.PI/8;if(i%4===0)continue;const column=new THREE.Mesh(cylinder,dark);column.scale.set(.32,2.4,.32);column.position.set(x+Math.cos(a)*9.5,1.4,z+Math.sin(a)*9.5);scene.add(column);}
  for(const item of map.decorations??[]){const x=item.x*S,z=item.y*S,bottom=(item.elevation??0)*S,w=item.width*S,h=item.height*S,d=item.depth*S;
   if(item.kind==='lavafall'){box(x,h/2,z,w,h,d,blue);continue;}
   if(item.kind==='rock'){const rock=new THREE.Mesh(track(new THREE.IcosahedronGeometry(.5,0)),dark);rock.scale.set(w,h,d);rock.position.set(x,bottom+h/2,z);scene.add(rock);continue;}
   const mesh=new THREE.Mesh(cylinder,item.kind==='vent'?blue:cargo);mesh.position.set(x,bottom+h/2,z);mesh.scale.set(w,h,d);
   if(item.kind==='pipe'&&w>h){mesh.rotation.z=Math.PI/2;mesh.scale.set(h,w,d);mesh.position.y=bottom+h;}
   scene.add(mesh);for(const yy of [bottom+h*.15,bottom+h*.8])box(x,yy,z,w+.03,.035,d+.03,pink);
  }
 }
 // Playable boundaries read as low illuminated curbs; skyline is outside them.
 for(const z of [0,map.bounds.height*S])box(map.bounds.width*S/2,.22,z,map.bounds.width*S,.44,.15,blue);
 for(const x of [0,map.bounds.width*S])box(x,.22,map.bounds.height*S/2,.15,.44,map.bounds.height*S,blue);
 if(!industrial)for(let i=0;i<28;i++){const x=i*3.3-5,h=9+(i*7%15);for(const z of [-8,map.bounds.height*S+8]){box(x,h/2,z,2.1,h,2.5,dark);for(let y=2;y<h;y+=3)box(x,y,z+1.27,1.2,.06,.025,i%3?blue:pink);}}
 for(const [mat,meshes] of batches){const instances=track(new THREE.InstancedMesh(cube,mat,meshes.length));for(const [i,mesh] of meshes.entries()){mesh.updateMatrix();instances.setMatrixAt(i,mesh.matrix);}instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();scene.add(instances);}
 return {solids,dispose(){resources.forEach(r=>r.dispose());resources.clear();}};
}
