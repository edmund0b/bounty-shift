import type {MapDefinition,MapBlock,Surface,Rect,Footprint} from './types';
import {SCORCHED_SITES,SCORCHED_GROUND,SCORCHED_BRIDGES,CORE_HIGH,SCORCHED_PROPS,scorchedStairs,SP_BOUNDS,type ScorchedSite} from './scorched-layout';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];
function block(id:string,r:Footprint,bottom:number,top:number,kind:MapBlock['kind']='building',name=''){blocks.push({...r,id,bottom,top,kind,name,accent:'#bc9677'});}
function deck(id:string,r:Footprint,z:number){surfaces.push({...r,id,elevation:z,style:'deck'});block(id,r,z-10,z,'deck');}
function floor(id:string,r:Rect,holes:Rect[],z:number){const xs=[...new Set([r.x,r.x+r.width,...holes.flatMap(h=>[h.x,h.x+h.width])])].filter(x=>x>=r.x&&x<=r.x+r.width).sort((a,b)=>a-b),ys=[...new Set([r.y,r.y+r.height,...holes.flatMap(h=>[h.y,h.y+h.height])])].filter(y=>y>=r.y&&y<=r.y+r.height).sort((a,b)=>a-b);let n=0;for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=xs[i],y=ys[j],w=xs[i+1]-x,h=ys[j+1]-y;if(!holes.some(a=>x+w/2>a.x&&x+w/2<a.x+a.width&&y+h/2>a.y&&y+h/2<a.y+a.height))deck(id+'-'+n++,{x,y,width:w,height:h},z);}}
function ramp(id:string,r:Rect,axis:'x'|'y',from:number,to:number){surfaces.push({...r,id,elevation:Math.max(from,to),ramp:{axis,from,to},style:'stairs'});}
const bridges=[...SCORCHED_BRIDGES,...CORE_HIGH];
function wall(b:ScorchedSite,side:'north'|'south'|'west'|'east',z:number){const horizontal=side==='north'||side==='south',start=horizontal?b.x:b.y,len=horizontal?b.width:b.height,spans:[number,number][]=[];const roof=z===(b.levels-1)*120;
 if(!roof){if(horizontal){const center=b.x+(b.id==='store'?220:(b.width-250)/2);spans.push([center-70,center+70]);if(side==='north'&&z===0&&b.id!=='store'){const stair=scorchedStairs(b)[0];spans.push([stair.x-2,stair.x+stair.width+2]);}}else spans.push([b.y+12,b.y+78]);}
 if(b.id==='store'&&side==='north'&&roof)spans.push([248,372]);
 for(const r of bridges){if(r.elevation!==z)continue;const touches=side==='north'?r.y+r.height===b.y:side==='south'?r.y===b.y+b.height:side==='west'?r.x+r.width===b.x:r.x===b.x+b.width;if(touches)spans.push(horizontal?[r.x-2,r.x+r.width+2]:[r.y-2,r.y+r.height+2]);}
 // Authored missing facade panels expose ruined rooms without changing the floor route.
 if(b.damage==='heavy'&&!roof&&side==='west')spans.push([b.y+250,b.y+390]);
 let cursor=start,n=0;const segment=(a:number,c:number,bottom:number,top:number)=>{if(c<=a)return;const t=roof?6:12;block(`${b.id}-${side}-${z}-${n++}`,horizontal?{x:a,y:side==='north'?b.y:b.y+b.height-t,width:c-a,height:t}:{x:side==='west'?b.x:b.x+b.width-t,y:a,width:t,height:c-a},bottom,top,roof?'rail':'building');};
 for(const [aa,cc]of spans.sort((a,b)=>a[0]-b[0])){const a=Math.max(start,aa),c=Math.min(start+len,cc);if(c<=start||a>=start+len)continue;if(a>cursor)segment(cursor,a,z,z+(roof?28:120));if(!roof)segment(a,c,z+100,z+120);cursor=Math.max(cursor,c);}segment(cursor,start+len,z,z+(roof?28:120));
}
for(const b of SCORCHED_SITES){const stairs=scorchedStairs(b);if(b.levels===3){floor(b.id+'-mid',b,[...stairs,...(b.id==='warehouse'?[{x:b.x+120,y:b.y+120,width:240,height:300}]:b.id==='residential'?[{x:b.x+120,y:b.y+220,width:140,height:130}]:[])],120);const damage=b.damage==='heavy'?[{x:b.x+125,y:b.y+160,width:b.id==='warehouse'?235:190,height:b.id==='warehouse'?280:170}]:[];floor(b.id+'-roof',b,[stairs[1],...damage],240);}else floor(b.id+'-roof',b,[],120);
 for(const s of stairs)ramp(s.id,s,'y',s.from,s.to);
 for(let level=0;level<b.levels;level++)for(const side of ['north','south','west','east'] as const)wall(b,side,level*120);
 for(const s of stairs)for(const side of [0,1])for(let i=0;i<4;i++){const h=s.from+(s.to-s.from)*(i+.5)/4;block(s.id+'-rail-'+side+'-'+i,{x:s.x+(side?s.width:-5),y:s.y+i*s.height/4,width:5,height:s.height/4},h,h+25,'rail');}
 if(['mining','research','store'].includes(b.id)){const mid=b.x+(b.id==='store'?220:(b.width-250)/2),y=b.y+b.height*.6;block(b.id+'-room-left',{x:b.x+12,y,width:mid-60-b.x-12,height:8},0,105);block(b.id+'-room-right',{x:mid+60,y,width:b.x+b.width-(b.id==='store'?12:250)-mid-60,height:8},0,105);}
}
deck('crucible',{x:1150,y:1050,width:900,height:900,shape:'ellipse'},120);
block('crucible-core',{x:1540,y:1440,width:120,height:120,shape:'ellipse'},120,540,'monument','THE CRUCIBLE');
ramp('core-north',{x:1520,y:730,width:160,height:320},'y',0,120);ramp('core-south',{x:1520,y:1950,width:160,height:340},'y',120,0);ramp('core-west',{x:800,y:1420,width:350,height:160},'x',0,120);ramp('core-east',{x:2050,y:1420,width:350,height:160},'x',120,0);
// Flat mouths overlap the circular rim so no route relies on stepping over a void.
for(const [id,r]of [['core-west-mouth',{x:1150,y:1420,width:170,height:160}],['core-east-mouth',{x:1880,y:1420,width:170,height:160}],['core-north-mouth',{x:1520,y:1050,width:160,height:250}],['core-south-mouth',{x:1520,y:1750,width:160,height:200}]] as const)deck(id,r,120);
for(const b of bridges)deck(b.id,b,b.elevation);
ramp('core-high-access',{x:1400,y:820,width:130,height:380},'y',120,240);
// Rail only exposed bridge edges. Junctions remain open where adjacent decks/buildings meet.
for(const b of bridges){for(const side of ['north','south','west','east']){const h=side==='north'||side==='south',start=h?b.x:b.y,len=h?b.width:b.height;let begin:number|null=null,n=0;for(let t=0;t<=len;t+=5){const x=h?start+t:b.x+(side==='east'?b.width+.5:-.5),y=h?b.y+(side==='south'?b.height+.5:-.5):start+t;const joined=bridges.some(r=>r!==b&&r.elevation===b.elevation&&x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height)||SCORCHED_SITES.some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height)||surfaces.some(r=>r.ramp&&Math.abs((r.ramp.axis==='y'?(Math.abs(y-r.y)<2?r.ramp.from:Math.abs(y-r.y-r.height)<2?r.ramp.to:-999):-999)-b.elevation)<.1&&x>=r.x&&x<=r.x+r.width&&y>=r.y-1&&y<=r.y+r.height+1);
 const exposed=!joined&&t<len;if(exposed&&begin===null)begin=t;if(!exposed&&begin!==null){const a=start+begin,l=t-begin;block(b.id+'-rail-'+side+'-'+n++,h?{x:a,y:b.y+(side==='south'?b.height-5:0),width:l,height:5}:{x:b.x+(side==='east'?b.width-5:0),y:a,width:5,height:l},b.elevation,b.elevation+25,'rail');begin=null;}}}}
