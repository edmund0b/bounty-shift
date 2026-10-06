import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomInt, randomUUID, randomBytes } from 'node:crypto';

const MODES = {
    tag: { name: 'TAG', icon: '◉', description: 'Avoid being IT at the buzzer. Find and throw freeze balls to stop other runners.' },
    flag_run: { name: 'FLAG RUN', icon: '⚑', description: 'Loot and fight, then recover the flag and deliver it to the marked capture zone.' },
    kill_race: { name: 'KILL RACE', icon: '⚔', description: 'Find weapons and earn eliminations. Duos race to 15; highest score wins at the buzzer.' },
};
const RULES = { freezeMs: 3000, retagGraceMs: 1200, flagSpawnMs: 30000, killTarget: 15, pickupRange: 65, ballSpeed: 650, ballLifetimeMs: 1600, itemRespawnMs: 12000 };
const WEAPONS = { blade: { damage: 25, cooldown: .38 }, hammer: { damage: 40, cooldown: .9 } };
function emptyMode() { return { teams: {}, scores: {}, matchPoints: {}, it: null, tagAfter: 0, items: [], projectiles: [], flag: { state: 'not_spawned', carrier: null, position: { x: 0, y: 0 }, spawnAt: 0 }, capture: { x: 0, y: 0 }, winnerKeys: [], reason: '' }; }
const validMode = (value) => typeof value === 'string' && Object.hasOwn(MODES, value);
const validFormat = (value) => value === 'solo' || value === 'duo';
const validTeams = (format, count) => format === 'solo' ? count >= 2 && count <= 6 : count === 4 || count === 6;
function teamKey(state, id) { return state.teams[id] ?? id; }

const ICE = '#a4d9e5', blocks$4 = [], surfaces$4 = [];
function block$4(id, x, y, width, height, top, kind = 'barrier', name = '', bottom = 0) { blocks$4.push({ id, x, y, width, height, top, bottom, kind, name, accent: ICE }); }
function deck$3(id, x, y, width, height, elevation) { surfaces$4.push({ id, x, y, width, height, elevation, style: 'deck' }); block$4(id, x, y, width, height, elevation, 'deck', '', elevation - 10); }
function ramp$3(id, x, y, width, height, axis, from, to) { surfaces$4.push({ id, x, y, width, height, elevation: Math.max(from, to), ramp: { axis, from, to }, style: 'stairs' }); }
// An irregular fjord basin: narrow northern stronghold, broad village, rocky eastern cove,
// and a southern coastal shelf. Ice is ordinary supported terrain, never a new physics mode.
const ground$3 = [{ x: 620, y: 100, width: 900, height: 660 }, { x: 170, y: 620, width: 1760, height: 720 }, { x: 220, y: 1240, width: 1710, height: 670 }, { x: 400, y: 1800, width: 1400, height: 420 }, { x: 650, y: 2120, width: 950, height: 260 }];
block$4('valhalla-hall', 820, 330, 420, 300, 220, 'building', 'VALHALLA HALLS');
block$4('fortress-gatehouse', 650, 80, 150, 80, 230, 'building', 'FJORD FORTRESS');
block$4('western-guardhouse', 190, 710, 180, 260, 200, 'building', 'FJORD FORTRESS');
block$4('armory-hall', 1560, 740, 270, 260, 200, 'building', 'FROST-BITTEN ARMORY');
block$4('cove-longhouse', 1570, 1760, 220, 180, 160, 'building', "RAIDER'S COVE");
// Ground-to-mid stairs on both sides of the great hall; an upper northern circuit has two descents.
deck$3('valhalla-front', 720, 630, 620, 190, 90);
ramp$3('hall-front-stairs', 910, 820, 240, 270, 'y', 90, 0);
deck$3('west-hall-route', 560, 340, 260, 480, 90);
ramp$3('west-village-stairs', 560, 820, 240, 270, 'y', 90, 0);
deck$3('east-hall-route', 1240, 340, 250, 480, 90);
ramp$3('east-village-stairs', 1250, 820, 240, 270, 'y', 90, 0);
ramp$3('west-battlement-stairs', 560, 340, 240, 300, 'y', 180, 90);
ramp$3('east-battlement-stairs', 1250, 340, 240, 300, 'y', 180, 90);
deck$3('west-battlement', 560, 170, 260, 170, 180);
deck$3('north-wall-walk', 820, 170, 430, 150, 180);
deck$3('east-battlement', 1250, 170, 240, 170, 180);
// Western fortress loop reaches the village by stairs at both ends.
deck$3('western-fortress', 370, 700, 190, 560, 90);
ramp$3('fortress-south-stairs', 370, 1260, 190, 270, 'y', 90, 0);
deck$3('armory-terrace', 1490, 1000, 360, 200, 90);
ramp$3('armory-south-stairs', 1610, 1200, 220, 270, 'y', 90, 0);
ramp$3('armory-west-stairs', 1220, 1100, 270, 180, 'x', 0, 90);
// Cove is a short open-ended ice passage with a high ceiling, not a subterranean maze.
block$4('cave-west-wall', 1370, 1360, 45, 320, 210);
block$4('cave-east-wall', 1830, 1360, 45, 320, 240);
block$4('cave-ice-roof', 1415, 1420, 415, 200, 215, 'barrier', '', 170);
// Raised dock loop: climb either side, cross the timber quay, return to the frozen basin.
ramp$3('dock-west-stairs', 700, 1820, 220, 240, 'y', 0, 80);
ramp$3('dock-east-stairs', 1300, 1820, 220, 240, 'y', 0, 80);
deck$3('frost-guard-quay', 700, 2060, 820, 180, 80);
deck$3('dock-west-finger', 700, 2240, 220, 110, 80);
deck$3('dock-east-finger', 1300, 2240, 220, 110, 80);
block$4('plaza-runestone', 1000, 1580, 75, 95, 140, 'monument', 'RUNESTONE PLAZA');
// Fortifications/ice pillars shape approaches while the middle remains a connected frozen crossing.
for (const [i, x, y, w, h, t] of [
    [0, 180, 1040, 130, 160, 150], [1, 700, 1190, 130, 180, 140], [2, 1090, 1240, 90, 100, 80],
    [3, 370, 1610, 150, 150, 155], [4, 1210, 1740, 100, 95, 65], [5, 1730, 1110, 90, 85, 140],
    [6, 600, 1700, 85, 85, 60], [7, 940, 1960, 90, 80, 60], [8, 1550, 2020, 100, 100, 65],
    [9, 720, 1450, 100, 65, 50], [10, 1240, 1460, 85, 80, 55], [11, 1060, 900, 70, 90, 50],
])
    block$4(`frost-cover-${i}`, x, y, w, h, t, i % 3 === 0 ? 'monument' : 'crate');
for (const [i, x, y, w, h, e] of [[0, 760, 700, 70, 65, 90], [1, 1260, 650, 45, 50, 90], [2, 890, 200, 75, 65, 180], [3, 1510, 1030, 70, 65, 90], [4, 1080, 2080, 80, 55, 80]])
    block$4(`upper-cargo-${i}`, x, y, w, h, e + 45, 'crate', '', e);
// Rails guard exposed upper edges and leave every stair/bridge mouth open.
for (const [i, x, y, w, h, e] of [[0, 560, 170, 260, 10, 180], [1, 820, 170, 430, 10, 180], [2, 1250, 170, 240, 10, 180], [3, 1480, 180, 10, 150, 180], [4, 720, 630, 100, 10, 90], [5, 1240, 630, 100, 10, 90], [6, 700, 2230, 220, 10, 80], [7, 920, 2230, 380, 10, 80], [8, 1300, 2230, 220, 10, 80]])
    block$4(`fjord-rail-${i}`, x, y, w, h, e + 30, 'rail', '', e);
// Visible cliff volumes follow the ground outline. Distant mountains remain visual only.
for (const [i, x, y, w, h] of [[0, 0, 0, 2200, 80], [1, 0, 80, 600, 530], [2, 1540, 80, 660, 530], [3, 0, 610, 150, 720], [4, 1950, 610, 250, 1320], [5, 0, 1340, 200, 460], [6, 0, 1810, 380, 410], [7, 0, 2230, 630, 270], [8, 1620, 2240, 580, 260], [9, 0, 2390, 2200, 110]])
    block$4(`ice-cliff-${i}`, x, y, w, h, 300 + (i % 3) * 70, 'monument');
const vikingsFjord = { id: 'vikings_fjord', name: "Viking's Fjord", bounds: { width: 2200, height: 2500 }, plaza: { x: 700, y: 1480, width: 650, height: 430 }, ground: ground$3, blocks: blocks$4, surfaces: surfaces$4,
    spawns: [{ x: 990, y: 150 }, { x: 1450, y: 730, elevation: 90 }, { x: 270, y: 1280 }, { x: 1850, y: 850 }, { x: 1570, y: 1310 }, { x: 1800, y: 1660 }, { x: 480, y: 1930 }, { x: 1230, y: 2310 }],
    districts: [{ id: 'fortress', name: 'FJORD FORTRESS', x: 1030, y: 230, accent: ICE }, { id: 'hall', name: 'VALHALLA HALLS', x: 1030, y: 570, accent: ICE }, { id: 'armory', name: 'FROST-BITTEN ARMORY', x: 1680, y: 900, accent: ICE }, { id: 'cove', name: "RAIDER'S COVE", x: 1560, y: 1500, accent: ICE }, { id: 'runes', name: 'RUNESTONE PLAZA', x: 1030, y: 1700, accent: ICE }, { id: 'docks', name: 'FROST-GUARD DOCKS', x: 1120, y: 2150, accent: ICE }],
    minimapLabels: [{ text: 'FORTRESS', x: 1070, y: 125 }, { text: 'VALHALLA', x: 1030, y: 510 }, { text: 'ARMORY', x: 1670, y: 950 }, { text: 'COVE', x: 1570, y: 1570 }, { text: 'RUNESTONE', x: 1040, y: 1820 }, { text: 'DOCKS', x: 1110, y: 2320 }],
    environment: { theme: 'fjord', base: '#bacdd5', fog: '#b0c6d4', accent: ICE, lighting: { sky: '#e5f2ff', ground: '#627e92', sun: '#dfeeff', points: [{ color: '#ffd39d', x: 30.9, y: 3.3, z: 19.5, intensity: 8, distance: 9 }, { color: '#a2efff', x: 46.8, y: 2.2, z: 45, intensity: 6, distance: 9 }] } } };

