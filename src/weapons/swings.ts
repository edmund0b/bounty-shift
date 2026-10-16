import {Euler,Quaternion,Vector3} from 'three';
/** Character-space grip trajectories. The active swing crosses contact with angular velocity. */
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
function arc(p:number,ready:number,windup:number,contact:number,follow:number){
 if(p<.28)return ready+(windup-ready)*smooth(p/.28);
 if(p<.72){const t=(p-.28)/.44;return contact+(windup-contact)*Math.cos(Math.PI*t);}
 return follow+(ready-follow)*smooth((p-.72)/.28);
}
export function meleeGrip(id:string,action:string,p:number){const n=Number(action.at(-1)),attack=action.startsWith('attack'),dual=id==='twin-daggers',hammer=id==='impact-hammer',katana=id==='pulse-katana',bat=id==='riot-bat';
 let x=dual?.25:hammer?.16:.32,y=hammer?2.12:2.28,z=dual?.52:.47,rx=hammer?-1.1:katana?-.65:-.85,ry=dual?.28:.45,rz=0;
 let lx=-.25,ly=2.28,lz=.52,lrx=-.6,lry=-.28;
 if(attack){
  const sign=n===2?-1:1;
  if(dual){const angle=arc(p,sign*.45,sign*1.05,0,-sign*1.05),pitch=arc(p,-.55,-.8,0,.8);
   if(n===2){lrx=pitch;lry=angle;lx=-.2;ly=2.28;lz=.58;}else{x=.2;y=2.28;z=.58;rx=pitch;ry=angle;}
   // Alternating finish: right slash, then independent left counter slash.
   if(n===3){const rp=Math.min(1,p/.6),lp=Math.max(0,(p-.4)/.6);x=.2;z=.58;rx=arc(rp,-.55,-.8,0,.8);ry=arc(rp,.45,1.05,0,-1.05);lx=-.2;ly=2.28;lz=.58;lrx=arc(lp,-.55,-.8,0,.8);lry=arc(lp,-.45,-1.05,0,1.05);}

  }else if(hammer){x=.1;y=2.02;z=.53;const lift=p<.28?smooth(p/.28):p<.5?1-smooth((p-.28)/.22):0;if(n>1){x+=lift*.58;y+=lift*.64;z+=lift*.06;}ry=n===1?arc(p,.35,1.4,0,-1.4):n===2?arc(p,.35,-1.05,0,1.05):arc(p,.35,.65,0,-.65);rx=n===1?-Math.PI/2:arc(p,-1.1,n===3?-1.95:-2.15,-Math.PI/2,n===3?-.34:-.64);}
  else{y=2.25;z=.53;const span=katana?1.45:bat?1.2:.95;
   ry=arc(p,.45,sign*span,0,-sign*span);
   rx=n===3?arc(p,-.65,-1.25,0,1.25):katana&&n===1?arc(p,-.65,-.65,0,.65):bat?0:arc(p,-.5,-.3,0,.3);
   rz=katana?-.18:bat?.1:0;
  }
 }
 if(action==='equip'||action==='unequip'){const t=smooth(action==='equip'?1-p:p);y-=t*.42;z-=t*.13;rx+=t*.8;ly-=t*.42;lrx+=t*.8;}
 if(action==='sprint'){rx-=.25;ry+=.2;y-=.1;}if(action.startsWith('slide')){y=1.45;rx=-.5;ly=1.45;}else if(action.includes('crouch')){y-=.5;ly-=.5;}
 return {pos:new Vector3(x,y,z),rot:new Quaternion().setFromEuler(new Euler(rx,ry,rz)),left:new Vector3(lx,ly,lz),leftRot:new Quaternion().setFromEuler(new Euler(lrx,lry,0))};
}
