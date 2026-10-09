import * as T from 'three';
import {PlazaKit} from './central-plaza-kit';
/** Three reusable stratified formation meshes; top footprints stay flat and fully supported. */
export class CanyonRocks{
 readonly geometry:T.BufferGeometry[]=[];readonly rounded:T.BufferGeometry[]=[];readonly material:T.MeshStandardMaterial;
 constructor(readonly k:PlazaKit){this.material=k.track(new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
  for(let variant=0;variant<3;variant++){
   const p:number[]=[],colors:number[]=[];const outline=[[-.5,-.5],[0,-.5],[.5,-.5],[.5,0],[.5,.5],[0,.5],[-.5,.5],[-.5,0]];
   const rings=Array.from({length:9},(_,j)=>outline.map(([x,z],i)=>{const t=j/8,bulge=j===8?1.015:1.02+Math.sin(j*2.1+i*.9+variant)*.028;return[x*bulge,t,z*bulge];}));
   const tri=(a:number[],b:number[],c:number[],color:T.Color)=>{p.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);};
   const palette=['#976b4d','#a77b57','#b28a63','#966b4e','#b38a64','#a17855','#bc956b','#9d7452'];
   for(let j=0;j<8;j++)for(let i=0;i<8;i++){const n=(i+1)%8,col=new T.Color(palette[(j+variant)%8]).multiplyScalar(.91+((i*3+j)%5)*.035);tri(rings[j][i],rings[j+1][i],rings[j+1][n],col);tri(rings[j][i],rings[j+1][n],rings[j][n],col);}
   for(let i=0;i<8;i++)tri([0,1,0],rings[8][(i+1)%8],rings[8][i],new T.Color('#c49b71'));
   for(let i=0;i<8;i++)tri([0,0,0],rings[0][i],rings[0][(i+1)%8],new T.Color('#684a36'));
   const geo=k.track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();this.geometry.push(geo);
   const round=k.track(new T.CylinderGeometry(.5,.53,1,11,8));round.translate(0,.5,0);const pos=round.getAttribute('position'),col:number[]=[];
   for(let i=0;i<pos.count;i++){const h=pos.getY(i),angle=Math.atan2(pos.getZ(i),pos.getX(i)),r=1+.10*Math.sin(angle*3+variant)+.065*Math.sin(h*28+angle*2)-.12*h*(variant/2);pos.setXYZ(i,pos.getX(i)*r,h,pos.getZ(i)*r);const c=new T.Color(palette[Math.min(7,Math.floor(h*8))]).multiplyScalar(.92+.08*Math.sin(angle+variant));col.push(c.r,c.g,c.b);}
   round.setAttribute('color',new T.Float32BufferAttribute(col,3));round.computeVertexNormals();this.rounded.push(round);

  }
  this.material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vCanyonWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 rockPosition=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
    rockPosition=instanceMatrix*rockPosition;
    #endif
    vCanyonWorld=(modelMatrix*rockPosition).xyz;`);
   shader.fragmentShader='varying vec3 vCanyonWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(floor(vCanyonWorld*31.0),vec3(12.9898,78.233,36.71)))*43758.5453);
    float strata=pow(abs(sin(vCanyonWorld.y*16.0+sin(vCanyonWorld.x*2.0)*.3+sin(vCanyonWorld.z*2.0)*.3)),14.0);
    diffuseColor.rgb*=.82+.18*grain;
    diffuseColor.rgb*=1.0-.16*strata;`);
  };
 }
 boulder(x:number,y:number,width:number,depth:number,bottom:number,height:number,variant=0){this.k.add(this.rounded[Math.abs(variant)%3],this.material,[x+width/2,bottom,y+depth/2],[width,height,depth]);}
 add(x:number,y:number,width:number,depth:number,bottom:number,height:number,variant=0){this.k.add(this.geometry[Math.abs(variant)%3],this.material,[x+width/2,bottom,y+depth/2],[width,height,depth]);}
}
