import * as T from 'three';
import type {MapDefinition} from '../../shared/maps/types';
import {PLAZA_PROPS,PLAZA_BUILDINGS,CP_LEVELS as L} from '../../shared/maps/central-plaza-layout';
import {PlazaKit} from './central-plaza-kit';
import {buildingDetails} from './central-plaza-buildings';
import {plazaProps,transitDetails,streetsAndSkyline} from './central-plaza-props';
export function buildCentralPlaza(scene:T.Scene,map:MapDefinition){
 const k=new PlazaKit(scene),props=new Set(PLAZA_PROPS.map(p=>p.id));
 const asphalt=k.material('#24303a','wet'),paving=k.material('#56616a','wet'),metal=k.material('#405565','metal'),cyan=k.material('#58e7f5','glow');
 for(const b of map.blocks){k.solid(b);if(props.has(b.id)||b.id==='central-monument')continue;
  let mat=b.kind==='rail'?metal:b.kind==='deck'?k.material('#647483','wet'):k.material('#708193','brick');
  if(b.id.startsWith('district-street'))mat=asphalt;
  if(b.id.startsWith('transit-wall'))mat=k.material('#61717c');
  if(b.id.startsWith('district-boundary'))mat=k.material('#293e50','metal');
  if(b.id==='monument-platform')mat=paving;
  if(b.shape==='ellipse')k.cylinderAt(b.x+b.width/2,b.y+b.height/2,b.width/2,b.bottom,b.top-b.bottom,mat);
  else k.box(b.x,b.y,b.width,b.height,b.bottom,b.top-b.bottom,mat);
 }
 for(const s of map.surfaces)if(s.ramp)k.slope(s,metal,cyan);
 // Plaza paving stays level with the shared street datum; fine joints do not obstruct movement.
 for(let x=1070;x<2170;x+=80)for(let y=1120;y<2240;y+=80)k.box(x,y,77,77,L.street+.05,.15,paving);
 const crystal=k.track(new T.CylinderGeometry(0,1,1,5,1)),glass=k.material('#66b9ce','glass');
 k.add(crystal,glass,[1620,282,1670],[32,304,32],[0,.35,0]);
 k.add(crystal,cyan,[1620,285,1670],[11,280,11],[0,.35,0]);
 const ringGeo=k.track(new T.TorusGeometry(1,.012,6,64));
 const ring=new T.Mesh(ringGeo,cyan);ring.position.set(48.6,7.9,50.1);ring.scale.setScalar(2.25);ring.rotation.x=Math.PI/2-.22;k.root.add(ring);
 ring.onBeforeRender=()=>{ring.rotation.z=performance.now()*.00013;};
 const baseRing=k.track(new T.TorusGeometry(3.45,.035,6,64)),base=new T.Mesh(baseRing,cyan);base.position.set(48.6,3.94,50.1);base.rotation.x=Math.PI/2;k.root.add(base);
 k.sign('CENTRAL PLAZA',1620,1550,153,170,'#70eeff',Math.PI);
 buildingDetails(k);plazaProps(k);transitDetails(k);streetsAndSkyline(k);
 // One bounded camera-local rain draw; roof masks keep it outside the playable interiors.
 const count=600,positions=new Float32Array(count*6),seeds=new Float32Array(count*2);
 for(let i=0;i<count;i++){const x=((i*73)%601)/601,z=((i*137)%607)/607,y=((i*197)%613)/613;positions.set([x,y,z,x,y-.016,z],i*6);seeds[i*2]=seeds[i*2+1]=y;}
 const rainGeo=k.track(new T.BufferGeometry());rainGeo.setAttribute('position',new T.BufferAttribute(positions,3));rainGeo.setAttribute('seed',new T.BufferAttribute(seeds,1));
 const roofs=PLAZA_BUILDINGS.filter(b=>b.id!=='transit').map(b=>new T.Vector4(b.x*.03,b.y*.03,(b.x+b.width)*.03,(b.y+b.height)*.03));
 const rainMat=k.track(new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},roofs:{value:roofs}},vertexShader:`uniform float time; attribute float seed; varying vec3 world; void main(){vec3 p=vec3((position.x-.5)*24.,mod(seed*16.-time*8.,16.)+(position.y-seed)*16.,(position.z-.5)*24.);p.xz+=cameraPosition.xz;p.y+=cameraPosition.y-7.;world=p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec4 roofs[9];varying vec3 world;void main(){if(world.y<3.33)discard;for(int i=0;i<9;i++){vec4 r=roofs[i];if(world.x>r.x&&world.x<r.z&&world.z>r.y&&world.z<r.w&&world.y<10.8)discard;}gl_FragColor=vec4(.52,.72,.88,.22);}`}));
 const rain=new T.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;rain.onBeforeRender=()=>{rainMat.uniforms.time.value=performance.now()*.001;};k.root.add(rain);
 k.finish();return{solids:k.solids,dispose:()=>k.dispose()};
}