const WOOD = '#ad8656', blocks$3 = [], surfaces$3 = [];
function block$3(id, x, y, width, height, top, kind = 'crate', name = '', bottom = 0) { blocks$3.push({ id, x, y, width, height, top, bottom, kind, name, accent: WOOD }); }
function deck$2(id, x, y, width, height, elevation) { surfaces$3.push({ id, x, y, width, height, elevation, style: 'deck' }); block$3(id, x, y, width, height, elevation, 'deck', '', elevation - 10); }
function roof(id, x, y, width, height, elevation, name) { block$3(id, x, y, width, height, elevation, 'building', name); surfaces$3.push({ id: id + '-roof', x, y, width, height, elevation, style: 'deck' }); }
function ramp$2(id, x, y, width, height, axis, from, to) { surfaces$3.push({ id, x, y, width, height, elevation: Math.max(from, to), ramp: { axis, from, to }, style: 'stairs' }); }
// Irregular canyon footprint: open north plaza, pinched settlement, wider southern crossing.
const ground$2 = [{ x: 300, y: 100, width: 1300, height: 650 }, { x: 160, y: 690, width: 1580, height: 570 }, { x: 160, y: 1160, width: 1590, height: 900 }, { x: 280, y: 1960, width: 1350, height: 500 }];
roof('deadwood-saloon', 400, 480, 300, 320, 160, 'DEADWOOD SALOON');
roof('east-boardhouse', 1200, 420, 240, 300, 160, 'DUST-UP PLAZA');
deck$2('saloon-porch', 380, 800, 430, 180, 80);
ramp$2('saloon-street-stairs', 810, 800, 240, 180, 'x', 80, 0);
ramp$2('saloon-roof-stairs', 710, 480, 180, 320, 'y', 160, 80);
deck$2('saloon-roof-landing', 380, 420, 510, 60, 160);
deck$2('town-roof-bridge', 700, 300, 500, 180, 160);
deck$2('east-roof-landing', 1200, 240, 440, 180, 160);
ramp$2('east-roof-descent', 1460, 420, 180, 420, 'y', 160, 0);
deck$2('mine-side-walkway', 380, 980, 180, 860, 80);
deck$2('mine-overlook', 200, 1180, 180, 180, 80);
ramp$2('west-crossing-stairs', 380, 1840, 180, 240, 'y', 80, 0);
roof('west-renegade', 160, 1480, 220, 260, 80, 'RENEGADE OUTPOST');
roof('east-renegade', 1250, 1400, 300, 260, 80, 'RENEGADE OUTPOST');
deck$2('renegade-crossing-bridge', 560, 1580, 690, 180, 80);
deck$2('east-outpost-landing', 1250, 1660, 500, 180, 80);
ramp$2('east-outpost-stairs', 1570, 1380, 180, 280, 'y', 0, 80);
// Solid architecture breaks sightlines; the mine pocket is open-ended rather than a tunnel maze.
block$3('mine-headframe', 180, 920, 180, 200, 170, 'building', 'LAST CHANCE MINE');
block$3('scrap-mine-store', 170, 700, 180, 150, 150, 'building', 'SCRAP CANYON MINE');
block$3('mine-backwall', 170, 1140, 30, 250, 160, 'barrier');
block$3('plaza-adobe', 1010, 120, 170, 170, 140, 'building', "OUTLAW'S CANYON");
block$3('west-plaza-store', 320, 150, 200, 190, 130, 'building');
block$3('east-plaza-store', 1300, 110, 260, 160, 135, 'building');
block$3('east-scrap-shed', 1260, 970, 250, 240, 130, 'building');
block$3('crossing-storefront', 650, 2090, 240, 170, 145, 'building', 'GHOST TOWN CROSSING');
block$3('abandoned-east-store', 1350, 2140, 220, 200, 110, 'building');
block$3('crossing-west-store', 300, 2230, 170, 170, 100, 'building');
// Gameplay cliff volumes track the irregular ground boundary; decorative rock layers stay outside.
for (const [i, x, y, w, h] of [
    [0, 0, 0, 1900, 90], [1, 0, 90, 280, 590], [2, 1620, 90, 280, 580],
    [3, 0, 680, 140, 1260], [4, 1760, 680, 140, 1380],
    [5, 0, 2070, 260, 530], [6, 1650, 2080, 250, 520], [7, 0, 2470, 1900, 130],
])
    block$3(`canyon-cliff-${i}`, x, y, w, h, 250 + (i % 3) * 60, 'monument');
// Cover density is concentrated at junctions, leaving 150+ unit navigation lanes.
for (const [i, x, y, w, h, top] of [
    [0, 620, 220, 85, 85, 45], [1, 760, 560, 70, 100, 40], [2, 1050, 660, 100, 70, 55],
    [3, 610, 1120, 95, 75, 60], [4, 1020, 1220, 100, 110, 70], [5, 900, 1450, 90, 65, 45],
    [6, 650, 1830, 130, 80, 60], [7, 1120, 2020, 110, 80, 45], [8, 940, 2300, 100, 75, 50],
    [9, 210, 1980, 95, 65, 55], [10, 1570, 1160, 90, 75, 65], [11, 1170, 850, 75, 80, 55],
])
    block$3(`scrap-cover-${i}`, x, y, w, h, top, i % 3 === 0 ? 'barrier' : 'crate');
for (const [i, x, y, w, h, e] of [[0, 440, 560, 80, 65, 160], [1, 1240, 500, 65, 80, 160], [2, 200, 1540, 65, 65, 80], [3, 1320, 1460, 80, 65, 80]])
    block$3(`upper-cover-${i}`, x, y, w, h, e + 42, 'crate', '', e);
// Upper perimeter rails leave ramp mouths and bridge connections clear.
for (const [i, x, y, w, h, e] of [[0, 380, 420, 320, 8, 160], [1, 700, 300, 500, 8, 160], [2, 890, 472, 310, 8, 160], [3, 1200, 240, 440, 8, 160], [4, 1632, 240, 8, 180, 160], [5, 380, 1000, 8, 180, 80], [6, 380, 1360, 8, 120, 80], [7, 560, 1580, 690, 8, 80], [8, 560, 1752, 690, 8, 80]])
    block$3(`wood-rail-${i}`, x, y, w, h, e + 27, 'rail', '', e);
// Prop collision uses the same footprint as the visible barrel/cart body.
for (const [i, x, y, w, h] of [[0, 970, 1100, 150, 80], [1, 970, 1880, 130, 70]])
    block$3(`cart-body-${i}`, x - w / 2, y - h / 2, w, h, 45, 'barrier');
for (const [i, x, y] of [[0, 720, 1030], [1, 1210, 1260], [2, 580, 2000], [3, 1480, 1930]]) {
    block$3(`barrel-body-${i}`, x - 22.5, y - 22.5, 45, 45, 55, 'barrier');
    blocks$3[blocks$3.length - 1].shape = 'ellipse';
}
const outlawsCanyon = { id: 'outlaws_canyon', name: "Outlaw's Canyon", bounds: { width: 1900, height: 2600 }, plaza: { x: 550, y: 150, width: 690, height: 570 }, ground: ground$2, blocks: blocks$3, surfaces: surfaces$3,
    spawns: [{ x: 580, y: 390 }, { x: 1150, y: 350 }, { x: 260, y: 1370 }, { x: 1550, y: 1285 }, { x: 300, y: 1900 }, { x: 1500, y: 2010 }, { x: 550, y: 2380 }, { x: 1200, y: 2370 }],
    districts: [{ id: 'dust', name: 'DUST-UP PLAZA', x: 950, y: 350, accent: WOOD }, { id: 'mine', name: 'LAST CHANCE MINE', x: 260, y: 1200, accent: WOOD }, { id: 'saloon', name: 'DEADWOOD SALOON', x: 550, y: 730, accent: WOOD }, { id: 'west', name: 'WEST RENEGADE', x: 270, y: 1600, accent: WOOD }, { id: 'east', name: 'EAST RENEGADE', x: 1400, y: 1550, accent: WOOD }, { id: 'crossing', name: 'GHOST TOWN CROSSING', x: 1030, y: 2280, accent: WOOD }],
    minimapLabels: [{ text: 'DUST-UP', x: 950, y: 360 }, { text: 'PLAZA', x: 950, y: 470 }, { text: 'LAST CHANCE', x: 400, y: 1130 }, { text: 'MINE', x: 420, y: 1250 }, { text: 'RENEGADE', x: 900, y: 1530 }, { text: 'GHOST TOWN', x: 1050, y: 2230 }, { text: 'CROSSING', x: 1050, y: 2340 }],
    decorations: [{ kind: 'cart', x: 970, y: 1100, width: 150, height: 55, depth: 80 }, { kind: 'cart', x: 970, y: 1880, width: 130, height: 55, depth: 70 }, { kind: 'barrel', x: 720, y: 1030, width: 45, height: 55, depth: 45 }, { kind: 'barrel', x: 1210, y: 1260, width: 45, height: 55, depth: 45 }, { kind: 'barrel', x: 580, y: 2000, width: 45, height: 55, depth: 45 }, { kind: 'barrel', x: 1480, y: 1930, width: 45, height: 55, depth: 45 }],
    environment: { theme: 'canyon', base: '#bca076', fog: '#d6bea0', accent: WOOD, lighting: { sky: '#f4e4c6', ground: '#766049', sun: '#ffe0b0', points: [{ color: '#ffc078', x: 16, y: 3, z: 25, intensity: 9, distance: 12 }, { color: '#efb777', x: 7, y: 3, z: 35, intensity: 7, distance: 10 }] } } };

const BLUE = '#69c9ec';
const blocks$2 = [], surfaces$2 = [];
function block$2(id, x, y, width, height, top, kind = 'crate', name = '', bottom = 0, shape) { blocks$2.push({ id, x, y, width, height, top, bottom, kind, name, accent: BLUE, shape }); }
function deck$1(id, x, y, width, height, elevation, shape) { surfaces$2.push({ id, x, y, width, height, elevation, style: 'deck', shape }); block$2(id, x, y, width, height, elevation, 'deck', '', elevation - 10, shape); }
function ramp$1(id, x, y, width, height, axis, from, to) { surfaces$2.push({ id, x, y, width, height, elevation: Math.max(from, to), ramp: { axis, from, to }, style: 'stairs' }); }
const ground$1 = [
    { x: 720, y: 820, width: 760, height: 760, shape: 'ellipse' },
    { x: 120, y: 950, width: 440, height: 360 },
    { x: 500, y: 1070, width: 420, height: 240 },
    { x: 1660, y: 890, width: 460, height: 700 },
    { x: 1390, y: 1070, width: 330, height: 240 },
    { x: 780, y: 1880, width: 640, height: 380, shape: 'ellipse' },
    { x: 980, y: 1510, width: 240, height: 450 },
    { x: 170, y: 1560, width: 440, height: 370 },
    { x: 250, y: 1260, width: 200, height: 400 },
    { x: 550, y: 1660, width: 550, height: 180 },
    { x: 1150, y: 1660, width: 550, height: 180 },
    { x: 1690, y: 1480, width: 200, height: 400 },
    { x: 480, y: 880, width: 300, height: 240 },
    { x: 1420, y: 880, width: 300, height: 240 },
];
// Suspended terminal and observation route: 0 / 90 / 180, with paired ascent/descent.
deck$1('cloudhaven-platform', 760, 140, 680, 480, 90, 'ellipse');
deck$1('north-bridge', 1000, 570, 200, 250, 90);
ramp$1('terminal-main-stairs', 1000, 820, 200, 260, 'y', 90, 0);
deck$1('sunset-upper-bridge', 570, 450, 430, 180, 90);
ramp$1('sunset-side-stairs', 570, 630, 180, 270, 'y', 90, 0);
deck$1('stardust-upper-bridge', 1300, 450, 330, 180, 90);
ramp$1('stardust-side-stairs', 1450, 630, 180, 270, 'y', 90, 0);
deck$1('terminal-observation', 780, 80, 640, 200, 180);
ramp$1('observation-west-stairs', 800, 280, 180, 280, 'y', 180, 90);
ramp$1('observation-east-stairs', 1200, 280, 180, 280, 'y', 180, 90);
deck$1('terminal-west-landing', 800, 540, 200, 120, 90);
deck$1('terminal-east-landing', 1200, 540, 200, 120, 90);
deck$1('observatory-terrace', 920, 2050, 360, 140, 90);
ramp$1('observatory-stairs', 1020, 1790, 160, 260, 'y', 0, 90);
// Terminal/observatory pods are closed landmarks; circulation remains open on every side.
block$2('terminal-dome-base', 950, 220, 300, 240, 210, 'monument', 'CLOUDHAVEN TERMINAL', 90, 'ellipse');
block$2('observatory-dome-base', 990, 2090, 200, 100, 205, 'monument', 'HIGH OBSERVATORY', 90, 'ellipse');
block$2('navigation-beacon', 1050, 1150, 100, 100, 75, 'monument', 'AERIE PLAZA', 0, 'ellipse');
block$2('sunset-gate', 150, 970, 110, 95, 160, 'building', 'SUNSET GATE');
block$2('west-dock-kiosk', 190, 1760, 95, 95, 100, 'building', 'STARDUST DOCK');
block$2('east-dock-terminal', 1980, 940, 120, 130, 145, 'building', 'STARDUST DOCK');
for (const [i, x, y, w, h, top, bottom] of [
    [0, 850, 1020, 90, 65, 45, 0], [1, 1280, 1340, 90, 65, 55, 0],
    [2, 930, 1380, 70, 80, 42, 0], [3, 1270, 960, 80, 70, 55, 0],
    [4, 375, 1130, 80, 65, 65, 0], [5, 410, 1630, 100, 70, 55, 0],
    [6, 1850, 1160, 100, 75, 55, 0], [7, 1990, 1390, 90, 90, 65, 0],
    [8, 1710, 960, 90, 75, 35, 0], [9, 810, 2100, 65, 55, 40, 0],
    [10, 1350, 2100, 50, 50, 42, 0], [11, 1250, 170, 65, 65, 220, 180],
])
    block$2(`terminal-cover-${i}`, x, y, w, h, top, i === 2 || i === 8 ? 'barrier' : 'crate', '', bottom);
