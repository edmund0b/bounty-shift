import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {characters,characterById} from './characters/registry';
import {createRig,disposeTree} from './characters/rig';
import {animate,defaults} from './animations/player';
import {type RoomView,type ClientMessage} from '../shared/game';
import {type CharacterId,characterName} from '../shared/characters';
import './character-selection.css';

// Workshop Engine's 5.2-radius lineup, drag velocity, damping and front-most selection.
// Models are built once per screen; rotating never reloads or rebuilds a skin.
function CircularLineup({value,locked,onHighlight}:{value:CharacterId;locked:boolean;onHighlight:(id:CharacterId)=>void}){
 const host=useRef<HTMLDivElement>(null),target=useRef(0),lockedRef=useRef(locked),highlight=useRef(onHighlight),[error,setError]=useState('');
 lockedRef.current=locked;highlight.current=onHighlight;
 useEffect(()=>{target.current=-characters.findIndex(c=>c.id===value)/8*Math.PI*2;},[value]);
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setError('Enable hardware acceleration to preview the character lineup.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;el.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.05,100),carousel=new T.Group();scene.add(carousel);
  scene.add(new T.HemisphereLight(0xb6dfff,0x12253d,.9));for(const [color,intensity,x,y,z] of [[0xd3e9ff,2,4,8,6],[0xf0e6dc,1.3,-5,4,4],[0xbac8ee,2,2,5,-5]]){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
  const floor=new T.Mesh(new T.CircleGeometry(9,64),new T.MeshStandardMaterial({color:0x091623,roughness:.7,metalness:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
  const rigs=characters.map((c,i)=>{const rig=createRig(c,true),a=i/8*Math.PI*2;rig.root.position.set(Math.sin(a)*5.2,0,Math.cos(a)*5.2);rig.root.rotation.y=a;carousel.add(rig.root);return rig;});
  let rotation=target.current,velocity=0,drag=false,lastX=0,startX=0,frame=0,last=performance.now(),gesture=0;
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,w<h?5:4,w<h?20:15);camera.lookAt(0,1.3,2.5);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const down=(e:PointerEvent)=>{if(lockedRef.current)return;drag=true;startX=lastX=e.clientX;gesture=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!drag||e.pointerId!==gesture)return;const dx=e.clientX-lastX;lastX=e.clientX;rotation+=dx*.007;velocity=Math.max(-.025,Math.min(.025,dx*.0009));};
  const up=(e:PointerEvent)=>{if(!drag)return;drag=false;if(Math.abs(e.clientX-startX)<8){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(carousel.children,true)[0];if(hit){let o:T.Object3D|null=hit.object;while(o&&o.parent!==carousel)o=o.parent;const i=rigs.findIndex(r=>r.root===o);if(i>=0){target.current=-i/8*Math.PI*2;velocity=0;highlight.current(characters[i].id as CharacterId);}}}};
  const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>{drag=false;});
  const draw=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;
   if(!drag){if(Math.abs(velocity)>.0003&&!lockedRef.current){rotation+=velocity;velocity*=Math.exp(-dt*6);target.current=rotation;}else{const difference=Math.atan2(Math.sin(target.current-rotation),Math.cos(target.current-rotation));rotation+=difference*(1-Math.exp(-dt*9));}}
   carousel.rotation.y=rotation;let best=0,max=-Infinity;rigs.forEach((r,i)=>{animate(r,'idle',(now/3000)%1,defaults);const front=Math.cos(i/8*Math.PI*2+rotation);if(front>max){max=front;best=i;}r.ring.visible=front>.96;});
   if(!lockedRef.current&&drag)highlight.current(characters[best].id as CharacterId);
   if(!drag&&Math.abs(velocity)<.0003&&!lockedRef.current){const index=((Math.round(-rotation/(Math.PI*2)*8)%8)+8)%8;if(Math.abs(target.current-rotation)<.08)highlight.current(characters[index].id as CharacterId);}
   canvas.dataset.highlight=characters[best].id;renderer.render(scene,camera);frame=requestAnimationFrame(draw);
  };frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();disposeTree(scene);renderer.dispose();canvas.remove();};
 },[]);
 return <div className="character-stage" ref={host} aria-label="Circular Workshop character lineup">{error&&<p role="alert">{error}</p>}</div>;
}

