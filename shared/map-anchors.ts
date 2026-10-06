import {MAPS} from './map.js';
import {walkable} from './traversal.js';
import type {Position} from './game.js';
// Separate authored capture destinations from rules. Spawn anchors already belong to each map.
const captures:Record<string,Position>={central_plaza:{x:1300,y:1200},scorched_point:{x:1200,y:1100,elevation:90},aerie_sky_port:{x:1100,y:1200},outlaws_canyon:{x:900,y:400},vikings_fjord:{x:1025,y:1700}};
export function mapAnchors(id:string){
 const map=MAPS[id];if(!map)throw new Error(`Unknown map ${id}`);
 const requested=captures[id];let capture:Position|undefined;
 // Find supported clear ground around the authored marker (monuments can occupy its center).
 for(let radius=0;radius<=300&&!capture;radius+=25)for(let i=0;i<16&&!capture;i++){
  const point={x:requested.x+Math.cos(i*Math.PI/8)*radius,y:requested.y+Math.sin(i*Math.PI/8)*radius,elevation:requested.elevation??0};
  if(walkable(point,map))capture=point;
 }
 if(!capture)throw new Error(`No valid capture zone for ${id}`);
 const points=map.spawns.filter(p=>walkable(p,map)).map(p=>({...p}));
 return {capture,respawns:points,chests:points.filter((_,i)=>i%2===0),floor:points.filter((_,i)=>i%2===1),flags:points.filter(p=>Math.hypot(p.x-capture!.x,p.y-capture!.y)>250)};
}