// Rails at upper exposed edges; unsupported support boundaries secure the remaining platform lips.
for (const [i, x, y, w, h, e] of [
    [0, 780, 80, 640, 8, 180], [1, 780, 80, 8, 200, 180], [2, 1412, 80, 8, 200, 180],
    [3, 980, 272, 220, 8, 180], [4, 570, 450, 390, 8, 90], [5, 750, 622, 50, 8, 90],
    [6, 1370, 450, 260, 8, 90], [7, 1400, 622, 50, 8, 90],
    [8, 1000, 660, 8, 160, 90], [9, 1192, 660, 8, 160, 90],
    [10, 920, 2050, 100, 8, 90], [11, 1180, 2050, 100, 8, 90],
    [12, 920, 2050, 8, 140, 90], [13, 1272, 2050, 8, 140, 90],
])
    block$2(`sky-rail-${i}`, x, y, w, h, e + 28, 'rail', '', e);
const day = { theme: 'sky_port', base: '#d3d0c4', fog: '#bfd8e8', accent: BLUE, cloudColor: '#eef0e8', cloudShade: '#c5d7e2', lighting: { sky: '#ecf4ff', ground: '#82725d', sun: '#fff1d3', points: [{ color: '#a4ddff', x: 33, y: 4, z: 36, intensity: 12, distance: 20 }, { color: '#ffdea6', x: 10, y: 4, z: 33, intensity: 8, distance: 18 }] } };
const night = { theme: 'sky_port', base: '#394b6b', fog: '#111a39', accent: '#83d9ff', cloudColor: '#32466b', cloudShade: '#263656', lighting: { sky: '#bdccff', ground: '#25304d', sun: '#acbcff', points: [{ color: '#7fbdff', x: 33, y: 4, z: 36, intensity: 22, distance: 22 }, { color: '#b8a6ff', x: 33, y: 5, z: 12, intensity: 18, distance: 20 }] } };
const aerieSkyPort = { id: 'aerie_sky_port', name: 'Aerie Sky-Port', bounds: { width: 2200, height: 2400 }, plaza: { x: 720, y: 820, width: 760, height: 760, shape: 'ellipse' }, ground: ground$1, blocks: blocks$2, surfaces: surfaces$2,
    spawns: [{ x: 240, y: 1140 }, { x: 1950, y: 1100 }, { x: 900, y: 600, elevation: 90 }, { x: 880, y: 2070 }, { x: 310, y: 1740 }, { x: 1940, y: 1470 }, { x: 1300, y: 600, elevation: 90 }, { x: 1320, y: 2080 }],
    districts: [{ id: 'plaza', name: 'AERIE PLAZA', x: 1100, y: 1200, accent: BLUE }, { id: 'terminal', name: 'CLOUDHAVEN TERMINAL', x: 1100, y: 390, accent: BLUE }, { id: 'sunset', name: 'SUNSET GATE', x: 300, y: 1100, accent: BLUE }, { id: 'west-dock', name: 'STARDUST DOCK', x: 350, y: 1730, accent: BLUE }, { id: 'east-dock', name: 'STARDUST DOCK', x: 1900, y: 1250, accent: BLUE }, { id: 'observatory', name: 'HIGH OBSERVATORY', x: 1100, y: 2070, accent: BLUE }],
    minimapLabels: [{ text: 'TERMINAL', x: 1100, y: 700 }, { text: 'PLAZA', x: 1100, y: 1400 }, { text: 'SUNSET', x: 335, y: 1240 }, { text: 'WEST DOCK', x: 395, y: 1850 }, { text: 'STARDUST', x: 1900, y: 1550 }, { text: 'OBSERVATORY', x: 1100, y: 2330 }],
    decorations: [{ kind: 'dome', x: 1100, y: 340, elevation: 210, width: 300, height: 130, depth: 240 }, { kind: 'dome', x: 1090, y: 2140, elevation: 205, width: 200, height: 95, depth: 100 }, { kind: 'vent', x: 1100, y: 1200, elevation: 75, width: 80, height: 80, depth: 80 }, { kind: 'shuttle', x: 2040, y: 1720, elevation: 40, width: 250, height: 60, depth: 130 }, { kind: 'shuttle', x: 260, y: 700, elevation: 140, width: 200, height: 50, depth: 95 }],
    environment: day, variants: { day, night } };

const CYAN = '#46dfff', PINK = '#f077de';
const blocks$1 = [];
function block$1(id, x, y, width, height, top, kind = 'crate', name = '', accent = CYAN, bottom = 0) { blocks$1.push({ id, x, y, width, height, top, bottom, kind, name, accent }); }
// Deliberately asymmetric buildings leave outer lanes, forecourts, and multiple exits.
block$1('west-hall', 180, 500, 350, 200, 210, 'building', 'WEST DEPOT', PINK);
block$1('west-loading', 180, 1030, 350, 350, 185, 'building', '', PINK);
block$1('east-store', 2050, 600, 360, 170, 220, 'building', 'EAST STORAGE', PINK);
block$1('east-service', 2090, 1130, 300, 300, 185, 'building', '', PINK);
block$1('terminal', 1030, 1830, 540, 180, 200, 'building', 'SOUTH TERMINAL');
block$1('north-left', 850, 70, 220, 160, 240, 'building', '');
block$1('north-right', 1530, 90, 220, 150, 220, 'building', '');
block$1('signal-base', 1220, 970, 160, 160, 22, 'monument', 'CENTRAL PLAZA');
for (const [i, x, y, w, h, z] of [
    [0, 400, 800, 100, 100, 55], [1, 200, 1510, 160, 70, 48], [2, 450, 1410, 100, 90, 64],
    [3, 920, 850, 90, 65, 35], [4, 1620, 820, 100, 70, 55], [5, 970, 1190, 100, 65, 30],
    [6, 1540, 1210, 100, 85, 55], [7, 2150, 900, 160, 80, 60], [8, 2350, 1040, 80, 110, 45],
    [9, 1940, 1000, 90, 150, 65], [10, 2170, 1530, 160, 70, 55], [11, 890, 1610, 95, 70, 35],
    [12, 1670, 1640, 95, 70, 35], [13, 1130, 1550, 110, 45, 28], [14, 1450, 1540, 110, 45, 28],
])
    block$1(`cargo-${i}`, x, y, w, h, z, i >= 11 ? 'barrier' : 'crate', '', i < 3 || i >= 7 && i <= 10 ? PINK : CYAN);
for (const [i, x, y] of [[0, 580, 460], [1, 1900, 470], [2, 510, 1750], [3, 1970, 1790]])
    block$1(`planter-${i}`, x, y, 95, 80, 25, 'planter', '', i % 2 ? PINK : CYAN);
const surfaces$1 = [
    { id: 'north-bridge', x: 650, y: 280, width: 1300, height: 150, elevation: 100, style: 'deck' },
    { id: 'west-catwalk', x: 650, y: 430, width: 160, height: 1090, elevation: 100, style: 'deck' },
    { id: 'east-catwalk', x: 1790, y: 430, width: 160, height: 1090, elevation: 100, style: 'deck' },
    { id: 'west-balcony', x: 810, y: 1380, width: 220, height: 140, elevation: 100, style: 'deck' },
    { id: 'east-balcony', x: 1570, y: 1380, width: 220, height: 140, elevation: 100, style: 'deck' },
    { id: 'north-stairs', x: 1220, y: 430, width: 160, height: 320, elevation: 100, ramp: { axis: 'y', from: 100, to: 0 }, style: 'stairs' },
    { id: 'west-stairs', x: 650, y: 1520, width: 160, height: 360, elevation: 100, ramp: { axis: 'y', from: 100, to: 0 }, style: 'stairs' },
    { id: 'east-ramp', x: 1790, y: 1520, width: 160, height: 360, elevation: 100, ramp: { axis: 'y', from: 100, to: 0 }, style: 'ramp' },
];
for (const s of surfaces$1.filter(s => !s.ramp))
    block$1(s.id, s.x, s.y, s.width, s.height, s.elevation, 'deck', '', CYAN, s.elevation - 8);
// Rails protect upper edges while leaving broad stair mouths and junctions open.
for (const [i, x, y, w, h] of [
    [0, 650, 280, 1300, 9], [1, 810, 421, 410, 9], [2, 1380, 421, 410, 9],
    [3, 650, 430, 9, 1090], [4, 801, 430, 9, 950], [5, 1941, 430, 9, 1090], [6, 1790, 430, 9, 950],
    [7, 810, 1380, 220, 9], [8, 810, 1511, 220, 9], [9, 1021, 1380, 9, 140],
    [10, 1570, 1380, 220, 9], [11, 1570, 1511, 220, 9], [12, 1570, 1380, 9, 140],
])
    block$1(`rail-${i}`, x, y, w, h, 133, 'rail', '', CYAN, 100);
const centralPlaza = { id: 'central_plaza', name: 'Central Plaza', bounds: { width: 2600, height: 2100 }, plaza: { x: 850, y: 760, width: 900, height: 600 }, blocks: blocks$1, surfaces: surfaces$1,
    spawns: [{ x: 950, y: 1710 }, { x: 1650, y: 1710 }, { x: 610, y: 850 }, { x: 2000, y: 870 }, { x: 1120, y: 540 }, { x: 1480, y: 540 }, { x: 400, y: 1650 }, { x: 2250, y: 1740 }],
    districts: [{ id: 'center', name: 'CENTRAL PLAZA', x: 1300, y: 900, accent: CYAN }, { id: 'west', name: 'WEST DEPOT', x: 350, y: 780, accent: PINK }, { id: 'east', name: 'EAST STORAGE', x: 2250, y: 830, accent: PINK }, { id: 'south', name: 'SOUTH TERMINAL', x: 1300, y: 1750, accent: CYAN }, { id: 'north', name: 'NORTH BRIDGE', x: 1300, y: 320, accent: CYAN }],
    environment: { base: '#122337', fog: '#071223', accent: CYAN } };