export function CharacterSelection({room,id,status,action}:{room:RoomView;id:string;status:string;action:(m:ClientMessage)=>void}){
 const me=room.players.find(p=>p.id===id),[highlight,setHighlight]=useState<CharacterId>(me?.characterId??'voltrix');
 const equipped=me?.characterId,selection=room.selection;
 useEffect(()=>{if(equipped)setHighlight(equipped);},[equipped]);
 const seconds=Math.max(0,Math.ceil(((selection?.deadline??room.serverTime)-room.serverTime)/1000));
 const locked=room.players.filter(p=>p.characterId).length;
 const browse=(delta:number)=>{if(equipped)return;const i=characters.findIndex(c=>c.id===highlight);setHighlight(characters[(i+delta+8)%8].id as CharacterId);};
 return <section className="character-screen" aria-label="Character selection">
  <header className="selection-header"><div className="selection-brand">BOUNTY <i>SHIFT</i><small>MULTIPLAYER // CHARACTER SELECT</small></div><div className="selection-heading"><h1>SELECT YOUR <em>CHARACTER</em></h1><p>Choose your character before the hunt begins.</p></div><div className="selection-timer" role="timer"><small>AUTO EQUIP IN</small><strong>{seconds.toString().padStart(2,'0')}</strong><span>SECONDS</span></div></header>
  <CircularLineup value={highlight} locked={!!equipped} onHighlight={setHighlight}/>
  <aside className="selection-players"><h2>CHARACTERS LOCKED IN <span>{locked} / {room.players.length}</span></h2>{room.players.map(p=><div className={p.characterId?'is-equipped':''} key={p.id}><span className="lock-mark">{p.characterId?'✓':'○'}</span><span>{p.name}{p.id===id?' (you)':''}<small>{p.characterId?characterName(p.characterId):'SELECTING...'}</small></span><small>{!p.connected?'RECONNECTING':p.characterAutoAssigned?'AUTO-ASSIGNED':p.characterId?'LOCKED IN':'SELECTING'}</small></div>)}</aside>
  <div className="selection-focus"><div className="selection-browse"><button aria-label="Previous character" disabled={!!equipped} onClick={()=>browse(-1)}>←</button><div><small>{equipped?'CHARACTER EQUIPPED':'FEATURED CHARACTER'}</small><h2>{characterById(highlight).displayName}</h2></div><button aria-label="Next character" disabled={!!equipped} onClick={()=>browse(1)}>→</button></div><button className="equip-character" disabled={!!equipped||status!=='Connected'||seconds===0} onClick={()=>action({type:'choose_character',matchId:room.match.id,characterId:highlight})}>{equipped?'✓ CHARACTER EQUIPPED':'EQUIP CHARACTER'}</button><p role="status">{status!=='Connected'?status:equipped?'WAITING FOR OTHER PLAYERS...':'Drag to rotate • Tap a character to focus'}</p><div className="roster-shortcuts" aria-label="Character shortcuts">{characters.map(c=><button key={c.id} aria-label={`Highlight ${c.displayName}`} aria-pressed={highlight===c.id} disabled={!!equipped} style={{'--skin-color':`#${c.palette.glow.toString(16).padStart(6,'0')}`} as React.CSSProperties} onClick={()=>setHighlight(c.id as CharacterId)}>{c.displayName.slice(0,2)}</button>)}</div></div>
  <button className="selection-leave" onClick={()=>action({type:'leave'})}>← LEAVE MATCH</button>
 </section>;
}
