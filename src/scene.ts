import {GUNS,gunId,ADS,decayedHeat} from '../shared/gun-config';
import type {AimControl} from '../shared/presentation';
import {GameplayWeapon} from './weapons/gameplay';
import {createRig,disposeTree,type Rig} from './characters/rig';
import {characterById} from './characters/registry';
import {GameplayAnimator} from './animations/gameplay';
import {createLootEffects} from './LootEffects';
import {teamKey} from '../shared/modes';
import * as THREE from 'three';
import { ACTIVE_MAP, type MapDefinition } from '../shared/map';
import {mapEnvironment} from '../shared/map';
import {buildEnvironment} from './environment';
import {displayElevation} from '../shared/traversal';
import { ARENA, isWalkable, type Motion, type RoomView, type PlayerView } from '../shared/game';
import { COMBAT } from '../shared/combat';
import { VIEW, cameraAim, CONTROLLER, smoothAngle } from '../shared/presentation';
import { constrainOrbit } from './camera';

const S=VIEW.scale;
type Avatar={weapon:GameplayWeapon;animationTime:number|null;sample:PlayerView;animation:GameplayAnimator;rig:Rig;characterId:string;bases:THREE.Color[];transparent:boolean[];heldBall:THREE.Group;frost:THREE.Group;frostMat:THREE.MeshBasicMaterial;frostMix:number;group:THREE.Group;limbs:THREE.Group[];materials:THREE.MeshStandardMaterial[];label:THREE.Sprite;labelCanvas:HTMLCanvasElement;labelTexture:THREE.CanvasTexture;ring:THREE.Mesh;arc:THREE.Mesh;lastLabel:string;version:number;x:number;z:number;elevation:number};
export function createArenaScene(canvas:HTMLCanvasElement,map:MapDefinition=ACTIVE_MAP,variant:string|null=null){
 const env=mapEnvironment(map,variant);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene();scene.background=new THREE.Color(env.fog);scene.fog=new THREE.Fog(env.fog,45,200);
 const camera=new THREE.PerspectiveCamera(VIEW.fov,16/9,.08,350);
 const lighting=env.lighting;
 scene.add(new THREE.HemisphereLight(lighting?.sky??'#94dcff',lighting?.ground??'#102039',2.2));const sun=new THREE.DirectionalLight(lighting?.sun??'#c5ddff',2.2);sun.position.set(10,20,8);scene.add(sun);
 for(const p of lighting?.points??[{color:'#ff62db',intensity:30,distance:35,x:43,y:6,z:28},{color:'#3edcff',intensity:35,distance:35,x:21,y:6,z:20}]){const light=new THREE.PointLight(p.color,p.intensity,p.distance,2);light.position.set(p.x,p.y,p.z);scene.add(light);}
 const resources=new Set<{dispose:()=>void}>(),solids:THREE.Mesh[]=[],avatars=new Map<string,Avatar>();
 const track=<T extends {dispose:()=>void}>(r:T):T=>{resources.add(r);return r;};
 const material=(color:string,glow=false)=>track(new THREE.MeshStandardMaterial({color,roughness:glow?.35:.55,metalness:.45,emissive:glow?color:'#000000',emissiveIntensity:glow?2:0}));
 const cube=track(new THREE.BoxGeometry(1,1,1));
 const box=(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>{const mesh=new THREE.Mesh(cube,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;};
 const environment=buildEnvironment(scene,map,variant);solids.push(...environment.solids as THREE.Mesh[]);
 const lootEffects=createLootEffects(scene,track);
 const frostGeometry=track(new THREE.OctahedronGeometry(.035,0));
 const limbGeometry=track(new THREE.BoxGeometry(1,1,1));
 const makeAvatar=(id:string,color:string,characterId:string,player:PlayerView):Avatar=>{
  const group=new THREE.Group();scene.add(group);
  const rig=createRig(characterById(characterId));rig.root.scale.multiplyScalar(.55);rig.ring.visible=false;group.add(rig.root);
  const mats:THREE.MeshStandardMaterial[]=[];rig.root.traverse(o=>{const m=(o as THREE.Mesh).material;for(const mat of Array.isArray(m)?m:[m])if(mat instanceof THREE.MeshStandardMaterial&&!mats.includes(mat))mats.push(mat);});
  const bases=mats.map(m=>m.color.clone()),transparent=mats.map(m=>m.transparent);const limbs=[...rig.legs.map(l=>l.hip),...rig.arms.map(a=>a.shoulder)];
  const ring=new THREE.Mesh(track(new THREE.RingGeometry(.55,.6,40)),track(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.y=.035;group.add(ring);
  const arc=new THREE.Mesh(track(new THREE.RingGeometry(.6,COMBAT.range*S,32,1,-COMBAT.halfAngle,COMBAT.halfAngle*2)),track(new THREE.MeshBasicMaterial({color:'#bdeeff',transparent:true,opacity:.3,side:THREE.DoubleSide})));arc.rotation.x=-Math.PI/2;arc.rotation.z=-Math.PI/2;arc.position.y=.06;arc.visible=false;group.add(arc);
  const c=document.createElement('canvas');c.width=512;c.height=128;const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(track(new THREE.SpriteMaterial({map:t,depthTest:true,transparent:true})));label.position.y=2.5;label.scale.set(2.4,.6,1);group.add(label);
  const heldBall=lootEffects.art.freezeBall();heldBall.position.set(0,-.12,.1);heldBall.scale.setScalar(1/.55);rig.arms[1].wrist.add(heldBall);heldBall.visible=false;
  const frost=new THREE.Group(),frostMat=track(new THREE.MeshBasicMaterial({color:'#bcefff',transparent:true,opacity:0,depthWrite:false}));for(let j=0;j<6;j++)frost.add(new THREE.Mesh(frostGeometry,frostMat));group.add(frost);
  const a={weapon:new GameplayWeapon(rig),animationTime:null,sample:{...player},animation:new GameplayAnimator(rig),rig,characterId,bases,transparent,heldBall,frost,frostMat,frostMix:0,group,limbs,materials:mats,label,labelCanvas:c,labelTexture:t,ring,arc,lastLabel:'',version:-1,x:0,z:0,elevation:0};avatars.set(id,a);return a;
 };
 // Reuse a bounded pool: these meshes only present server state and never decide hits.
 const ice=material('#65eaff',true),gold=material('#ffc951',true),steel=material('#cadce7');
 const capture=new THREE.Mesh(track(new THREE.RingGeometry(1.1,1.3,40)),ice);capture.rotation.x=-Math.PI/2;capture.visible=false;scene.add(capture);
 const flag=new THREE.Group();box(flag,0,1,0,.07,2,.07,steel);box(flag,.45,1.65,0,.85,.55,.04,gold);flag.visible=false;scene.add(flag);
 scene.updateMatrixWorld(true);
 const labelAnchor=new THREE.Vector3();
 const ray=new THREE.Raycaster(),target=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3();let aimBlend=0,recoilKick=0,lastHeat=0,lastShotAt=0,heatInstance='';const seenShots=new Set<string>();
 let first=true,lastWidth=0,lastHeight=0,floorElevation=0;
 const constrainCamera=(point:THREE.Vector3)=>constrainOrbit(point,target,solids,ray,map.bounds,floorElevation);
 function update(room:RoomView,id:string,predicted:Motion|null,yaw:number,pitch:number,dt:number,time:number,ads?:AimControl){
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  if(lastWidth!==width||lastHeight!==height){lastWidth=width;lastHeight=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const visualNow=lootEffects.clock(room);lootEffects.updateLoot(room,visualNow,predicted??room.players.find(p=>p.id===id)??null);
  capture.visible=room.selectedGameMode==='flag_run';capture.position.set(room.mode.capture.x*S,(room.mode.capture.elevation??0)*S+.04,room.mode.capture.y*S);
  const flagState=room.mode.flag;flag.visible=room.selectedGameMode==='flag_run'&&['spawned','dropped','carried'].includes(flagState.state);flag.position.set(flagState.position.x*S,(flagState.position.elevation??0)*S+(flagState.state==='carried'?1.8:0),flagState.position.y*S);
  const self=room.players.find(p=>p.id===id);if(!self)return;const local=predicted||self,aim=cameraAim(yaw);floorElevation=(local.elevation??0)*S;
  const gun=gunId(self.heldItem)?GUNS[self.heldItem]:null,aiming=!!gun&&!!(ads?.active??self.ads)&&self.health>0&&self.frozenUntil<=visualNow&&!['reload','equip'].includes(self.weaponAction?.clip??'');
  aimBlend+=(Number(aiming)-aimBlend)*(1-Math.exp(-dt*ADS.blendSpeed));
  const instance=self.inventory?.weapons?.[self.selectedSlot===2?1:0]?.instanceId;
  for(const e of room.mode.weaponEffects??[])if(e.ownerId===id&&e.type==='shot'&&e.instanceId===instance&&!seenShots.has(e.shotId??e.id)){seenShots.add(e.shotId??e.id);if(visualNow-e.at<350){recoilKick+=gun?.cameraKick??0;lastHeat=e.heat??0;lastShotAt=e.at;heatInstance=e.instanceId??'';}}
  if(seenShots.size>128){seenShots.clear();for(const e of room.mode.weaponEffects??[])seenShots.add(e.shotId??e.id);}
  recoilKick*=Math.exp(-dt*13);const viewPitch=pitch+recoilKick,blend=(hip:number,aim:number)=>hip+(aim-hip)*aimBlend,distance=blend(VIEW.cameraDistance,gun?.distance??VIEW.cameraDistance),shoulder=blend(VIEW.shoulder,gun?.shoulder??VIEW.shoulder)*(ads?.shoulder??1);
  camera.fov=blend(VIEW.fov,gun?.fov??VIEW.fov);camera.updateProjectionMatrix();
  const precise=!!self.ads&&visualNow-(self.adsSince??visualNow)>=ADS.seconds*1000,cone=gun?(precise?gun.ads:gun.hip)+(gunId(self.heldItem)&&instance===heatInstance?decayedHeat(lastHeat,lastShotAt,visualNow,self.heldItem)*gun.recoil:0):0;
  canvas.parentElement?.style.setProperty('--gun-bloom',`${Math.max(6,Math.min(140,cone*height/Math.tan(camera.fov*Math.PI/360)))}px`);canvas.dataset.aimBlend=aimBlend.toFixed(3);canvas.dataset.fov=camera.fov.toFixed(2);canvas.dataset.shoulder=String(ads?.shoulder??1);
  target.set(local.x*S,(local.elevation??0)*S+CONTROLLER.lookHeight,local.y*S);const orbit=distance*Math.cos(viewPitch);desired.set(target.x-aim.x*orbit+Math.cos(yaw)*shoulder,Math.max(floorElevation+CONTROLLER.floorClearance,target.y+blend(CONTROLLER.cameraLift,.15)-Math.sin(viewPitch)*distance),target.z-aim.y*orbit+Math.sin(yaw)*shoulder);constrainCamera(desired);
  // Keep the camera outside other characters without changing their collision/movement.
  for(const other of room.players)if(other.id!==id&&other.health>0){const center=new THREE.Vector3(other.x*S,(other.elevation??0)*S+.9,other.y*S),delta=desired.clone().sub(center);if(delta.length()<.65)desired.copy(center.add(delta.lengthSq()>1e-8?delta.setLength(.65):new THREE.Vector3(0,0,.65)));}constrainCamera(desired);
  if(first){camera.position.copy(desired);first=false;}else camera.position.lerp(desired,1-Math.exp(-dt*CONTROLLER.cameraSmoothing));constrainCamera(camera.position);
  for(const other of room.players)if(other.id!==id&&other.health>0){const center=new THREE.Vector3(other.x*S,(other.elevation??0)*S+.9,other.y*S),delta=camera.position.clone().sub(center);if(delta.length()<.65)camera.position.copy(center.add(delta.lengthSq()>1e-8?delta.setLength(.65):new THREE.Vector3(0,0,.65)));}constrainCamera(camera.position);
  look.set(target.x+aim.x*4.2*Math.cos(viewPitch),target.y+Math.sin(viewPitch)*4.2,target.z+aim.y*4.2*Math.cos(viewPitch));camera.lookAt(look);
  const ids=new Set(room.players.map(p=>p.id));for(const [key,a] of avatars)if(!ids.has(key)){scene.remove(a.group);a.weapon.dispose();disposeTree(a.rig.root);avatars.delete(key);}
  for(const p of room.players){
   const isIt=room.selectedGameMode==='tag'&&teamKey(room.mode,p.id)===room.mode.it;const frozen=p.frozenUntil>visualNow&&p.health>0;const color=frozen?'#b2f6ff':isIt?'#ff4a69':room.selectedFormat==='duo'?['#46e7ff','#ffaa55','#b89cff'][Number(teamKey(room.mode,p.id).split('-')[1])-1]??p.color:p.id===id?'#46e7ff':p.color;
   const characterId=p.characterId??'voltrix';let a=avatars.get(p.id);
   if(a&&a.characterId!==characterId){scene.remove(a.group);a.weapon.dispose();disposeTree(a.rig.root);avatars.delete(p.id);a=undefined;}
   a=a||makeAvatar(p.id,color,characterId,p);const pos=p.id===id?local:p;
   const oldX=a.x,oldZ=a.z,resetPosition=a.version!==p.spawnVersion;if(a.version!==p.spawnVersion||p.id===id){a.x=pos.x*S;a.z=pos.y*S;a.elevation=pos.elevation??0;a.version=p.spawnVersion;}else{const f=1-Math.exp(-dt*18);const candidate={x:a.x/S+(p.x-a.x/S)*f,y:a.z/S+(p.y-a.z/S)*f,elevation:0};const height=p.airborne?a.elevation+(p.elevation-a.elevation)*f:displayElevation(candidate,a.elevation+(p.elevation-a.elevation)*f,map);candidate.elevation=height??p.elevation;if(Math.hypot(a.x-p.x*S,a.z-p.y*S)<=180*S&&height!==null&&(p.airborne||isWalkable(candidate,map))){a.x=candidate.x*S;a.z=candidate.y*S;a.elevation=candidate.elevation;}else{a.x=p.x*S;a.z=p.y*S;a.elevation=p.elevation;}}
   a.group.scale.y=1;a.rig.root.visible=!(p.id===id&&self.heldItem==='sniper-rifle'&&aimBlend>.65);
   a.group.position.set(a.x,a.elevation*S,a.z);const armedAim=p.weaponAction;const facing=p.ads?{x:p.aimX??pos.facingX,y:p.aimY??pos.facingY}:armedAim?{x:armedAim.aimX,y:armedAim.aimY}:p.attackFlash>0?{x:p.attackX,y:p.attackY}:{x:pos.facingX,y:pos.facingY};a.group.rotation.y=smoothAngle(a.group.rotation.y,Math.atan2(facing.x,facing.y),CONTROLLER.avatarTurnSpeed,dt);a.arc.rotation.z=-Math.PI/2+(p.attackFlash>0?Math.atan2(p.attackX,p.attackY)-a.group.rotation.y:0);
   for(let i=0;i<a.materials.length;i++){const mat=a.materials[i];mat.color.copy(a.bases[i]);if(p.hitFlash>0)mat.color.lerp(new THREE.Color('#ffffff'),.65);if(p.health===0)mat.color.multiplyScalar(.3);if(frozen)mat.color.lerp(new THREE.Color('#91cddd'),.35);mat.opacity=p.id===id&&camera.position.distanceTo(target)<CONTROLLER.avatarFadeDistance?.18:1;mat.transparent=mat.opacity<1||a.transparent[i];}
   a.frostMix+=(Number(frozen)-a.frostMix)*(1-Math.exp(-dt*(frozen?20:8)));if(p.health===0||!frozen&&a.frostMix<.015)a.frostMix=0;a.frost.visible=a.frostMix>.015;a.frostMat.opacity=a.frostMix*.6;a.frost.children.forEach((mesh,j)=>{const angle=time*.8+j*Math.PI/3;mesh.position.set(Math.sin(angle)*.45,.35+(j%3)*.45+Math.sin(time*2+j)*.06,Math.cos(angle)*.32);});
   (a.ring.material as THREE.MeshBasicMaterial).color.set(p.protection>0?'#f8d94a':color);a.ring.visible=isIt||frozen||room.selectedFormat==='duo'||p.id===id||p.id===room.objective.target?.id||p.protection>0;a.arc.visible=p.attackFlash>0&&!room.mode.effects.some(e=>e.type==='throw'&&e.ownerId===p.id&&visualNow-e.at<350);
   // Derive speed from actual translated position, never camera rotation or held movement keys.
   const animationDt=a.animationTime===null?0:Math.max(0,time-a.animationTime);a.animationTime=time;
   const speed=!resetPosition&&animationDt>0?Math.min(ARENA.speed*4,Math.hypot(a.x-oldX,a.z-oldZ)/(S*animationDt)):0;
   Object.assign(a.sample,p);if(p.id===id){a.sample.airborne=local.airborne;a.sample.verticalVelocity=local.verticalVelocity;a.sample.crouched=local.crouched;a.sample.sprinting=local.sprinting;a.sample.traversalState=local.traversalState;a.sample.dashRemaining=local.dashRemaining;}
   a.animation.update(a.sample,speed,animationDt,a.elevation*S,frozen);
   a.weapon.update(a.sample,a.animation.timeline,room.selectedGameMode,visualNow,speed);
   a.rig.head.getWorldPosition(labelAnchor);a.label.position.y=labelAnchor.y-a.group.position.y+.8;a.label.visible=p.id!==id;
   const labelWorld=2*camera.position.distanceTo(labelAnchor)*Math.tan(camera.fov*Math.PI/360)/height*(width<700?120:160);a.label.scale.set(labelWorld,labelWorld/4,1);
   const throwing=room.mode.effects.filter(e=>e.type==='throw'&&e.ownerId===p.id).at(-1),throwAge=throwing?visualNow-throwing.at:Infinity;
   a.heldBall.visible=p.heldItem==='freeze_ball'&&p.health>0;if(a.heldBall.visible)a.limbs[3].rotation.x=-.6;
   if(throwAge>=0&&throwAge<350){a.limbs[3].rotation.x=-.6-.95*Math.sin(Math.PI*throwAge/350);a.limbs[2].rotation.x=.15;}
   const labelKey=`${p.name}|${p.health}|${p.connected}|${color}|${isIt}|${frozen}|${p.protection>0}`;if(labelKey!==a.lastLabel){a.lastLabel=labelKey;const c=a.labelCanvas.getContext('2d')!;c.clearRect(0,0,512,128);c.font='600 42px Arial';c.textAlign='center';c.fillStyle='#ffffff';c.shadowColor='#000000';c.shadowBlur=8;c.fillText(`${isIt?'IT · ':''}${frozen?'❄ ':''}${p.name}${p.health===0?' · KO':!p.connected?' · …':''}`,256,50);c.shadowBlur=0;c.strokeStyle='#d5e5ed';c.lineWidth=2;c.strokeRect(59,75,394,20);c.fillStyle='#091321';c.fillRect(60,76,392,18);c.fillStyle=p.protection>0?'#f8d94a':'#ed5971';c.fillRect(60,76,392*p.health/COMBAT.maxHealth,18);c.fillStyle='#091321';for(let n=1;n<10;n++)c.fillRect(60+392*n/10,76,2,18);c.font='600 23px Arial';c.fillStyle='#fff';c.fillText(String(Math.ceil(p.health)),256,122);a.labelTexture.needsUpdate=true;}
  }
  scene.updateMatrixWorld(true);lootEffects.updateProjectiles(room,visualNow,owner=>avatars.get(owner)?.heldBall.getWorldPosition(new THREE.Vector3()),(owner,weaponId)=>{const w=avatars.get(owner)?.weapon.weapon;return w?.gun&&w.id===weaponId?w.anchor('muzzle'):undefined;},id); 
  const animationLabels=room.players.map(p=>`${p.id}:${avatars.get(p.id)?.animation.timeline.state}`).join(',');if(canvas.dataset.animations!==animationLabels)canvas.dataset.animations=animationLabels;
  const animationVersions=room.players.map(p=>`${p.id}:${avatars.get(p.id)?.version}`).join(',');if(canvas.dataset.animationVersions!==animationVersions)canvas.dataset.animationVersions=animationVersions;
  canvas.dataset.weapons=room.players.map(p=>`${p.id}:${avatars.get(p.id)?.weapon.weapon?.id??'unarmed'}:${avatars.get(p.id)?.weapon.lastClip}`).join(',');
  canvas.dataset.aimPoses=room.players.map(p=>`${p.id}:${Number(avatars.get(p.id)?.rig.root.userData.aimBlend??0).toFixed(2)}`).join(',');
  canvas.dataset.characters=room.players.map(p=>`${p.id}:${p.characterId}`).join(',');renderer.render(scene,camera);
 }
 const shotDirection=new THREE.Vector3();return {update,aimRay(){camera.getWorldDirection(shotDirection);return {x:shotDirection.x,y:shotDirection.z,z:shotDirection.y,origin:{x:camera.position.x/S,y:camera.position.z/S,elevation:camera.position.y/S}};},dispose(){for(const a of avatars.values()){a.weapon.dispose();disposeTree(a.rig.root);}for(const r of resources)r.dispose();resources.clear();avatars.clear();lootEffects.dispose();environment.dispose();renderer.dispose();}};
}
