// Audio is unlocked only by an existing user gesture. No autoplay or per-chest AudioContext.
export function gameplayAudio(){
 let context:AudioContext|null=null;
 const unlock=()=>{try{context??=new AudioContext();void context.resume().catch(()=>{});}catch{/* Silent mode remains fully playable. */}};
 window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
 return {open(distance:number){if(!context||context.state!=='running'||distance>12)return;const now=context.currentTime,gain=context.createGain();gain.gain.setValueAtTime(.025*Math.max(0,1-distance/12),now);gain.gain.exponentialRampToValueAtTime(.0001,now+.22);gain.connect(context.destination);for(const frequency of [180,540]){const oscillator=context.createOscillator();oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(frequency*1.6,now+.17);oscillator.connect(gain);oscillator.start(now);oscillator.stop(now+.23);oscillator.onended=()=>oscillator.disconnect();}setTimeout(()=>gain.disconnect(),300);},dispose(){window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);void context?.close().catch(()=>{});}};
}
