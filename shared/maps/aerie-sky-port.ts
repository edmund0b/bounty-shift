import type {MapDefinition,MapEnvironment,MapBlock,Surface,Rect,Footprint} from './types';
import {AERIE_SITES,AERIE_GROUND,AERIE_BRIDGES,AERIE_HUB_STAIRS,aerieStairs} from './aerie-layout';
const blocks:MapBlock[]=[],surfaces:Surface[]=[];const BLUE='#69c9ec';
function block(id:string,r:Footprint,bottom:number,top:number,kind:MapBlock['kind']='building'){blocks.push({...r,id,bottom,top,kind,name:'',accent:BLUE});}
function deck(id:string,r:Footprint,z:number){surfaces.push({...r,id,elevation:z,style:'deck'});block(id,r,z-10,z,'deck');}
function floor(id:string,r:Rect,holes:Rect[],z:number){const xs=[...new Set([r.x,r.x+r.width,...holes.flatMap(h=>[h.x,h.x+h.width])])].filter(x=>x>=r.x&&x<=r.x+r.width).sort((a,b)=>a-b),ys=[...new Set([r.y,r.y+r.height,...holes.flatMap(h=>[h.y,h.y+h.height])])].filter(y=>y>=r.y&&y<=r.y+r.height).sort((a,b)=>a-b);let n=0;for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=xs[i],y=ys[j],width=xs[i+1]-x,height=ys[j+1]-y;if(!holes.some(h=>x+width/2>h.x&&x+width/2<h.x+h.width&&y+height/2>h.y&&y+height/2<h.y+h.height))deck(id+'-'+n++,{x,y,width,height},z);}}
for(const s of AERIE_SITES){const stairs=aerieStairs(s),atrium={x:s.x+110,y:s.y+150,width:s.width-400,height:s.height-280};
 floor(s.id+'-balcony',s,[...stairs,atrium],120);
 const roofHole=['hangar','garden','arrival','observation'].includes(s.id)?[{x:s.x+100,y:s.y+120,width:s.width-375,height:s.height-240}]:[];
 floor(s.id+'-upper',s,[stairs[1],...roofHole],240);
 for(const st of stairs){surfaces.push({...st,elevation:Math.max(st.from,st.to),ramp:{axis:'y',from:st.from,to:st.to},style:'stairs'});}
 // Piers leave generous through-doors on each side and clear stair mouths.
 for(const [i,x,y]of [[0,s.x,s.y],[1,s.x+s.width-16,s.y],[2,s.x,s.y+s.height-16],[3,s.x+s.width-16,s.y+s.height-16]] as const)block(s.id+'-pier-'+i,{x,y,width:16,height:16},0,270);
 if(['mall','residential','control'].includes(s.id))for(const z of [0,120]){
  for(const yy of [s.y,s.y+s.height-12]){block(s.id+'-facade-a-'+z+'-'+yy,{x:s.x,y:yy,width:85,height:12},z,z+120);block(s.id+'-facade-b-'+z+'-'+yy,{x:s.x+245,y:yy,width:80,height:12},z,z+120);}
  for(const xx of [s.x,s.x+s.width-12])for(const yy of [s.y+180,s.y+s.height-180])if(!(s.id==='mall'&&z===120&&xx===s.x&&yy===s.y+s.height-180))block(s.id+'-side-'+z+'-'+xx+'-'+yy,{x:xx,y:yy,width:12,height:100},z,z+120);
  block(s.id+'-room-divider-'+z,{x:s.x+235,y:s.y+200,width:10,height:110},z,z+100);
 }
 for(const z of [0,120])for(const n of [0,1])block(s.id+'-furniture-'+z+'-'+n,{x:s.x+35,y:s.id==='mall'&&z===120&&n===1?s.y+s.height-90:s.y+220+n*140,width:65,height:65},z,z+38,s.id==='garden'?'planter':'barrier');
}
for(const b of AERIE_BRIDGES)deck(b.id,b,b.elevation);
deck('hub-upper-landing',{x:1840,y:1300,width:120,height:100},240);
deck('hub-upper-mid-mouth',{x:1840,y:1720,width:120,height:240},120);
deck('hub-high-crossing',{x:1740,y:1300,width:100,height:100},240);
for(const s of AERIE_HUB_STAIRS)surfaces.push({...s,elevation:Math.max(s.from,s.to),ramp:{axis:s.axis,from:s.from,to:s.to},style:'stairs'});
block('transit-spire',{x:1570,y:1610,width:100,height:100,shape:'ellipse'},0,850,'monument');
block('control-mast',{x:2450,y:690,width:90,height:90},240,610,'monument');
block('residential-penthouse',{x:230,y:820,width:130,height:130},240,430);
block('hangar-craft',{x:2460,y:1640,width:130,height:240},0,65,'barrier');
// Cover is large enough to read; small visual props do not enter collision.
for(const [i,x,y]of [[0,1410,1510],[1,1800,1740],[2,1200,2800],[3,2110,2550]] as const)block('civic-planter-'+i,{x,y,width:100,height:55},0,38,'planter');
// Rail only exposed edges of elevated floors; joins and stair entrances stay open.
const flat=surfaces.filter(s=>!s.ramp);
for(const r of flat)for(const side of ['n','s','w','e']){const horizontal=side==='n'||side==='s',len=horizontal?r.width:r.height;let begin:number|null=null,n=0;
 for(let t=0;t<=len;t+=5){const x=horizontal?r.x+t:r.x+(side==='e'?r.width+.5:-.5),y=horizontal?r.y+(side==='s'?r.height+.5:-.5):r.y+t;
 const joined=flat.some(a=>a!==r&&a.elevation===r.elevation&&x>=a.x&&x<=a.x+a.width&&y>=a.y&&y<=a.y+a.height)||surfaces.some(a=>a.ramp&&x>=a.x-1&&x<=a.x+a.width+1&&y>=a.y-1&&y<=a.y+a.height+1);
 const exposed=!joined&&t<len;if(exposed&&begin===null)begin=t;if(!exposed&&begin!==null){const l=t-begin;block(r.id+'-edge-'+side+'-'+n++,horizontal?{x:r.x+begin,y:r.y+(side==='s'?r.height-4:0),width:l,height:4}:{x:r.x+(side==='e'?r.width-4:0),y:r.y+begin,width:4,height:l},r.elevation,r.elevation+25,'rail');begin=null;}
 }}
