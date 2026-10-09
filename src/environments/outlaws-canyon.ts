import * as T from 'three';
import type {MapDefinition} from '../../shared/maps/types';
import {CANYON_MESAS,CANYON_RAMPS,CANYON_WOOD} from '../../shared/maps/outlaws-layout';
import {PlazaKit} from './central-plaza-kit';
import {CanyonRocks} from './outlaws-rocks';
import {canyonProps} from './outlaws-props';
export function buildOutlawsCanyon(scene:T.Scene,map:MapDefinition){const k=new PlazaKit(scene);k.root.name='outlaws-canyon-environment';const rocks=new CanyonRocks(k),sand=k.material('#ae9169'),wood=k.material('#786047','wood'),boards=k.material('#b09369','wood'),rope=k.material('#958365'),dark=k.material('#594735');
 k.box(0,0,map.bounds.width,map.bounds.height,-20,20,sand);
 // Sandy washes break up the ground without changing the support surface.
 const wash=k.material('#b99b73');for(const [x,y,w,d]of [[1050,1100,800,1080],[1850,1800,700,400],[280,770,500,170],[750,2570,1350,240]])k.box(x,y,w,d,.05,.1,wash);
 const rockIds=new Set(CANYON_MESAS.map(m=>m.id));let index=0;
 for(const b of map.blocks){k.solid(b);if(b.id.startsWith('wall-')){const horizontal=b.width>b.height,len=horizontal?b.width:b.height;for(let i=0;i<3;i++){const a=i*len/3;rocks.boulder(b.x+(horizontal?a:0),b.y+(horizontal?0:a),horizontal?len/3+35:b.width+8,horizontal?b.height+8:len/3+35,0,b.top*(.93+(i%2)*.1),index++);}}else if(b.shape==='ellipse')rocks.boulder(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,index++);else if(b.kind==='monument'||rockIds.has(b.id)||b.id==='rock-bridge')rocks.add(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,index++);else k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,b.kind==='crate'?boards:wood);}
 for(const s of map.surfaces.filter(s=>s.ramp)){const authored=CANYON_RAMPS.find(a=>a.id===s.id)!;k.slope(s,authored.wood?wood:sand,authored.wood?boards:sand);if(authored.wood){for(const side of [0,1]){if(s.ramp!.axis==='y'){const x=s.x+(side?s.width:0);k.beam([x,s.ramp!.from+30,s.y],[x,s.ramp!.to+30,s.y+s.height],3,rope);}else{const y=s.y+(side?s.height:0);k.beam([s.x,s.ramp!.from+30,y],[s.x+s.width,s.ramp!.to+30,y],3,rope);}}}}
 for(const p of CANYON_WOOD){const alongX=p.width>p.height,len=alongX?p.width:p.height;for(let t=0;t<len;t+=22)k.box(p.x+(alongX?t:0),p.y+(alongX?0:t),alongX?19:p.width,alongX?p.height:19,p.elevation+.2,1.2,boards);
  for(let t=25;t<len;t+=170)for(const side of [0,1]){const x=p.x+(alongX?t:side?p.width-5:5),y=p.y+(alongX?side?p.height-5:5:t);k.cylinderAt(x,y,4,0,p.elevation+30,wood);}
  // Rope only runs along long exposed sides, leaving ends and nearby access clear.
  if(p.id.includes('crossing')||p.id==='west-outpost-walk'){for(const side of [0,1]){const x=p.x+(side?p.width:0),y=p.y+(side?p.height:0);if(alongX)k.beam([p.x,p.elevation+30,y],[p.x+p.width,p.elevation+30,y],2.5,rope);else k.beam([x,p.elevation+30,p.y],[x,p.elevation+30,p.y+p.height],2.5,rope);}}
 }
 // Large boundary caps and exterior mesas create an irregular geological skyline.
 for(const b of map.blocks.filter(b=>b.id.startsWith('wall-'))){const x=b.x+b.width*.15,y=b.y+b.height*.15;rocks.boulder(x,y,b.width*.55,b.height*.65,b.top-15,b.top*.16,index++);}
 for(let i=0;i<12;i++){const x=-550+i*360;rocks.boulder(x,-420,280,350,0,530+i%3*100,i);rocks.boulder(x,3300,330,280,0,480+i%4*90,i);}
 // Cliff bands and scree remain pooled; no unique mesh per chip.
 for(const m of CANYON_MESAS){for(let i=0;i<4;i++){const x=m.x+20+i*(m.width-100)/4;rocks.boulder(x,m.y+10,65,55,m.elevation,8+i%2*5,i);}}
 // Rounded wall buttresses and scalloped roof pieces soften the cave without narrowing its center.
 for(let i=0;i<7;i++){const y=1000+i*120;rocks.boulder(265,y,60,115,0,182,i);if(i<6)rocks.boulder(550,y,60,115,0,182,i+1);rocks.boulder(305,y,180,110,172,35,i);}
 canyonProps(k,rocks);
 // A single deterministic, render-driven dust layer. It has no collision or weather gameplay.
 const dustPositions=new Float32Array(180*3);for(let i=0;i<180;i++){dustPositions[i*3]=(250+i*167%2300)*.03;dustPositions[i*3+1]=.25+(i%11)*.065;dustPositions[i*3+2]=(300+i*239%2400)*.03;}
 const dustGeo=k.track(new T.BufferGeometry());dustGeo.setAttribute('position',new T.BufferAttribute(dustPositions,3));const dustMat=k.track(new T.PointsMaterial({color:'#cfb388',size:.065,transparent:true,opacity:.26,depthWrite:false}));const dust=new T.Points(dustGeo,dustMat);dust.name='canyon-ambient-dust';dust.onBeforeRender=()=>{dust.position.x=Math.sin(performance.now()*.00012)*.7;dust.position.z=Math.sin(performance.now()*.00007)*.3;};k.root.add(dust);
 k.root.traverse(o=>{const m=(o as T.Mesh).material;if(m instanceof T.MeshBasicMaterial&&m.map)m.side=T.FrontSide;});k.finish();return{solids:k.solids,dispose:()=>k.dispose()};}
