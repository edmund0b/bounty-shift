import assert from 'node:assert/strict';
import {centralPlaza,buildingStairs} from '../shared/maps/central-plaza.ts';
import {PLAZA_BUILDINGS,TRANSIT_STAIRS} from '../shared/maps/central-plaza-layout.ts';
import {walkable} from '../shared/traversal.ts';
import {freshMotion,advanceMotion,STEP} from '../shared/game.ts';
console.log('Map:',centralPlaza.blocks.length,'blocks',centralPlaza.surfaces.length,'surfaces');
for(const p of centralPlaza.spawns)assert(walkable(p,centralPlaza));
const travel=(p,waypoints)=>{let m=freshMotion(p);for(const [x,y] of waypoints){for(let i=0;i<1000&&Math.hypot(m.x-x,m.y-y)>7;i++){let dx=x-m.x,dy=y-m.y,len=Math.hypot(dx,dy);m=advanceMotion(m,{dx:dx/len,dy:dy/len},STEP,centralPlaza);}if(Math.hypot(m.x-x,m.y-y)>9)return{blocked:m,toward:[x,y]};}return{x:m.x,y:m.y,elevation:m.elevation};};
for(const b of PLAZA_BUILDINGS.filter(b=>b.id!=='transit')){const [a,c]=buildingStairs(b),x=a.x+a.width/2,x2=c.x+c.width/2,y=a.y-40,south=a.y+a.height+40;const result=travel({x,y,elevation:110},[[x,south],[x2,south],[x2,y]]);assert(!result.blocked,b.id+JSON.stringify(result));assert.equal(result.elevation,350);console.log(b.id,'roof reached');}
const transit=travel({x:1975,y:2450,elevation:110},[[1975,2890],[1975,3060],[3065,3060],[3065,2610],[3065,2170]]);assert(!transit.blocked,JSON.stringify(transit));assert.equal(transit.elevation,110);console.log('transit shortcut passed');
