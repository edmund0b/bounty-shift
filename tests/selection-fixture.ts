import type {WebSocket} from 'ws';
import {RoomServer as ActualRoomServer} from '../server/rooms';
// Existing gameplay regressions complete the new pre-match protocol before exercising gameplay.
// Selection edge-case coverage uses the real RoomServer directly in character-selection.test.ts.
export class RoomServer extends ActualRoomServer {
 override message(ws:WebSocket,raw:string){super.message(ws,raw);const room=this.sessions.get(ws)?.room;
  if((()=>{try{return JSON.parse(raw)?.type;}catch{return null;}})()==='start'&&room?.phase==='character_selection'){
   for(const p of room.players)if(p.socket)super.message(p.socket,JSON.stringify({type:'choose_character',matchId:room.match.id,characterId:'voltrix'}));
   for(const p of room.players)if(p.socket)super.message(p.socket,JSON.stringify({type:'character_prepared',matchId:room.match.id}));
  }
 }
}
