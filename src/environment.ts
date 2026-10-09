import {buildVikingsFjord} from './environments/vikings-fjord';
import {buildOutlawsCanyon} from './environments/outlaws-canyon';
import {buildAerieSkyPort} from './environments/aerie-sky-port';
import {buildScorchedPoint} from './environments/scorched-point';
import {buildCentralPlaza} from './environments/central-plaza';
import * as THREE from 'three';
import {mapEnvironment} from '../shared/map';
import type {MapDefinition} from '../shared/map';
import {surfaceHeight} from '../shared/traversal';
import {VIEW} from '../shared/presentation';

export function buildEnvironment(scene:THREE.Scene,map:MapDefinition,variant:string|null=null){
 if(map.id==='vikings_fjord')return buildVikingsFjord(scene,map);
 if(map.id==='outlaws_canyon')return buildOutlawsCanyon(scene,map);
 if(map.id==='aerie_sky_port')return buildAerieSkyPort(scene,map,variant);
 if(map.id==='scorched_point')return buildScorchedPoint(scene,map);
 if(map.id==='central_plaza')return buildCentralPlaza(scene,map);
 const env=mapEnvironment(map,variant),sky=env.theme==='sky_port',canyon=env.theme==='canyon',fjord=env.theme==='fjord',night=variant==='night';
 const S=VIEW.scale,industrial=env.theme==='industrial',resources=new Set<{dispose:()=>void}>(),solids:THREE.Object3D[]=[];
 const track=<T extends {dispose:()=>void}>(r:T):T=>{resources.add(r);return r;};
 const cube=track(new THREE.BoxGeometry(1,1,1)),plane=track(new THREE.PlaneGeometry(1,1));
 const mats=new Map<string,THREE.Material>();
 const material=(color:string,glow=false)=>{const key=color+glow;if(!mats.has(key))mats.set(key,track(glow?new THREE.MeshBasicMaterial({color,toneMapped:false}):new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.4})));return mats.get(key)!;};
 const batches=new Map<THREE.Material,THREE.Mesh[]>();
 const navy=material(fjord?'#586b78':canyon?'#a98559':sky?(night?'#657594':'#ddd9c9'):industrial?'#3b3532':'#21354e'),dark=material(fjord?'#293c49':canyon?'#59432f':sky?'#35475c':industrial?'#161312':'#0a1422'),blue=material(fjord?'#c9e2e9':canyon?'#9b7748':sky||industrial?env.accent:'#46dfff',!canyon&&!fjord),pink=material(fjord?'#759cab':canyon?'#7f5540':sky?(night?'#9d99ed':'#dbc28e'):industrial?'#b84d22':'#f077de',!canyon&&!fjord),cargo=material(fjord?'#4c4339':canyon?'#82624a':sky?'#7c91a5':industrial?'#554639':'#304158');
 const cylinder=track(new THREE.CylinderGeometry(.5,.5,1,32)),circle=track(new THREE.CircleGeometry(.5,48));
 function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,solid=false){const mesh=new THREE.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);if(solid){scene.add(mesh);solids.push(mesh);}else{const list=batches.get(mat)??[];list.push(mesh);batches.set(mat,list);}return mesh;}
 const signTextures=new Map<string,THREE.Texture>();
 function sign(text:string,x:number,z:number,w:number,yaw:number,color:string,height:number){
  const key=text+color;let texture=signTextures.get(key);if(!texture){const c=document.createElement('canvas');c.width=1024;c.height=192;const g=c.getContext('2d')!;g.fillStyle='#071321';g.fillRect(0,0,1024,192);g.strokeStyle=color;g.lineWidth=8;g.strokeRect(4,4,1016,184);g.textAlign='center';g.font='600 64px Arial';g.fillStyle='#e5f6ff';g.fillText(text,512,112);g.fillStyle=color;g.fillRect(270,146,484,5);texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;signTextures.set(key,texture);}
  const mat=track(new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide})),mesh=new THREE.Mesh(plane,mat);mesh.scale.set(w,w*192/1024,1);mesh.position.set(x,height,z);mesh.rotation.y=yaw;scene.add(mesh);
 }
 // A single generated floor texture, reusable meshes, and emissive trim keep downloads/draw cost small.
 const c=document.createElement('canvas');c.width=2048;c.height=1654;const g=c.getContext('2d')!,fx=c.width/map.bounds.width,fy=c.height/map.bounds.height;
 g.fillStyle=env.base;g.fillRect(0,0,c.width,c.height);g.strokeStyle=fjord?'#c3d5dd':canyon?'#af956f':'#203b54';g.lineWidth=1;
 for(let x=0;x<map.bounds.width;x+=80){g.beginPath();g.moveTo(x*fx,0);g.lineTo(x*fx,c.height);g.stroke();}
 for(let z=0;z<map.bounds.height;z+=80){g.beginPath();g.moveTo(0,z*fy);g.lineTo(c.width,z*fy);g.stroke();}
 g.strokeStyle=fjord?'#9db8c7':canyon?'#ac8d61':'#3c7185';g.lineWidth=4;g.strokeRect(map.plaza.x*fx,map.plaza.y*fy,map.plaza.width*fx,map.plaza.height*fy);
 if(canyon){
  g.fillStyle='#b59970';g.fillRect(820*fx,600*fy,310*fx,1800*fy);
  for(let i=0;i<1600;i++){g.fillStyle=i%3?'#b39871':'#c6ad85';g.fillRect((i*137%map.bounds.width)*fx,(i*239%map.bounds.height)*fy,2+i%5,1+i%3);}
 }
 // Multiple street choices, not a single peripheral corridor.
 if(!industrial&&!sky&&!canyon&&!fjord){for(const x of [110,570,870,1730,1990,2490]){g.strokeStyle=x===570||x===1990?'#735283':'#345569';g.lineWidth=3;g.beginPath();g.moveTo(x*fx,80*fy);g.lineTo(x*fx,2010*fy);g.stroke();}
 g.setLineDash([12,24]);g.strokeStyle='#587482';for(const y of [800,1480,1700]){g.beginPath();g.moveTo(80*fx,y*fy);g.lineTo(2520*fx,y*fy);g.stroke();}g.setLineDash([]);}
 const texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;
 const floorMat=track(new THREE.MeshStandardMaterial({map:texture,roughness:fjord?.85:.32,metalness:fjord?.08:.55}));
 if(map.ground){
  // Lava is a visual floor only. The shared ground union, not this plane, grants walkable support.
  if(!sky&&!canyon&&!fjord){const lavaCanvas=document.createElement('canvas');lavaCanvas.width=512;lavaCanvas.height=512;const l=lavaCanvas.getContext('2d')!;l.fillStyle='#b42e06';l.fillRect(0,0,512,512);
  for(let i=0;i<180;i++){const x=i*137%512,y=i*89%512;l.strokeStyle=i%3?'#ef570c':'#ff9c27';l.lineWidth=2+i%4;l.beginPath();l.moveTo(x,y);l.lineTo(x+14+i%29,y+10+i%23);l.lineTo(x+31,y-9);l.stroke();}
  const lavaTexture=track(new THREE.CanvasTexture(lavaCanvas));lavaTexture.wrapS=lavaTexture.wrapT=THREE.RepeatWrapping;lavaTexture.repeat.set(7,7);lavaTexture.colorSpace=THREE.SRGBColorSpace;
  const lava=new THREE.Mesh(plane,track(new THREE.MeshBasicMaterial({map:lavaTexture,color:env.lava,toneMapped:false})));lava.scale.set(map.bounds.width*S,map.bounds.height*S,1);lava.rotation.x=-Math.PI/2;lava.position.set(map.bounds.width*S/2,-.45,map.bounds.height*S/2);scene.add(lava);}
  // Tessellate the rectangle union once: no coplanar overlapping plates or per-tile draw calls.
  const rects=map.ground.filter(r=>!r.shape),xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b),vertices:number[]=[],uvs:number[]=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const x=xs[i],z=zs[j],right=xs[i+1],back=zs[j+1];if(!rects.some(r=>(x+right)/2>=r.x&&(x+right)/2<=r.x+r.width&&(z+back)/2>=r.y&&(z+back)/2<=r.y+r.height))continue;
   for(const [xx,zz] of [[x,z],[x,back],[right,back],[x,z],[right,back],[right,z]]){vertices.push(xx*S,0,zz*S);uvs.push(xx/map.bounds.width,1-zz/map.bounds.height);}
  }
  const groundGeometry=track(new THREE.BufferGeometry());groundGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));groundGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));groundGeometry.computeVertexNormals();scene.add(new THREE.Mesh(groundGeometry,floorMat));
  for(const r of map.ground){if(r.shape){const geo=track(circle.clone());if(sky){const uv=geo.getAttribute('uv'),pos=geo.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,(r.x+r.width/2+pos.getX(i)*r.width)/map.bounds.width,1-(r.y+r.height/2-pos.getY(i)*r.height)/map.bounds.height);}const deck=new THREE.Mesh(geo,floorMat);deck.rotation.x=-Math.PI/2;deck.position.set((r.x+r.width/2)*S,sky?.001:0,(r.y+r.height/2)*S);deck.scale.set(r.width*S,r.height*S,1);scene.add(deck);if(sky){const foundation=new THREE.Mesh(cylinder,dark);foundation.position.set((r.x+r.width/2)*S,-.18,(r.y+r.height/2)*S);foundation.scale.set(r.width*S,.35,r.height*S);scene.add(foundation);}}
   if(!r.shape){const x=(r.x+r.width/2)*S,z=(r.y+r.height/2)*S;box(x,-.15,z,r.width*S,.3,r.height*S,dark);for(const zz of [r.y,r.y+r.height])box(x,.01,zz*S,r.width*S,.025,.035,pink);}
  }
 }else{const floor=new THREE.Mesh(plane,floorMat);floor.scale.set(map.bounds.width*S,map.bounds.height*S,1);floor.rotation.x=-Math.PI/2;floor.position.set(map.bounds.width*S/2,0,map.bounds.height*S/2);scene.add(floor);}
 for(const b of map.blocks){
  const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,w=b.width*S,d=b.height*S,h=(b.top-b.bottom)*S,bottom=b.bottom*S,accent=b.accent.includes('f077')?pink:blue;
  if(b.shape==='ellipse'){
   const mesh=new THREE.Mesh(cylinder,canyon&&b.id.startsWith('barrel-body')?dark:navy);mesh.position.set(x,bottom+h/2,z);mesh.scale.set(w,h,d);scene.add(mesh);solids.push(mesh);
   const rim=new THREE.Mesh(track(new THREE.RingGeometry(.48,.5,48)),blue);rim.rotation.x=-Math.PI/2;rim.scale.set(w,d,1);rim.position.set(x,b.top*S+.025,z);scene.add(rim);continue;
  }
  box(x,bottom+h/2,z,w,h,d,b.kind==='crate'?cargo:b.kind==='rail'?dark:fjord&&b.id.startsWith('ice-cliff')?material('#7098ae'):fjord&&b.kind==='building'?material('#403a32'):navy,true);
  if(b.kind==='rail'){box(x,bottom+h-.02,z,w,.035,d,accent);continue;}
  for(const zz of [z-d/2,z+d/2])box(x,bottom+h+.02,zz,w,.035,.045,accent);
  for(const xx of [x-w/2,x+w/2])box(xx,bottom+h+.02,z,.045,.035,d,accent);
  if(b.kind==='deck')continue;
  for(const zz of [z-d/2-.015,z+d/2+.015])box(x,bottom+.08,zz,w,.045,.035,accent);
  if(b.kind==='building'){
   if(!fjord&&(!canyon||!map.surfaces.some(s=>s.id===b.id+'-roof')))box(x,bottom+h+.16,z,w+.2,.25,d+.2,dark);
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
  for(let i=0;i<=count;i++){const t=i/count;if(fjord){box(alongX?x+w*t:x+w/2,high+(low-high)*t+.012,alongX?z+d/2:z+d*t,alongX?.035:w,.016,alongX?d:.035,blue);continue;}const strip=new THREE.Mesh(plane,i%4===0?blue:material('#687f91'));strip.scale.set(alongX?d:w,.035,1);strip.rotation.set(-Math.PI/2+slope,0,0);if(alongX)strip.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));strip.position.set(alongX?x+w*t:x+w/2,high+(low-high)*t+.012,alongX?z+d/2:z+d*t);scene.add(strip);}
  if(alongX){for(const zz of [z+.03,z+d-.03]){const rail=box(x+w/2,(high+low)/2+.7,zz,Math.hypot(w,high-low),.055,.055,blue);rail.rotation.z=-slope;}}
  else for(const xx of [x+.03,x+w-.03]){const rail=box(xx,(high+low)/2+.7,z+d/2,.055,.055,Math.hypot(d,high-low),blue);rail.rotation.x=slope;}
 }
 if(!industrial&&!sky&&!canyon&&!fjord){
 // Strong plaza landmark: solid plinth, slender twin energy pylons, concentric floor rings.
 const base=map.blocks.find(b=>b.kind==='monument')!,mx=(base.x+base.width/2)*S,mz=(base.y+base.height/2)*S;
 for(const x of [mx-1.8,mx+1.8]){box(x,4.15,mz,.36,7,.36,blue);box(x,.8,mz,.62,.5,.62,dark);}
 for(const radius of [3.2,4.1]){const ring=new THREE.Mesh(track(new THREE.RingGeometry(radius,radius+.035,64)),track(new THREE.MeshBasicMaterial({color:'#46dfff',side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.set(mx,.02,mz);scene.add(ring);}
 // Monument details are decorative; its shared solid plinth blocks feet and low melee.
 sign('CENTRAL PLAZA',mx,mz,6.5,0,'#46dfff',3.6);sign('CENTRAL PLAZA',mx,mz,6.5,Math.PI,'#46dfff',3.6);
 sign('NORTH BRIDGE',1300*S,281*S,8,Math.PI,'#46dfff',4.5);sign('NORTH BRIDGE',1300*S,428*S,8,0,'#46dfff',4.5);
 const trunk=track(new THREE.CylinderGeometry(.08,.13,1.4,6)),leaf=track(new THREE.IcosahedronGeometry(.8,0)),green=material('#285d50');
 for(const b of map.blocks.filter(b=>b.kind==='planter')){const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,tree=new THREE.Mesh(trunk,dark);tree.position.set(x,b.top*S+.7,z);scene.add(tree);const crown=new THREE.Mesh(leaf,green);crown.position.set(x,b.top*S+1.7,z);crown.scale.set(1,1.25,1);scene.add(crown);}
 }else if(fjord){
  const snow=material('#e0eaf0'),ice=material('#86b4cc'),wood=material('#403a32'),rune=material('#87e8f4',true),warm=material('#ffc58b',true);
  const rockGeo=track(new THREE.IcosahedronGeometry(.5,0)),icicleGeo=track(new THREE.ConeGeometry(.065,.6,5)),icicles:THREE.Mesh[]=[];
  // Gabled timber halls, snow caps and heavy beams replace flat sci-fi roof silhouettes.
  for(const b of map.blocks.filter(b=>b.kind==='building')){
   const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,w=b.width*S,d=b.height*S,top=b.top*S,rise=Math.min(w*.58,6);
   const vertices=[-w/2,0,-d/2,w/2,0,-d/2,0,rise,-d/2,-w/2,0,d/2,w/2,0,d/2,0,rise,d/2];
   const geo=track(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geo.computeVertexNormals();
   box(x,.45,z,w,.9,d,navy);
   const roof=new THREE.Mesh(geo,snow);roof.position.set(x,top,z);scene.add(roof);solids.push(roof);
   for(const zz of [z-d/2-.02,z+d/2+.02]){
    const face=new THREE.Mesh(plane,wood);face.position.set(x,top+.25,zz);face.scale.set(w,.4,1);scene.add(face);
    for(const xx of [x-w/2+.2,x,x+w/2-.2])box(xx,top/2,zz,.19,top,.17,wood);
    for(const side of [-1,1]){const beam=box(x+side*w/4,top+rise/2,zz,Math.hypot(w/2,rise),.16,.17,wood);beam.rotation.z=side===-1?Math.atan2(rise,w/2):-Math.atan2(rise,w/2);}
    for(let i=0;i<7;i++){const icicle=new THREE.Mesh(icicleGeo,ice);icicle.position.set(x-w*.43+i*w*.14,top-.22,zz);icicle.rotation.z=Math.PI;icicles.push(icicle);}
    for(const xx of [x-.95,x+.95]){box(xx,1.5,zz+.03,.16,.5,.16,warm);box(xx,1.1,zz,.1,.45,.1,wood);}
   }
  }
  const icicleInstances=track(new THREE.InstancedMesh(icicleGeo,ice,icicles.length));for(const [i,mesh] of icicles.entries()){mesh.updateMatrix();icicleInstances.setMatrixAt(i,mesh.matrix);}icicleInstances.computeBoundingSphere();scene.add(icicleInstances);
  // Timber bridges/docks and snow-covered stone battlements share authoritative flat tops.
  for(const deck of map.surfaces.filter(s=>!s.ramp)){
   for(let y=deck.y+20;y<deck.y+deck.height;y+=45)box((deck.x+deck.width/2)*S,deck.elevation*S+.015,y*S,deck.width*S,.025,.05,wood);
   if(deck.id.includes('battlement')||deck.id==='north-wall-walk')for(let x=deck.x+25;x<deck.x+deck.width;x+=75)box(x*S,deck.elevation*S+.6,(deck.y+15)*S,.8,1.2,.4,navy);
  }
  // Snow caps stay decorative; collision belongs to the visible body footprints.
  for(const b of map.blocks.filter(b=>b.kind!=='building'&&b.kind!=='deck'&&b.kind!=='rail')){
   box((b.x+b.width/2)*S,b.top*S+.04,(b.y+b.height/2)*S,b.width*S,.08,b.height*S,snow);
   if(b.id.startsWith('ice-cliff')||b.id.startsWith('frost-cover')&&b.kind==='monument'){
    const mesh=new THREE.Mesh(rockGeo,ice);mesh.position.set((b.x+b.width/2)*S,b.top*S*.55,(b.y+b.height/2)*S);mesh.scale.set(b.width*S*.8,b.top*S,b.height*S*.8);scene.add(mesh);
   }
  }
  // Fictional Nordic rune strokes contrast with dark standing stones, not glowing neon walls.
  for(const [xx,zz,base,height] of [[1037,1676,0,4.2],[1300,630,90,1.8],[1408,1400,0,3.2]]){
   box(xx*S,base*S+height*.55,zz*S,.045,height*.65,.035,rune);
   for(const direction of [-1,1]){const glyph=box(xx*S+direction*.14,base*S+height*.7,zz*S,.38,.045,.035,rune);glyph.rotation.z=direction*.65;}
  }
  sign('RUNESTONE PLAZA',1037*S,1677*S,5,0,env.accent,4.7);sign('RUNESTONE PLAZA',1037*S,1578*S,5,Math.PI,env.accent,4.7);
  sign("RAIDER'S COVE",1560*S,1361*S,6,Math.PI,env.accent,4.8);
  sign("RAIDER'S COVE",1560*S,1681*S,6,0,env.accent,4.8);
  sign('FROST-GUARD DOCKS',1110*S,2238*S,8,0,env.accent,4.3);sign('FROST-GUARD DOCKS',1110*S,2058*S,8,Math.PI,env.accent,4.3);
  sign("VIKING'S FJORD",1100*S,1100*S,7,0,env.accent,5.6);
  // Low-poly ice cliffs and distant snowy mountains build depth without physics or extra lights.
  for(let i=0;i<22;i++){
   const mesh=new THREE.Mesh(rockGeo,i%3?ice:snow),side=i%2;
   mesh.position.set((side?2130:65)*S,5+(i%3),150*S+(i>>1)*6.3);mesh.scale.set(5+i%3,14+i%5,6);scene.add(mesh);
  }
  for(let i=0;i<14;i++){const mesh=new THREE.Mesh(rockGeo,i%2?snow:navy);mesh.position.set((i%2?-350:2580)*S,6,(i*213%2800)*S);mesh.scale.set(15+i%4,25+i%5,16);scene.add(mesh);}
  // Static frozen coastal water and one longship silhouette; no swimming or ice physics.
  const water=new THREE.Mesh(plane,ice);water.rotation.x=-Math.PI/2;water.scale.set(120,80,1);water.position.set(33,-.55,72);scene.add(water);
  const hull=new THREE.Mesh(track(new THREE.CylinderGeometry(.5,.35,1,8)),wood);hull.position.set(51,-.1,69);hull.scale.set(2.2,1.1,8);scene.add(hull);
  box(51,2.4,69,.14,4.6,.14,wood);box(51,3,69,2.3,2,.065,material('#829baa'));
  for(const zz of [65,73])box(51,.6,zz,.25,1.7,.3,wood);
  for(let i=0;i<8;i++){const crack=box(27+i*2,-.5,72+i%3,.025,.02,3,navy);crack.rotation.y=i*.8;}
 }else if(canyon){
  const wood=material('#604631'),rust=material('#846655'),sand=material('#b39369'),lantern=material('#ffca7a',true);
  // Timber porches, patched facades and corrugated sheets reinforce the frontier silhouette.
  for(const b of map.blocks.filter(b=>b.kind==='building')){
   const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,w=b.width*S,d=b.height*S,top=b.top*S;
   for(let i=0;i<Math.floor(w/.45);i++)box(x-w/2+i*.45,top+.015,z,.025,.025,d,rust);
   for(const xx of [x-w*.34,x+w*.34]){box(xx,top*.5,z+d/2+.055,.65,.85,.04,wood);box(xx,top*.5,z-d/2-.055,.65,.85,.04,wood);}
   for(const xx of [x-w/2+.15,x+w/2-.15]){box(xx,top*.5,z+d/2+.13,.14,top,.14,wood);box(xx,.75,z+d/2+.32,.15,.28,.15,lantern);}
   if(b.name?.includes('MINE'))for(let i=0;i<6;i++)box(x-w/2+i*w/6,.02,z+d/2+1.2,.05,.025,2.5,rust);
  }
  // Walkable timber platforms remain at the authoritative top; small planks are visual only.
  for(const s of map.surfaces.filter(s=>!s.ramp)){
   for(let y=s.y+20;y<s.y+s.height;y+=35)box((s.x+s.width/2)*S,s.elevation*S+.012,y*S,s.width*S,.022,.04,wood);
   for(const x of [s.x+15,s.x+s.width-15])box(x*S,s.elevation*S/2,(s.y+s.height/2)*S,.16,s.elevation*S,.16,wood);
  }
  
  sign('DEADWOOD SALOON',550*S,802*S,8,0,'#bb9a65',6.2);
  for(const x of [395,795]){box(x*S,3.15,900*S,.17,1.5,.17,wood);box(x*S,3.8,900*S,.28,.35,.28,lantern);}
  // A high timber gate identifies the southern crossing without blocking the street.
  for(const x of [850,1230])box(x*S,2.8,1980*S,.2,5.6,.2,wood);
  sign('GHOST TOWN CROSSING',1040*S,1981*S,10,0,'#b39564',5.5);sign('GHOST TOWN CROSSING',1040*S,1979*S,10,Math.PI,'#b39564',5.5);
  sign('DUST-UP PLAZA',950*S,320*S,7,0,'#b39564',4.5);
  // Low-poly rock layers wrap the gameplay cliffs and continue into distant mesas.
  const rockGeo=track(new THREE.IcosahedronGeometry(.5,0));
  for(let i=0;i<38;i++){
   const side=i%2===0,xx=(side?60:1830)+(i%3-1)*35,zz=140+(i>>1)*130;
   const mesh=new THREE.Mesh(rockGeo,i%3?sand:navy);mesh.scale.set(7+i%3,11+i%5,7);mesh.position.set(xx*S,4.2,zz*S);scene.add(mesh);
  }
  for(let i=0;i<12;i++){const mesh=new THREE.Mesh(rockGeo,sand);mesh.scale.set(12+i%4,13+i%5,12);mesh.position.set((i%2?-230:2130)*S,5,(i*257%2900)*S);scene.add(mesh);}
  for(const item of map.decorations??[]){const x=item.x*S,z=item.y*S,w=item.width*S,h=item.height*S,d=item.depth*S;
   if(item.kind==='barrel')for(const y of [h*.2,h*.8]){const band=new THREE.Mesh(cylinder,rust);band.scale.set(w+.03,.055,d+.03);band.position.set(x,y,z);scene.add(band);}
   if(item.kind==='cart'){box(x,h*.6,z,w,h*.55,d,rust);for(const xx of [x-w*.3,x+w*.3])for(const zz of [z-d*.55,z+d*.55]){const wheel=new THREE.Mesh(cylinder,dark);wheel.rotation.x=Math.PI/2;wheel.scale.set(.6,.16,.6);wheel.position.set(xx,.32,zz);scene.add(wheel);}}
  }
 }else if(sky){
  // Open-air landmarks share geometry across variants; palette and lighting alone change.
  for(const b of map.blocks.filter(b=>b.kind==='monument')){
   const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S;
   for(const a of [0,Math.PI])sign(b.name??map.name,x,z+(a===0?1:-1)*b.height*S/2,Math.max(4,b.width*S),a,env.accent,b.top*S+1.3);
  }
  sign('AERIE SKY-PORT',1100*S,1300*S,7,0,env.accent,5.5);
  const shell=track(new THREE.SphereGeometry(.5,20,10,0,Math.PI*2,0,Math.PI/2));
  const glass=material(night?'#405b88':'#adc9d6');
  for(const item of map.decorations??[]){
   const x=item.x*S,z=item.y*S,y=(item.elevation??0)*S,w=item.width*S,h=item.height*S,d=item.depth*S;
   if(item.kind==='dome'){
    const dome=new THREE.Mesh(shell,glass);dome.position.set(x,y,z);dome.scale.set(w,h*2,d);scene.add(dome);solids.push(dome);
    const ribs=new THREE.Mesh(shell,track(new THREE.MeshBasicMaterial({color:night?'#92bdd8':'#e2dfcd',wireframe:true})));ribs.position.copy(dome.position);ribs.scale.copy(dome.scale).multiplyScalar(1.003);scene.add(ribs);
    const rim=new THREE.Mesh(track(new THREE.RingGeometry(.48,.5,32)),blue);rim.rotation.x=-Math.PI/2;rim.position.set(x,y+.02,z);rim.scale.set(w,d,1);scene.add(rim);
   }else if(item.kind==='shuttle'){
    box(x,y+h/2,z,w*.75,h,d*.45,navy);box(x,y+h*.7,z-w*.12,w*.35,h*.45,d*.4,dark);box(x,y+h*.3,z,w,h*.12,d,pink);box(x-w*.35,y+h*.4,z+d*.2,w*.1,h*.2,d*.3,blue);
   }else {box(x,y+h/2,z,w*.18,h,d*.18,blue);}
  }
  // Cloud banks are static instanced low-poly geometry, far below gameplay support.
  const cloudGeo=track(new THREE.IcosahedronGeometry(1,1)),cloudMat=material(env.cloudColor??'#eef0e8');
  const clouds=track(new THREE.InstancedMesh(cloudGeo,cloudMat,48)),dummy=new THREE.Object3D();
  for(let i=0;i<48;i++){dummy.position.set((i*179%3100-450)*S,-14-(i%5)*2,(i*293%3300-400)*S);dummy.scale.set(8+i%4,2.2+i%3,6+i%5);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}clouds.computeBoundingSphere();scene.add(clouds);
  const sea=new THREE.Mesh(plane,material(env.cloudShade??'#c5d7e2'));sea.rotation.x=-Math.PI/2;sea.scale.set(1000,1000,1);sea.position.set(33,-29,36);scene.add(sea);
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
 if(!sky&&!canyon&&!fjord)for(const z of [0,map.bounds.height*S])box(map.bounds.width*S/2,.22,z,map.bounds.width*S,.44,.15,blue);
 if(!sky&&!canyon&&!fjord)for(const x of [0,map.bounds.width*S])box(x,.22,map.bounds.height*S/2,.15,.44,map.bounds.height*S,blue);
 if(!industrial&&!sky&&!canyon&&!fjord)for(let i=0;i<28;i++){const x=i*3.3-5,h=9+(i*7%15);for(const z of [-8,map.bounds.height*S+8]){box(x,h/2,z,2.1,h,2.5,dark);for(let y=2;y<h;y+=3)box(x,y,z+1.27,1.2,.06,.025,i%3?blue:pink);}}
 for(const [mat,meshes] of batches){const instances=track(new THREE.InstancedMesh(cube,mat,meshes.length));for(const [i,mesh] of meshes.entries()){mesh.updateMatrix();instances.setMatrixAt(i,mesh.matrix);}instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();scene.add(instances);}
 return {solids,dispose(){resources.forEach(r=>r.dispose());resources.clear();}};
}
