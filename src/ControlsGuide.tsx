import React from 'react';
import {ActionIcon} from './GameHud';
import './controls.css';

type Category='book'|'movement'|'camera'|'combat'|'general'|'joystick'|'swipe';
export function ControlSymbol({name}:{name:Category}){
 if(name==='movement')return <ActionIcon action="sprint"/>;
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
  {name==='book'?<><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z"/><path d="M12 5v15"/></>:name==='camera'?<><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v8m-6 0h12"/></>:name==='combat'?<><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>:name==='general'?<><path d="m10 2-1 3-3 1-3-1-2 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>:name==='joystick'?<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m14 0h5"/></>:<><path d="m3 6 4-3m-4 3 4 3M3 6h16m0 0-4-3m4 3-4 3M8 21l-4-6c-1-2 1-3 2-2l2 2V9c0-2 3-2 3 0v3c6-2 8 0 8 4l-1 5"/></>}
 </svg>;
}
function Key({children}:{children:React.ReactNode}){return <kbd className="control-key">{children}</kbd>}
function MouseInput({click=false}:{click?:boolean}){return <span className={`control-mouse ${click?'left-click':''}`}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="2" width="12" height="20" rx="6"/>{click&&<path d="M12 3C9 3 7 5 7 8v2h5Z" fill="currentColor" stroke="none"/>}<path d="M12 2v8m-6 0h12"/></svg><span>{click?'Left click':'Mouse'}</span></span>}
function Row({input,action,note}:{input:React.ReactNode;action:string;note?:string}){return <li className="control-row"><span className="control-input">{input}</span><span className="control-action">{action}{note&&<small>{note}</small>}</span></li>}
function Group({name,icon,children,hint}:{name:string;icon:Category;children:React.ReactNode;hint?:string}){return <section className="control-section" aria-label={name}><h3><ControlSymbol name={icon}/>{name}{hint&&<span>{hint}</span>}</h3><ul>{children}</ul></section>}
export function ControlsGuide({coarse}:{coarse:boolean}){return <div className="controls-guide">
 <span className="control-device">{coarse?'TOUCH CONTROLS':'KEYBOARD + MOUSE'}</span>
 <Group name="MOVEMENT" icon="movement" hint="Camera-relative">
  {coarse?<><Row input={<span className="control-touch"><ControlSymbol name="joystick"/></span>} action="Move" note="Left joystick"/><Row input={<span className="control-touch"><ActionIcon action="sprint"/></span>} action="Sprint" note="Hold Sprint"/><Row input={<span className="control-touch"><ActionIcon action="dash"/></span>} action="Dash" note="Tap Dash"/></>:<>
   <Row input={<><Key>W</Key><span className="key-or">or</span><Key>↑</Key></>} action="Move Forward"/>
   <Row input={<><Key>A</Key><span className="key-or">or</span><Key>←</Key></>} action="Move Left"/>
   <Row input={<><Key>S</Key><span className="key-or">or</span><Key>↓</Key></>} action="Move Backward"/>
   <Row input={<><Key>D</Key><span className="key-or">or</span><Key>→</Key></>} action="Move Right"/>
   <Row input={<Key>Shift</Key>} action="Sprint" note="Hold"/>
   <Row input={<Key>Space</Key>} action="Dash"/>
  </>}
 </Group>
 <Group name="CAMERA" icon="camera">
  {coarse?<Row input={<span className="control-touch"><ControlSymbol name="swipe"/></span>} action="Look Around" note="Drag open right side"/>:<><Row input={<MouseInput/>} action="Look Around" note="Click game to capture mouse"/><Row input={<><Key>Q</Key><Key>E</Key></>} action="Rotate Camera" note="Fallback"/></>}
 </Group>
 <Group name="COMBAT" icon="combat">
  {coarse?<Row input={<span className="control-touch"><ControlSymbol name="combat"/></span>} action="Attack" note="Tap Attack"/>:<><Row input={<MouseInput click/>} action="Attack" note="After mouse capture"/><Row input={<Key>F</Key>} action="Attack" note="Alternative"/></>}
 </Group>
 <Group name="ITEMS + EVASION" icon="general">
  <Row input={coarse?<span>USE</span>:<Key>R</Key>} action="Open / Pick up" note="Chest opens first; use again to claim"/>
  <Row input={coarse?<span>DODGE</span>:<Key>Z</Key>} action="Dodge" note="Shares Dash cooldown"/>
  <Row input={coarse?<span>SLIDE</span>:<Key>X</Key>} action="Slide" note="Move while activating"/>
  <Row input={coarse?<span>ATTACK</span>:<span>F / Click</span>} action="Throw Freeze Ball" note="When holding a ball"/>
 </Group>
 {!coarse&&<Group name="GENERAL" icon="general"><Row input={<Key>Esc</Key>} action="Release Cursor"/></Group>}
 </div>}
