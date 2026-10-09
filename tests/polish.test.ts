import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MAPS} from '../shared/map';
import {CHARACTER_IDS} from '../shared/characters';
import {mapLocationLabels} from '../src/map-labels';

test('all eight source characters have distinct static head portraits, consistently framed',()=>{
 const hashes=new Set<string>();for(const id of CHARACTER_IDS){const png=readFileSync(new URL(`../public/portraits/${id}.png`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),640);hashes.add(createHash('sha256').update(png).digest('hex'));}assert.equal(hashes.size,8);
});
for(const map of Object.values(MAPS))test(`${map.name}: compact/expanded names stay on authored districts without overlaps`,()=>{
 for(const expanded of [false,true]){const labels=mapLocationLabels(map,expanded);assert.equal(labels.length,map.districts.length);for(const l of labels){const d=map.districts.find(d=>d.id===l.id)!;assert.equal(l.fullName,d.name);assert.equal(l.x,d.x);assert.equal(l.y,d.y);assert(!/^\d+$/.test(l.lines.join('')));assert(l.fontSize>50);assert(l.x-l.width/2>=0&&l.x+l.width/2<=map.bounds.width);assert(l.y-l.height/2>=0&&l.y+l.height/2<=map.bounds.height);}for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2);}}
});

test('tiny mobile maps prioritize three recognizable anchors; expanded maps restore every name',()=>{for(const map of Object.values(MAPS)){const tiny=mapLocationLabels(map,false,true);assert.equal(tiny.length,3);assert(tiny.every(l=>l.fontSize>=150));assert.equal(mapLocationLabels(map,true,true).length,map.districts.length);}});