const day:MapEnvironment={theme:'sky_port',base:'#dce5e9',fog:'#8b9db5',accent:BLUE,cloudColor:'#f6ded0',cloudShade:'#9daec6',lighting:{sky:'#e7f4ff',ground:'#928998',sun:'#ffe2bf',points:[{color:'#69dfff',x:48.6,y:8,z:49.8,intensity:22,distance:21},{color:'#ffd4a0',x:78,y:3,z:80,intensity:12,distance:17}]}};
const night:MapEnvironment={theme:'sky_port',base:'#465973',fog:'#17263f',accent:BLUE,cloudColor:'#63728c',cloudShade:'#374765',lighting:{sky:'#b7d0ef',ground:'#4a526d',sun:'#c8dcff',points:[{color:'#69dfff',x:48.6,y:8,z:49.8,intensity:30,distance:24},{color:'#ffc893',x:78,y:3,z:80,intensity:20,distance:19},{color:'#79baff',x:82,y:8,z:24,intensity:15,distance:17}]}};
export const aerieSkyPort:MapDefinition={id:'aerie_sky_port',name:'Aerie Sky-Port',bounds:{width:3200,height:3240},plaza:{x:1040,y:1080,width:1160,height:1160,shape:'ellipse'},ground:[...AERIE_GROUND,{x:1740,y:880,width:140,height:370},{x:1740,y:2070,width:140,height:480}],blocks,surfaces,
spawns:[{x:1150,y:2600},{x:2390,y:2460},{x:1240,y:210},{x:2540,y:560},{x:340,y:660},{x:2520,y:1460},{x:340,y:1810},{x:1470,y:1910}],
districts:[{id:'hub',name:'CENTRAL TRANSIT SPIRE',x:1620,y:1660,accent:BLUE},...AERIE_SITES.map(s=>({id:s.id,name:s.name,x:s.x+s.width/2,y:s.y+s.height/2,accent:BLUE}))],minimapLabels:[{text:'HUB',x:1620,y:1660},...AERIE_SITES.map(s=>({text:s.number,x:s.x+s.width/2,y:s.y+s.height/2}))],environment:day,variants:{day,night}};
