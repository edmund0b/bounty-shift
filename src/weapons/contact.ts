import {Box3,Ray,Vector3} from 'three';
import type {EquippedWeapon} from './attachment';
import {weaponEvents} from './actions';
export type ContactEvent={time:number;kind:'shot'|'contact'|'reload';hand:number;connected:boolean;point:Vector3;origin:Vector3;direction:Vector3};
/** Local preview only: no health, authority or damage. One result per authored event. */
export function evaluateContacts(weapon:EquippedWeapon,action:string,bounds:Box3|null):ContactEvent[]{return weaponEvents(weapon.id,action).map(event=>{
 weapon.sample(action,event.time,true);const origin=weapon.contact(event.time,action),direction=new Vector3(1,0,0);const muzzle=weapon.node('muzzle');if(muzzle){muzzle.updateWorldMatrix(true,false);direction.transformDirection(muzzle.matrixWorld);}
 const point=new Vector3(),connected=!!bounds&&event.kind!=='reload'&&(event.kind==='shot'?!!new Ray(origin,direction).intersectBox(bounds,point):bounds.distanceToPoint(origin)<.035);
 if(event.kind!=='shot'||!connected)point.copy(event.kind==='shot'?origin.clone().addScaledVector(direction,3):origin);
 return {...event,connected,point,origin,direction};
 });}