const EMBER = '#ff772b', IRON = '#d69764';
const blocks = [], surfaces = [];
const ground = [
    { x: 840, y: 40, width: 720, height: 520 }, // Refinery
    { x: 110, y: 400, width: 490, height: 430 }, // Mines
    { x: 80, y: 930, width: 480, height: 500 }, // Forge
    { x: 1840, y: 880, width: 560, height: 500 }, // Hell's Depot
    { x: 1800, y: 350, width: 600, height: 410 }, // Lava Fields
    { x: 850, y: 1680, width: 700, height: 440 }, // Volcanic Depot
    { x: 220, y: 1550, width: 620, height: 550 }, // Lower maintenance
    { x: 1560, y: 1500, width: 840, height: 600 }, // Slag logistics
    { x: 350, y: 180, width: 1700, height: 160 },
    { x: 350, y: 180, width: 180, height: 650 },
    { x: 240, y: 780, width: 220, height: 280 },
    { x: 240, y: 1370, width: 220, height: 300 },
    { x: 700, y: 1930, width: 1150, height: 170 },
    { x: 2040, y: 1280, width: 180, height: 400 },
    { x: 2050, y: 700, width: 180, height: 240 },
    { x: 2290, y: 700, width: 110, height: 1000 },
    { x: 1900, y: 180, width: 180, height: 320 },
];
function block(id, x, y, width, height, top, kind = 'crate', name = '', bottom = 0, shape) { blocks.push({ id, x, y, width, height, top, bottom, kind, name, accent: EMBER, shape }); }
function deck(id, x, y, width, height, elevation, shape) {
    surfaces.push({ id, x, y, width, height, elevation, style: 'deck', shape });
    block(id, x, y, width, height, elevation, 'deck', '', elevation - 10, shape);
}
function ramp(id, x, y, width, height, axis, from, to, style = 'stairs') {
    surfaces.push({ id, x, y, width, height, elevation: Math.max(from, to), ramp: { axis, from, to }, style });
}
// Three connected height bands: lower sectors, raised Crucible/bridges, upper refinery loop.
deck('crucible', 860, 760, 680, 680, 90, 'ellipse');
deck('north-approach', 1100, 750, 200, 250, 90);
deck('south-approach', 1100, 1300, 200, 200, 90);
deck('west-approach', 560, 1000, 400, 200, 90);
deck('east-approach', 1440, 1000, 400, 200, 90);
ramp('refinery-crucible', 1100, 510, 200, 240, 'y', 0, 90);
ramp('depot-crucible', 1100, 1500, 200, 270, 'y', 90, 0);
ramp('forge-crucible', 300, 1000, 260, 200, 'x', 0, 90);
ramp('logistics-crucible', 1840, 1000, 260, 200, 'x', 90, 0);
deck('west-maintenance', 560, 1100, 180, 680, 90);
deck('east-maintenance', 1660, 1100, 180, 680, 90);
deck('west-mid-landing', 560, 1600, 280, 180, 90);
deck('east-mid-landing', 1560, 1600, 280, 180, 90);
ramp('west-low-access', 560, 1780, 200, 260, 'y', 90, 0);
ramp('east-low-access', 1640, 1780, 200, 260, 'y', 90, 0);
deck('west-upper', 660, 560, 180, 740, 190);
deck('east-upper', 1560, 560, 180, 740, 190);
deck('refinery-overlook', 660, 560, 1080, 180, 190);
ramp('west-upper-access', 660, 1300, 180, 300, 'y', 190, 90);
ramp('east-upper-access', 1560, 1300, 180, 300, 'y', 190, 90);
ramp('refinery-upper-access', 900, 60, 180, 500, 'y', 0, 190);
// Machinery solids provide honest line-of-sight cover; decorations sit on these footprints.
block('refinery-furnace', 1250, 100, 240, 260, 260, 'building', 'MAGMA REFINERY');
block('mines-rock', 120, 410, 140, 220, 190, 'building', 'OBSIDIAN MINES');
block('forge-furnace', 90, 1250, 200, 160, 230, 'building', "HELL'S FORGE");
block('depot-hall', 2150, 880, 160, 160, 215, 'building', "HELL'S DEPOT");
block('fields-vent', 2130, 390, 140, 170, 150, 'building', 'LAVA FIELDS');
block('volcanic-machinery', 950, 1950, 170, 155, 190, 'building', 'VOLCANIC DEPOT');
block('slag-equipment', 2030, 1800, 180, 200, 180, 'building', '');
block('crucible-core', 1130, 1030, 140, 140, 185, 'monument', 'THE CRUCIBLE', 90, 'ellipse');
for (const [i, x, y, w, h, top, bottom] of [
    [0, 560, 480, 60, 110, 75, 0], [1, 300, 670, 100, 70, 65, 0], [2, 450, 900, 70, 75, 55, 0],
    [3, 190, 1140, 65, 80, 70, 0], [4, 2020, 1230, 100, 70, 55, 0], [5, 1860, 480, 85, 100, 65, 0],
    [6, 1900, 1540, 70, 55, 70, 0], [7, 1390, 1810, 75, 70, 55, 0], [8, 450, 1680, 80, 100, 55, 0],
    [9, 1010, 950, 70, 55, 140, 90], [10, 1350, 1200, 65, 75, 145, 90],
    [11, 680, 820, 50, 70, 240, 190], [12, 1680, 1070, 40, 60, 230, 190],
    [13, 1380, 590, 120, 65, 230, 190],
])
    block(`equipment-${i}`, x, y, w, h, top, i === 9 || i === 13 ? 'barrier' : 'crate', '', bottom);
// Guard rails leave broad ramp mouths and junctions open. Unsupported edges also stop movement.
for (const [i, x, y, w, h, e] of [
    [0, 560, 1000, 390, 8, 90], [1, 1445, 1000, 395, 8, 90],
    [2, 740, 1192, 195, 8, 90], [3, 1465, 1192, 195, 8, 90],
    [4, 1100, 770, 8, 65, 90], [5, 1292, 770, 8, 65, 90],
    [6, 1100, 1390, 8, 110, 90], [7, 1292, 1390, 8, 110, 90],
    [8, 560, 1200, 8, 580, 90], [9, 1732, 1200, 8, 580, 90],
    [10, 660, 560, 8, 740, 190], [11, 832, 740, 8, 560, 190],
    [12, 1732, 560, 8, 740, 190], [13, 1560, 740, 8, 560, 190],
    [14, 660, 560, 240, 8, 190], [15, 1080, 560, 660, 8, 190],
    [16, 840, 732, 720, 8, 190],
])
    block(`guard-${i}`, x, y, w, h, e + 30, 'rail', '', e);
const decorations = [
    { kind: 'tank', x: 1365, y: 230, width: 130, height: 320, depth: 130 },
    { kind: 'stack', x: 1290, y: 180, width: 55, height: 450, depth: 55 },
    { kind: 'stack', x: 1450, y: 170, width: 50, height: 380, depth: 50 },
    { kind: 'tank', x: 170, y: 1320, width: 90, height: 300, depth: 90 },
    { kind: 'pipe', x: 1100, y: 130, width: 1050, height: 35, depth: 35 },
    { kind: 'pipe', x: 130, y: 1140, width: 32, height: 260, depth: 32 },
    { kind: 'rock', x: 185, y: 520, width: 140, height: 240, depth: 180 },
    { kind: 'vent', x: 1200, y: 1100, elevation: 185, width: 105, height: 8, depth: 105 },
];
for (let i = 0; i < 14; i++)
    decorations.push({ kind: i % 3 ? 'rock' : 'stack', x: i * 180 - 60, y: i % 2 ? -150 : 2350, width: 140, height: 280 + i % 4 * 100, depth: 150 });
for (let i = 0; i < 4; i++)
    decorations.push({ kind: 'lavafall', x: i * 800 - 100, y: i % 2 ? -100 : 2310, width: 50, height: 450, depth: 35 });
const scorchedPoint = { id: 'scorched_point', name: 'Scorched Point', bounds: { width: 2400, height: 2200 }, plaza: { x: 860, y: 760, width: 680, height: 680, shape: 'ellipse' }, blocks, surfaces, ground,
    spawns: [{ x: 1190, y: 390 }, { x: 380, y: 570 }, { x: 2050, y: 600 }, { x: 180, y: 980 }, { x: 2210, y: 1200 }, { x: 1240, y: 1900 }, { x: 350, y: 1880 }, { x: 1900, y: 1710 }],
    districts: [{ id: 'crucible', name: 'THE CRUCIBLE', x: 1200, y: 1100, accent: IRON }, { id: 'refinery', name: 'MAGMA REFINERY', x: 1350, y: 230, accent: EMBER }, { id: 'mines', name: 'OBSIDIAN MINES', x: 350, y: 550, accent: IRON }, { id: 'fields', name: 'LAVA FIELDS', x: 2030, y: 520, accent: EMBER }, { id: 'forge', name: "HELL'S FORGE", x: 300, y: 1170, accent: EMBER }, { id: 'depot', name: "HELL'S DEPOT", x: 2100, y: 1170, accent: EMBER }, { id: 'volcanic', name: 'VOLCANIC DEPOT', x: 1250, y: 1880, accent: IRON }],
    minimapLabels: [{ text: 'REFINERY', x: 1200, y: 430 }, { text: 'MINES', x: 360, y: 780 }, { text: 'FIELDS', x: 2050, y: 690 }, { text: 'FORGE', x: 300, y: 1390 }, { text: 'DEPOT', x: 2100, y: 1370 }, { text: 'CRUCIBLE', x: 1200, y: 1270 }, { text: 'VOLCANIC', x: 1220, y: 2080 }], decorations,
    environment: { theme: 'industrial', base: '#241e1b', fog: '#160e0b', accent: EMBER, lava: '#ffddaa', lighting: { sky: '#d8bba5', ground: '#261009', sun: '#ffc596', points: [{ color: '#ff5010', x: 36, y: 3, z: 33, intensity: 28, distance: 28 }, { color: '#ff6f25', x: 36, y: 4, z: 9, intensity: 20, distance: 25 }] } } };

// Only completed maps enter the registry. Future IDs are reserved, not selectable.
const MAPS = { central_plaza: centralPlaza, scorched_point: scorchedPoint, aerie_sky_port: aerieSkyPort, outlaws_canyon: outlawsCanyon, vikings_fjord: vikingsFjord };
const ACTIVE_MAP = MAPS.central_plaza;
const WORLD = ACTIVE_MAP.bounds;
ACTIVE_MAP.blocks;
ACTIVE_MAP.spawns;
ACTIVE_MAP.plaza;

const TRAVERSAL = { radius: 14, bodyHeight: 60, maxStep: 3.5};
function inside(p, r, padding = 0) { if (r.shape === 'ellipse') {
    const rx = r.width / 2 + padding, ry = r.height / 2 + padding;
    return rx > 0 && ry > 0 && ((p.x - r.x - r.width / 2) / rx) ** 2 + ((p.y - r.y - r.height / 2) / ry) ** 2 <= 1 + 1e-8;
} return p.x >= r.x - padding && p.x <= r.x + r.width + padding && p.y >= r.y - padding && p.y <= r.y + r.height + padding; }
function groundSupport(p, map) { if (!map.ground)
    return true; for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, point = { x: p.x + Math.cos(a) * TRAVERSAL.radius, y: p.y + Math.sin(a) * TRAVERSAL.radius };
    if (!map.ground.some(r => inside(point, r)))
        return false;
} return true; }
function surfaceHeight(s, p) { if (!s.ramp)
    return s.elevation; const distance = s.ramp.axis === 'x' ? (p.x - s.x) / s.width : (p.y - s.y) / s.height; return s.ramp.from + (s.ramp.to - s.ramp.from) * Math.max(0, Math.min(1, distance)); }
