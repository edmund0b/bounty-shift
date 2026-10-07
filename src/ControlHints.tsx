import React,{useEffect,useState} from 'react';

export function ControlHints({children}:{children:React.ReactNode}){
 const [shown,setShown]=useState(()=>{try{return localStorage.getItem('bounty-shift-control-hints')!=='hidden';}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem('bounty-shift-control-hints',shown?'shown':'hidden');}catch{/* Storage restrictions do not disable the toggle. */}},[shown]);
 return <aside className={`control-hints ${shown?'hints-shown':'hints-hidden'}`} aria-label="Gameplay controls"><button className="hint-toggle" aria-expanded={shown} aria-controls="gameplay-hint-cards" onClick={()=>{setShown(!shown);document.querySelector<HTMLCanvasElement>('.viewport canvas')?.focus({preventScroll:true});}}>{shown?'HIDE CONTROLS':'SHOW CONTROLS'} <span aria-hidden="true">⌨</span></button><div id="gameplay-hint-cards" className="hint-cards">{children}<span className="desktop-attack-hint">ATTACK / THROW <kbd>F</kbd></span></div></aside>;
}
