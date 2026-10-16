import * as T from 'three';
import {equipmentById} from './registry';
import {WeaponKit} from './kit';
import {buildSniper} from './sniper';
import {buildMelee} from './melee';
import {buildFirearm} from './firearms';
import {buildPowerup} from './powerups';
export function createEquipment(id:string){const asset=equipmentById(id),kit=new WeaponKit(asset.color);kit.root.name=id;kit.root.userData={schemaVersion:1,assetId:id,status:asset.status,units:'meters',forward:'+X',up:'+Y',source:'Bounty Shift Workshop procedural model',gameplayIntegrated:false};
 if(id==='sniper-rifle')buildSniper(kit);else if(asset.category==='melee')buildMelee(kit,id);else if(asset.category==='firearms')buildFirearm(kit,id);else buildPowerup(kit,id);
 const markers=new T.Group();markers.name='attachment-markers';markers.userData.previewOnly=true;kit.root.add(markers);
 for(const a of asset.anchors){const parent=a.part?kit.root.getObjectByName(a.part)!:kit.root;const anchor=new T.Object3D();anchor.name=a.name;anchor.position.set(...a.position);anchor.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3(...a.direction).normalize());anchor.userData={attachment:true,direction:a.direction};parent.add(anchor);const marker=new T.Mesh(kit.sphere,kit.energy);marker.scale.setScalar(.035);marker.userData.anchor=anchor;markers.add(marker);}
 kit.root.scale.setScalar(asset.scale);kit.root.rotation.set(...asset.orientation);kit.root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(kit.root),stats={meshes:0,triangles:0,materials:0};const mats=new Set<T.Material>();kit.root.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.anchor){stats.meshes++;stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});stats.materials=mats.size;
 markers.visible=false;const effects=kit.root.getObjectByName('presentation-effects');
 return {root:kit.root,asset,bounds,stats,markers,effects,kit,updateMarkers(){kit.root.updateMatrixWorld(true);for(const m of markers.children){const a=m.userData.anchor as T.Object3D;m.position.copy(markers.worldToLocal(a.getWorldPosition(new T.Vector3())));}},dispose:()=>kit.dispose()};
}
export type EquipmentModel=ReturnType<typeof createEquipment>;