block('research-observatory',{x:1205,y:245,width:120,height:120,shape:'ellipse'},240,325,'barrier');
for(const x of [2460,2570])block('power-stack-'+x,{x,y:595,width:40,height:40,shape:'ellipse'},240,420,'barrier');
for(const p of SCORCHED_PROPS)block(p.id,p,p.bottom,p.top,p.kind==='crate'?'crate':'barrier');
export const scorchedPoint:MapDefinition={id:'scorched_point',name:'Scorched Point',bounds:SP_BOUNDS,plaza:{x:1150,y:1050,width:900,height:900,shape:'ellipse'},blocks,surfaces,ground:SCORCHED_GROUND,
 spawns:[{x:960,y:440},{x:810,y:970},{x:2150,y:450},{x:760,y:1820},{x:3000,y:1370},{x:1900,y:2690},{x:850,y:2490},{x:2870,y:2240}],
 districts:[{id:'crucible',name:'CENTRAL GEOTHERMAL CORE',x:1600,y:1500,accent:'#ff9c47'},...SCORCHED_SITES.map(b=>({id:b.id,name:b.name,x:b.x+b.width/2,y:b.y+b.height/2,accent:b.accent}))],minimapLabels:[{text:'CORE',x:1600,y:1500},...SCORCHED_SITES.map(b=>({text:b.number,x:b.x+b.width/2,y:b.y+b.height/2}))],
 environment:{theme:'industrial',base:'#292724',fog:'#231b18',accent:'#f0964c',lava:'#ffae51',lighting:{sky:'#e0d8ca',ground:'#877768',sun:'#fff0da',points:[{color:'#ff651c',x:48,y:8,z:45,intensity:50,distance:25},{color:'#ff501c',x:65,y:4,z:43,intensity:30,distance:20},{color:'#ff6225',x:30,y:3,z:60,intensity:30,distance:20},{color:'#abcbd5',x:44,y:4,z:13,intensity:15,distance:13}]}}};
