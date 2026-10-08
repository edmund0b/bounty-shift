import React from 'react';

export function ControlHints({children,shown,onToggle}:{children:React.ReactNode;shown:boolean;onToggle:()=>void}){
 return <aside className={`control-hints ${shown?'hints-shown':'hints-hidden'}`} aria-label="Gameplay controls"><button className="hint-toggle" aria-expanded={shown} aria-controls="gameplay-hint-cards" onClick={()=>{onToggle();document.querySelector<HTMLCanvasElement>('.viewport canvas')?.focus({preventScroll:true});}}>{shown?'HIDE CONTROLS':'SHOW CONTROLS'} <span aria-hidden="true">⌨</span></button><div id="gameplay-hint-cards" className="hint-cards">{children}</div></aside>;
}
