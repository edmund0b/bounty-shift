import * as T from 'three';
import type {Rig} from './characters/rig';
import {solveArm} from './weapons/attachment';
export function createFlagModel(scale=.8){
 const root=new T.Group();root.name='FLAG_MODEL';root.scale.setScalar(scale);
 const poleGeometry=new T.CylinderGeometry(.035,.035,1.9,10),clothGeometry=new T.BoxGeometry(.95,.58,.025),tipGeometry=new T.SphereGeometry(.055,8,6),poleMaterial=new T.MeshStandardMaterial({color:'#cadce7',roughness:.45,metalness:.6}),clothMaterial=new T.MeshStandardMaterial({color:'#ffc951',roughness:.7,side:T.DoubleSide});
 const pole=new T.Mesh(poleGeometry,poleMaterial);pole.position.y=.55;root.add(pole);const cloth=new T.Mesh(clothGeometry,clothMaterial);cloth.position.set(-.48,1.16,0);root.add(cloth);const tip=new T.Mesh(tipGeometry,poleMaterial);tip.position.y=1.53;root.add(tip);
 return {root,dispose(){root.removeFromParent();poleGeometry.dispose();clothGeometry.dispose();tipGeometry.dispose();poleMaterial.dispose();clothMaterial.dispose();}};
}
/** Off-hand overlay; lower body/root and authoritative weapon state stay unchanged. */
export class FlagCarry {
 readonly model=createFlagModel(1.35);private blend=0;private target=new T.Vector3();private desired=new T.Quaternion().setFromEuler(new T.Euler(-.12,0,-.06));private orientation=new T.Quaternion();private before=[new T.Quaternion(),new T.Quaternion(),new T.Quaternion()];
 constructor(private rig:Rig){this.model.root.name='CARRIED_FLAG';this.model.root.position.set(0,-.1,.05);rig.arms[0].wrist.add(this.model.root);this.model.root.visible=false;}
 update(carried:boolean,dt:number,alive=true){this.model.root.visible=carried&&alive;if(!alive){this.blend=0;return;}this.blend+=(Number(carried)-this.blend)*(1-Math.exp(-Math.max(0,dt)*22));if(this.blend<.001)return;
 const a=this.rig.arms[0],nodes=[a.shoulder,a.elbow,a.wrist];nodes.forEach((n,i)=>this.before[i].copy(n.quaternion));this.target.set(-this.rig.shape.shoulder-.2,-.28,.38);this.orientation.copy(this.rig.hips.quaternion).multiply(this.rig.torso.quaternion).invert().multiply(this.desired);solveArm(this.rig,0,this.target,this.orientation);nodes.forEach((n,i)=>n.quaternion.slerp(this.before[i],1-this.blend));
 }
 dispose(){this.model.dispose();}
}
