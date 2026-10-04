import * as THREE from 'three';
import { BUILDINGS, WORLD, PLAZA } from '../shared/map';
import { ARENA, isWalkable, type Motion, type RoomView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { VIEW, cameraAim } from '../shared/presentation';

const S=VIEW.scale;
type Avatar={group:THREE.Group;limbs:THREE.Group[];materials:THREE.MeshStandardMaterial[];label:THREE.Sprite;labelCanvas:HTMLCanvasElement;labelTexture:THREE.CanvasTexture;ring:THREE.Mesh;arc:THREE.Mesh;lastLabel:string;version:number;x:number;z:number};
export function createArenaScene(canvas:HTMLCanvasElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#071223');scene.fog=new THREE.Fog('#071223',28,78);
 const camera=new THREE.PerspectiveCamera(VIEW.fov,16/9,.08,110);
 scene.add(new THREE.HemisphereLight('#94dcff','#102039',2.2));const sun=new THREE.DirectionalLight('#c5ddff',2.2);sun.position.set(10,20,8);scene.add(sun);
 const magenta=new THREE.PointLight('#ff62db',30,35,2);magenta.position.set(43,6,28);scene.add(magenta);
 const cyan=new THREE.PointLight('#3edcff',35,35,2);cyan.position.set(21,6,20);scene.add(cyan);
 const resources=new Set<{dispose:()=>void}>(),solids:THREE.Mesh[]=[],avatars=new Map<string,Avatar>();
 const track=<T extends {dispose:()=>void}>(r:T):T=>{resources.add(r);return r;};
 const material=(color:string,glow=false)=>track(new THREE.MeshStandardMaterial({color,roughness:glow?.35:.55,metalness:.45,emissive:glow?color:'#000000',emissiveIntensity:glow?2:0}));
 const stone=material('#263c55'),cap=material('#22354c'),dark=material('#070f1b'),blue=material('#37deff',true),pink=material('#f379ee',true);
 const cube=track(new THREE.BoxGeometry(1,1,1));
 const box=(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>{const mesh=new THREE.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 const labelTexture=(text:string,color:string)=>{
  const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#081523';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(4,4,1016,184);
  ctx.fillStyle='#e2f5ff';ctx.textAlign='center';ctx.font=`600 ${text.length>15?52:64}px Arial`;ctx.fillText(text,512,109);
  ctx.fillStyle=color;ctx.fillRect(330,140,364,5);const texture=track(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;return texture;
 };
 const sign=(text:string,x:number,z:number,width:number,yaw:number,color:string,y=3.4)=>{
  const mat=track(new THREE.MeshBasicMaterial({map:labelTexture(text,color),side:THREE.DoubleSide}));
  const mesh=new THREE.Mesh(track(new THREE.PlaneGeometry(width,width*192/1024)),mat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;scene.add(mesh);
 };
 // A painted floor texture provides restrained lane highlights without reflection passes.
 const floorCanvas=document.createElement('canvas');floorCanvas.width=2048;floorCanvas.height=1475;const ctx=floorCanvas.getContext('2d')!;
 ctx.fillStyle='#122337';ctx.fillRect(0,0,2048,1475);const fx=2048/WORLD.width,fy=1475/WORLD.height;
 ctx.strokeStyle='#263b52';ctx.lineWidth=2;for(let x=0;x<WORLD.width;x+=80){ctx.beginPath();ctx.moveTo(x*fx,0);ctx.lineTo(x*fx,1475);ctx.stroke();}for(let y=0;y<WORLD.height;y+=80){ctx.beginPath();ctx.moveTo(0,y*fy);ctx.lineTo(2048,y*fy);ctx.stroke();}
 ctx.strokeStyle='#41728b';ctx.lineWidth=4;ctx.strokeRect(PLAZA.x*fx,PLAZA.y*fy,PLAZA.width*fx,PLAZA.height*fy);
 for(const [x,c] of [[120,'#38718a'],[720,'#3c91aa'],[1380,'#795e9e'],[1880,'#416a94']] as const){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x*fx,0);ctx.lineTo(x*fx,1475);ctx.stroke();}
 ctx.setLineDash([12,30]);ctx.strokeStyle='#688198';ctx.beginPath();ctx.moveTo(0,720*fy);ctx.lineTo(2048,720*fy);ctx.stroke();ctx.setLineDash([]);
 const floorTexture=track(new THREE.CanvasTexture(floorCanvas));floorTexture.colorSpace=THREE.SRGBColorSpace;
 const floor=new THREE.Mesh(track(new THREE.PlaneGeometry(WORLD.width*S,WORLD.height*S)),track(new THREE.MeshStandardMaterial({map:floorTexture,color:'#ffffff',roughness:.3,metalness:.6})));floor.rotation.x=-Math.PI/2;floor.position.set(WORLD.width*S/2,0,WORLD.height*S/2);scene.add(floor);
 for(const [i,b] of BUILDINGS.entries()){
  const x=(b.x+b.width/2)*S,z=(b.y+b.height/2)*S,w=b.width*S,d=b.height*S,h=b.name?5.2+(i%3)*1.1:1.7;
  const neon=i>=5?pink:blue;const solid=box(scene,x,h/2,z,w,h,d,stone);solids.push(solid);
  box(scene,x,h+.15,z,w+.06,.3,d+.06,cap);
  for(const zz of [z-d/2-.025,z+d/2+.025]){box(scene,x,.12,zz,w,.055,.055,neon);box(scene,x,h-.12,zz,w,.055,.055,neon);box(scene,x,1.9,zz,w-.5,.03,.03,neon);}
  for(const xx of [x-w/2-.025,x+w/2+.025]){box(scene,xx,.12,z,.055,.055,d,neon);box(scene,xx,h/2,z,.055,h,.055,neon);}
  if(b.name){const text=b.name==='SIGNAL STATION'?'CENTRAL PLAZA':b.name;const color=i>=5?'#f58df0':'#65e6ff';
   sign(text,x,z+d/2+.04,Math.min(w-.6,9),0,color);sign(text,x,z-d/2-.04,Math.min(w-.6,9),Math.PI,color);
   sign(text,x-w/2-.04,z,Math.min(d-.6,7),-Math.PI/2,color);sign(text,x+w/2+.04,z,Math.min(d-.6,7),Math.PI/2,color);
   // Closed façade panels are decorative, never additional walkable doors.
   for(const zz of [z-d/2-.06,z+d/2+.06]){box(scene,x,1.05,zz,1.8,2.1,.045,dark);box(scene,x,2.16,zz,1.9,.045,.07,neon);}
  }
 }
 // Boundary curbs exactly enclose the authoritative playfield. Skyline stays outside it.
 for(const z of [0,WORLD.height*S])box(scene,WORLD.width*S/2,.3,z,WORLD.width*S,.6,.15,blue);
 for(const x of [0,WORLD.width*S])box(scene,x,.3,WORLD.height*S/2,.15,.6,WORLD.height*S,blue);
 for(let i=0;i<14;i++){const h=8+(i*7%12);box(scene,i*5-3,h/2,-5,3,h,3,stone);box(scene,i*5-3,h/2,WORLD.height*S+5,3,h,3,stone);}
 const limbGeometry=track(new THREE.BoxGeometry(1,1,1));
 const makeAvatar=(id:string,color:string):Avatar=>{
  const group=new THREE.Group();scene.add(group);const armor=track(new THREE.MeshStandardMaterial({color:'#385772',roughness:.8,metalness:.2}));const glow=material(color,true);const mats=[armor,glow];
  box(group,0,1.18,0,.68,.65,.38,armor);box(group,0,.79,0,.52,.22,.32,armor);box(group,0,1.73,0,.4,.38,.37,armor);
  box(group,0,1.74,.2,.31,.065,.03,glow);for(const x of [-.215,.215])box(group,x,1.73,0,.025,.2,.25,glow);for(const x of [-.26,.26]){box(group,x,1.2,-.21,.06,.55,.045,glow);box(group,x,.79,-.19,.045,.2,.045,glow);}
  const limbs:THREE.Group[]=[];
  for(const [x,y,w,h] of [[-.2,.76,.23,.68],[.2,.76,.23,.68],[-.35,1.43,.14,.6],[.35,1.43,.14,.6]]){
   const pivot=new THREE.Group();pivot.position.set(x,y,0);group.add(pivot);const mesh=new THREE.Mesh(limbGeometry,armor);mesh.scale.set(w,h,.26);mesh.position.y=-h/2;pivot.add(mesh);box(pivot,0,-h*.7,-.145,w*.75,.065,.025,glow);limbs.push(pivot);
  }
  const ring=new THREE.Mesh(track(new THREE.RingGeometry(.55,.6,40)),track(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.y=.035;group.add(ring);
  const arc=new THREE.Mesh(track(new THREE.RingGeometry(.6,COMBAT.range*S,32,1,-COMBAT.halfAngle,COMBAT.halfAngle*2)),track(new THREE.MeshBasicMaterial({color:'#bdeeff',transparent:true,opacity:.3,side:THREE.DoubleSide})));arc.rotation.x=-Math.PI/2;arc.rotation.z=-Math.PI/2;arc.position.y=.06;arc.visible=false;group.add(arc);
  const c=document.createElement('canvas');c.width=512;c.height=128;const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(track(new THREE.SpriteMaterial({map:t,depthTest:true,transparent:true})));label.position.y=2.25;label.scale.set(2.4,.6,1);group.add(label);
  const a={group,limbs,materials:mats,label,labelCanvas:c,labelTexture:t,ring,arc,lastLabel:'',version:-1,x:0,z:0};avatars.set(id,a);return a;
 };
 scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),target=new THREE.Vector3(),desired=new THREE.Vector3(),direction=new THREE.Vector3(),look=new THREE.Vector3();let first=true,lastWidth=0,lastHeight=0;
 function constrainCamera(point:THREE.Vector3){
  point.x=THREE.MathUtils.clamp(point.x,.15,WORLD.width*S-.15);point.z=THREE.MathUtils.clamp(point.z,.15,WORLD.height*S-.15);
  direction.copy(point).sub(target);const length=direction.length();if(length<.01)return;ray.set(target,direction.normalize());ray.far=length;
  const hit=ray.intersectObjects(solids,false)[0];if(hit)point.copy(target).addScaledVector(direction,Math.max(.35,hit.distance-.28));
 }
 function update(room:RoomView,id:string,predicted:Motion|null,yaw:number,dt:number,time:number){
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  if(lastWidth!==width||lastHeight!==height){lastWidth=width;lastHeight=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const self=room.players.find(p=>p.id===id);if(!self)return;const local=predicted||self,aim=cameraAim(yaw);
  target.set(local.x*S,1.3,local.y*S);desired.set(target.x-aim.x*VIEW.cameraDistance+Math.cos(yaw)*VIEW.shoulder,VIEW.cameraHeight,target.z-aim.y*VIEW.cameraDistance+Math.sin(yaw)*VIEW.shoulder);constrainCamera(desired);
  if(first){camera.position.copy(desired);first=false;}else camera.position.lerp(desired,1-Math.exp(-dt*14));constrainCamera(camera.position);
  look.set(target.x+aim.x*4.2,1.35,target.z+aim.y*4.2);camera.lookAt(look);
  const ids=new Set(room.players.map(p=>p.id));for(const [key,a] of avatars)if(!ids.has(key)){scene.remove(a.group);avatars.delete(key);}
  for(const p of room.players){
   const color=p.id===id?'#46e7ff':p.id===room.objective.target?.id?'#f8d94a':p.color;
   const a=avatars.get(p.id)||makeAvatar(p.id,color),pos=p.id===id?local:p;
   const oldX=a.x,oldZ=a.z;if(a.version!==p.spawnVersion||p.id===id){a.x=pos.x*S;a.z=pos.y*S;a.version=p.spawnVersion;}else{const f=1-Math.exp(-dt*18);const candidate={x:a.x/S+(p.x-a.x/S)*f,y:a.z/S+(p.y-a.z/S)*f};if(Math.hypot(a.x-p.x*S,a.z-p.y*S)<=180*S&&isWalkable(candidate)){a.x=candidate.x*S;a.z=candidate.y*S;}else{a.x=p.x*S;a.z=p.y*S;}}
   a.group.position.set(a.x,p.health===0?-.65:0,a.z);const facing=p.attackFlash>0?{x:p.attackX,y:p.attackY}:p.id===id?aim:{x:p.facingX,y:p.facingY};a.group.rotation.y=Math.atan2(facing.x,facing.y);
   a.materials[1].color.set(p.hitFlash>0?'#ffffff':color);a.materials[1].emissive.set(p.hitFlash>0?'#ffffff':color);for(const mat of a.materials){mat.transparent=p.id===id&&camera.position.distanceTo(target)<1.25;mat.opacity=mat.transparent?.18:1;}
   a.materials[0].color.set(p.health===0?'#141a25':p.hitFlash>0?'#d7f5ff':p.id===room.objective.target?.id?'#635931':'#385772');
   (a.ring.material as THREE.MeshBasicMaterial).color.set(p.protection>0?'#f8d94a':color);a.ring.visible=p.id===id||p.id===room.objective.target?.id||p.protection>0;a.arc.visible=p.attackFlash>0;
   // Simple articulation is movement feedback, not final character animation.
   const moving=Math.hypot(a.x-oldX,a.z-oldZ)>.003&&p.health>0;for(let j=0;j<a.limbs.length;j++)a.limbs[j].rotation.x=moving?Math.sin(time*(p.sprinting?13:9)+(j%2)*Math.PI)*.32:0;
   const labelKey=`${p.name}|${p.health}|${p.connected}|${color}`;if(labelKey!==a.lastLabel){a.lastLabel=labelKey;const c=a.labelCanvas.getContext('2d')!;c.clearRect(0,0,512,128);c.font='600 42px Arial';c.textAlign='center';c.fillStyle='#ffffff';c.shadowColor='#000000';c.shadowBlur=8;c.fillText(`${p.name}${p.health===0?' · KO':!p.connected?' · …':''}`,256,50);c.shadowBlur=0;c.fillStyle='#091321';c.fillRect(60,76,392,18);c.fillStyle=color;c.fillRect(60,76,392*p.health/COMBAT.maxHealth,18);a.labelTexture.needsUpdate=true;}
  }
  renderer.render(scene,camera);
 }
 return {update,dispose(){for(const r of resources)r.dispose();resources.clear();avatars.clear();renderer.dispose();}};
}