function blockedAt(p, map = ACTIVE_MAP) {
    const z = p.elevation ?? 0, r = TRAVERSAL.radius;
    if (p.x < r || p.y < r || p.x > map.bounds.width - r || p.y > map.bounds.height - r || z < 0)
        return true;
    if (map.blocks.some(b => inside(p, b, b.kind === 'deck' ? 0 : r - .001) && z < b.top - .001 && z + TRAVERSAL.bodyHeight > b.bottom + .001))
        return true;
    // Ramps are solid wedges, not teleport zones or hollow invisible stairs.
    return map.surfaces.some(s => s.ramp && inside(p, s) && z < surfaceHeight(s, p) - .01);
}
function supported(p, map = ACTIVE_MAP) { const z = p.elevation ?? 0; return z === 0 ? groundSupport(p, map) : map.surfaces.some(s => inside(p, s) && Math.abs(surfaceHeight(s, p) - z) < .02); }
function walkable(p, map = ACTIVE_MAP) { return supported(p, map) && !blockedAt(p, map); }
function nextPosition(previous, x, y, map = ACTIVE_MAP) {
    const prior = previous.elevation ?? 0, point = { x, y };
    const heights = [0, ...map.surfaces.filter(s => inside(point, s)).map(s => surfaceHeight(s, point))];
    // Tiny axis substeps allow slopes and prevent passing through geometry at dash speed.
    for (const elevation of [...new Set(heights)].sort((a, b) => b - a)) {
        if (Math.abs(elevation - prior) > TRAVERSAL.maxStep + 1e-6)
            continue;
        const candidate = { x, y, elevation };
        if (walkable(candidate, map))
            return candidate;
    }
    return null;
}

const ARENA = { ...WORLD, radius: TRAVERSAL.radius, speed: 220 };
const STEP = 1 / 30;
const MAX_PLAYERS = 6;
const RECONNECT_MS = 10_000;
const NETWORK = { inputTimeoutMs: 300, maxInputAdvance: 120};
const COLORS = ['#60cfff', '#ffbc66', '#b6a2ff', '#77d8a4', '#ff8da5', '#e9df78'];
const MOVEMENT = { sprintMultiplier: 1.5, staminaMax: 100, staminaDrain: 28, staminaRegen: 22, regenDelay: 0.6, dashSpeed: 850, dashDuration: 0.18, dashCooldown: 3 };
function freshMotion(position) {
    return { ...position, traversalState: 'idle', elevation: position.elevation ?? 0, stamina: MOVEMENT.staminaMax, regenWait: 0, exhausted: false, dashCooldown: 0, dashRemaining: 0, dashX: 0, dashY: 1, facingX: 0, facingY: 1, dashSeen: 0, sprinting: false };
}
function isWalkable(p, map = ACTIVE_MAP) { return walkable(p, map); }
// Server and client prediction share the same floor/solid tests and <=5px steps.
function move(p, dx, dy, dt = STEP, speed = ARENA.speed, map = ACTIVE_MAP) {
    const length = Math.hypot(dx, dy);
    if (length > 1) {
        dx /= length;
        dy /= length;
    }
    const totalX = dx * speed * dt, totalY = dy * speed * dt, steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / 5));
    let point = { ...p, elevation: p.elevation ?? 0 };
    for (let i = 0; i < steps; i++) {
        const x = Math.max(ARENA.radius, Math.min(map.bounds.width - ARENA.radius, point.x + totalX / steps));
        point = nextPosition(point, x, point.y, map) ?? point;
        const y = Math.max(ARENA.radius, Math.min(map.bounds.height - ARENA.radius, point.y + totalY / steps));
        point = nextPosition(point, point.x, y, map) ?? point;
    }
    return point;
}
function advanceMotion(previous, input, dt = STEP, map = ACTIVE_MAP) {
    const s = { ...previous };
    s.dashCooldown = Math.max(0, s.dashCooldown - dt);
    s.regenWait = Math.max(0, s.regenWait - dt);
    let dx = input.dx, dy = input.dy;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
        dx /= length;
        dy /= length;
    }
    if (length > 0) {
        s.facingX = dx;
        s.facingY = dy;
    }
    if (!input.sprint)
        s.exhausted = false;
    const dashId = input.dashId ?? s.dashSeen;
    if (dashId > s.dashSeen) {
        s.dashSeen = dashId;
        if (s.dashCooldown <= 0 && (input.dashStyle !== 'slide' || length > 0)) {
            s.traversalState = input.dashStyle ?? 'dash';
            s.dashCooldown = MOVEMENT.dashCooldown;
            s.dashRemaining = s.traversalState === 'slide' ? .42 : s.traversalState === 'dodge' ? .24 : MOVEMENT.dashDuration;
            s.dashX = length > 0 ? dx : s.facingX;
            s.dashY = length > 0 ? dy : s.facingY;
        }
    }
    s.sprinting = !!input.sprint && length > 0 && !s.exhausted && s.stamina > 0 && s.dashRemaining <= 0;
    if (s.sprinting) {
        s.stamina = Math.max(0, s.stamina - MOVEMENT.staminaDrain * dt);
        s.regenWait = MOVEMENT.regenDelay;
        if (s.stamina === 0)
            s.exhausted = true;
    }
    else if (s.regenWait <= 0)
        s.stamina = Math.min(MOVEMENT.staminaMax, s.stamina + MOVEMENT.staminaRegen * dt);
    let pos;
    if (s.dashRemaining > 0) {
        const time = Math.min(dt, s.dashRemaining);
        pos = move(s, s.dashX, s.dashY, time, s.traversalState === 'slide' ? 400 : s.traversalState === 'dodge' ? 580 : MOVEMENT.dashSpeed, map);
        s.dashRemaining = Math.max(0, s.dashRemaining - dt);
    }
    else
        pos = move(s, dx, dy, dt, ARENA.speed * (s.sprinting ? MOVEMENT.sprintMultiplier : 1), map);
    if (s.dashRemaining <= 0)
        s.traversalState = s.sprinting ? 'sprint' : length > 0 ? 'walk' : 'idle';
    return { ...s, ...pos, elevation: pos.elevation ?? 0 };
}

const COMBAT = { chestHeight: 30, maxHealth: 100, damage: 25, range: 80, halfAngle: Math.PI / 3, cooldown: 0.6, respawnDelay: 5, protection: 1.5, attackFlash: 0.15, hitFlash: 0.2 };
function freshCombat() { return { health: COMBAT.maxHealth, koRemaining: 0, protection: 0, attackCooldown: 0, attackSeen: 0, attackFlash: 0, hitFlash: 0, attackX: 0, attackY: 1, spawnVersion: 0 }; }
// Chest-height segment against actual solid volumes, including overhead decks.
function clearAttackLine(a, b, map = ACTIVE_MAP) {
    const az = (a.elevation ?? 0) + COMBAT.chestHeight, bz = (b.elevation ?? 0) + COMBAT.chestHeight;
    const hit = map.blocks.some(w => {
        if (w.shape === 'ellipse') {
            const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, bz - az) / 2));
            for (let i = 0; i <= steps; i++) {
                const t = i / steps, z = az + (bz - az) * t;
                if (z >= w.bottom && z <= w.top && inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, w))
                    return true;
            }
            return false;
        }
        let enter = 0, exit = 1;
        for (const [start, delta, min, max] of [[a.x, b.x - a.x, w.x, w.x + w.width], [a.y, b.y - a.y, w.y, w.y + w.height], [az, bz - az, w.bottom, w.top]]) {
            if (Math.abs(delta) < 1e-9) {
                if (start < min || start > max)
                    return false;
                continue;
            }
            const t1 = (min - start) / delta, t2 = (max - start) / delta;
            enter = Math.max(enter, Math.min(t1, t2));
            exit = Math.min(exit, Math.max(t1, t2));
            if (enter > exit)
                return false;
        }
        return enter <= exit;
    });
    if (hit)
        return false;
    // Short melee segments are sampled conservatively through sloped stair solids.
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, bz - az) / 4));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, z = az + (bz - az) * t;
        if (map.surfaces.some(s => s.ramp && inside(p, s) && z >= 0 && z <= surfaceHeight(s, p)))
            return false;
    }
    return true;
}
function canHit(a, b, aimX, aimY, map = ACTIVE_MAP) {
    const dx = b.x - a.x, dy = b.y - a.y, horizontal = Math.hypot(dx, dy), distance = Math.hypot(dx, dy, (b.elevation ?? 0) - (a.elevation ?? 0)), length = Math.hypot(aimX, aimY);
    if (distance > COMBAT.range || length < 1e-6)
        return false;
    return (horizontal < 1e-6 || (dx * aimX + dy * aimY) / (horizontal * length) >= Math.cos(COMBAT.halfAngle)) && clearAttackLine(a, b, map);
}
function safeSpawn(others, map = ACTIVE_MAP) {
    let best = map.spawns[0], score = -1;
    for (const point of map.spawns) {
        if (!isWalkable(point, map))
            continue;
        const clearance = others.length ? Math.min(...others.map(p => Math.hypot(p.x - point.x, p.y - point.y))) : Infinity;
        if (clearance > score) {
            best = point;
            score = clearance;
        }
    }
    return { ...best };
}

// Separate authored capture destinations from rules. Spawn anchors already belong to each map.
const captures = { central_plaza: { x: 1300, y: 1200 }, scorched_point: { x: 1200, y: 1100, elevation: 90 }, aerie_sky_port: { x: 1100, y: 1200 }, outlaws_canyon: { x: 900, y: 400 }, vikings_fjord: { x: 1025, y: 1700 } };
function mapAnchors(id) {
    const map = MAPS[id];
    if (!map)
        throw new Error(`Unknown map ${id}`);
    const requested = captures[id];
    let capture;
    // Find supported clear ground around the authored marker (monuments can occupy its center).
    for (let radius = 0; radius <= 300 && !capture; radius += 25)
        for (let i = 0; i < 16 && !capture; i++) {
            const point = { x: requested.x + Math.cos(i * Math.PI / 8) * radius, y: requested.y + Math.sin(i * Math.PI / 8) * radius, elevation: requested.elevation ?? 0 };
            if (walkable(point, map))
                capture = point;
        }
    if (!capture)
        throw new Error(`No valid capture zone for ${id}`);
    const points = map.spawns.filter(p => walkable(p, map)).map(p => ({ ...p }));
    return { capture, respawns: points, chests: points.filter((_, i) => i % 2 === 0), floor: points.filter((_, i) => i % 2 === 1), flags: points.filter(p => Math.hypot(p.x - capture.x, p.y - capture.y) > 250) };
}

