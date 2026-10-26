import {FLAG_CAPTURE} from '../shared/flag-capture.js';
import {NETWORK,type Position} from '../shared/game.js';
import {teamKey} from '../shared/modes.js';
import {near,type ModeRoom,type ModePlayer} from './modes.js';
export function resetCapture(room:ModeRoom,now:number,reason:string){const f=room.mode.flag;if(f.capture){const ownerId=f.capture.carrierId;delete f.capture;f.captureNotice={ownerId,at:now,kind:'interrupted',reason};}}
export function tickFlagCapture(room:ModeRoom,p:ModePlayer,now:number){
 const f=room.mode.flag,actor=p as ModePlayer&{dx?:number;dy?:number;lastInput?:number;airborne?:boolean;verticalVelocity?:number};
 const position:Position={x:p.x,y:p.y,elevation:p.elevation??0},sample=f.captureSample;f.captureSample={at:now,position};
 const elapsed=sample?Math.max(0,(now-sample.at)/1000):0,moved=sample?Math.hypot(p.x-sample.position.x,p.y-sample.position.y,(p.elevation??0)-(sample.position.elevation??0)):0;
 const liveInput=now-(actor.lastInput??now)<NETWORK.inputTimeoutMs,intent=liveInput&&Math.hypot(actor.dx??0,actor.dy??0)>FLAG_CAPTURE.inputTolerance;
 let reason='';if(f.state!=='carried'||f.carrier!==p.id||!p.socket||p.health<=0||p.frozenUntil>now||now>=room.round.endsAt)reason='Carrier unavailable';
 else if(!near(room,p,room.mode.capture,FLAG_CAPTURE.zoneRadius))reason='Left capture zone';
 else if(intent||p.dashRemaining>0||actor.airborne||Math.abs(actor.verticalVelocity??0)>.01||elapsed>0&&moved/elapsed>FLAG_CAPTURE.speedTolerance||f.capture&&Math.hypot(p.x-f.capture.anchor.x,p.y-f.capture.anchor.y,(p.elevation??0)-(f.capture.anchor.elevation??0))>FLAG_CAPTURE.driftTolerance)reason='Keep still to capture';
 if(reason){resetCapture(room,now,reason);return false;}
 if(!f.capture||f.capture.carrierId!==p.id){f.capture={carrierId:p.id,startedAt:now,endsAt:now+FLAG_CAPTURE.durationMs,anchor:position};delete f.captureNotice;return false;}
 if(now<f.capture.endsAt)return false;
 f.state='captured';f.captureNotice={at:now,kind:'captured',reason:'Flag captured'};delete f.capture;delete f.captureSample;room.mode.winnerKeys=[teamKey(room.mode,p.id)];return true;
}