const key = (r, p) => teamKey(r.mode, p.id);
const keys = (r) => [...new Set(Object.values(r.mode.teams))];
const noOp = () => { };
function leaders(room) { const max = Math.max(...keys(room).map(k => room.mode.scores[k] ?? 0)); return keys(room).filter(k => (room.mode.scores[k] ?? 0) === max); }
const MODE_RULES = {
    tag: { loot: ['freeze_ball'], combat: false, init: ({ room }) => { const candidates = keys(room); room.mode.it = candidates[randomInt(candidates.length)]; }, tick: ({ room }) => { const active = room.players.filter(p => p.socket); if (!room.players.some(p => key(room, p) === room.mode.it) && active.length)
            room.mode.it = key(room, active[0]); return false; }, hit: ({ room, now }, a, b) => { if (key(room, a) === room.mode.it && now >= room.mode.tagAfter) {
            room.mode.it = key(room, b);
            room.mode.tagAfter = now + RULES.retagGraceMs;
        } }, finish: ({ room }) => { room.mode.winnerKeys = keys(room).filter(k => k !== room.mode.it && room.players.some(p => key(room, p) === k)); room.mode.reason = 'Time expired — the IT side loses.'; } },
    kill_race: { loot: ['blade', 'hammer'], combat: true, init: noOp, tick: ({ room }) => room.selectedFormat === 'duo' && Object.values(room.mode.scores).some(n => n >= RULES.killTarget), finish: ({ room }) => { room.mode.winnerKeys = leaders(room); room.mode.reason = Object.values(room.mode.scores).some(n => n >= RULES.killTarget) && room.selectedFormat === 'duo' ? 'Elimination target reached.' : 'Time expired — highest elimination score wins. Ties share the win.'; } },
    flag_run: { loot: ['blade', 'hammer'], combat: true, init: ({ room, now }) => { const anchors = mapAnchors(room.mapId); room.mode.flag = { state: 'not_spawned', carrier: null, position: anchors.flags[randomInt(anchors.flags.length)], spawnAt: now + RULES.flagSpawnMs }; }, tick: ({ room, now }) => {
            const f = room.mode.flag;
            if (f.state === 'not_spawned' && now >= f.spawnAt)
                f.state = 'spawned';
            if (f.state === 'carried') {
                const p = room.players.find(p => p.id === f.carrier);
                if (!p || !p.socket || p.health <= 0) {
                    dropFlag(room, p);
                    return false;
                }
                f.position = { x: p.x, y: p.y, elevation: p.elevation };
                if (near(room, p, room.mode.capture)) {
                    f.state = 'captured';
                    room.mode.winnerKeys = [key(room, p)];
                    return true;
                }
            }
            return false;
        }, finish: ({ room }) => { room.mode.reason = room.mode.flag.state === 'captured' ? 'Flag delivered — capture wins.' : 'Time expired without a capture — no round winner.'; } }
};
function beginMode(room, now) {
    const prior = room.mode;
    room.mode = emptyMode();
    room.mode.teams = prior.teams;
    room.mode.matchPoints = prior.matchPoints;
    for (const k of keys(room))
        room.mode.scores[k] = 0;
    const anchors = mapAnchors(room.mapId);
    room.mode.capture = anchors.capture;
    const loot = MODE_RULES[room.selectedGameMode].loot;
    room.mode.items = [...anchors.chests.map((p, i) => ({ ...p, id: `chest-${i}`, source: 'chest', state: 'closed', kind: null, refreshAt: 0 })), ...anchors.floor.map((p, i) => ({ ...p, id: `floor-${i}`, source: 'floor', state: 'opened', kind: loot[randomInt(loot.length)], refreshAt: 0 }))];
    for (const p of room.players) {
        p.frozenUntil = 0;
        p.heldItem = null;
    }
    MODE_RULES[room.selectedGameMode].init({ room, now });
}
function assignTeams(room) { room.mode = emptyMode(); room.players.forEach((p, i) => { room.mode.teams[p.id] = room.selectedFormat === 'duo' ? `team-${Math.floor(i / 2) + 1}` : p.id; }); }
function enemies(room, a, b) { return a.id !== b.id && key(room, a) !== key(room, b); }
function near(room, a, b, range = RULES.pickupRange) { return Math.hypot(a.x - b.x, a.y - b.y, (a.elevation ?? 0) - (b.elevation ?? 0)) <= range && clearAttackLine(a, b, MAPS[room.mapId]); }
function interact(room, p, now) {
    if (!p.socket || p.health <= 0 || p.frozenUntil > now)
        return;
    const flag = room.mode.flag;
    if (room.selectedGameMode === 'flag_run' && ['spawned', 'dropped'].includes(flag.state) && near(room, p, flag.position)) {
        flag.state = 'carried';
        flag.carrier = p.id;
        return;
    }
    const item = room.mode.items.filter(i => i.state !== 'empty' && near(room, p, i)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!item)
        return;
    if (item.state === 'closed') {
        const loot = MODE_RULES[room.selectedGameMode].loot;
        item.kind = loot[randomInt(loot.length)];
        item.state = 'opened';
        return;
    }
    p.heldItem = item.kind;
    item.kind = null;
    item.state = 'empty';
    item.refreshAt = now + RULES.itemRespawnMs;
}
function dropFlag(room, p) { const f = room.mode.flag; if (f.state !== 'carried' || p && f.carrier !== p.id)
    return; if (p)
    f.position = { x: p.x, y: p.y, elevation: p.elevation }; f.carrier = null; f.state = 'dropped'; }
function onElimination(room, killer, victim) { dropFlag(room, victim); victim.heldItem = null; victim.frozenUntil = 0; killer.eliminations++; killer.matchEliminations++; room.mode.scores[key(room, killer)] = (room.mode.scores[key(room, killer)] ?? 0) + 1; }
function throwBall(room, p, now) { if (p.heldItem !== 'freeze_ball')
    return false; p.heldItem = null; room.mode.projectiles.push({ id: randomUUID(), ownerId: p.id, teamId: key(room, p), x: p.x, y: p.y, elevation: p.elevation, dx: p.attackX, dy: p.attackY, expiresAt: now + RULES.ballLifetimeMs }); return true; }
function tickMode(room, now, dt) {
    for (const item of room.mode.items)
        if (item.source === 'floor' && item.state === 'empty' && now >= item.refreshAt) {
            const loot = MODE_RULES[room.selectedGameMode].loot;
            item.kind = loot[randomInt(loot.length)];
            item.state = 'opened';
        }
    room.mode.projectiles = room.mode.projectiles.filter(ball => {
        if (now >= ball.expiresAt)
            return false;
        const start = { x: ball.x, y: ball.y, elevation: ball.elevation };
        const end = { x: ball.x + ball.dx * RULES.ballSpeed * dt, y: ball.y + ball.dy * RULES.ballSpeed * dt, elevation: ball.elevation };
        if (!clearAttackLine(start, end, MAPS[room.mapId]))
            return false;
        const targets = room.players.filter(p => p.socket && p.health > 0 && p.id !== ball.ownerId && key(room, p) !== ball.teamId).map(p => { const vx = end.x - start.x, vy = end.y - start.y, t = Math.max(0, Math.min(1, ((p.x - start.x) * vx + (p.y - start.y) * vy) / (vx * vx + vy * vy || 1))); return { p, t, point: { x: start.x + vx * t, y: start.y + vy * t, elevation: ball.elevation } }; }).filter(({ p, point }) => near(room, p, point, 30)).sort((a, b) => a.t - b.t);
        if (targets[0]) {
            targets[0].p.frozenUntil = now + RULES.freezeMs;
            targets[0].p.dashRemaining = 0;
            return false;
        }
        Object.assign(ball, end);
        return true;
    });
    return MODE_RULES[room.selectedGameMode].tick({ room, now });
}
function finishMode(room, now) { MODE_RULES[room.selectedGameMode].finish({ room, now }); for (const k of room.mode.winnerKeys)
    room.mode.matchPoints[k] = (room.mode.matchPoints[k] ?? 0) + 1; room.mode.projectiles = []; }

const ROUND = { durationMs: 90_000, resultsMs: 5_000 };
const MATCH = { rounds: 3 };
function emptyMatch() { return { id: '', roundNumber: 0, totalRounds: MATCH.rounds, nextRoundSeconds: 0, results: [], winners: [], history: [], mapHistory: [] }; }

const OPENING_MAP_ID = 'central_plaza';
// Selection randomness is supplied by the server. This helper never chooses independently in a client.
function selectRoundMap(roundNumber, previous, chooseIndex, registry = MAPS) {
    const ids = Object.keys(registry);
    if (!ids.length)
        throw new Error('No playable maps registered');
    if (roundNumber === 1)
        return registry[OPENING_MAP_ID] ? OPENING_MAP_ID : ids[0];
    const alternatives = ids.filter(id => id !== previous), pool = alternatives.length ? alternatives : ids;
    return pool[chooseIndex(pool.length)];
}
function selectMapVariant(mapId, chooseIndex) { const variants = Object.keys(MAPS[mapId]?.variants ?? {}); return variants.length ? variants[chooseIndex(variants.length)] : null; }

const mapFor = (room) => MAPS[room.mapId] ?? ACTIVE_MAP;
class RoomServer {
    legacyBounty;
    // Retain the original Bounty behavior for regression coverage and future mode integration.
    constructor(legacyBounty = false) {
        this.legacyBounty = legacyBounty;
    }
    rooms = new Map();
    sessions = new Map();
    send(ws, message) { if (ws.readyState === 1) {
        try {
            ws.send(JSON.stringify(message));
        }
        catch {
            this.disconnect(ws);
        }
    } }
    view(room, recipient) {
        const target = room.players.find(p => p.id === recipient?.targetId);
        return { selectedGameMode: room.selectedGameMode, selectedFormat: room.selectedFormat, mode: room.mode, mapId: room.mapId, mapVariant: room.mapVariant, nextMapId: room.nextMapId, nextMapVariant: room.nextMapVariant, match: room.match, round: room.round, objective: { target: target ? { id: target.id, name: target.name } : null, eliminations: recipient?.eliminations ?? 0, matchEliminations: recipient?.matchEliminations ?? 0 }, code: room.code, hostId: room.hostId, phase: room.phase, tick: room.tick, notice: room.notice, serverTime: Date.now(), players: room.players.map(p => ({ traversalState: p.traversalState, frozenUntil: p.frozenUntil, heldItem: p.heldItem, id: p.id, name: p.name, color: p.color, ready: p.ready, connected: !!p.socket, x: p.x, y: p.y, elevation: p.elevation, ack: p.ack, stamina: p.stamina, regenWait: p.regenWait, exhausted: p.exhausted, dashCooldown: p.dashCooldown, dashRemaining: p.dashRemaining, dashX: p.dashX, dashY: p.dashY, facingX: p.facingX, facingY: p.facingY, dashSeen: p.dashSeen, sprinting: p.sprinting, health: p.health, koRemaining: p.koRemaining, protection: p.protection, attackCooldown: p.attackCooldown, attackSeen: p.attackSeen, attackFlash: p.attackFlash, hitFlash: p.hitFlash, attackX: p.attackX, attackY: p.attackY, spawnVersion: p.spawnVersion })) };
    }
    broadcast(room) { for (const p of room.players)
        if (p.socket)
            this.send(p.socket, { type: 'state', room: this.view(room, p) }); }
    fail(ws, message, fatal = false) { this.send(ws, { type: 'error', message, fatal }); }
    name(value) { if (typeof value !== 'string')
        return null; const s = value.trim().replace(/\s+/g, ' '); return /^[\p{L}\p{N} _.-]{1,20}$/u.test(s) ? s : null; }
    message(ws, raw) {
        let m;
        try {
            m = JSON.parse(raw);
        }
        catch {
            this.fail(ws, 'Invalid message.');
            return;
        }
        if (!m || typeof m !== 'object' || Array.isArray(m))
            return;
        if (m.type === 'ping') {
            this.send(ws, { type: 'pong' });
            return;
        }
        const session = this.sessions.get(ws);
        if (['create', 'join', 'resume'].includes(m.type)) {
            if (session) {
                this.fail(ws, 'Leave your current room first.');
                return;
            }
            if (m.type === 'resume') {
                const room = typeof m.code === 'string' ? this.rooms.get(m.code) : undefined;
                const p = room?.players.find(p => typeof m.token === 'string' && p.token === m.token);
                if (!room || !p || (!p.socket && Date.now() - p.disconnectedAt > RECONNECT_MS)) {
                    this.fail(ws, 'Your room session expired. Create or join a room again.', true);
                    return;
                }
                if (p.socket) {
                    this.send(ws, { type: 'error', message: 'This player is already connected. Waiting for the previous connection to close; close any duplicate tab.', retryable: true });
                    return;
                }
                p.socket = ws;
                p.disconnectedAt = 0;
                p.lastInput = 0;
                p.dx = 0;
                p.dy = 0;
                p.seq = p.ack;
                p.sprint = false;
                p.dashId = p.dashSeen;
                p.attackId = p.attackSeen;
                p.aimX = 0;
                p.aimY = 0;
                this.sessions.set(ws, { room, player: p });
                if (!room.players.some(x => x.id === room.hostId && x.socket))
                    room.hostId = p.id;
                this.send(ws, { type: 'welcome', id: p.id, token: p.token, room: this.view(room, p) });
                this.broadcast(room);
                return;
            }
            const name = this.name(m.name);
            if (!name) {
                this.fail(ws, 'Use 1–20 letters, numbers, spaces, periods, hyphens, or underscores.');
                return;
            }
            let room;
            if (m.type === 'create') {
                if (this.rooms.size >= 100) {
                    this.fail(ws, 'Server is full. Please try again later.');
                    return;
                }
                let code;
                do {
                    code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
                } while (this.rooms.has(code));
                room = { selectedGameMode: "tag", selectedFormat: "solo", mode: emptyMode(), mapId: OPENING_MAP_ID, mapVariant: null, nextMapId: null, nextMapVariant: null, code, hostId: '', phase: 'lobby', match: emptyMatch(), round: { endsAt: 0, remainingSeconds: 0, returnAt: 0, results: [] }, roster: [], players: [], tick: 0, notice: '' };
                this.rooms.set(code, room);
            }
            else {
                const code = typeof m.code === 'string' ? m.code.trim().toUpperCase() : '';
                room = this.rooms.get(code);
                if (!room) {
                    this.fail(ws, 'Room not found. Check the six-character code.');
                    return;
                }
                if (room.phase !== 'lobby') {
                    this.fail(ws, 'This test is already running. Ask the host to return to the lobby.');
                    return;
                }
                if (room.players.length >= MAX_PLAYERS) {
                    this.fail(ws, 'This room is full (6 players).');
                    return;
                }
                if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                    this.fail(ws, 'That name is already in this room. Choose another name.');
                    return;
                }
            }
            const color = COLORS.find(c => !room.players.some(p => p.color === c)) || COLORS[0];
            const p = { dashStyle: 'dash', frozenUntil: 0, heldItem: null, targetId: null, eliminations: 0, matchEliminations: 0, ...freshMotion(mapFor(room).spawns[0]), ...freshCombat(), sprint: false, dashId: 0, attackId: 0, aimX: 0, aimY: 0, id: randomUUID(), token: randomBytes(24).toString('hex'), name, color, ready: false, ack: 0, seq: 0, dx: 0, dy: 0, lastInput: 0, disconnectedAt: 0, socket: ws };
            room.players.push(p);
            if (!room.hostId)
                room.hostId = p.id;
            room.notice = '';
            this.sessions.set(ws, { room, player: p });
            this.send(ws, { type: 'welcome', id: p.id, token: p.token, room: this.view(room, p) });
            this.broadcast(room);
            return;
        }
        if (!session) {
            if (m.type === 'leave') {
                this.send(ws, { type: 'left' });
                return;
            }
            this.fail(ws, 'Join a room first.');
            return;
        }
        const { room, player: p } = session;
        if (this.rooms.get(room.code) !== room || !room.players.includes(p) || p.socket !== ws) {
            this.sessions.delete(ws);
            this.fail(ws, 'Your room session expired.', true);
            return;
        }
        if (m.type === 'leave') {
            this.remove(room, p);
            this.send(ws, { type: 'left' });
            return;
        }
        if (m.type === 'ready' && room.phase === 'lobby' && typeof m.ready === 'boolean') {
            p.ready = m.ready;
            this.broadcast(room);
            return;
        }
        if (m.type === 'settings') {
            if (room.hostId !== p.id) {
                this.fail(ws, 'Only the host can change mode and format.');
                return;
            }
            if (room.phase !== 'lobby') {
                this.fail(ws, 'Match settings are locked until the lobby.');
                return;
            }
            if (!validMode(m.mode) || !validFormat(m.format)) {
                this.fail(ws, 'Invalid mode or format.');
                return;
            }
            if (room.selectedGameMode !== m.mode || room.selectedFormat !== m.format) {
                room.selectedGameMode = m.mode;
                room.selectedFormat = m.format;
                for (const player of room.players)
                    player.ready = false;
                room.notice = 'Settings changed. Ready up for the selected rules.';
            }
            this.broadcast(room);
            return;
        }
        if (m.type === 'interact') {
            if (room.phase === 'arena' && m.matchId === room.match.id && m.roundNumber === room.match.roundNumber && Date.now() < room.round.endsAt) {
                interact(room, p, Date.now());
                this.broadcast(room);
            }
            return;
        }
        if (m.type === 'start') {
            if (room.hostId !== p.id) {
                this.fail(ws, 'Only the host can start the test.');
                return;
            }
            if (room.phase !== 'lobby')
                return;
            if (room.players.length < 2 || room.players.some(p => !p.socket || !p.ready)) {
                this.fail(ws, 'At least two connected players are needed, and everyone must be ready.');
                return;
            }
            if (!validMode(room.selectedGameMode) || !validTeams(room.selectedFormat, room.players.length)) {
                this.fail(ws, 'Duos require exactly 4 or 6 players.');
                return;
            }
            assignTeams(room);
            room.match = { ...emptyMatch(), id: randomUUID() };
            room.roster = [...room.players];
            for (const p of room.players)
                p.matchEliminations = 0;
            this.startRound(room, Date.now());
            return;
        }
        if (m.type === 'lobby') {
            if (room.hostId !== p.id) {
                this.fail(ws, 'Only the host can return everyone to the lobby.');
                return;
            }
            this.toLobby(room, 'Host returned the room to the lobby.');
            return;
        }
        if (m.type === 'input' && room.phase === 'arena') {
            if (m.matchId !== room.match.id || m.roundNumber !== room.match.roundNumber || Date.now() >= room.round.endsAt)
                return;
            if (!Number.isSafeInteger(m.seq) || m.seq <= p.seq || m.seq > p.seq + NETWORK.maxInputAdvance || !Number.isFinite(m.dx) || !Number.isFinite(m.dy) || Math.abs(m.dx) > 1 || Math.abs(m.dy) > 1)
                return;
            if (m.sprint !== undefined && typeof m.sprint !== 'boolean')
                return;
            if (m.dashId !== undefined && (!Number.isSafeInteger(m.dashId) || m.dashId < p.dashId || m.dashId > p.dashId + NETWORK.maxInputAdvance))
                return;
            if (m.attackId !== undefined && (!Number.isSafeInteger(m.attackId) || m.attackId < p.attackId || m.attackId > p.attackId + NETWORK.maxInputAdvance))
                return;
            if ((m.aimX !== undefined && (!Number.isFinite(m.aimX) || Math.abs(m.aimX) > 1)) || (m.aimY !== undefined && (!Number.isFinite(m.aimY) || Math.abs(m.aimY) > 1)))
                return;
            if (m.dashStyle !== undefined && !['dash', 'dodge', 'slide'].includes(m.dashStyle))
                return;
            p.dashStyle = m.dashStyle ?? 'dash';
            p.attackId = m.attackId ?? p.attackId;
            p.aimX = m.aimX ?? 0;
            p.aimY = m.aimY ?? 0;
            p.seq = m.seq;
            p.dx = m.dx;
            p.dy = m.dy;
            p.sprint = m.sprint ?? false;
            p.dashId = m.dashId ?? p.dashId;
            p.lastInput = Date.now();
        }
    }
    toLobby(room, notice) { if (room.phase === 'lobby') {
        this.broadcast(room);
        return;
    } room.mode = emptyMode(); room.match = emptyMatch(); room.round = { endsAt: 0, remainingSeconds: 0, returnAt: 0, results: [] }; room.roster = []; room.phase = 'lobby'; room.mapId = OPENING_MAP_ID; room.mapVariant = null; room.nextMapId = null; room.nextMapVariant = null; room.notice = notice; for (const p of room.players) {
        Object.assign(p, freshMotion(mapFor(room).spawns[0]), freshCombat());
        p.dashSeen = p.dashId;
        p.attackSeen = p.attackId;
        p.targetId = null;
        p.eliminations = 0;
        p.matchEliminations = 0;
        p.frozenUntil = 0;
        p.heldItem = null;
        p.ready = false;
        p.dx = 0;
        p.dy = 0;
        p.sprint = false;
        p.dashRemaining = 0;
        p.attackFlash = 0;
        p.hitFlash = 0;
        p.attackSeen = p.attackId;
    } this.broadcast(room); }
    disconnect(ws) { const s = this.sessions.get(ws); if (!s)
        return; this.sessions.delete(ws); const { room, player: p } = s; dropFlag(room, p); p.socket = null; p.ready = false; p.dx = 0; p.dy = 0; p.sprint = false; p.dashRemaining = 0; p.disconnectedAt = Date.now(); this.transfer(room); this.broadcast(room); }
    transfer(room) { if (!room.players.some(p => p.id === room.hostId && p.socket)) {
        const next = room.players.find(p => p.socket);
        if (next)
            room.hostId = next.id;
    } }
    remove(room, p) { if (this.rooms.get(room.code) !== room || !room.players.includes(p))
        return; if (p.socket)
        this.sessions.delete(p.socket); dropFlag(room, p); p.socket = null; p.dx = 0; p.dy = 0; p.lastInput = 0; p.targetId = null; room.players = room.players.filter(x => x !== p); if (!room.players.length) {
        this.rooms.delete(room.code);
        return;
    } this.transfer(room); if ((room.phase === 'arena' || room.phase === 'intermission') && (room.players.length < 2 || room.selectedFormat === 'duo' && !validTeams(room.selectedFormat, room.players.length)))
        this.toLobby(room, room.selectedFormat === 'duo' ? 'Match ended: a player left; Duos require 4 or 6 players.' : 'Test ended: at least two players are needed.');
    else {
        for (const other of room.players)
            if (other.targetId === p.id)
                this.assignTarget(room, other, p.id);
        this.broadcast(room);
    } }
    assignTarget(room, p, previous) {
        const all = room.players.filter(o => o !== p);
        const connected = all.filter(o => o.socket);
        const others = connected.length ? connected : all;
        const different = others.filter(o => o.id !== previous);
        const pool = different.length ? different : others;
        const living = pool.filter(o => o.health > 0);
        const choices = living.length ? living : pool;
        p.targetId = choices.length ? choices[randomInt(choices.length)].id : null;
    }
    startRound(room, now) {
        if (this.rooms.get(room.code) !== room || !room.match.id || !['lobby', 'intermission'].includes(room.phase) || room.match.roundNumber >= MATCH.rounds)
            return;
        if (room.players.length < 2) {
            this.toLobby(room, 'Match ended: at least two players are needed.');
            return;
        }
        for (const p of room.roster)
            p.eliminations = 0;
        room.mapId = room.match.roundNumber === 0 ? OPENING_MAP_ID : room.nextMapId ?? selectRoundMap(room.match.roundNumber + 1, room.mapId, randomInt);
        room.mapVariant = room.nextMapId ? room.nextMapVariant : selectMapVariant(room.mapId, randomInt);
        room.nextMapId = null;
        room.nextMapVariant = null;
        room.phase = 'arena';
        room.notice = '';
        room.match.roundNumber++;
        room.match.nextRoundSeconds = 0;
        room.match.mapHistory.push(room.mapId);
        room.round = { endsAt: now + ROUND.durationMs, remainingSeconds: ROUND.durationMs / 1000, returnAt: 0, results: [] };
        room.players.forEach((p, i) => { const version = p.spawnVersion + 1; Object.assign(p, freshMotion(mapFor(room).spawns[i]), freshCombat()); p.spawnVersion = version; const dx = mapFor(room).plaza.x + mapFor(room).plaza.width / 2 - p.x, dy = mapFor(room).plaza.y + mapFor(room).plaza.height / 2 - p.y, length = Math.hypot(dx, dy) || 1; p.facingX = dx / length; p.facingY = dy / length; p.targetId = null; p.eliminations = 0; p.dx = 0; p.dy = 0; p.sprint = false; p.dashId = 0; p.attackId = 0; p.aimX = 0; p.aimY = 0; p.seq = p.ack; p.lastInput = 0; });
        // Generate a new random assignment each round; repeats are allowed, especially with two players.
        if (this.legacyBounty) {
            const order = [...room.players];
            for (let i = order.length - 1; i > 0; i--) {
                const j = randomInt(i + 1);
                [order[i], order[j]] = [order[j], order[i]];
            }
            order.forEach((p, i) => p.targetId = order[(i + 1) % order.length].id);
        }
        else
            beginMode(room, now);
        if (process.env.BOUNTY_DEBUG === '1')
            console.info('[round]', { room: room.code, mode: room.selectedGameMode, format: room.selectedFormat, map: room.mapId, round: room.match.roundNumber, teams: room.mode.teams, it: room.mode.it, flag: room.mode.flag.state, loot: MODE_RULES[room.selectedGameMode].loot });
        this.broadcast(room);
    }
    ranking(players, match = false) {
        const score = (p) => match ? p.matchEliminations : p.eliminations;
        const sorted = [...players].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
        return sorted.map(p => ({ id: p.id, name: p.name, eliminations: score(p), rank: sorted.findIndex(o => score(o) === score(p)) + 1 }));
    }
    modeRanking(room, match) {
        const teams = [...new Set(Object.values(room.mode.teams))];
        const score = (k) => match ? (room.mode.matchPoints[k] ?? 0) : room.selectedGameMode === 'kill_race' ? (room.mode.scores[k] ?? 0) : Number(room.mode.winnerKeys.includes(k));
        teams.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
        return teams.map(k => ({ id: k, name: room.roster.filter(p => teamKey(room.mode, p.id) === k).map(p => p.name).join(' + '), eliminations: score(k), rank: teams.findIndex(t => score(t) === score(k)) + 1 }));
    }
    endRound(room, now) {
        if (this.rooms.get(room.code) !== room || room.phase !== 'arena')
            return;
        if (!this.legacyBounty)
            finishMode(room, now);
        room.round.remainingSeconds = 0;
        room.round.results = this.legacyBounty ? this.ranking(room.roster) : this.modeRanking(room, false);
        room.match.history.push(room.round.results.map(p => ({ ...p })));
        if (room.match.roundNumber >= MATCH.rounds) {
            room.phase = 'complete';
            room.nextMapId = null;
            room.nextMapVariant = null;
            room.round.returnAt = 0;
            room.match.nextRoundSeconds = 0;
            room.match.results = this.legacyBounty ? this.ranking(room.roster, true) : this.modeRanking(room, true);
            room.match.winners = room.match.results.filter(p => p.rank === 1).map(p => ({ id: p.id, name: p.name }));
        }
        else {
            room.nextMapId = selectRoundMap(room.match.roundNumber + 1, room.mapId, randomInt);
            room.nextMapVariant = selectMapVariant(room.nextMapId, randomInt);
            room.phase = 'intermission';
            room.round.returnAt = now + ROUND.resultsMs;
            room.match.nextRoundSeconds = ROUND.resultsMs / 1000;
        }
        for (const p of room.players) {
            p.dx = 0;
            p.dy = 0;
            p.sprint = false;
            p.sprinting = false;
            p.dashRemaining = 0;
            p.attackSeen = p.attackId;
            p.ack = p.seq;
        }
        this.broadcast(room);
    }
    tick(now = Date.now()) {
        for (const room of this.rooms.values()) {
            for (const p of [...room.players])
                if (!p.socket && now - p.disconnectedAt >= RECONNECT_MS)
                    this.remove(room, p);
            if (!this.rooms.has(room.code))
                continue;
            room.tick++;
            if (room.phase === 'intermission') {
                room.match.nextRoundSeconds = Math.max(0, Math.ceil((room.round.returnAt - now) / 1000));
                if (now >= room.round.returnAt)
                    this.startRound(room, now);
                else if (room.tick % 2 === 0)
                    this.broadcast(room);
                continue;
            }
            if (room.phase === 'arena' && now >= room.round.endsAt) {
                this.endRound(room, now);
                continue;
            }
            if (room.phase === 'arena') {
                room.round.remainingSeconds = Math.max(0, Math.ceil((room.round.endsAt - now) / 1000));
                for (const p of room.players) {
                    p.attackCooldown = Math.max(0, p.attackCooldown - STEP);
                    p.protection = Math.max(0, p.protection - STEP);
                    p.attackFlash = Math.max(0, p.attackFlash - STEP);
                    p.hitFlash = Math.max(0, p.hitFlash - STEP);
                    if (p.koRemaining > 0) {
                        p.koRemaining = Math.max(0, p.koRemaining - STEP);
                        p.ack = p.seq;
                        p.dashSeen = p.dashId;
                        p.attackSeen = p.attackId;
                        if (p.koRemaining < 1e-8) {
                            const point = safeSpawn(room.players.filter(o => o !== p && o.health > 0).map(o => ({ x: o.x, y: o.y })), mapFor(room));
                            const version = p.spawnVersion + 1;
                            Object.assign(p, freshMotion(point), freshCombat());
                            p.spawnVersion = version;
                            p.protection = COMBAT.protection;
                            p.dashSeen = p.dashId;
                            p.attackSeen = p.attackId;
                            p.dx = 0;
                            p.dy = 0;
                            p.sprint = false;
                            p.lastInput = 0;
                        }
                        continue;
                    }
                    if (!p.socket)
                        continue;
                    if (p.frozenUntil > now) {
                        p.dashRemaining = 0;
                        p.sprinting = false;
                        p.ack = p.seq;
                        p.dashSeen = p.dashId;
                        continue;
                    }
                    const active = now - p.lastInput < NETWORK.inputTimeoutMs;
                    const motion = advanceMotion(p, { dx: active ? p.dx : 0, dy: active ? p.dy : 0, sprint: active && p.sprint, dashId: active ? p.dashId : p.dashSeen, dashStyle: p.dashStyle }, STEP, mapFor(room));
                    Object.assign(p, motion);
                    p.ack = p.seq;
                }
                // Gather all eligible swings before applying damage: simultaneous hits can trade.
                const attacks = [];
                for (const p of room.players) {
                    if (p.attackId <= p.attackSeen)
                        continue;
                    p.attackSeen = p.attackId;
                    if (!p.socket || p.health <= 0 || p.frozenUntil > now || p.attackCooldown > 1e-8 || now - p.lastInput >= NETWORK.inputTimeoutMs)
                        continue;
                    const length = Math.hypot(p.aimX, p.aimY);
                    p.attackX = length > 1e-6 ? p.aimX / length : p.facingX;
                    p.attackY = length > 1e-6 ? p.aimY / length : p.facingY;
                    p.attackCooldown = p.heldItem && p.heldItem in WEAPONS ? WEAPONS[p.heldItem].cooldown : COMBAT.cooldown;
                    p.attackFlash = COMBAT.attackFlash;
                    p.protection = 0;
                    if (this.legacyBounty || !throwBall(room, p, now))
                        attacks.push(p);
                }
                const swingDamage = new Map(attacks.map(p => [p, p.heldItem && p.heldItem in WEAPONS ? WEAPONS[p.heldItem].damage : COMBAT.damage]));
                const damage = new Map();
                for (const attacker of attacks) {
                    const targets = room.players.filter(p => p !== attacker && (this.legacyBounty || enemies(room, attacker, p)) && p.health > 0 && p.protection <= 0 && canHit(attacker, p, attacker.attackX, attacker.attackY, mapFor(room)));
                    targets.sort((a, b) => Math.hypot(a.x - attacker.x, a.y - attacker.y) - Math.hypot(b.x - attacker.x, b.y - attacker.y) || a.id.localeCompare(b.id));
                    const target = targets[0];
                    if (target && !this.legacyBounty && !MODE_RULES[room.selectedGameMode].combat) {
                        MODE_RULES[room.selectedGameMode].hit?.({ room, now }, attacker, target);
                        continue;
                    }
                    if (target)
                        damage.set(target, [...(damage.get(target) || []), attacker]);
                }
                const completions = [];
                for (const [p, hitters] of damage) {
                    // Stable ID order defines the final damage contributor within a simultaneous tick.
                    hitters.sort((a, b) => a.id.localeCompare(b.id));
                    let total = 0;
                    let killer;
                    for (const attacker of hitters) {
                        total += swingDamage.get(attacker) ?? COMBAT.damage;
                        if (!killer && total >= p.health)
                            killer = attacker;
                    }
                    if (killer && !this.legacyBounty)
                        onElimination(room, killer, p);
                    if (this.legacyBounty && killer && killer.targetId === p.id)
                        completions.push(killer);
                    p.health = Math.max(0, p.health - total);
                    p.hitFlash = COMBAT.hitFlash;
                    if (p.health === 0) {
                        p.koRemaining = COMBAT.respawnDelay;
                        p.dx = 0;
                        p.dy = 0;
                        p.sprint = false;
                        p.sprinting = false;
                        p.dashRemaining = 0;
                        p.attackSeen = p.attackId;
                        p.dashSeen = p.dashId;
                    }
                }
                // Resolve all relationships before changing any target, preserving mutual KO credit.
                for (const p of completions) {
                    p.eliminations++;
                    p.matchEliminations++;
                    this.assignTarget(room, p, p.targetId);
                }
                if (!this.legacyBounty && tickMode(room, now, STEP)) {
                    this.endRound(room, now);
                    continue;
                }
                if (room.tick % 2 === 0)
                    this.broadcast(room);
            }
        }
    }
}

async function createGameServer(production = process.env.NODE_ENV === 'production' || fileURLToPath(import.meta.url).replaceAll('\\', '/').endsWith('/dist/server.js'), legacyBounty = false) {
    const app = express();
    app.disable('x-powered-by');
    const server = createServer(app);
    const rooms = new RoomServer(legacyBounty);
    const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
    server.on('upgrade', (req, socket, head) => {
        if (req.url !== '/ws') {
            socket.destroy();
            return;
        }
        const origin = req.headers.origin;
        if (origin) {
            try {
                if (new URL(origin).host !== req.headers.host) {
                    socket.destroy();
                    return;
                }
            }
            catch {
                socket.destroy();
                return;
            }
        }
        if (wss.clients.size >= 600) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });
    wss.on('connection', ws => {
        let count = 0;
        let windowStart = Date.now();
        let alive = true;
        ws.on('pong', () => { alive = true; });
        const heartbeat = setInterval(() => { if (!alive) {
            ws.terminate();
            return;
        } alive = false; if (ws.readyState === 1)
            ws.ping(); }, 5000);
        ws.on('message', raw => { if (Date.now() - windowStart >= 1000) {
            count = 0;
            windowStart = Date.now();
        } if (++count > 90) {
            ws.close(1008, 'Too many messages');
            return;
        } rooms.message(ws, raw.toString()); });
        ws.on('close', () => { clearInterval(heartbeat); rooms.disconnect(ws); });
        ws.on('error', () => { });
    });
    const timer = setInterval(() => rooms.tick(), STEP * 1000);
    app.get('/health', (_req, res) => res.json({ ok: true, phase: 6 }));
    let vite;
    if (production) {
        const here = dirname(fileURLToPath(import.meta.url));
        app.use(express.static(resolve(here, '../dist/client')));
        app.get('/', (_req, res) => res.sendFile(resolve(here, '../dist/client/index.html')));
    }
    else {
        const { createServer } = await import('vite');
        vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
        app.use(vite.middlewares);
    }
    return { server, rooms, close: async () => { clearInterval(timer); for (const ws of wss.clients)
            ws.terminate(); await new Promise(r => wss.close(() => r())); await new Promise(r => server.close(() => r())); rooms.sessions.clear(); rooms.rooms.clear(); if (vite)
            await vite.close(); } };
}
if (process.env.BOUNTY_TEST !== '1') {
    const game = await createGameServer();
    const port = Number(process.env.PORT) || 3000;
    game.server.listen(port, '0.0.0.0', () => console.log(`Bounty Shift Phase 6 listening on port ${port}`));
    for (const signal of ['SIGINT', 'SIGTERM'])
        process.on(signal, () => { void game.close().then(() => process.exit(0)); });
}

export { createGameServer };
