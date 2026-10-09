// server/index.ts
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// shared/characters.ts
var CHARACTER_IDS = ["voltrix", "kirin", "emberjack", "mossbyte", "novaa", "gravel", "lumi", "shade"];
var isCharacterId = (value) => typeof value === "string" && CHARACTER_IDS.includes(value);
var SELECTION = { chooseMs: 3e4, totalMs: 39e3 };

// shared/inventory.ts
function clearInventory(p) {
  p.inventory = { weapon: null, utility: null };
  p.selectedSlot = 1;
  p.heldItem = null;
}
function pickup(p, kind) {
  p.inventory ??= { weapon: null, utility: null };
  const utility = kind === "freeze_ball";
  p.inventory[utility ? "utility" : "weapon"] = kind;
  p.selectedSlot = utility ? 3 : 1;
  p.heldItem = kind;
}
function equip(p, slot, carry) {
  p.inventory ??= { weapon: null, utility: null };
  if (slot === 2 && !carry || slot === 3 && !p.inventory.utility) return false;
  p.selectedSlot = slot;
  p.heldItem = slot === 1 ? p.inventory.weapon : slot === 3 ? p.inventory.utility : null;
  return true;
}
function consumeUtility(p) {
  if (p.inventory) p.inventory.utility = null;
  p.heldItem = null;
  p.selectedSlot = 1;
  p.heldItem = p.inventory?.weapon ?? null;
}

// shared/modes.ts
var MODES = {
  tag: { name: "TAG", icon: "\u25C9", description: "Avoid being IT at the buzzer. Find and throw freeze balls to stop other runners." },
  flag_run: { name: "FLAG RUN", icon: "\u2691", description: "Loot and fight, then recover the flag and deliver it to the marked capture zone." },
  kill_race: { name: "KILL RACE", icon: "\u2694", description: "Find weapons and earn eliminations. Duos race to 15; highest score wins at the buzzer." }
};
var RULES = { freezeMs: 3e3, retagGraceMs: 1200, flagSpawnMs: 3e4, flagWarningMs: 5e3, killTarget: 15, pickupRange: 65, ballSpeed: 650, ballLifetimeMs: 1600, itemRespawnMs: 12e3 };
var WEAPONS = { blade: { damage: 25, cooldown: 0.38 }, hammer: { damage: 40, cooldown: 0.9 } };
function emptyMode() {
  return { teams: {}, scores: {}, matchPoints: {}, it: null, tagAfter: 0, items: [], projectiles: [], effects: [], flag: { state: "not_spawned", carrier: null, position: { x: 0, y: 0 }, spawnAt: 0 }, capture: { x: 0, y: 0 }, winnerKeys: [], reason: "" };
}
var validMode = (value) => typeof value === "string" && Object.hasOwn(MODES, value);
var validFormat = (value) => value === "solo" || value === "duo";
var validTeams = (format, count) => format === "solo" ? count >= 2 && count <= 6 : count === 4 || count === 6;
function teamKey(state, id) {
  return state.teams[id] ?? id;
}

// server/modes.ts
import { randomInt, randomUUID } from "node:crypto";

// shared/maps/fjord-layout.ts
var FJORD_TERRACES = [
  { id: "village", x: 800, y: 1e3, width: 1400, height: 950, elevation: 120 },
  { id: "hall-foundation", x: 800, y: 450, width: 650, height: 550, elevation: 120 },
  { id: "west-high", x: 400, y: 250, width: 600, height: 200, elevation: 240 },
  { id: "east-high", x: 2e3, y: 250, width: 550, height: 450, elevation: 240 },
  { id: "cliff-path-north", x: 2370, y: 700, width: 180, height: 680, elevation: 240 },
  { id: "cliff-path-south", x: 2370, y: 1600, width: 180, height: 250, elevation: 240 },
  { id: "west-landing", x: 440, y: 1320, width: 360, height: 180, elevation: 120 },
  { id: "east-landing", x: 2150, y: 2170, width: 400, height: 180, elevation: 120 }
];
var FJORD_WALKS = [
  { id: "cliff-path-crossing", x: 2370, y: 1380, width: 180, height: 220, elevation: 240 },
  { id: "north-bridge", x: 1e3, y: 270, width: 1e3, height: 180, elevation: 240 },
  { id: "hall-west-balcony", x: 620, y: 450, width: 180, height: 550, elevation: 240 },
  { id: "west-high-walk", x: 440, y: 450, width: 180, height: 550, elevation: 240 },
  { id: "hall-loft", x: 800, y: 450, width: 650, height: 170, elevation: 240 },
  { id: "hall-back-landing", x: 1025, y: 350, width: 210, height: 100, elevation: 120 },
  { id: "ice-bridge", x: 1200, y: 2400, width: 750, height: 180, elevation: 120 }
];
var FJORD_STAIRS = [
  { id: "hall-back-stair", x: 1235, y: 350, width: 320, height: 100, axis: "x", from: 120, to: 0 },
  { id: "hall-inner-stair", x: 1290, y: 620, width: 140, height: 320, axis: "y", from: 240, to: 120 },
  { id: "west-high-stair", x: 440, y: 1e3, width: 180, height: 320, axis: "y", from: 240, to: 120 },
  { id: "west-shore-stair", x: 650, y: 1500, width: 150, height: 320, axis: "y", from: 120, to: 0 },
  { id: "east-village-stair", x: 2180, y: 700, width: 170, height: 320, axis: "y", from: 240, to: 120 },
  { id: "east-village-landing", x: 2180, y: 1020, width: 170, height: 180, axis: "x", from: 120, to: 120 },
  { id: "village-east-descent", x: 2200, y: 1400, width: 320, height: 180, axis: "x", from: 120, to: 0 },
  { id: "village-dock-west", x: 1e3, y: 1950, width: 180, height: 320, axis: "y", from: 120, to: 0 },
  { id: "village-dock-east", x: 1900, y: 1950, width: 180, height: 320, axis: "y", from: 120, to: 0 },
  { id: "cliff-south-stair", x: 2370, y: 1850, width: 180, height: 320, axis: "y", from: 240, to: 120 },
  { id: "cliff-shore-stair", x: 2370, y: 2350, width: 180, height: 320, axis: "y", from: 120, to: 0 },
  { id: "ice-west-access", x: 880, y: 2400, width: 320, height: 180, axis: "x", from: 0, to: 120 },
  { id: "ice-east-access", x: 1950, y: 2400, width: 320, height: 180, axis: "x", from: 120, to: 0 }
];
var FJORD_HUTS = [
  { id: "smithy", x: 1580, y: 1010, width: 340, height: 280, bottom: 120, top: 295 },
  { id: "market-store", x: 840, y: 1590, width: 270, height: 260, bottom: 120, top: 270 },
  { id: "stable", x: 1760, y: 1610, width: 390, height: 260, bottom: 120, top: 285 },
  { id: "net-house", x: 650, y: 2720, width: 290, height: 260, bottom: 0, top: 155 },
  { id: "cliff-cabin", x: 2090, y: 280, width: 230, height: 220, bottom: 240, top: 385 }
];
var FJORD_LOCATIONS = [
  { id: "square", name: "VILLAGE SQUARE", x: 1450, y: 1530 },
  { id: "longhouse", name: "LONGHOUSE", x: 1125, y: 730 },
  { id: "tower", name: "WATCH TOWER", x: 1540, y: 360 },
  { id: "docks", name: "DOCKYARD", x: 1500, y: 2850 },
  { id: "ice", name: "ICE BRIDGE", x: 1575, y: 2490 },
  { id: "cave", name: "CAVERN PASS", x: 430, y: 1950 },
  { id: "cliff", name: "CLIFF PATH", x: 2460, y: 1500 }
];

// shared/maps/vikings-fjord.ts
var blocks = [];
var surfaces = [];
function block(id, x, y, width, height, bottom, top, kind = "monument", shape) {
  blocks.push({ id, x, y, width, height, bottom, top, kind, shape, name: "", accent: "#a7cddd" });
}
function deck(r, bottom) {
  surfaces.push({ ...r, style: "deck" });
  block(r.id, r.x, r.y, r.width, r.height, bottom, r.elevation, "deck");
}
for (const r of FJORD_TERRACES) deck(r, 0);
for (const r of FJORD_WALKS) deck(r, r.elevation - 14);
for (const r of FJORD_STAIRS) surfaces.push({ ...r, elevation: Math.max(r.from, r.to), ramp: { axis: r.axis, from: r.from, to: r.to }, style: "stairs" });
for (let i = 0; i < 10; i++) {
  block("boundary-north-" + i, i * 300, 0, 310, 160, 0, 390 + i % 3 * 65);
  block("boundary-west-" + i, 0, 150 + i * 300, 200, 310, 0, 360 + i % 4 * 65);
  block("boundary-east-" + i, 2800, 150 + i * 300, 200, 310, 0, 350 + i % 3 * 80);
}
for (let i = 0; i < 10; i++) block("boundary-south-" + i, i * 300, 3160, 310, 140, 0, i >= 3 && i <= 6 ? 24 + i % 3 * 9 : 100 + i % 3 * 35);
block("hall-west-wall", 800, 620, 20, 380, 120, 410, "building");
block("hall-west-loft-wall", 800, 450, 20, 45, 120, 410, "building");
block("hall-west-loft-wall-south", 800, 575, 20, 45, 120, 410, "building");
block("hall-east-wall", 1430, 450, 20, 550, 120, 410, "building");
for (const y of [450, 980]) {
  block("hall-door-left-" + y, 820, y, 205, 20, 120, 410, "building");
  block("hall-door-right-" + y, 1235, y, 195, 20, 120, 410, "building");
  block("hall-lintel-" + y, 1025, y, 210, 20, 285, 410, "building");
}
block("hall-roof-camera", 790, 440, 670, 570, 410, 425, "barrier");
block("hall-hearth", 935, 715, 95, 110, 120, 165, "monument");
block("hall-table", 1190, 740, 85, 150, 120, 157, "crate");
for (const h of FJORD_HUTS) block(h.id, h.x, h.y, h.width, h.height, h.bottom, h.top, "building");
block("cave-west", 240, 1470, 65, 900, 0, 260);
block("cave-east", 575, 1500, 65, 840, 0, 265);
block("cave-roof", 240, 1550, 400, 740, 190, 275);
for (const [i, x, y] of [[0, 295, 1700], [1, 525, 1970], [2, 290, 2170]]) block("cave-column-" + i, x, y, 75, 105, 0, 195, "monument", "ellipse");
for (const [i, x, y, ww, hh, z, t] of [[0, 1410, 1390, 80, 90, 120, 240], [1, 1220, 1690, 105, 75, 120, 175], [2, 1840, 1350, 95, 80, 120, 175], [3, 1230, 1140, 85, 65, 120, 168], [4, 850, 2080, 90, 150, 0, 65], [5, 2570, 1700, 100, 160, 0, 140], [6, 2580, 2380, 110, 100, 0, 85], [7, 760, 2540, 70, 85, 0, 55], [8, 1730, 2710, 100, 70, 0, 60]]) block("cover-" + i, x, y, ww, hh, z, t, i % 2 ? "crate" : "monument", i % 2 ? void 0 : "ellipse");
block("longship-west", 1080, 2810, 160, 325, 0, 72, "monument", "ellipse");
block("longship-east", 1830, 2830, 170, 305, 0, 72, "monument", "ellipse");
for (const [i, x, y, ww, hh, z] of [[0, 1e3, 270, 1e3, 10, 240], [1, 1e3, 440, 1e3, 10, 240], [2, 2540, 710, 10, 1130, 240], [3, 2370, 1050, 10, 780, 240], [4, 620, 450, 10, 550, 240], [5, 440, 460, 10, 530, 240]]) block("rail-" + i, x, y, ww, hh, z, z + 30, "rail");
var vikingsFjord = {
  id: "vikings_fjord",
  name: "Viking's Fjord",
  bounds: { width: 3e3, height: 3300 },
  plaza: { x: 1120, y: 1280, width: 630, height: 620 },
  ground: [{ x: 0, y: 0, width: 3e3, height: 3300 }],
  blocks,
  surfaces,
  spawns: [{ x: 1470, y: 1800, elevation: 120 }, { x: 870, y: 1230, elevation: 120 }, { x: 2120, y: 1280, elevation: 120 }, { x: 2670, y: 1070 }, { x: 470, y: 2540 }, { x: 1510, y: 2710 }, { x: 2630, y: 2830 }, { x: 1120, y: 360, elevation: 240 }],
  districts: FJORD_LOCATIONS.map((l) => ({ ...l, accent: "#a7cddd" })),
  minimapLabels: FJORD_LOCATIONS.map((l) => ({ text: l.name, x: l.x, y: l.y })),
  environment: { theme: "fjord", base: "#b7cbd6", fog: "#9aafc1", accent: "#b4d8e4", lighting: { sky: "#dcecff", ground: "#6a7985", sun: "#fff0d8", points: [{ color: "#ffc078", x: 29.5, y: 5.8, z: 23, intensity: 12, distance: 13 }, { color: "#ffc078", x: 36, y: 7.8, z: 16, intensity: 9, distance: 12 }, { color: "#a7d9ec", x: 13, y: 3.2, z: 58, intensity: 5, distance: 10 }, { color: "#ffc078", x: 13.3, y: 2.8, z: 66, intensity: 6, distance: 8 }] } }
};

// shared/maps/outlaws-layout.ts
var CANYON_BOUNDS = { width: 2800, height: 3e3 };
var CANYON_MESAS = [
  { id: "west-high", x: 420, y: 360, width: 600, height: 420, elevation: 240 },
  { id: "east-high", x: 1820, y: 360, width: 620, height: 420, elevation: 240 },
  { id: "west-ledge", x: 650, y: 1100, width: 270, height: 650, elevation: 120 },
  { id: "east-ledge", x: 1950, y: 1100, width: 420, height: 650, elevation: 120 },
  { id: "north-shelf", x: 1050, y: 600, width: 800, height: 260, elevation: 120 },
  { id: "south-shelf", x: 1050, y: 2220, width: 800, height: 300, elevation: 120 },
  { id: "southeast-high", x: 2050, y: 2350, width: 480, height: 330, elevation: 240 }
];
var CANYON_RAMPS = [
  { id: "pit-north", x: 1340, y: 860, width: 170, height: 320, axis: "y", from: 120, to: 0, wood: false },
  { id: "pit-south", x: 1340, y: 1900, width: 170, height: 320, axis: "y", from: 0, to: 120, wood: false },
  { id: "pit-west", x: 920, y: 1430, width: 320, height: 160, axis: "x", from: 120, to: 0, wood: false },
  { id: "pit-east", x: 1630, y: 1430, width: 320, height: 160, axis: "x", from: 0, to: 120, wood: false },
  { id: "west-high-ascent", x: 700, y: 780, width: 160, height: 320, axis: "y", from: 240, to: 120, wood: false },
  { id: "east-high-ascent", x: 2090, y: 780, width: 160, height: 320, axis: "y", from: 240, to: 120, wood: false },
  { id: "west-lower-ascent", x: 920, y: 1600, width: 320, height: 140, axis: "x", from: 120, to: 0, wood: true },
  { id: "east-lower-ascent", x: 2180, y: 1750, width: 160, height: 320, axis: "y", from: 120, to: 0, wood: false },
  { id: "outpost-entry", x: 420, y: 2490, width: 160, height: 320, axis: "y", from: 120, to: 0, wood: true },
  { id: "outpost-roof", x: 690, y: 2120, width: 130, height: 320, axis: "y", from: 240, to: 120, wood: true },
  { id: "southeast-ascent", x: 2350, y: 2030, width: 140, height: 320, axis: "y", from: 120, to: 240, wood: false }
];
var CANYON_WOOD = [
  { id: "west-balcony", x: 500, y: 1100, width: 150, height: 650, elevation: 120 },
  { id: "west-outpost-walk", x: 820, y: 1750, width: 100, height: 320, elevation: 120 },
  { id: "outpost-main", x: 400, y: 2070, width: 500, height: 420, elevation: 120 },
  { id: "east-catwalk-junction", x: 2200, y: 1610, width: 290, height: 140, elevation: 120 },
  { id: "east-catwalk", x: 2350, y: 1750, width: 140, height: 280, elevation: 120 },
  { id: "southern-high-crossing", x: 900, y: 2400, width: 1150, height: 130, elevation: 240 }
];
var CANYON_CAVE = [
  { id: "cave-west-wall", x: 230, y: 930, width: 70, height: 1040, bottom: 0, top: 310 },
  { id: "cave-east-wall", x: 570, y: 960, width: 70, height: 760, bottom: 0, top: 310 },
  { id: "cave-south-wall-a", x: 230, y: 1950, width: 120, height: 70, bottom: 0, top: 305 },
  { id: "cave-south-wall-b", x: 510, y: 1950, width: 110, height: 70, bottom: 0, top: 305 },
  { id: "cave-south-lintel", x: 230, y: 1950, width: 580, height: 70, bottom: 185, top: 305 },
  { id: "cave-main-roof", x: 230, y: 960, width: 410, height: 760, bottom: 185, top: 310 },
  { id: "cave-chamber-roof", x: 230, y: 1720, width: 580, height: 230, bottom: 185, top: 310 }
];
var CANYON_ROCKS = [
  { id: "pit-spire", x: 1400, y: 1610, width: 140, height: 170, bottom: 0, top: 205 },
  { id: "pit-cover-west", x: 1100, y: 1220, width: 95, height: 130, bottom: 0, top: 65 },
  { id: "pit-cover-east", x: 1700, y: 1770, width: 110, height: 100, bottom: 0, top: 75 },
  { id: "floor-spire-east", x: 2490, y: 1260, width: 110, height: 190, bottom: 0, top: 330 },
  { id: "floor-boulder-south", x: 1700, y: 2680, width: 150, height: 130, bottom: 0, top: 95 },
  { id: "floor-boulder-west", x: 1020, y: 1910, width: 110, height: 160, bottom: 0, top: 80 },
  { id: "north-spire", x: 1490, y: 250, width: 120, height: 180, bottom: 0, top: 460 },
  { id: "bridge-cover-west", x: 1170, y: 500, width: 80, height: 50, bottom: 240, top: 310 },
  { id: "bridge-cover-east", x: 1620, y: 630, width: 90, height: 50, bottom: 240, top: 292 },
  { id: "upper-south-cover", x: 1460, y: 2400, width: 100, height: 42, bottom: 240, top: 294 },
  { id: "high-west-cover", x: 460, y: 540, width: 95, height: 140, bottom: 240, top: 350 },
  { id: "high-east-cover", x: 2310, y: 650, width: 95, height: 100, bottom: 240, top: 350 },
  { id: "south-shelf-cover", x: 1660, y: 2250, width: 115, height: 85, bottom: 120, top: 205 }
];
var CANYON_LOCATIONS = [
  { id: "pit", number: "01", name: "CENTRAL PIT", x: 1450, y: 1500 },
  { id: "bridge", number: "02", name: "ROCK BRIDGE", x: 1410, y: 590 },
  { id: "outpost", number: "03", name: "RUINED OUTPOST", x: 630, y: 2290 },
  { id: "cave", number: "04", name: "CAVE TUNNEL", x: 435, y: 1510 },
  { id: "floor", number: "05", name: "CANYON FLOOR", x: 1950, y: 2010 },
  { id: "tower", number: "06", name: "WATCH TOWER", x: 2130, y: 550 }
];

// shared/maps/outlaws-canyon.ts
var blocks2 = [];
var surfaces2 = [];
function block2(id, r, bottom, top, kind = "monument") {
  blocks2.push({ ...r, id, bottom, top, kind, name: "", accent: "#a88962" });
}
function deck2(id, r, z, bottom = z - 12) {
  surfaces2.push({ ...r, id, elevation: z, style: "deck" });
  block2(id, r, bottom, z, "deck");
}
for (let i = 0; i < 9; i++) {
  const x = i * 320;
  block2("wall-north-" + i, { x, y: 0, width: 325, height: 190 + i % 3 * 12 }, 0, 420 + i % 4 * 55);
  block2("wall-south-" + i, { x, y: 2840, width: 325, height: 160 }, 0, 390 + i % 3 * 60);
}
for (let i = 0; i < 9; i++) {
  const y = 160 + i * 300;
  block2("wall-west-" + i, { x: 0, y, width: 180, height: 310 }, 0, 450 + i % 3 * 50);
  block2("wall-east-" + i, { x: 2630, y, width: 170, height: 310 }, 0, 430 + i % 4 * 45);
}
for (const m of CANYON_MESAS) deck2(m.id, m, m.elevation, 0);
for (const s of CANYON_RAMPS) surfaces2.push({ ...s, elevation: Math.max(s.from, s.to), ramp: { axis: s.axis, from: s.from, to: s.to }, style: s.wood ? "stairs" : "ramp" });
for (const p of CANYON_WOOD) deck2(p.id, p, p.elevation);
deck2("outpost-roof-west", { x: 400, y: 2070, width: 290, height: 420 }, 240);
deck2("outpost-roof-east", { x: 820, y: 2070, width: 80, height: 420 }, 240);
deck2("outpost-roof-north", { x: 690, y: 2070, width: 130, height: 50 }, 240);
deck2("outpost-roof-south", { x: 690, y: 2440, width: 130, height: 50 }, 240);
deck2("rock-bridge", { x: 1020, y: 500, width: 800, height: 180 }, 240, 205);
for (const [id, x, width, bottom] of [["west-root", 1020, 110, 0], ["west-haunch", 1130, 100, 100], ["west-arch", 1230, 100, 150], ["west-crown", 1330, 70, 185], ["east-crown", 1440, 70, 185], ["east-arch", 1510, 100, 150], ["east-haunch", 1610, 100, 100], ["east-root", 1710, 110, 0]]) block2("arch-" + id, { x, y: 500, width, height: 180 }, bottom, 205);
for (const b of CANYON_CAVE) block2(b.id, b, b.bottom, b.top);
for (const b of CANYON_ROCKS) {
  block2(b.id, b, b.bottom, b.top);
  blocks2[blocks2.length - 1].shape = "ellipse";
}
block2("cave-rock-bend-a", { x: 360, y: 1320, width: 105, height: 140 }, 0, 185);
blocks2[blocks2.length - 1].shape = "ellipse";
block2("cave-rock-bend-b", { x: 490, y: 1570, width: 65, height: 100 }, 0, 150);
blocks2[blocks2.length - 1].shape = "ellipse";
for (const [i, x, y, width, height] of [[0, 400, 2070, 20, 420], [1, 400, 2070, 240, 15], [2, 400, 2475, 100, 15], [3, 605, 2475, 70, 15], [4, 880, 2070, 20, 140], [5, 490, 2210, 100, 12]]) block2("outpost-wall-" + i, { x, y, width, height }, 120, 225, "building");
for (const [i, x, y] of [[0, 415, 2085], [1, 870, 2085], [2, 415, 2450], [3, 870, 2450]]) block2("outpost-post-" + i, { x, y, width: 15, height: 15 }, 0, 330, "building");
for (const [i, x, y] of [[0, 2020, 470], [1, 2270, 470], [2, 2020, 690], [3, 2270, 690]]) block2("tower-post-" + i, { x, y, width: 15, height: 15 }, 240, 420, "building");
block2("tower-shade", { x: 2e3, y: 450, width: 310, height: 280 }, 410, 425, "building");
block2("wagon-body", { x: 1870, y: 1920, width: 140, height: 75 }, 0, 48, "barrier");
for (const [i, x, y, z] of [[0, 470, 2340, 120], [1, 585, 2150, 120], [2, 2100, 630, 240], [3, 320, 1670, 0]]) block2("supply-" + i, { x, y, width: 55, height: 55 }, z, z + 43, "crate");
var outlawsCanyon = {
  id: "outlaws_canyon",
  name: "Outlaw's Canyon",
  bounds: CANYON_BOUNDS,
  plaza: { x: 1030, y: 1120, width: 850, height: 800 },
  ground: [{ x: 180, y: 190, width: 2450, height: 2650 }],
  blocks: blocks2,
  surfaces: surfaces2,
  spawns: [{ x: 1270, y: 1300 }, { x: 1850, y: 1230 }, { x: 950, y: 950 }, { x: 2500, y: 970 }, { x: 960, y: 2650 }, { x: 1930, y: 2710 }, { x: 940, y: 2130 }, { x: 2510, y: 2200 }],
  districts: CANYON_LOCATIONS.map((p) => ({ ...p, accent: "#b29269" })),
  minimapLabels: CANYON_LOCATIONS.map((p) => ({ text: p.number, x: p.x, y: p.y })),
  environment: { theme: "canyon", base: "#b0916c", fog: "#c8ad8c", accent: "#bc9565", lighting: { sky: "#f5e6cc", ground: "#73503a", sun: "#ffd09a", points: [{ color: "#ffb85f", x: 13.2, y: 3.3, z: 39, intensity: 19, distance: 12 }, { color: "#ffc57b", x: 14, y: 3.2, z: 55.5, intensity: 16, distance: 12 }, { color: "#f5ac58", x: 18, y: 5, z: 68, intensity: 8, distance: 9 }] } }
};

// shared/maps/aerie-layout.ts
var AERIE_SITES = [
  { id: "arrival", number: "01", name: "ARRIVAL PLAZA", x: 1e3, y: 2540, width: 600, height: 560 },
  { id: "mall", number: "02", name: "SKY MALL", x: 2250, y: 2400, width: 650, height: 560 },
  { id: "observation", number: "03", name: "OBSERVATION DOME", x: 1100, y: 150, width: 600, height: 600 },
  { id: "control", number: "04", name: "CONTROL TOWER", x: 2400, y: 500, width: 600, height: 600 },
  { id: "residential", number: "05", name: "RESIDENTIAL SPIRE", x: 200, y: 600, width: 600, height: 600 },
  { id: "hangar", number: "06", name: "HANGAR BAY", x: 2380, y: 1400, width: 620, height: 680 },
  { id: "garden", number: "07", name: "GARDEN TERRACE", x: 200, y: 1750, width: 600, height: 580 }
];
var AERIE_GROUND = [
  ...AERIE_SITES.map((s) => ({ x: s.x - 40, y: s.y - 40, width: s.width + 80, height: s.height + 80 })),
  { x: 800, y: 700, width: 180, height: 2060 },
  { x: 700, y: 750, width: 1840, height: 160 },
  { x: 2240, y: 800, width: 180, height: 1960 },
  { x: 700, y: 2500, width: 1750, height: 160 },
  { x: 1040, y: 1080, width: 1160, height: 1160, shape: "ellipse" },
  { x: 880, y: 1530, width: 480, height: 180 },
  { x: 1920, y: 1530, width: 480, height: 180 },
  { x: 1520, y: 750, width: 180, height: 580 },
  { x: 1520, y: 2060, width: 180, height: 550 },
  { x: 700, y: 1840, width: 260, height: 180 },
  { x: 2310, y: 1800, width: 170, height: 180 },
  { x: 1300, y: 2290, width: 280, height: 220 }
];
function aerieStairs(s) {
  return [
    { id: s.id + "-lower-mid", x: s.x + s.width - 160, y: s.y + 90, width: 110, height: s.height - 180, from: 0, to: 120 },
    { id: s.id + "-mid-high", x: s.x + s.width - 290, y: s.y + 90, width: 110, height: s.height - 180, from: 240, to: 120 }
  ];
}
var AERIE_BRIDGES = [
  { id: "residential-dome", x: 800, y: 650, width: 300, height: 120, elevation: 120 },
  { id: "dome-control", x: 1700, y: 620, width: 700, height: 120, elevation: 240 },
  { id: "control-hangar", x: 2460, y: 1100, width: 120, height: 300, elevation: 120 },
  { id: "hangar-mall", x: 2460, y: 2080, width: 120, height: 320, elevation: 240 },
  { id: "mall-arrival", x: 1600, y: 2720, width: 650, height: 120, elevation: 120 },
  { id: "arrival-garden-east", x: 800, y: 2180, width: 320, height: 120, elevation: 240 },
  { id: "arrival-garden-south", x: 1e3, y: 2180, width: 120, height: 360, elevation: 240 },
  { id: "garden-residential", x: 280, y: 1200, width: 120, height: 550, elevation: 120 },
  { id: "hub-west-link", x: 800, y: 1840, width: 480, height: 120, elevation: 120 },
  { id: "hub-east-link", x: 1960, y: 1840, width: 420, height: 120, elevation: 120 },
  { id: "hub-north", x: 1160, y: 1240, width: 920, height: 120, elevation: 120 },
  { id: "hub-south", x: 1160, y: 1960, width: 920, height: 120, elevation: 120 },
  { id: "hub-west", x: 1160, y: 1240, width: 120, height: 840, elevation: 120 },
  { id: "hub-east", x: 1960, y: 1240, width: 120, height: 840, elevation: 120 },
  { id: "hub-high-north", x: 1400, y: 1400, width: 440, height: 100, elevation: 240 },
  { id: "hub-high-south", x: 1400, y: 1820, width: 440, height: 100, elevation: 240 },
  { id: "hub-high-west", x: 1400, y: 1400, width: 100, height: 520, elevation: 240 },
  { id: "hub-high-east", x: 1740, y: 1400, width: 100, height: 520, elevation: 240 }
];
var AERIE_HUB_STAIRS = [
  { id: "hub-south-ascent", x: 1740, y: 2080, width: 140, height: 320, axis: "y", from: 120, to: 0 },
  { id: "hub-north-ascent", x: 1740, y: 920, width: 140, height: 320, axis: "y", from: 0, to: 120 },
  { id: "hub-upper-ascent", x: 1840, y: 1400, width: 120, height: 320, axis: "y", from: 240, to: 120 }
];

// shared/maps/aerie-sky-port.ts
var blocks3 = [];
var surfaces3 = [];
var BLUE = "#69c9ec";
function block3(id, r, bottom, top, kind = "building") {
  blocks3.push({ ...r, id, bottom, top, kind, name: "", accent: BLUE });
}
function deck3(id, r, z) {
  surfaces3.push({ ...r, id, elevation: z, style: "deck" });
  block3(id, r, z - 10, z, "deck");
}
function floor(id, r, holes, z) {
  const xs2 = [.../* @__PURE__ */ new Set([r.x, r.x + r.width, ...holes.flatMap((h) => [h.x, h.x + h.width])])].filter((x) => x >= r.x && x <= r.x + r.width).sort((a, b) => a - b), ys2 = [.../* @__PURE__ */ new Set([r.y, r.y + r.height, ...holes.flatMap((h) => [h.y, h.y + h.height])])].filter((y) => y >= r.y && y <= r.y + r.height).sort((a, b) => a - b);
  let n = 0;
  for (let i = 0; i < xs2.length - 1; i++) for (let j = 0; j < ys2.length - 1; j++) {
    const x = xs2[i], y = ys2[j], width = xs2[i + 1] - x, height = ys2[j + 1] - y;
    if (!holes.some((h) => x + width / 2 > h.x && x + width / 2 < h.x + h.width && y + height / 2 > h.y && y + height / 2 < h.y + h.height)) deck3(id + "-" + n++, { x, y, width, height }, z);
  }
}
for (const s of AERIE_SITES) {
  const stairs = aerieStairs(s), atrium = { x: s.x + 110, y: s.y + 150, width: s.width - 400, height: s.height - 280 };
  floor(s.id + "-balcony", s, [...stairs, atrium], 120);
  const roofHole = ["hangar", "garden", "arrival", "observation"].includes(s.id) ? [{ x: s.x + 100, y: s.y + 120, width: s.width - 375, height: s.height - 240 }] : [];
  floor(s.id + "-upper", s, [stairs[1], ...roofHole], 240);
  for (const st of stairs) {
    surfaces3.push({ ...st, elevation: Math.max(st.from, st.to), ramp: { axis: "y", from: st.from, to: st.to }, style: "stairs" });
  }
  for (const [i, x, y] of [[0, s.x, s.y], [1, s.x + s.width - 16, s.y], [2, s.x, s.y + s.height - 16], [3, s.x + s.width - 16, s.y + s.height - 16]]) block3(s.id + "-pier-" + i, { x, y, width: 16, height: 16 }, 0, 270);
  if (["mall", "residential", "control"].includes(s.id)) for (const z of [0, 120]) {
    for (const yy of [s.y, s.y + s.height - 12]) {
      block3(s.id + "-facade-a-" + z + "-" + yy, { x: s.x, y: yy, width: 85, height: 12 }, z, z + 120);
      block3(s.id + "-facade-b-" + z + "-" + yy, { x: s.x + 245, y: yy, width: 80, height: 12 }, z, z + 120);
    }
    for (const xx of [s.x, s.x + s.width - 12]) for (const yy of [s.y + 180, s.y + s.height - 180]) if (!(s.id === "mall" && z === 120 && xx === s.x && yy === s.y + s.height - 180)) block3(s.id + "-side-" + z + "-" + xx + "-" + yy, { x: xx, y: yy, width: 12, height: 100 }, z, z + 120);
    block3(s.id + "-room-divider-" + z, { x: s.x + 235, y: s.y + 200, width: 10, height: 110 }, z, z + 100);
  }
  for (const z of [0, 120]) for (const n of [0, 1]) block3(s.id + "-furniture-" + z + "-" + n, { x: s.x + 35, y: s.id === "mall" && z === 120 && n === 1 ? s.y + s.height - 90 : s.y + 220 + n * 140, width: 65, height: 65 }, z, z + 38, s.id === "garden" ? "planter" : "barrier");
}
for (const b of AERIE_BRIDGES) deck3(b.id, b, b.elevation);
deck3("hub-upper-landing", { x: 1840, y: 1300, width: 120, height: 100 }, 240);
deck3("hub-upper-mid-mouth", { x: 1840, y: 1720, width: 120, height: 240 }, 120);
deck3("hub-high-crossing", { x: 1740, y: 1300, width: 100, height: 100 }, 240);
for (const s of AERIE_HUB_STAIRS) surfaces3.push({ ...s, elevation: Math.max(s.from, s.to), ramp: { axis: s.axis, from: s.from, to: s.to }, style: "stairs" });
block3("transit-spire", { x: 1570, y: 1610, width: 100, height: 100, shape: "ellipse" }, 0, 850, "monument");
block3("control-mast", { x: 2450, y: 690, width: 90, height: 90 }, 240, 610, "monument");
block3("residential-penthouse", { x: 230, y: 820, width: 130, height: 130 }, 240, 430);
block3("hangar-craft", { x: 2460, y: 1640, width: 130, height: 240 }, 0, 65, "barrier");
for (const [i, x, y] of [[0, 1410, 1510], [1, 1800, 1740], [2, 1200, 2800], [3, 2110, 2550]]) block3("civic-planter-" + i, { x, y, width: 100, height: 55 }, 0, 38, "planter");
var flat = surfaces3.filter((s) => !s.ramp);
for (const r of flat) for (const side of ["n", "s", "w", "e"]) {
  const horizontal = side === "n" || side === "s", len = horizontal ? r.width : r.height;
  let begin = null, n = 0;
  for (let t = 0; t <= len; t += 5) {
    const x = horizontal ? r.x + t : r.x + (side === "e" ? r.width + 0.5 : -0.5), y = horizontal ? r.y + (side === "s" ? r.height + 0.5 : -0.5) : r.y + t;
    const joined = flat.some((a) => a !== r && a.elevation === r.elevation && x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height) || surfaces3.some((a) => a.ramp && x >= a.x - 1 && x <= a.x + a.width + 1 && y >= a.y - 1 && y <= a.y + a.height + 1);
    const exposed = !joined && t < len;
    if (exposed && begin === null) begin = t;
    if (!exposed && begin !== null) {
      const l = t - begin;
      block3(r.id + "-edge-" + side + "-" + n++, horizontal ? { x: r.x + begin, y: r.y + (side === "s" ? r.height - 4 : 0), width: l, height: 4 } : { x: r.x + (side === "e" ? r.width - 4 : 0), y: r.y + begin, width: 4, height: l }, r.elevation, r.elevation + 25, "rail");
      begin = null;
    }
  }
}
var day = { theme: "sky_port", base: "#dce5e9", fog: "#8b9db5", accent: BLUE, cloudColor: "#f6ded0", cloudShade: "#9daec6", lighting: { sky: "#e7f4ff", ground: "#928998", sun: "#ffe2bf", points: [{ color: "#69dfff", x: 48.6, y: 8, z: 49.8, intensity: 22, distance: 21 }, { color: "#ffd4a0", x: 78, y: 3, z: 80, intensity: 12, distance: 17 }] } };
var night = { theme: "sky_port", base: "#465973", fog: "#17263f", accent: BLUE, cloudColor: "#63728c", cloudShade: "#374765", lighting: { sky: "#b7d0ef", ground: "#4a526d", sun: "#c8dcff", points: [{ color: "#69dfff", x: 48.6, y: 8, z: 49.8, intensity: 30, distance: 24 }, { color: "#ffc893", x: 78, y: 3, z: 80, intensity: 20, distance: 19 }, { color: "#79baff", x: 82, y: 8, z: 24, intensity: 15, distance: 17 }] } };
var aerieSkyPort = {
  id: "aerie_sky_port",
  name: "Aerie Sky-Port",
  bounds: { width: 3200, height: 3240 },
  plaza: { x: 1040, y: 1080, width: 1160, height: 1160, shape: "ellipse" },
  ground: [...AERIE_GROUND, { x: 1740, y: 880, width: 140, height: 370 }, { x: 1740, y: 2070, width: 140, height: 480 }],
  blocks: blocks3,
  surfaces: surfaces3,
  spawns: [{ x: 1150, y: 2600 }, { x: 2390, y: 2460 }, { x: 1240, y: 210 }, { x: 2540, y: 560 }, { x: 340, y: 660 }, { x: 2520, y: 1460 }, { x: 340, y: 1810 }, { x: 1470, y: 1910 }],
  districts: [{ id: "hub", name: "CENTRAL TRANSIT SPIRE", x: 1620, y: 1660, accent: BLUE }, ...AERIE_SITES.map((s) => ({ id: s.id, name: s.name, x: s.x + s.width / 2, y: s.y + s.height / 2, accent: BLUE }))],
  minimapLabels: [{ text: "HUB", x: 1620, y: 1660 }, ...AERIE_SITES.map((s) => ({ text: s.number, x: s.x + s.width / 2, y: s.y + s.height / 2 }))],
  environment: day,
  variants: { day, night }
};

// shared/maps/central-plaza-layout.ts
var CP_LEVELS = { transit: 0, street: 110, mid: 230, roof: 350 };
var CP_BOUNDS = { width: 3200, height: 3200 };
var PLAZA_BUILDINGS = [
  { id: "hq", number: "01", name: "BOUNTY HQ", use: "Lobby \xB7 offices \xB7 skybridge", x: 250, y: 2240, width: 640, height: 520, accent: "#46dfff", front: "east" },
  { id: "apartments", number: "02", name: "APARTMENTS", use: "Lobby \xB7 upper corridor \xB7 fire escape", x: 250, y: 1110, width: 560, height: 640, accent: "#d9ac7c", front: "east", openStairs: true },
  { id: "club", number: "03", name: "NIGHTCLUB", use: "Dance floor \xB7 bar \xB7 VIP", x: 300, y: 250, width: 600, height: 600, accent: "#e84bd1", front: "south" },
  { id: "store", number: "04", name: "CONVENIENCE", use: "Shop \xB7 storage \xB7 rear alley", x: 1230, y: 250, width: 640, height: 520, accent: "#66dce7", front: "south" },
  { id: "parking", number: "05", name: "PARKING", use: "Two decks \xB7 broad ramps \xB7 roof", x: 2360, y: 990, width: 580, height: 680, accent: "#ef657c", front: "west", openStairs: true },
  { id: "noodles", number: "06", name: "NOODLE SHOP", use: "Restaurant \xB7 kitchen \xB7 courtyard", x: 1160, y: 2510, width: 620, height: 500, accent: "#ff925c", front: "north" },
  { id: "electronics", number: "07", name: "ELECTRONICS", use: "Display floor \xB7 backroom \xB7 balcony", x: 2340, y: 1870, width: 580, height: 500, accent: "#63aafa", front: "west" },
  { id: "warehouse", number: "08", name: "WAREHOUSE", use: "Loading dock \xB7 storage \xB7 roof", x: 2540, y: 2570, width: 520, height: 500, accent: "#cba97a", front: "west" },
  { id: "transit", number: "09", name: "TRANSIT", use: "Station \xB7 service passage \xB7 second exit", x: 1850, y: 2440, width: 370, height: 600, accent: "#8dddef", front: "north" },
  { id: "maintenance", number: "10", name: "MAINTENANCE", use: "Utility rooms \xB7 catwalk \xB7 roof", x: 2220, y: 250, width: 560, height: 520, accent: "#71bbc6", front: "south", openStairs: true }
];
var TRANSIT_STAIRS = [
  { id: "transit-main-stairs", x: 1900, y: 2490, width: 150, height: 360 },
  { id: "transit-service-stairs", x: 2990, y: 2210, width: 150, height: 360 }
];
var TRANSIT_GROUND = [
  ...TRANSIT_STAIRS,
  { x: 1900, y: 2990, width: 1240, height: 140 },
  { x: 1900, y: 2850, width: 150, height: 280 },
  { x: 2990, y: 2570, width: 150, height: 560 }
];
var PLAZA_BRIDGES = [
  { id: "club-store-roof", x: 900, y: 300, width: 330, height: 110, elevation: 350 },
  { id: "store-maintenance-mid", x: 1870, y: 250, width: 350, height: 100, elevation: 230 },
  { id: "maintenance-parking-roof", x: 2550, y: 770, width: 110, height: 220, elevation: 350 },
  { id: "parking-electronics-mid", x: 2460, y: 1670, width: 120, height: 200, elevation: 230 },
  { id: "apartments-hq-roof", x: 480, y: 1750, width: 120, height: 490, elevation: 350 },
  { id: "hq-noodles-roof", x: 890, y: 2630, width: 270, height: 110, elevation: 350 },
  { id: "electronics-warehouse-roof", x: 2710, y: 2370, width: 110, height: 200, elevation: 350 }
];
var PLAZA_PROPS = [];
function prop(id, kind, x, y, width, height, bottom, rise, accent = "#6eced9") {
  PLAZA_PROPS.push({ id, kind, x, y, width, height, bottom, top: bottom + rise, accent });
}
for (const [i, x, y] of [[0, 1240, 1270], [1, 1900, 1270], [2, 1240, 1930], [3, 1900, 1930]]) prop("plaza-tree-" + i, "planter", x, y, 110, 80, 110, 30);
for (const [i, x, y] of [[0, 1330, 1150], [1, 1780, 1150], [2, 1320, 2100], [3, 1810, 2100]]) prop("plaza-bench-" + i, "bench", x, y, 105, 32, 110, 25);
prop("plaza-directory", "kiosk", 2060, 1550, 45, 65, 110, 100);
prop("plaza-west-kiosk", "kiosk", 1110, 1510, 55, 75, 110, 100, "#dc70c9");
for (const b of PLAZA_BUILDINGS.filter((b2) => b2.id !== "transit")) {
  prop(b.id + "-roof-hvac", "hvac", b.x + 55, b.y + b.height - 155, 105, 75, 350, 40, b.accent);
  prop(b.id + "-roof-tank", "tank", b.x + 50, b.y + 145, 75, 75, 350, 78, b.accent);
  if (b.id === "parking") {
    prop("parking-car", "car", b.x + 55, b.y + 230, 90, 175, 110, 48, b.accent);
    prop("parking-upper-car", "car", b.x + 50, b.y + 230, 90, 175, 230, 48, "#9aaec1");
    continue;
  }
  prop(b.id + "-service-bin", "dumpster", b.x + 30, b.y + b.height + 25, 65, 45, 110, 48);
  const kind = b.id === "warehouse" ? "crate" : b.id === "store" || b.id === "electronics" ? "shelf" : "counter";
  prop(b.id + "-interior-a", kind, b.x + (b.id === "warehouse" ? 280 : 45), b.y + 160, 70, 125, 110, b.id === "warehouse" ? 75 : 42, b.accent);
  prop(b.id + "-interior-b", kind, b.x + (b.id === "warehouse" ? 280 : 45), b.y + b.height - 175, 75, 95, 110, 42, b.accent);
  prop(b.id + "-upper-equipment", b.id === "maintenance" ? "shelf" : "counter", b.x + (b.id === "warehouse" ? 280 : 45), b.y + 200, 70, 90, 230, 45, b.accent);
}
prop("street-delivery-van", "car", 980, 2600, 90, 175, 110, 62, "#4f739a");
prop("club-street-vending", "vending", 990, 400, 50, 45, 110, 78, "#db53b5");
prop("transit-vending", "vending", 2110, 2460, 50, 40, 110, 80);
prop("warehouse-pallet", "crate", 2430, 2780, 65, 80, 110, 46, "#987b53");
var PLAZA_BALCONIES = [
  { id: "hq-balcony", x: 890, y: 2240, width: 130, height: 150, attached: "west" },
  { id: "apartments-fire-escape", x: 810, y: 1110, width: 130, height: 150, attached: "west" },
  { id: "club-vip-terrace", x: 410, y: 850, width: 300, height: 110, attached: "north" },
  { id: "electronics-balcony", x: 2210, y: 1870, width: 130, height: 150, attached: "east" },
  { id: "noodles-upper-gallery", x: 1220, y: 2400, width: 300, height: 110, attached: "south" },
  { id: "maintenance-catwalk", x: 2260, y: 770, width: 300, height: 110, attached: "north" },
  { id: "parking-overlook", x: 2230, y: 1220, width: 130, height: 210, attached: "east" }
];

// shared/maps/central-plaza.ts
var CYAN = "#66dbed";
var blocks4 = [];
var surfaces4 = [];
function block4(id, r, bottom, top, kind = "building", accent = CYAN, name = "") {
  blocks4.push({ ...r, id, bottom, top, kind, accent, name });
}
function deck4(id, r, elevation, thickness = 10) {
  surfaces4.push({ ...r, id, elevation, style: "deck" });
  block4(id, r, elevation - thickness, elevation, "deck");
}
function ramp(id, r, from, to, style = "stairs") {
  surfaces4.push({ ...r, id, elevation: Math.max(from, to), ramp: { axis: "y", from, to }, style });
}
function floor2(id, r, holes, elevation) {
  const xs2 = [.../* @__PURE__ */ new Set([r.x, r.x + r.width, ...holes.flatMap((h) => [Math.max(r.x, h.x), Math.min(r.x + r.width, h.x + h.width)])])].filter((x) => x >= r.x && x <= r.x + r.width).sort((a, b) => a - b);
  const ys2 = [.../* @__PURE__ */ new Set([r.y, r.y + r.height, ...holes.flatMap((h) => [Math.max(r.y, h.y), Math.min(r.y + r.height, h.y + h.height)])])].filter((y) => y >= r.y && y <= r.y + r.height).sort((a, b) => a - b);
  let n = 0;
  for (let i = 0; i < xs2.length - 1; i++) for (let j = 0; j < ys2.length - 1; j++) {
    const x = (xs2[i] + xs2[i + 1]) / 2, y = (ys2[j] + ys2[j + 1]) / 2;
    if (holes.some((h) => x > h.x && x < h.x + h.width && y > h.y && y < h.y + h.height)) continue;
    deck4(`${id}-${n++}`, { x: xs2[i], y: ys2[j], width: xs2[i + 1] - xs2[i], height: ys2[j + 1] - ys2[j] }, elevation);
  }
}
function buildingStairs(b) {
  const w = b.id === "parking" ? 140 : 95, gap = 15, end = b.x + b.width - 20;
  return [{ id: b.id + "-street-to-mid", x: b.id === "warehouse" ? b.x + 20 : end - w, y: b.y + 100, width: w, height: b.height - 200, from: CP_LEVELS.street, to: CP_LEVELS.mid }, { id: b.id + "-mid-to-roof", x: b.id === "warehouse" ? b.x + 20 + w + gap : end - w * 2 - gap, y: b.y + 100, width: w, height: b.height - 200, from: CP_LEVELS.roof, to: CP_LEVELS.mid }];
}
function openings(b, side, level) {
  const horizontal = side === "north" || side === "south", start = horizontal ? b.x : b.y, length = horizontal ? b.width : b.height;
  const spans = [];
  if (level < CP_LEVELS.roof) {
    if (horizontal) {
      const center = b.x + (b.id === "warehouse" ? 245 : 0) + (b.width - (b.id === "parking" ? 330 : 245)) / 2;
      spans.push([center - 70, center + 70]);
      if (level === CP_LEVELS.street && side === "north") {
        const stair = buildingStairs(b)[0];
        spans.push([stair.x - 1, stair.x + stair.width + 1]);
      }
    } else {
      spans.push([b.y + 10, b.y + 92]);
      if (b.front === side && b.id === "parking") spans.push([b.y + b.height * 0.5 - 90, b.y + b.height * 0.5 + 90]);
    }
  }
  for (const bridge of PLAZA_BRIDGES) {
    if (bridge.elevation !== level) continue;
    const touches = side === "north" ? bridge.y + bridge.height === b.y : side === "south" ? bridge.y === b.y + b.height : side === "west" ? bridge.x + bridge.width === b.x : bridge.x === b.x + b.width;
    if (touches) {
      const a = horizontal ? bridge.x : bridge.y, c = a + (horizontal ? bridge.width : bridge.height);
      if (c > start && a < start + length) spans.push([Math.max(start, a - 3), Math.min(start + length, c + 3)]);
    }
  }
  return spans.map(([a, c]) => [Math.max(start, a), Math.min(start + length, c)]).filter(([a, c]) => c > a).sort((a, c) => a[0] - c[0]);
}
function facade(b, side, level) {
  const horizontal = side === "north" || side === "south", start = horizontal ? b.x : b.y, end = start + (horizontal ? b.width : b.height), spans = openings(b, side, level), rail = level === CP_LEVELS.roof || b.openStairs && side === "east", top = level + (rail ? 28 : 120), thick = rail ? 7 : 12;
  let cursor = start, n = 0;
  const segment = (a, c, bottom, upper) => {
    if (c - a < 0.01) return;
    const r = horizontal ? { x: a, y: side === "north" ? b.y : b.y + b.height - thick, width: c - a, height: thick } : { x: side === "west" ? b.x : b.x + b.width - thick, y: a, width: thick, height: c - a };
    block4(`${b.id}-${side}-${level}-${n++}`, r, bottom, upper, rail ? "rail" : "building", b.accent);
  };
  for (const [a, c] of spans) {
    if (a > cursor) segment(cursor, a, level, top);
    if (!rail) segment(a, c, level + 101, top);
    cursor = Math.max(cursor, c);
  }
  segment(cursor, end, level, top);
}
floor2("district-street", { x: 0, y: 0, ...CP_BOUNDS }, TRANSIT_STAIRS, CP_LEVELS.street);
for (const b of PLAZA_BUILDINGS.filter((b2) => b2.id !== "transit")) {
  const stairs = buildingStairs(b);
  floor2(b.id + "-upper-floor", b, stairs, CP_LEVELS.mid);
  floor2(b.id + "-roof", b, [stairs[1]], CP_LEVELS.roof);
  for (const s of stairs) ramp(s.id, s, s.from, s.to, b.id === "parking" ? "ramp" : "stairs");
  for (const level of [CP_LEVELS.street, CP_LEVELS.mid, CP_LEVELS.roof]) for (const side of ["north", "south", "west", "east"]) facade(b, side, level);
  if (!["parking", "warehouse"].includes(b.id)) {
    const mainWidth = b.width - 245, door = b.x + mainWidth / 2, split = b.y + b.height * 0.59;
    for (const level of [CP_LEVELS.street, CP_LEVELS.mid]) {
      block4(b.id + "-room-left-" + level, { x: b.x + 12, y: split, width: door - 55 - b.x - 12, height: 8 }, level, level + 110);
      block4(b.id + "-room-right-" + level, { x: door + 55, y: split, width: b.x + mainWidth - door - 55, height: 8 }, level, level + 110);
      block4(b.id + "-room-header-" + level, { x: door - 55, y: split, width: 110, height: 8 }, level + 94, level + 110);
    }
  }
  for (const s of stairs) for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const y = s.y + i * s.height / 4, height = s.height / 4, h = s.from + (s.to - s.from) * (i + 0.5) / 4;
    block4(`${s.id}-rail-${side}-${i}`, { x: side < 0 ? s.x - 6 : s.x + s.width, y, width: 6, height }, h, h + 28, "rail", b.accent);
  }
}
for (const bridge of PLAZA_BRIDGES) {
  deck4(bridge.id, bridge, bridge.elevation, 12);
  const alongX = bridge.width > bridge.height;
  if (alongX) {
    for (const side of [0, 1]) block4(bridge.id + "-rail-" + side, { x: bridge.x, y: bridge.y + side * (bridge.height - 7), width: bridge.width, height: 7 }, bridge.elevation, bridge.elevation + 28, "rail");
  } else for (const side of [0, 1]) block4(bridge.id + "-rail-" + side, { x: bridge.x + side * (bridge.width - 7), y: bridge.y, width: 7, height: bridge.height }, bridge.elevation, bridge.elevation + 28, "rail");
}
for (const balcony of PLAZA_BALCONIES) {
  deck4(balcony.id, balcony, CP_LEVELS.mid, 12);
  for (const side of ["north", "south", "west", "east"]) {
    if (side === balcony.attached) continue;
    const horizontal = side === "north" || side === "south";
    const r = horizontal ? { x: balcony.x, y: side === "north" ? balcony.y : balcony.y + balcony.height - 6, width: balcony.width, height: 6 } : { x: side === "west" ? balcony.x : balcony.x + balcony.width - 6, y: balcony.y, width: 6, height: balcony.height };
    block4(balcony.id + "-" + side, r, CP_LEVELS.mid, CP_LEVELS.mid + 28, "rail");
  }
  for (const x of [balcony.x + 8, balcony.x + balcony.width - 20]) for (const y of [balcony.y + 8, balcony.y + balcony.height - 20]) block4(balcony.id + "-support-" + x + "-" + y, { x, y, width: 12, height: 12 }, CP_LEVELS.street, CP_LEVELS.mid - 12, "building", "#536777");
}
for (const stair of TRANSIT_STAIRS) ramp(stair.id, stair, CP_LEVELS.street, 0);
var xs = [...new Set(TRANSIT_GROUND.flatMap((r) => [r.x, r.x + r.width]))].sort((a, b) => a - b);
var ys = [...new Set(TRANSIT_GROUND.flatMap((r) => [r.y, r.y + r.height]))].sort((a, b) => a - b);
var inside = (x, y) => TRANSIT_GROUND.some((r) => x > r.x && x < r.x + r.width && y > r.y && y < r.y + r.height);
var edge = 0;
for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
  const x = xs[i], y = ys[j], w = xs[i + 1] - x, h = ys[j + 1] - y;
  if (!inside(x + w / 2, y + h / 2)) continue;
  for (const [dx, dy, rect] of [[-1, 0, { x: x - 10, y, width: 10, height: h }], [1, 0, { x: x + w, y, width: 10, height: h }], [0, -1, { x, y: y - 10, width: w, height: 10 }], [0, 1, { x, y: y + h, width: w, height: 10 }]]) {
    if (!inside(x + w / 2 + dx * (w / 2 + 0.1), y + h / 2 + dy * (h / 2 + 0.1))) block4("transit-wall-" + edge++, rect, 0, CP_LEVELS.street - 10, "building", "#759cae");
  }
}
for (const stair of TRANSIT_STAIRS) for (const side of [0, 1]) block4(stair.id + "-street-rail-" + side, { x: stair.x + (side ? stair.width : -6), y: stair.y, width: 6, height: stair.height }, CP_LEVELS.street, CP_LEVELS.street + 28, "rail");
deck4("monument-platform", { x: 1500, y: 1550, width: 240, height: 240, shape: "ellipse" }, 130, 20);
block4("central-monument", { x: 1580, y: 1630, width: 80, height: 80, shape: "ellipse" }, 130, 450, "monument", CYAN, "CENTRAL PLAZA");
for (const [id, x, y, axis, from, to, w, h] of [["north", 1580, 1490, "y", 110, 130, 80, 80], ["south", 1580, 1770, "y", 130, 110, 80, 80], ["west", 1440, 1630, "x", 110, 130, 80, 80], ["east", 1720, 1630, "x", 130, 110, 80, 80]]) surfaces4.push({ id: "monument-" + id, x, y, width: w, height: h, elevation: 130, style: "stairs", ramp: { axis, from, to } });
for (const p of PLAZA_PROPS) block4(p.id, p, p.bottom, p.top, p.kind === "planter" ? "planter" : p.kind === "crate" ? "crate" : "barrier", p.accent);
for (const [id, r] of [["north", { x: 20, y: 20, width: 3160, height: 14 }], ["south", { x: 20, y: 3166, width: 3160, height: 14 }], ["west", { x: 20, y: 34, width: 14, height: 3132 }], ["east", { x: 3166, y: 34, width: 14, height: 3132 }]]) block4("district-boundary-" + id, r, CP_LEVELS.street, CP_LEVELS.street + 95, "barrier", "#627b8a");
var centralPlaza = {
  id: "central_plaza",
  name: "Central Plaza",
  bounds: CP_BOUNDS,
  plaza: { x: 1040, y: 1090, width: 1160, height: 1160 },
  blocks: blocks4,
  surfaces: surfaces4,
  ground: TRANSIT_GROUND,
  spawns: [{ x: 1030, y: 2410, elevation: CP_LEVELS.street }, { x: 2170, y: 2400, elevation: CP_LEVELS.street }, { x: 920, y: 1350, elevation: CP_LEVELS.street }, { x: 2280, y: 1520, elevation: CP_LEVELS.street }, { x: 1040, y: 900, elevation: CP_LEVELS.street }, { x: 2060, y: 870, elevation: CP_LEVELS.street }, { x: 500, y: 1940, elevation: CP_LEVELS.street }, { x: 3090, y: 1940, elevation: CP_LEVELS.street }],
  districts: [{ id: "center", name: "CENTRAL PLAZA", x: 1620, y: 1670, accent: CYAN }, ...PLAZA_BUILDINGS.map((b) => ({ id: b.id, name: b.name, x: b.x + b.width / 2, y: b.y + b.height / 2, accent: b.accent }))],
  minimapLabels: PLAZA_BUILDINGS.map((b) => ({ text: b.number, x: b.x + b.width / 2, y: b.y + b.height / 2 })),
  environment: { base: "#14202b", fog: "#070f20", accent: CYAN, lighting: { sky: "#9bb5d7", ground: "#394a5e", sun: "#c6d6e8", points: [{ color: "#56d9ff", x: 48.6, y: 8, z: 50.1, intensity: 45, distance: 25 }, { color: "#e947c4", x: 19, y: 6, z: 26, intensity: 30, distance: 20 }, { color: "#ff7845", x: 43, y: 5, z: 74, intensity: 28, distance: 18 }, { color: "#509fff", x: 70, y: 6, z: 63, intensity: 28, distance: 20 }] } }
};

// shared/maps/scorched-layout.ts
var SP_BOUNDS = { width: 3200, height: 3e3 };
var SCORCHED_SITES = [
  { id: "mining", number: "01", name: "MINING OFFICE", x: 250, y: 2150, width: 560, height: 500, damage: "light", levels: 3, accent: "#c4ad8d" },
  { id: "residential", number: "02", name: "RESIDENTIAL RUINS", x: 220, y: 680, width: 540, height: 560, damage: "heavy", levels: 3, accent: "#b39176" },
  { id: "research", number: "03", name: "VOLCANIC RESEARCH", x: 1150, y: 180, width: 600, height: 500, damage: "light", levels: 3, accent: "#a5c9d0" },
  { id: "workshop", number: "04", name: "ABANDONED WORKSHOP", x: 2180, y: 2280, width: 600, height: 500, damage: "medium", levels: 3, accent: "#d5b275" },
  { id: "store", number: "05", name: "BURNED MARKET", x: 200, y: 1510, width: 440, height: 400, damage: "medium", levels: 2, accent: "#bcb18d" },
  { id: "power", number: "06", name: "GEOTHERMAL POWER", x: 2310, y: 540, width: 620, height: 620, damage: "medium", levels: 3, accent: "#c39472" },
  { id: "warehouse", number: "07", name: "COLLAPSED WAREHOUSE", x: 2340, y: 1510, width: 620, height: 540, damage: "heavy", levels: 3, accent: "#a9a29a" }
];
var SCORCHED_GROUND = [
  { x: 20, y: 1120, width: 170, height: 440 },
  { x: 1500, y: 2250, width: 180, height: 420 },
  { x: 2440, y: 2020, width: 240, height: 250 },
  { x: 180, y: 2070, width: 700, height: 660 },
  { x: 140, y: 580, width: 700, height: 760 },
  { x: 1060, y: 120, width: 780, height: 620 },
  { x: 2020, y: 2210, width: 880, height: 640 },
  { x: 120, y: 1440, width: 720, height: 510 },
  { x: 2220, y: 420, width: 820, height: 850 },
  { x: 2280, y: 1430, width: 760, height: 630 },
  { x: 740, y: 400, width: 150, height: 2200 },
  { x: 700, y: 380, width: 1770, height: 150 },
  { x: 2900, y: 780, width: 150, height: 1890 },
  { x: 740, y: 2620, width: 2200, height: 150 },
  { x: 790, y: 1990, width: 1600, height: 170 },
  { x: 1330, y: 660, width: 560, height: 160 },
  { x: 2270, y: 1180, width: 420, height: 350 },
  { x: 650, y: 1370, width: 230, height: 300 }
];
var SCORCHED_BRIDGES = [
  { id: "store-stair-landing", x: 30, y: 1510, width: 170, height: 120, elevation: 120 },
  { id: "residential-research-span", x: 600, y: 550, width: 550, height: 130, elevation: 240 },
  { id: "residential-fire-landing", x: 600, y: 550, width: 130, height: 130, elevation: 240 },
  { id: "research-power-catwalk", x: 1750, y: 580, width: 560, height: 130, elevation: 120 },
  { id: "power-warehouse-span", x: 2670, y: 1160, width: 130, height: 350, elevation: 240 },
  { id: "warehouse-workshop-catwalk", x: 2570, y: 2050, width: 130, height: 230, elevation: 120 },
  { id: "mining-core-span", x: 810, y: 2220, width: 490, height: 130, elevation: 240 },
  { id: "mining-core-north", x: 1170, y: 1700, width: 130, height: 650, elevation: 240 },
  { id: "mining-core-junction", x: 1170, y: 1700, width: 230, height: 100, elevation: 240 },
  { id: "store-core-crossing", x: 640, y: 1650, width: 730, height: 130, elevation: 120 },
  { id: "research-core-landing", x: 1400, y: 680, width: 130, height: 140, elevation: 120 }
];
var CORE_HIGH = [{ id: "core-upper-north", x: 1300, y: 1200, width: 600, height: 100, elevation: 240 }, { id: "core-upper-south", x: 1300, y: 1700, width: 600, height: 100, elevation: 240 }, { id: "core-upper-west", x: 1300, y: 1200, width: 100, height: 600, elevation: 240 }, { id: "core-upper-east", x: 1800, y: 1200, width: 100, height: 600, elevation: 240 }];
function scorchedStairs(b) {
  if (b.id === "store") return [{ id: "store-roof-stairs", x: 30, y: 1190, width: 120, height: 320, from: 0, to: 120 }];
  const w = 100, end = b.x + b.width - 20, run = b.height - 180;
  return [{ id: b.id + "-ground-mid", x: end - w, y: b.y + 90, width: w, height: run, from: 0, to: 120 }, { id: b.id + "-mid-roof", x: end - w * 2 - 15, y: b.y + 90, width: w, height: run, from: 240, to: 120 }];
}
var SCORCHED_PROPS = [];
function prop2(id, kind, x, y, width, height, bottom, rise) {
  SCORCHED_PROPS.push({ id, kind, x, y, width, height, bottom, top: bottom + rise });
}
for (const b of SCORCHED_SITES) {
  const kind = b.id === "mining" ? "desk" : b.id === "store" ? "shelf" : b.id === "research" || b.id === "power" ? "console" : b.id === "residential" ? "sofa" : b.id === "workshop" ? "machine" : "crate";
  prop2(b.id + "-equipment-a", kind, b.x + 35, b.y + 140, 70, 90, 0, 45);
  prop2(b.id + "-equipment-b", kind, b.x + 40, b.y + b.height - 145, 70, 70, 0, 45);
  if (b.levels === 3) prop2(b.id + "-upper-console", b.id === "residential" ? "sofa" : "console", b.x + 35, b.y + 150, 70, 70, 120, 40);
  prop2(b.id + "-roof-equipment", "machine", b.x + (b.id === "research" ? 250 : 40), b.y + b.height - 130, 90, 65, (b.levels - 1) * 120, 45);
}
prop2("power-tank-a", "tank", 2380, 780, 105, 110, 240, 210);
prop2("power-tank-b", "tank", 2530, 770, 110, 110, 240, 170);
prop2("mining-truck", "car", 300, 2075, 85, 130, 0, 50);
prop2("burned-car", "car", 150, 1280, 75, 110, 0, 38);
prop2("warehouse-cargo", "crate", 2590, 1690, 90, 120, 0, 60);
prop2("workshop-hoist", "machine", 2420, 2470, 100, 100, 0, 60);
prop2("core-pump-west", "machine", 1430, 1410, 55, 85, 120, 60);
prop2("core-pump-east", "machine", 1740, 1510, 55, 85, 120, 60);

// shared/maps/scorched-point.ts
var blocks5 = [];
var surfaces5 = [];
function block5(id, r, bottom, top, kind = "building", name = "") {
  blocks5.push({ ...r, id, bottom, top, kind, name, accent: "#bc9677" });
}
function deck5(id, r, z) {
  surfaces5.push({ ...r, id, elevation: z, style: "deck" });
  block5(id, r, z - 10, z, "deck");
}
function floor3(id, r, holes, z) {
  const xs2 = [.../* @__PURE__ */ new Set([r.x, r.x + r.width, ...holes.flatMap((h) => [h.x, h.x + h.width])])].filter((x) => x >= r.x && x <= r.x + r.width).sort((a, b) => a - b), ys2 = [.../* @__PURE__ */ new Set([r.y, r.y + r.height, ...holes.flatMap((h) => [h.y, h.y + h.height])])].filter((y) => y >= r.y && y <= r.y + r.height).sort((a, b) => a - b);
  let n = 0;
  for (let i = 0; i < xs2.length - 1; i++) for (let j = 0; j < ys2.length - 1; j++) {
    const x = xs2[i], y = ys2[j], w = xs2[i + 1] - x, h = ys2[j + 1] - y;
    if (!holes.some((a) => x + w / 2 > a.x && x + w / 2 < a.x + a.width && y + h / 2 > a.y && y + h / 2 < a.y + a.height)) deck5(id + "-" + n++, { x, y, width: w, height: h }, z);
  }
}
function ramp2(id, r, axis, from, to) {
  surfaces5.push({ ...r, id, elevation: Math.max(from, to), ramp: { axis, from, to }, style: "stairs" });
}
var bridges = [...SCORCHED_BRIDGES, ...CORE_HIGH];
function wall(b, side, z) {
  const horizontal = side === "north" || side === "south", start = horizontal ? b.x : b.y, len = horizontal ? b.width : b.height, spans = [];
  const roof = z === (b.levels - 1) * 120;
  if (!roof) {
    if (horizontal) {
      const center = b.x + (b.id === "store" ? 220 : (b.width - 250) / 2);
      spans.push([center - 70, center + 70]);
      if (side === "north" && z === 0 && b.id !== "store") {
        const stair = scorchedStairs(b)[0];
        spans.push([stair.x - 2, stair.x + stair.width + 2]);
      }
    } else spans.push([b.y + 12, b.y + 78]);
  }
  if (b.id === "store" && side === "north" && roof) spans.push([248, 372]);
  for (const r of bridges) {
    if (r.elevation !== z) continue;
    const touches = side === "north" ? r.y + r.height === b.y : side === "south" ? r.y === b.y + b.height : side === "west" ? r.x + r.width === b.x : r.x === b.x + b.width;
    if (touches) spans.push(horizontal ? [r.x - 2, r.x + r.width + 2] : [r.y - 2, r.y + r.height + 2]);
  }
  if (b.damage === "heavy" && !roof && side === "west") spans.push([b.y + 250, b.y + 390]);
  let cursor = start, n = 0;
  const segment = (a, c, bottom, top) => {
    if (c <= a) return;
    const t = roof ? 6 : 12;
    block5(`${b.id}-${side}-${z}-${n++}`, horizontal ? { x: a, y: side === "north" ? b.y : b.y + b.height - t, width: c - a, height: t } : { x: side === "west" ? b.x : b.x + b.width - t, y: a, width: t, height: c - a }, bottom, top, roof ? "rail" : "building");
  };
  for (const [aa, cc] of spans.sort((a, b2) => a[0] - b2[0])) {
    const a = Math.max(start, aa), c = Math.min(start + len, cc);
    if (c <= start || a >= start + len) continue;
    if (a > cursor) segment(cursor, a, z, z + (roof ? 28 : 120));
    if (!roof) segment(a, c, z + 100, z + 120);
    cursor = Math.max(cursor, c);
  }
  segment(cursor, start + len, z, z + (roof ? 28 : 120));
}
for (const b of SCORCHED_SITES) {
  const stairs = scorchedStairs(b);
  if (b.levels === 3) {
    floor3(b.id + "-mid", b, [...stairs, ...b.id === "warehouse" ? [{ x: b.x + 120, y: b.y + 120, width: 240, height: 300 }] : b.id === "residential" ? [{ x: b.x + 120, y: b.y + 220, width: 140, height: 130 }] : []], 120);
    const damage = b.damage === "heavy" ? [{ x: b.x + 125, y: b.y + 160, width: b.id === "warehouse" ? 235 : 190, height: b.id === "warehouse" ? 280 : 170 }] : [];
    floor3(b.id + "-roof", b, [stairs[1], ...damage], 240);
  } else floor3(b.id + "-roof", b, [], 120);
  for (const s of stairs) ramp2(s.id, s, "y", s.from, s.to);
  for (let level = 0; level < b.levels; level++) for (const side of ["north", "south", "west", "east"]) wall(b, side, level * 120);
  for (const s of stairs) for (const side of [0, 1]) for (let i = 0; i < 4; i++) {
    const h = s.from + (s.to - s.from) * (i + 0.5) / 4;
    block5(s.id + "-rail-" + side + "-" + i, { x: s.x + (side ? s.width : -5), y: s.y + i * s.height / 4, width: 5, height: s.height / 4 }, h, h + 25, "rail");
  }
  if (["mining", "research", "store"].includes(b.id)) {
    const mid = b.x + (b.id === "store" ? 220 : (b.width - 250) / 2), y = b.y + b.height * 0.6;
    block5(b.id + "-room-left", { x: b.x + 12, y, width: mid - 60 - b.x - 12, height: 8 }, 0, 105);
    block5(b.id + "-room-right", { x: mid + 60, y, width: b.x + b.width - (b.id === "store" ? 12 : 250) - mid - 60, height: 8 }, 0, 105);
  }
}
deck5("crucible", { x: 1150, y: 1050, width: 900, height: 900, shape: "ellipse" }, 120);
block5("crucible-core", { x: 1540, y: 1440, width: 120, height: 120, shape: "ellipse" }, 120, 540, "monument", "THE CRUCIBLE");
ramp2("core-north", { x: 1520, y: 730, width: 160, height: 320 }, "y", 0, 120);
ramp2("core-south", { x: 1520, y: 1950, width: 160, height: 340 }, "y", 120, 0);
ramp2("core-west", { x: 800, y: 1420, width: 350, height: 160 }, "x", 0, 120);
ramp2("core-east", { x: 2050, y: 1420, width: 350, height: 160 }, "x", 120, 0);
for (const [id, r] of [["core-west-mouth", { x: 1150, y: 1420, width: 170, height: 160 }], ["core-east-mouth", { x: 1880, y: 1420, width: 170, height: 160 }], ["core-north-mouth", { x: 1520, y: 1050, width: 160, height: 250 }], ["core-south-mouth", { x: 1520, y: 1750, width: 160, height: 200 }]]) deck5(id, r, 120);
for (const b of bridges) deck5(b.id, b, b.elevation);
ramp2("core-high-access", { x: 1400, y: 820, width: 130, height: 380 }, "y", 120, 240);
for (const b of bridges) {
  for (const side of ["north", "south", "west", "east"]) {
    const h = side === "north" || side === "south", start = h ? b.x : b.y, len = h ? b.width : b.height;
    let begin = null, n = 0;
    for (let t = 0; t <= len; t += 5) {
      const x = h ? start + t : b.x + (side === "east" ? b.width + 0.5 : -0.5), y = h ? b.y + (side === "south" ? b.height + 0.5 : -0.5) : start + t;
      const joined = bridges.some((r) => r !== b && r.elevation === b.elevation && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) || SCORCHED_SITES.some((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) || surfaces5.some((r) => r.ramp && Math.abs((r.ramp.axis === "y" ? Math.abs(y - r.y) < 2 ? r.ramp.from : Math.abs(y - r.y - r.height) < 2 ? r.ramp.to : -999 : -999) - b.elevation) < 0.1 && x >= r.x && x <= r.x + r.width && y >= r.y - 1 && y <= r.y + r.height + 1);
      const exposed = !joined && t < len;
      if (exposed && begin === null) begin = t;
      if (!exposed && begin !== null) {
        const a = start + begin, l = t - begin;
        block5(b.id + "-rail-" + side + "-" + n++, h ? { x: a, y: b.y + (side === "south" ? b.height - 5 : 0), width: l, height: 5 } : { x: b.x + (side === "east" ? b.width - 5 : 0), y: a, width: 5, height: l }, b.elevation, b.elevation + 25, "rail");
        begin = null;
      }
    }
  }
}
block5("research-observatory", { x: 1205, y: 245, width: 120, height: 120, shape: "ellipse" }, 240, 325, "barrier");
for (const x of [2460, 2570]) block5("power-stack-" + x, { x, y: 595, width: 40, height: 40, shape: "ellipse" }, 240, 420, "barrier");
for (const p of SCORCHED_PROPS) block5(p.id, p, p.bottom, p.top, p.kind === "crate" ? "crate" : "barrier");
var scorchedPoint = {
  id: "scorched_point",
  name: "Scorched Point",
  bounds: SP_BOUNDS,
  plaza: { x: 1150, y: 1050, width: 900, height: 900, shape: "ellipse" },
  blocks: blocks5,
  surfaces: surfaces5,
  ground: SCORCHED_GROUND,
  spawns: [{ x: 960, y: 440 }, { x: 810, y: 970 }, { x: 2150, y: 450 }, { x: 760, y: 1820 }, { x: 3e3, y: 1370 }, { x: 1900, y: 2690 }, { x: 850, y: 2490 }, { x: 2870, y: 2240 }],
  districts: [{ id: "crucible", name: "CENTRAL GEOTHERMAL CORE", x: 1600, y: 1500, accent: "#ff9c47" }, ...SCORCHED_SITES.map((b) => ({ id: b.id, name: b.name, x: b.x + b.width / 2, y: b.y + b.height / 2, accent: b.accent }))],
  minimapLabels: [{ text: "CORE", x: 1600, y: 1500 }, ...SCORCHED_SITES.map((b) => ({ text: b.number, x: b.x + b.width / 2, y: b.y + b.height / 2 }))],
  environment: { theme: "industrial", base: "#292724", fog: "#231b18", accent: "#f0964c", lava: "#ffae51", lighting: { sky: "#e0d8ca", ground: "#877768", sun: "#fff0da", points: [{ color: "#ff651c", x: 48, y: 8, z: 45, intensity: 50, distance: 25 }, { color: "#ff501c", x: 65, y: 4, z: 43, intensity: 30, distance: 20 }, { color: "#ff6225", x: 30, y: 3, z: 60, intensity: 30, distance: 20 }, { color: "#abcbd5", x: 44, y: 4, z: 13, intensity: 15, distance: 13 }] } }
};

// shared/map.ts
var MAPS = { central_plaza: centralPlaza, scorched_point: scorchedPoint, aerie_sky_port: aerieSkyPort, outlaws_canyon: outlawsCanyon, vikings_fjord: vikingsFjord };
var ACTIVE_MAP = MAPS.central_plaza;
var WORLD = ACTIVE_MAP.bounds;
var BUILDINGS = ACTIVE_MAP.blocks;
var SPAWNS = ACTIVE_MAP.spawns;
var PLAZA = ACTIVE_MAP.plaza;

// shared/traversal.ts
var TRAVERSAL = { radius: 14, bodyHeight: 60, maxStep: 3.5, maxSlope: 0.4 };
function inside2(p, r, padding = 0) {
  if (r.shape === "ellipse") {
    const rx = r.width / 2 + padding, ry = r.height / 2 + padding;
    return rx > 0 && ry > 0 && ((p.x - r.x - r.width / 2) / rx) ** 2 + ((p.y - r.y - r.height / 2) / ry) ** 2 <= 1 + 1e-8;
  }
  return p.x >= r.x - padding && p.x <= r.x + r.width + padding && p.y >= r.y - padding && p.y <= r.y + r.height + padding;
}
function groundSupport(p, map) {
  if (!map.ground) return true;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, point = { x: p.x + Math.cos(a) * TRAVERSAL.radius, y: p.y + Math.sin(a) * TRAVERSAL.radius };
    if (!map.ground.some((r) => inside2(point, r))) return false;
  }
  return true;
}
function surfaceHeight(s, p) {
  if (!s.ramp) return s.elevation;
  const distance = s.ramp.axis === "x" ? (p.x - s.x) / s.width : (p.y - s.y) / s.height;
  return s.ramp.from + (s.ramp.to - s.ramp.from) * Math.max(0, Math.min(1, distance));
}
function blockedAt(p, map = ACTIVE_MAP) {
  const z = p.elevation ?? 0, r = TRAVERSAL.radius;
  if (p.x < r || p.y < r || p.x > map.bounds.width - r || p.y > map.bounds.height - r || z < 0) return true;
  if (map.blocks.some((b) => inside2(p, b, b.kind === "deck" ? 0 : r - 1e-3) && z < b.top - 1e-3 && z + TRAVERSAL.bodyHeight > b.bottom + 1e-3)) return true;
  return map.surfaces.some((s) => s.ramp && inside2(p, s) && z < surfaceHeight(s, p) - 0.01);
}
function supported(p, map = ACTIVE_MAP) {
  const z = p.elevation ?? 0;
  return z === 0 ? groundSupport(p, map) : map.surfaces.some((s) => inside2(p, s) && Math.abs(surfaceHeight(s, p) - z) < 0.02);
}
function walkable(p, map = ACTIVE_MAP) {
  return supported(p, map) && !blockedAt(p, map);
}
function nextPosition(previous, x, y, map = ACTIVE_MAP) {
  const prior = previous.elevation ?? 0, point = { x, y };
  const heights = [0, ...map.surfaces.filter((s) => inside2(point, s)).map((s) => surfaceHeight(s, point))];
  for (const elevation of [...new Set(heights)].sort((a, b) => b - a)) {
    if (Math.abs(elevation - prior) > TRAVERSAL.maxStep + 1e-6) continue;
    const candidate = { x, y, elevation };
    if (walkable(candidate, map)) return candidate;
  }
  return null;
}

// shared/game.ts
var ARENA = { ...WORLD, radius: TRAVERSAL.radius, speed: 220 };
var STEP = 1 / 30;
var MAX_PLAYERS = 6;
var RECONNECT_MS = 1e4;
var NETWORK = { inputTimeoutMs: 300, maxInputAdvance: 120, resumeRetryMs: 1e3, resumeAttempts: 15 };
var COLORS = ["#60cfff", "#ffbc66", "#b6a2ff", "#77d8a4", "#ff8da5", "#e9df78"];
var MOVEMENT = { sprintMultiplier: 1.5, staminaMax: 100, staminaDrain: 28, staminaRegen: 22, regenDelay: 0.6, dashSpeed: 850, dashDuration: 0.18, dashCooldown: 3 };
var JUMP = { velocity: 300, gravity: 900 };
function freshMotion(position) {
  return { ...position, jumpOrigin: { ...position, elevation: position.elevation ?? 0 }, jumpSeen: 0, airborne: false, verticalVelocity: 0, crouched: false, traversalState: "idle", elevation: position.elevation ?? 0, stamina: MOVEMENT.staminaMax, regenWait: 0, exhausted: false, dashCooldown: 0, dashRemaining: 0, dashX: 0, dashY: 1, facingX: 0, facingY: 1, dashSeen: 0, sprinting: false };
}
function isWalkable(p, map = ACTIVE_MAP) {
  return walkable(p, map);
}
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
  s.crouched = !!input.crouch;
  const jump = input.jumpId ?? s.jumpSeen ?? 0;
  if (jump > (s.jumpSeen ?? 0)) {
    s.jumpSeen = jump;
    if (!s.airborne && walkable(s, map)) {
      s.airborne = true;
      s.verticalVelocity = JUMP.velocity;
      s.jumpOrigin = { x: s.x, y: s.y, elevation: s.elevation };
    }
  }
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
  if (!input.sprint) s.exhausted = false;
  const dashId = input.dashId ?? s.dashSeen;
  if (dashId > s.dashSeen) {
    s.dashSeen = dashId;
    if (s.dashCooldown <= 0 && (input.dashStyle !== "slide" || length > 0)) {
      s.traversalState = input.dashStyle ?? "dash";
      s.dashCooldown = MOVEMENT.dashCooldown;
      s.dashRemaining = s.traversalState === "slide" ? 0.42 : s.traversalState === "dodge" ? 0.24 : MOVEMENT.dashDuration;
      s.dashX = length > 0 ? dx : s.facingX;
      s.dashY = length > 0 ? dy : s.facingY;
    }
  }
  s.sprinting = !!input.sprint && length > 0 && !s.exhausted && s.stamina > 0 && s.dashRemaining <= 0;
  if (s.sprinting) {
    s.stamina = Math.max(0, s.stamina - MOVEMENT.staminaDrain * dt);
    s.regenWait = MOVEMENT.regenDelay;
    if (s.stamina === 0) s.exhausted = true;
  } else if (s.regenWait <= 0) s.stamina = Math.min(MOVEMENT.staminaMax, s.stamina + MOVEMENT.staminaRegen * dt);
  const travel = (dx2, dy2, time, speed) => {
    if (!s.airborne) return move(s, dx2, dy2, time, speed, map);
    let p = { x: s.x, y: s.y, elevation: s.elevation };
    const steps = Math.max(1, Math.ceil(speed * time / 5));
    for (let i = 0; i < steps; i++) {
      for (const axis of ["x", "y"]) {
        const q = { ...p, [axis]: p[axis] + (axis === "x" ? dx2 : dy2) * speed * time / steps };
        if (!blockedAt(q, map)) p = q;
      }
    }
    return p;
  };
  let pos;
  if (s.dashRemaining > 0) {
    const time = Math.min(dt, s.dashRemaining);
    pos = travel(s.dashX, s.dashY, time, s.traversalState === "slide" ? 400 : s.traversalState === "dodge" ? 580 : MOVEMENT.dashSpeed);
    s.dashRemaining = Math.max(0, s.dashRemaining - dt);
  } else pos = travel(dx, dy, dt, ARENA.speed * (s.sprinting ? MOVEMENT.sprintMultiplier : 1));
  if (s.dashRemaining <= 0) s.traversalState = s.sprinting ? "sprint" : length > 0 ? "walk" : "idle";
  if (s.airborne) {
    const old = s.elevation;
    s.verticalVelocity = (s.verticalVelocity ?? 0) - JUMP.gravity * dt;
    const next = old + s.verticalVelocity * dt;
    const landings = [0, ...map.surfaces.filter((v) => inside2(pos, v)).map((v) => surfaceHeight(v, pos))].sort((a, b) => b - a);
    const floor4 = s.verticalVelocity <= 0 ? landings.find((z) => z <= old + 0.01 && z >= next - 0.01 && walkable({ ...pos, elevation: z }, map)) : void 0;
    if (floor4 !== void 0) {
      pos.elevation = floor4;
      s.airborne = false;
      s.verticalVelocity = 0;
    } else if (next < 0) {
      pos = s.jumpOrigin ?? pos;
      s.airborne = false;
      s.verticalVelocity = 0;
    } else {
      const steps = Math.max(1, Math.ceil(Math.abs(next - old) / 3));
      let z = old;
      for (let i = 0; i < steps; i++) {
        const candidate = z + (next - old) / steps;
        if (blockedAt({ ...pos, elevation: candidate }, map)) {
          if ((s.verticalVelocity ?? 0) < 0) {
            pos = s.jumpOrigin ?? pos;
            z = pos.elevation ?? 0;
            s.airborne = false;
          }
          s.verticalVelocity = 0;
          break;
        }
        z = candidate;
      }
      pos.elevation = z;
    }
    if (s.airborne && s.dashRemaining <= 0) s.traversalState = (s.verticalVelocity ?? 0) > 0 ? "jump" : "fall";
  }
  if (!s.airborne && s.crouched && s.dashRemaining <= 0) s.traversalState = "crouch";
  return { ...s, ...pos, elevation: pos.elevation ?? 0 };
}

// shared/combat.ts
var COMBAT = { chestHeight: 30, maxHealth: 100, damage: 25, range: 80, halfAngle: Math.PI / 3, cooldown: 0.6, respawnDelay: 5, protection: 1.5, attackFlash: 0.15, hitFlash: 0.2 };
function freshCombat() {
  return { health: COMBAT.maxHealth, koRemaining: 0, protection: 0, attackCooldown: 0, attackSeen: 0, attackFlash: 0, hitFlash: 0, attackX: 0, attackY: 1, spawnVersion: 0 };
}
function clearAttackLine(a, b, map = ACTIVE_MAP) {
  const az = (a.elevation ?? 0) + COMBAT.chestHeight, bz = (b.elevation ?? 0) + COMBAT.chestHeight;
  const hit = map.blocks.some((w) => {
    if (w.shape === "ellipse") {
      const steps2 = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, bz - az) / 2));
      for (let i = 0; i <= steps2; i++) {
        const t = i / steps2, z = az + (bz - az) * t;
        if (z >= w.bottom && z <= w.top && inside2({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, w)) return true;
      }
      return false;
    }
    let enter = 0, exit = 1;
    for (const [start, delta, min, max] of [[a.x, b.x - a.x, w.x, w.x + w.width], [a.y, b.y - a.y, w.y, w.y + w.height], [az, bz - az, w.bottom, w.top]]) {
      if (Math.abs(delta) < 1e-9) {
        if (start < min || start > max) return false;
        continue;
      }
      const t1 = (min - start) / delta, t2 = (max - start) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
      if (enter > exit) return false;
    }
    return enter <= exit;
  });
  if (hit) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, bz - az) / 4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, z = az + (bz - az) * t;
    if (map.surfaces.some((s) => s.ramp && inside2(p, s) && z >= 0 && z <= surfaceHeight(s, p))) return false;
  }
  return true;
}
function canHit(a, b, aimX, aimY, map = ACTIVE_MAP) {
  const dx = b.x - a.x, dy = b.y - a.y, horizontal = Math.hypot(dx, dy), distance = Math.hypot(dx, dy, (b.elevation ?? 0) - (a.elevation ?? 0)), length = Math.hypot(aimX, aimY);
  if (distance > COMBAT.range || length < 1e-6) return false;
  return (horizontal < 1e-6 || (dx * aimX + dy * aimY) / (horizontal * length) >= Math.cos(COMBAT.halfAngle)) && clearAttackLine(a, b, map);
}
function safeSpawn(others, map = ACTIVE_MAP) {
  let best = map.spawns[0], score = -1;
  for (const point of map.spawns) {
    if (!isWalkable(point, map)) continue;
    const clearance = others.length ? Math.min(...others.map((p) => Math.hypot(p.x - point.x, p.y - point.y))) : Infinity;
    if (clearance > score) {
      best = point;
      score = clearance;
    }
  }
  return { ...best };
}

// shared/loot.ts
var CHEST_OPEN_MS = 420;
var pickupPosition = (item) => item.pickupPosition ?? item;
function usableDistance(mapId, a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.elevation ?? 0) - (b.elevation ?? 0)) <= RULES.pickupRange && clearAttackLine(a, b, MAPS[mapId]);
}
function interactionItem(items, mapId, p) {
  return items.filter((i) => (i.state === "closed" || i.state === "opened" && !!i.kind) && usableDistance(mapId, p, i.state === "closed" ? i : pickupPosition(i))).sort((a, b) => Math.hypot(pickupPosition(a).x - p.x, pickupPosition(a).y - p.y) - Math.hypot(pickupPosition(b).x - p.x, pickupPosition(b).y - p.y))[0];
}

// shared/map-anchors.ts
var captures = { central_plaza: { x: 1620, y: 1450, elevation: 110 }, scorched_point: { x: 1400, y: 1500, elevation: 120 }, aerie_sky_port: { x: 1100, y: 1200 }, outlaws_canyon: { x: 900, y: 400 }, vikings_fjord: { x: 1470, y: 1800, elevation: 120 } };
function mapAnchors(id) {
  const map = MAPS[id];
  if (!map) throw new Error(`Unknown map ${id}`);
  const requested = captures[id];
  let capture;
  for (let radius = 0; radius <= 300 && !capture; radius += 25) for (let i = 0; i < 16 && !capture; i++) {
    const point = { x: requested.x + Math.cos(i * Math.PI / 8) * radius, y: requested.y + Math.sin(i * Math.PI / 8) * radius, elevation: requested.elevation ?? 0 };
    if (walkable(point, map)) capture = point;
  }
  if (!capture) throw new Error(`No valid capture zone for ${id}`);
  const points = map.spawns.filter((p) => walkable(p, map)).map((p) => ({ ...p }));
  return { capture, respawns: points, chests: points.filter((_, i) => i % 2 === 0), floor: points.filter((_, i) => i % 2 === 1), flags: points.filter((p) => Math.hypot(p.x - capture.x, p.y - capture.y) > 250) };
}

// server/modes.ts
var key = (r, p) => teamKey(r.mode, p.id);
var keys = (r) => [...new Set(Object.values(r.mode.teams))];
var noOp = () => {
};
function leaders(room) {
  const max = Math.max(...keys(room).map((k) => room.mode.scores[k] ?? 0));
  return keys(room).filter((k) => (room.mode.scores[k] ?? 0) === max);
}
var MODE_RULES = {
  tag: { loot: ["freeze_ball"], combat: false, init: ({ room }) => {
    const candidates = keys(room);
    room.mode.it = candidates[randomInt(candidates.length)];
  }, tick: ({ room }) => {
    const active = room.players.filter((p) => p.socket);
    if (!room.players.some((p) => key(room, p) === room.mode.it) && active.length) room.mode.it = key(room, active[0]);
    return false;
  }, hit: ({ room, now }, a, b) => {
    if (key(room, a) === room.mode.it && now >= room.mode.tagAfter) {
      room.mode.it = key(room, b);
      room.mode.tagAfter = now + RULES.retagGraceMs;
    }
  }, finish: ({ room }) => {
    room.mode.winnerKeys = keys(room).filter((k) => k !== room.mode.it && room.players.some((p) => key(room, p) === k));
    room.mode.reason = "Time expired \u2014 the IT side loses.";
  } },
  kill_race: { loot: ["blade", "hammer"], combat: true, init: noOp, tick: ({ room }) => room.selectedFormat === "duo" && Object.values(room.mode.scores).some((n) => n >= RULES.killTarget), finish: ({ room }) => {
    room.mode.winnerKeys = leaders(room);
    room.mode.reason = Object.values(room.mode.scores).some((n) => n >= RULES.killTarget) && room.selectedFormat === "duo" ? "Elimination target reached." : "Time expired \u2014 highest elimination score wins. Ties share the win.";
  } },
  flag_run: { loot: ["blade", "hammer"], combat: true, init: ({ room, now }) => {
    const anchors = mapAnchors(room.mapId);
    room.mode.flag = { state: "not_spawned", carrier: null, position: anchors.flags[randomInt(anchors.flags.length)], spawnAt: now + RULES.flagSpawnMs };
  }, tick: ({ room, now }) => {
    const f = room.mode.flag;
    if (f.state === "not_spawned" && now >= f.spawnAt) f.state = "spawned";
    if (f.state === "carried") {
      const p = room.players.find((p2) => p2.id === f.carrier);
      if (!p || !p.socket || p.health <= 0) {
        dropFlag(room, p);
        return false;
      }
      f.position = { x: p.x, y: p.y, elevation: p.elevation };
      if (near(room, p, room.mode.capture)) {
        f.state = "captured";
        room.mode.winnerKeys = [key(room, p)];
        return true;
      }
    }
    return false;
  }, finish: ({ room }) => {
    room.mode.reason = room.mode.flag.state === "captured" ? "Flag delivered \u2014 capture wins." : "Time expired without a capture \u2014 no round winner.";
  } }
};
function beginMode(room, now) {
  const prior = room.mode;
  room.mode = emptyMode();
  room.mode.teams = prior.teams;
  room.mode.matchPoints = prior.matchPoints;
  for (const k of keys(room)) room.mode.scores[k] = 0;
  const anchors = mapAnchors(room.mapId);
  room.mode.capture = anchors.capture;
  const loot = MODE_RULES[room.selectedGameMode].loot;
  room.mode.items = [...anchors.chests.map((p, i) => ({ ...p, id: `chest-${i}`, source: "chest", state: "closed", kind: null, refreshAt: 0 })), ...anchors.floor.map((p, i) => ({ ...p, id: `floor-${i}`, source: "floor", state: "opened", kind: loot[randomInt(loot.length)], refreshAt: 0 }))];
  for (const p of room.players) {
    p.frozenUntil = 0;
    clearInventory(p);
  }
  MODE_RULES[room.selectedGameMode].init({ room, now });
}
function assignTeams(room) {
  room.mode = emptyMode();
  room.players.forEach((p, i) => {
    room.mode.teams[p.id] = room.selectedFormat === "duo" ? `team-${Math.floor(i / 2) + 1}` : p.id;
  });
}
function enemies(room, a, b) {
  return a.id !== b.id && key(room, a) !== key(room, b);
}
function near(room, a, b, range = RULES.pickupRange) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.elevation ?? 0) - (b.elevation ?? 0)) <= range && clearAttackLine(a, b, MAPS[room.mapId]);
}
function interact(room, p, now) {
  if (!p.socket || p.health <= 0 || p.frozenUntil > now) return;
  const flag = room.mode.flag;
  if (room.selectedGameMode === "flag_run" && ["spawned", "dropped"].includes(flag.state) && near(room, p, flag.position)) {
    flag.state = "carried";
    flag.carrier = p.id;
    return;
  }
  const item = interactionItem(room.mode.items, room.mapId, p);
  if (!item) return;
  if (item.state === "closed") {
    const loot = MODE_RULES[room.selectedGameMode].loot;
    item.kind = loot[randomInt(loot.length)];
    item.state = "opening";
    item.openedAt = now;
    item.pickupPosition = { x: item.x, y: item.y, elevation: item.elevation };
    for (let radius = 28; radius >= 14; radius -= 7) {
      let found = false;
      for (let i = 0; i < 16; i++) {
        const candidate = { x: item.x + Math.cos(i * Math.PI / 8) * radius, y: item.y + Math.sin(i * Math.PI / 8) * radius, elevation: item.elevation ?? 0 };
        if (isWalkable(candidate, MAPS[room.mapId]) && clearAttackLine(item, candidate, MAPS[room.mapId])) {
          item.pickupPosition = candidate;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    return;
  }
  if (item.kind) pickup(p, item.kind);
  item.kind = null;
  item.state = "empty";
  item.refreshAt = now + RULES.itemRespawnMs;
}
function dropFlag(room, p) {
  const f = room.mode.flag;
  if (f.state !== "carried" || p && f.carrier !== p.id) return;
  if (p) f.position = { x: p.x, y: p.y, elevation: p.elevation };
  if (p?.selectedSlot === 2) {
    p.selectedSlot = 1;
    p.heldItem = p.inventory?.weapon ?? null;
  }
  f.carrier = null;
  f.state = "dropped";
}
function onElimination(room, killer, victim) {
  dropFlag(room, victim);
  clearInventory(victim);
  victim.frozenUntil = 0;
  killer.eliminations++;
  killer.matchEliminations++;
  room.mode.scores[key(room, killer)] = (room.mode.scores[key(room, killer)] ?? 0) + 1;
}
function throwBall(room, p, now) {
  if (p.heldItem !== "freeze_ball") return false;
  consumeUtility(p);
  room.mode.projectiles.push({ id: randomUUID(), ownerId: p.id, teamId: key(room, p), x: p.x, y: p.y, elevation: p.elevation, dx: p.attackX, dy: p.attackY, expiresAt: now + RULES.ballLifetimeMs, bornAt: now });
  room.mode.effects.push({ id: randomUUID(), type: "throw", at: now, ownerId: p.id, x: p.x, y: p.y, elevation: p.elevation, dx: p.attackX, dy: p.attackY });
  return true;
}
function tickMode(room, now, dt) {
  room.mode.effects = room.mode.effects.filter((e) => now - e.at < 1e3).slice(-48);
  for (const item of room.mode.items) if (item.state === "opening" && now >= (item.openedAt ?? now) + CHEST_OPEN_MS) item.state = "opened";
  for (const item of room.mode.items) if (item.source === "floor" && item.state === "empty" && now >= item.refreshAt) {
    const loot = MODE_RULES[room.selectedGameMode].loot;
    item.kind = loot[randomInt(loot.length)];
    item.state = "opened";
  }
  room.mode.projectiles = room.mode.projectiles.filter((ball) => {
    if (now >= ball.expiresAt) return false;
    const start = { x: ball.x, y: ball.y, elevation: ball.elevation };
    const end = { x: ball.x + ball.dx * RULES.ballSpeed * dt, y: ball.y + ball.dy * RULES.ballSpeed * dt, elevation: ball.elevation };
    if (!clearAttackLine(start, end, MAPS[room.mapId])) {
      room.mode.effects.push({ id: randomUUID(), type: "ice_wall", at: now, ownerId: ball.ownerId, ...start, dx: ball.dx, dy: ball.dy });
      return false;
    }
    const targets = room.players.filter((p) => p.socket && p.health > 0 && p.id !== ball.ownerId && key(room, p) !== ball.teamId).map((p) => {
      const vx = end.x - start.x, vy = end.y - start.y, t = Math.max(0, Math.min(1, ((p.x - start.x) * vx + (p.y - start.y) * vy) / (vx * vx + vy * vy || 1)));
      return { p, t, point: { x: start.x + vx * t, y: start.y + vy * t, elevation: ball.elevation } };
    }).filter(({ p, point }) => near(room, p, point, 30)).sort((a, b) => a.t - b.t);
    if (targets[0]) {
      targets[0].p.frozenUntil = now + RULES.freezeMs;
      targets[0].p.dashRemaining = 0;
      room.mode.effects.push({ id: randomUUID(), type: "ice_hit", at: now, ownerId: ball.ownerId, targetId: targets[0].p.id, ...targets[0].point, dx: ball.dx, dy: ball.dy });
      return false;
    }
    Object.assign(ball, end);
    return true;
  });
  return MODE_RULES[room.selectedGameMode].tick({ room, now });
}
function finishMode(room, now) {
  MODE_RULES[room.selectedGameMode].finish({ room, now });
  for (const k of room.mode.winnerKeys) room.mode.matchPoints[k] = (room.mode.matchPoints[k] ?? 0) + 1;
  room.mode.projectiles = [];
}

// server/rooms.ts
import { randomBytes, randomUUID as randomUUID2, randomInt as randomInt2 } from "node:crypto";

// shared/rounds.ts
var ROUND = { durationMs: 9e4, resultsMs: 5e3 };
var MATCH = { rounds: 3 };
function emptyMatch() {
  return { id: "", roundNumber: 0, totalRounds: MATCH.rounds, nextRoundSeconds: 0, results: [], winners: [], history: [], mapHistory: [] };
}

// shared/map-rotation.ts
var OPENING_MAP_ID = "central_plaza";
function selectRoundMap(roundNumber, previous, chooseIndex, registry = MAPS) {
  const ids = Object.keys(registry);
  if (!ids.length) throw new Error("No playable maps registered");
  if (roundNumber === 1) return registry[OPENING_MAP_ID] ? OPENING_MAP_ID : ids[0];
  const alternatives = ids.filter((id) => id !== previous), pool = alternatives.length ? alternatives : ids;
  return pool[chooseIndex(pool.length)];
}
function selectMapVariant(mapId, chooseIndex) {
  const variants = Object.keys(MAPS[mapId]?.variants ?? {});
  return variants.length ? variants[chooseIndex(variants.length)] : null;
}

// server/rooms.ts
var mapFor = (room) => MAPS[room.mapId] ?? ACTIVE_MAP;
var RoomServer = class {
  // Retain the original Bounty behavior for regression coverage and future mode integration.
  constructor(legacyBounty = false) {
    this.legacyBounty = legacyBounty;
  }
  rooms = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  send(ws, message) {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        this.disconnect(ws);
      }
    }
  }
  view(room, recipient) {
    const target = room.players.find((p) => p.id === recipient?.targetId);
    return { selection: room.selection, selectedGameMode: room.selectedGameMode, selectedFormat: room.selectedFormat, mode: room.mode, mapId: room.mapId, mapVariant: room.mapVariant, nextMapId: room.nextMapId, nextMapVariant: room.nextMapVariant, match: room.match, round: room.round, objective: { target: target ? { id: target.id, name: target.name } : null, eliminations: recipient?.eliminations ?? 0, matchEliminations: recipient?.matchEliminations ?? 0 }, code: room.code, hostId: room.hostId, phase: room.phase, tick: room.tick, notice: room.notice, serverTime: Date.now(), players: room.players.map((p) => ({ characterId: p.characterId, characterAutoAssigned: p.characterAutoAssigned, jumpSeen: p.jumpSeen, airborne: p.airborne, verticalVelocity: p.verticalVelocity, jumpOrigin: p.jumpOrigin, crouched: p.crouched, inventory: p.inventory, selectedSlot: p.selectedSlot, traversalState: p.traversalState, frozenUntil: p.frozenUntil, heldItem: p.heldItem, id: p.id, name: p.name, color: p.color, ready: p.ready, connected: !!p.socket, x: p.x, y: p.y, elevation: p.elevation, ack: p.ack, stamina: p.stamina, regenWait: p.regenWait, exhausted: p.exhausted, dashCooldown: p.dashCooldown, dashRemaining: p.dashRemaining, dashX: p.dashX, dashY: p.dashY, facingX: p.facingX, facingY: p.facingY, dashSeen: p.dashSeen, sprinting: p.sprinting, health: p.health, koRemaining: p.koRemaining, protection: p.protection, attackCooldown: p.attackCooldown, attackSeen: p.attackSeen, attackFlash: p.attackFlash, hitFlash: p.hitFlash, attackX: p.attackX, attackY: p.attackY, spawnVersion: p.spawnVersion })) };
  }
  broadcast(room) {
    for (const p of room.players) if (p.socket) this.send(p.socket, { type: "state", room: this.view(room, p) });
  }
  fail(ws, message, fatal = false) {
    this.send(ws, { type: "error", message, fatal });
  }
  name(value) {
    if (typeof value !== "string") return null;
    const s = value.trim().replace(/\s+/g, " ");
    return /^[\p{L}\p{N} _.-]{1,20}$/u.test(s) ? s : null;
  }
  message(ws, raw) {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      this.fail(ws, "Invalid message.");
      return;
    }
    if (!m || typeof m !== "object" || Array.isArray(m)) return;
    if (m.type === "ping") {
      this.send(ws, { type: "pong" });
      return;
    }
    const session = this.sessions.get(ws);
    if (["create", "join", "resume"].includes(m.type)) {
      if (session) {
        this.fail(ws, "Leave your current room first.");
        return;
      }
      if (m.type === "resume") {
        const room3 = typeof m.code === "string" ? this.rooms.get(m.code) : void 0;
        const p3 = room3?.players.find((p4) => typeof m.token === "string" && p4.token === m.token);
        if (!room3 || !p3 || !p3.socket && Date.now() - p3.disconnectedAt > RECONNECT_MS) {
          this.fail(ws, "Your room session expired. Create or join a room again.", true);
          return;
        }
        if (p3.socket) {
          this.send(ws, { type: "error", message: "This player is already connected. Waiting for the previous connection to close; close any duplicate tab.", retryable: true });
          return;
        }
        p3.socket = ws;
        p3.disconnectedAt = 0;
        p3.lastInput = 0;
        p3.dx = 0;
        p3.dy = 0;
        p3.seq = p3.ack;
        p3.sprint = false;
        p3.dashId = p3.dashSeen;
        p3.jumpId = p3.jumpSeen ?? 0;
        p3.crouch = false;
        p3.attackId = p3.attackSeen;
        p3.aimX = 0;
        p3.aimY = 0;
        this.sessions.set(ws, { room: room3, player: p3 });
        if (!room3.players.some((x) => x.id === room3.hostId && x.socket)) room3.hostId = p3.id;
        if (room3.phase === "match_loading" && room3.selection) room3.selection.preparedIds = room3.selection.preparedIds.filter((id) => id !== p3.id);
        this.send(ws, { type: "welcome", id: p3.id, token: p3.token, room: this.view(room3, p3) });
        this.broadcast(room3);
        return;
      }
      const name = this.name(m.name);
      if (!name) {
        this.fail(ws, "Use 1\u201320 letters, numbers, spaces, periods, hyphens, or underscores.");
        return;
      }
      let room2;
      if (m.type === "create") {
        if (this.rooms.size >= 100) {
          this.fail(ws, "Server is full. Please try again later.");
          return;
        }
        let code;
        do {
          code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
        } while (this.rooms.has(code));
        room2 = { selection: null, selectedGameMode: "tag", selectedFormat: "solo", mode: emptyMode(), mapId: OPENING_MAP_ID, mapVariant: null, nextMapId: null, nextMapVariant: null, code, hostId: "", phase: "lobby", match: emptyMatch(), round: { endsAt: 0, remainingSeconds: 0, returnAt: 0, results: [] }, roster: [], players: [], tick: 0, notice: "" };
        this.rooms.set(code, room2);
      } else {
        const code = typeof m.code === "string" ? m.code.trim().toUpperCase() : "";
        room2 = this.rooms.get(code);
        if (!room2) {
          this.fail(ws, "Room not found. Check the six-character code.");
          return;
        }
        if (room2.phase !== "lobby") {
          this.fail(ws, "This test is already running. Ask the host to return to the lobby.");
          return;
        }
        if (room2.players.length >= MAX_PLAYERS) {
          this.fail(ws, "This room is full (6 players).");
          return;
        }
        if (room2.players.some((p3) => p3.name.toLowerCase() === name.toLowerCase())) {
          this.fail(ws, "That name is already in this room. Choose another name.");
          return;
        }
      }
      const color = COLORS.find((c) => !room2.players.some((p3) => p3.color === c)) || COLORS[0];
      const p2 = { characterId: null, characterAutoAssigned: false, jumpId: 0, crouch: false, inventory: { weapon: null, utility: null }, selectedSlot: 1, dashStyle: "dash", frozenUntil: 0, heldItem: null, targetId: null, eliminations: 0, matchEliminations: 0, ...freshMotion(mapFor(room2).spawns[0]), ...freshCombat(), sprint: false, dashId: 0, attackId: 0, aimX: 0, aimY: 0, id: randomUUID2(), token: randomBytes(24).toString("hex"), name, color, ready: false, ack: 0, seq: 0, dx: 0, dy: 0, lastInput: 0, disconnectedAt: 0, socket: ws };
      room2.players.push(p2);
      if (!room2.hostId) room2.hostId = p2.id;
      room2.notice = "";
      this.sessions.set(ws, { room: room2, player: p2 });
      this.send(ws, { type: "welcome", id: p2.id, token: p2.token, room: this.view(room2, p2) });
      this.broadcast(room2);
      return;
    }
    if (!session) {
      if (m.type === "leave") {
        this.send(ws, { type: "left" });
        return;
      }
      this.fail(ws, "Join a room first.");
      return;
    }
    const { room, player: p } = session;
    if (this.rooms.get(room.code) !== room || !room.players.includes(p) || p.socket !== ws) {
      this.sessions.delete(ws);
      this.fail(ws, "Your room session expired.", true);
      return;
    }
    if (m.type === "leave") {
      this.remove(room, p);
      this.send(ws, { type: "left" });
      return;
    }
    if (m.type === "ready" && room.phase === "lobby" && typeof m.ready === "boolean") {
      p.ready = m.ready;
      this.broadcast(room);
      return;
    }
    if (m.type === "settings") {
      if (room.hostId !== p.id) {
        this.fail(ws, "Only the host can change mode and format.");
        return;
      }
      if (room.phase !== "lobby") {
        this.fail(ws, "Match settings are locked until the lobby.");
        return;
      }
      if (!validMode(m.mode) || !validFormat(m.format)) {
        this.fail(ws, "Invalid mode or format.");
        return;
      }
      if (room.selectedGameMode !== m.mode || room.selectedFormat !== m.format) {
        room.selectedGameMode = m.mode;
        room.selectedFormat = m.format;
        for (const player of room.players) player.ready = false;
        room.notice = "Settings changed. Ready up for the selected rules.";
      }
      this.broadcast(room);
      return;
    }
    if (m.type === "choose_character") {
      const now = Date.now();
      if (room.phase !== "character_selection" || !room.selection || m.matchId !== room.match.id || !isCharacterId(m.characterId) || !room.roster.includes(p)) return;
      if (now >= room.selection.deadline) {
        this.resolveCharacters(room, now);
        return;
      }
      if (p.characterId) return;
      p.characterId = m.characterId;
      p.characterAutoAssigned = false;
      this.resolveCharacters(room, now);
      this.broadcast(room);
      return;
    }
    if (m.type === "character_prepared") {
      if (room.phase !== "match_loading" || !room.selection || m.matchId !== room.match.id || !p.characterId) return;
      if (!room.selection.preparedIds.includes(p.id)) room.selection.preparedIds.push(p.id);
      this.resolveCharacters(room, Date.now());
      this.broadcast(room);
      return;
    }
    if (m.type === "equip") {
      if (room.phase === "arena" && m.matchId === room.match.id && m.roundNumber === room.match.roundNumber && Date.now() < room.round.endsAt && p.health > 0 && p.frozenUntil <= Date.now() && [1, 2, 3].includes(m.slot)) {
        equip(p, m.slot, room.mode.flag.state === "carried" && room.mode.flag.carrier === p.id);
        this.broadcast(room);
      }
      return;
    }
    if (m.type === "interact") {
      if (room.phase === "arena" && m.matchId === room.match.id && m.roundNumber === room.match.roundNumber && Date.now() < room.round.endsAt) {
        interact(room, p, Date.now());
        this.broadcast(room);
      }
      return;
    }
    if (m.type === "start") {
      if (room.hostId !== p.id) {
        this.fail(ws, "Only the host can start the test.");
        return;
      }
      if (room.phase !== "lobby") return;
      if (room.players.length < 2 || room.players.some((p2) => !p2.socket || !p2.ready)) {
        this.fail(ws, "At least two connected players are needed, and everyone must be ready.");
        return;
      }
      if (!validMode(room.selectedGameMode) || !validTeams(room.selectedFormat, room.players.length)) {
        this.fail(ws, "Duos require exactly 4 or 6 players.");
        return;
      }
      assignTeams(room);
      room.match = { ...emptyMatch(), id: randomUUID2() };
      room.roster = [...room.players];
      for (const p2 of room.players) p2.matchEliminations = 0;
      const now = Date.now();
      room.notice = "";
      room.phase = "character_selection";
      room.selection = { startedAt: now, deadline: now + SELECTION.chooseMs, expiresAt: now + SELECTION.totalMs, loadingAt: null, preparedIds: [] };
      for (const player of room.players) {
        player.characterId = null;
        player.characterAutoAssigned = false;
        player.dx = 0;
        player.dy = 0;
        player.sprint = false;
      }
      this.broadcast(room);
      return;
    }
    if (m.type === "lobby") {
      if (room.hostId !== p.id) {
        this.fail(ws, "Only the host can return everyone to the lobby.");
        return;
      }
      this.toLobby(room, "Host returned the room to the lobby.");
      return;
    }
    if (m.type === "input" && room.phase === "arena") {
      if (m.matchId !== room.match.id || m.roundNumber !== room.match.roundNumber || Date.now() >= room.round.endsAt) return;
      if (!Number.isSafeInteger(m.seq) || m.seq <= p.seq || m.seq > p.seq + NETWORK.maxInputAdvance || !Number.isFinite(m.dx) || !Number.isFinite(m.dy) || Math.abs(m.dx) > 1 || Math.abs(m.dy) > 1) return;
      if (m.crouch !== void 0 && typeof m.crouch !== "boolean") return;
      if (m.jumpId !== void 0 && (!Number.isSafeInteger(m.jumpId) || m.jumpId < p.jumpId || m.jumpId > p.jumpId + NETWORK.maxInputAdvance)) return;
      if (m.sprint !== void 0 && typeof m.sprint !== "boolean") return;
      if (m.dashId !== void 0 && (!Number.isSafeInteger(m.dashId) || m.dashId < p.dashId || m.dashId > p.dashId + NETWORK.maxInputAdvance)) return;
      if (m.attackId !== void 0 && (!Number.isSafeInteger(m.attackId) || m.attackId < p.attackId || m.attackId > p.attackId + NETWORK.maxInputAdvance)) return;
      if (m.aimX !== void 0 && (!Number.isFinite(m.aimX) || Math.abs(m.aimX) > 1) || m.aimY !== void 0 && (!Number.isFinite(m.aimY) || Math.abs(m.aimY) > 1)) return;
      if (m.dashStyle !== void 0 && !["dash", "dodge", "slide"].includes(m.dashStyle)) return;
      p.jumpId = m.jumpId ?? p.jumpId;
      p.crouch = m.crouch ?? false;
      p.dashStyle = m.dashStyle ?? "dash";
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
  toLobby(room, notice) {
    if (room.phase === "lobby") {
      this.broadcast(room);
      return;
    }
    room.selection = null;
    room.mode = emptyMode();
    room.match = emptyMatch();
    room.round = { endsAt: 0, remainingSeconds: 0, returnAt: 0, results: [] };
    room.roster = [];
    room.phase = "lobby";
    room.mapId = OPENING_MAP_ID;
    room.mapVariant = null;
    room.nextMapId = null;
    room.nextMapVariant = null;
    room.notice = notice;
    for (const p of room.players) {
      Object.assign(p, freshMotion(mapFor(room).spawns[0]), freshCombat());
      p.jumpSeen = p.jumpId;
      p.crouch = false;
      p.dashSeen = p.dashId;
      p.attackSeen = p.attackId;
      p.targetId = null;
      p.eliminations = 0;
      p.matchEliminations = 0;
      p.frozenUntil = 0;
      clearInventory(p);
      p.characterId = null;
      p.characterAutoAssigned = false;
      p.ready = false;
      p.dx = 0;
      p.dy = 0;
      p.sprint = false;
      p.dashRemaining = 0;
      p.attackFlash = 0;
      p.hitFlash = 0;
      p.attackSeen = p.attackId;
    }
    this.broadcast(room);
  }
  disconnect(ws) {
    const s = this.sessions.get(ws);
    if (!s) return;
    this.sessions.delete(ws);
    const { room, player: p } = s;
    dropFlag(room, p);
    p.socket = null;
    p.ready = false;
    p.dx = 0;
    p.dy = 0;
    p.sprint = false;
    p.dashRemaining = 0;
    p.disconnectedAt = Date.now();
    this.transfer(room);
    this.broadcast(room);
  }
  transfer(room) {
    if (!room.players.some((p) => p.id === room.hostId && p.socket)) {
      const next = room.players.find((p) => p.socket);
      if (next) room.hostId = next.id;
    }
  }
  remove(room, p) {
    if (this.rooms.get(room.code) !== room || !room.players.includes(p)) return;
    if (p.socket) this.sessions.delete(p.socket);
    dropFlag(room, p);
    p.socket = null;
    p.dx = 0;
    p.dy = 0;
    p.lastInput = 0;
    p.targetId = null;
    room.players = room.players.filter((x) => x !== p);
    if (!room.players.length) {
      this.rooms.delete(room.code);
      return;
    }
    this.transfer(room);
    if (["character_selection", "match_loading", "arena", "intermission"].includes(room.phase) && (room.players.length < 2 || room.selectedFormat === "duo" && !validTeams(room.selectedFormat, room.players.length))) this.toLobby(room, room.selectedFormat === "duo" ? "Match ended: a player left; Duos require 4 or 6 players." : "Test ended: at least two players are needed.");
    else {
      for (const other of room.players) if (other.targetId === p.id) this.assignTarget(room, other, p.id);
      this.broadcast(room);
    }
  }
  assignTarget(room, p, previous) {
    const all = room.players.filter((o) => o !== p);
    const connected = all.filter((o) => o.socket);
    const others = connected.length ? connected : all;
    const different = others.filter((o) => o.id !== previous);
    const pool = different.length ? different : others;
    const living = pool.filter((o) => o.health > 0);
    const choices = living.length ? living : pool;
    p.targetId = choices.length ? choices[randomInt2(choices.length)].id : null;
  }
  resolveCharacters(room, now) {
    if (!room.selection || this.rooms.get(room.code) !== room) return;
    if (["character_selection", "match_loading"].includes(room.phase) && now >= room.selection.expiresAt) {
      this.toLobby(room, "Match preparation timed out. Reconnect and ready up to try again.");
      return;
    }
    if (room.phase === "character_selection") {
      if (now >= room.selection.deadline) {
        for (const p of room.players) if (!p.characterId) {
          p.characterId = CHARACTER_IDS[randomInt2(CHARACTER_IDS.length)];
          p.characterAutoAssigned = true;
        }
      }
      if (room.players.every((p) => p.characterId)) {
        room.phase = "match_loading";
        room.selection.loadingAt = now;
      }
    }
    if (room.phase === "match_loading") {
      if (room.players.every((p) => p.socket && p.characterId && room.selection.preparedIds.includes(p.id))) {
        this.startRound(room, now);
        return;
      }
    }
    if (["character_selection", "match_loading"].includes(room.phase) && now >= room.selection.expiresAt) this.toLobby(room, "Match preparation timed out. Reconnect and ready up to try again.");
  }
  startRound(room, now) {
    if (this.rooms.get(room.code) !== room || !room.match.id || !["match_loading", "intermission"].includes(room.phase) || room.match.roundNumber >= MATCH.rounds) return;
    if (room.match.roundNumber === 0 && (!room.selection || room.players.some((p) => !p.characterId || !p.socket || !room.selection.preparedIds.includes(p.id)))) return;
    if (room.players.length < 2) {
      this.toLobby(room, "Match ended: at least two players are needed.");
      return;
    }
    for (const p of room.roster) p.eliminations = 0;
    room.mapId = room.match.roundNumber === 0 ? OPENING_MAP_ID : room.nextMapId ?? selectRoundMap(room.match.roundNumber + 1, room.mapId, randomInt2);
    room.mapVariant = room.nextMapId ? room.nextMapVariant : selectMapVariant(room.mapId, randomInt2);
    room.nextMapId = null;
    room.nextMapVariant = null;
    room.phase = "arena";
    room.notice = "";
    room.match.roundNumber++;
    room.match.nextRoundSeconds = 0;
    room.match.mapHistory.push(room.mapId);
    room.round = { endsAt: now + ROUND.durationMs, remainingSeconds: ROUND.durationMs / 1e3, returnAt: 0, results: [] };
    room.players.forEach((p, i) => {
      const version = p.spawnVersion + 1;
      Object.assign(p, freshMotion(mapFor(room).spawns[i]), freshCombat());
      p.spawnVersion = version;
      const dx = mapFor(room).plaza.x + mapFor(room).plaza.width / 2 - p.x, dy = mapFor(room).plaza.y + mapFor(room).plaza.height / 2 - p.y, length = Math.hypot(dx, dy) || 1;
      p.facingX = dx / length;
      p.facingY = dy / length;
      p.targetId = null;
      p.eliminations = 0;
      p.dx = 0;
      p.dy = 0;
      p.sprint = false;
      p.dashId = 0;
      p.jumpId = 0;
      p.crouch = false;
      p.attackId = 0;
      p.aimX = 0;
      p.aimY = 0;
      p.seq = p.ack;
      p.lastInput = 0;
    });
    if (this.legacyBounty) {
      const order = [...room.players];
      for (let i = order.length - 1; i > 0; i--) {
        const j = randomInt2(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      order.forEach((p, i) => p.targetId = order[(i + 1) % order.length].id);
    } else beginMode(room, now);
    if (process.env.BOUNTY_DEBUG === "1") console.info("[round]", { room: room.code, mode: room.selectedGameMode, format: room.selectedFormat, map: room.mapId, round: room.match.roundNumber, teams: room.mode.teams, it: room.mode.it, flag: room.mode.flag.state, loot: MODE_RULES[room.selectedGameMode].loot });
    this.broadcast(room);
  }
  ranking(players, match = false) {
    const score = (p) => match ? p.matchEliminations : p.eliminations;
    const sorted = [...players].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    return sorted.map((p) => ({ id: p.id, name: p.name, eliminations: score(p), rank: sorted.findIndex((o) => score(o) === score(p)) + 1 }));
  }
  modeRanking(room, match) {
    const teams = [...new Set(Object.values(room.mode.teams))];
    const score = (k) => match ? room.mode.matchPoints[k] ?? 0 : room.selectedGameMode === "kill_race" ? room.mode.scores[k] ?? 0 : Number(room.mode.winnerKeys.includes(k));
    teams.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
    return teams.map((k) => ({ id: k, name: room.roster.filter((p) => teamKey(room.mode, p.id) === k).map((p) => p.name).join(" + "), eliminations: score(k), rank: teams.findIndex((t) => score(t) === score(k)) + 1 }));
  }
  endRound(room, now) {
    if (this.rooms.get(room.code) !== room || room.phase !== "arena") return;
    if (!this.legacyBounty) finishMode(room, now);
    room.round.remainingSeconds = 0;
    room.round.results = this.legacyBounty ? this.ranking(room.roster) : this.modeRanking(room, false);
    room.match.history.push(room.round.results.map((p) => ({ ...p })));
    if (room.match.roundNumber >= MATCH.rounds) {
      room.phase = "complete";
      room.nextMapId = null;
      room.nextMapVariant = null;
      room.round.returnAt = 0;
      room.match.nextRoundSeconds = 0;
      room.match.results = this.legacyBounty ? this.ranking(room.roster, true) : this.modeRanking(room, true);
      room.match.winners = room.match.results.filter((p) => p.rank === 1).map((p) => ({ id: p.id, name: p.name }));
    } else {
      room.nextMapId = selectRoundMap(room.match.roundNumber + 1, room.mapId, randomInt2);
      room.nextMapVariant = selectMapVariant(room.nextMapId, randomInt2);
      room.phase = "intermission";
      room.round.returnAt = now + ROUND.resultsMs;
      room.match.nextRoundSeconds = ROUND.resultsMs / 1e3;
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
      for (const p of [...room.players]) if (!p.socket && now - p.disconnectedAt >= RECONNECT_MS) this.remove(room, p);
      if (!this.rooms.has(room.code)) continue;
      room.tick++;
      if (room.phase === "character_selection" || room.phase === "match_loading") {
        this.resolveCharacters(room, now);
        if (room.tick % 2 === 0) this.broadcast(room);
        continue;
      }
      if (room.phase === "intermission") {
        room.match.nextRoundSeconds = Math.max(0, Math.ceil((room.round.returnAt - now) / 1e3));
        if (now >= room.round.returnAt) this.startRound(room, now);
        else if (room.tick % 2 === 0) this.broadcast(room);
        continue;
      }
      if (room.phase === "arena" && now >= room.round.endsAt) {
        this.endRound(room, now);
        continue;
      }
      if (room.phase === "arena") {
        room.round.remainingSeconds = Math.max(0, Math.ceil((room.round.endsAt - now) / 1e3));
        for (const p of room.players) {
          p.attackCooldown = Math.max(0, p.attackCooldown - STEP);
          p.protection = Math.max(0, p.protection - STEP);
          p.attackFlash = Math.max(0, p.attackFlash - STEP);
          p.hitFlash = Math.max(0, p.hitFlash - STEP);
          if (p.koRemaining > 0) {
            p.koRemaining = Math.max(0, p.koRemaining - STEP);
            p.ack = p.seq;
            p.jumpSeen = p.jumpId;
            p.crouch = false;
            p.dashSeen = p.dashId;
            p.attackSeen = p.attackId;
            if (p.koRemaining < 1e-8) {
              const point = safeSpawn(room.players.filter((o) => o !== p && o.health > 0).map((o) => ({ x: o.x, y: o.y })), mapFor(room));
              const version = p.spawnVersion + 1;
              Object.assign(p, freshMotion(point), freshCombat());
              p.spawnVersion = version;
              p.protection = COMBAT.protection;
              p.jumpSeen = p.jumpId;
              p.crouch = false;
              p.dashSeen = p.dashId;
              p.attackSeen = p.attackId;
              p.dx = 0;
              p.dy = 0;
              p.sprint = false;
              p.lastInput = 0;
            }
            continue;
          }
          if (!p.socket) continue;
          if (p.frozenUntil > now) {
            p.dashRemaining = 0;
            p.sprinting = false;
            p.ack = p.seq;
            p.jumpSeen = p.jumpId;
            p.crouch = false;
            p.dashSeen = p.dashId;
            continue;
          }
          const active = now - p.lastInput < NETWORK.inputTimeoutMs;
          const motion = advanceMotion(p, { dx: active ? p.dx : 0, dy: active ? p.dy : 0, sprint: active && p.sprint, dashId: active ? p.dashId : p.dashSeen, dashStyle: p.dashStyle, jumpId: active ? p.jumpId : p.jumpSeen, crouch: active && p.crouch }, STEP, mapFor(room));
          Object.assign(p, motion);
          p.ack = p.seq;
        }
        const attacks = [];
        for (const p of room.players) {
          if (p.attackId <= p.attackSeen) continue;
          p.attackSeen = p.attackId;
          if (!p.socket || p.health <= 0 || p.frozenUntil > now || p.attackCooldown > 1e-8 || now - p.lastInput >= NETWORK.inputTimeoutMs) continue;
          const length = Math.hypot(p.aimX, p.aimY);
          p.attackX = length > 1e-6 ? p.aimX / length : p.facingX;
          p.attackY = length > 1e-6 ? p.aimY / length : p.facingY;
          p.attackCooldown = p.heldItem && p.heldItem in WEAPONS ? WEAPONS[p.heldItem].cooldown : COMBAT.cooldown;
          p.attackFlash = COMBAT.attackFlash;
          p.protection = 0;
          if (this.legacyBounty || !throwBall(room, p, now)) attacks.push(p);
        }
        const swingDamage = new Map(attacks.map((p) => [p, p.heldItem && p.heldItem in WEAPONS ? WEAPONS[p.heldItem].damage : COMBAT.damage]));
        const damage = /* @__PURE__ */ new Map();
        for (const attacker of attacks) {
          const targets = room.players.filter((p) => p !== attacker && (this.legacyBounty || enemies(room, attacker, p)) && p.health > 0 && p.protection <= 0 && canHit(attacker, p, attacker.attackX, attacker.attackY, mapFor(room)));
          targets.sort((a, b) => Math.hypot(a.x - attacker.x, a.y - attacker.y) - Math.hypot(b.x - attacker.x, b.y - attacker.y) || a.id.localeCompare(b.id));
          const target = targets[0];
          if (target && !this.legacyBounty && !MODE_RULES[room.selectedGameMode].combat) {
            MODE_RULES[room.selectedGameMode].hit?.({ room, now }, attacker, target);
            continue;
          }
          if (target) damage.set(target, [...damage.get(target) || [], attacker]);
        }
        const completions = [];
        for (const [p, hitters] of damage) {
          hitters.sort((a, b) => a.id.localeCompare(b.id));
          let total = 0;
          let killer;
          for (const attacker of hitters) {
            total += swingDamage.get(attacker) ?? COMBAT.damage;
            if (!killer && total >= p.health) killer = attacker;
          }
          if (killer && !this.legacyBounty) onElimination(room, killer, p);
          if (this.legacyBounty && killer && killer.targetId === p.id) completions.push(killer);
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
            p.jumpSeen = p.jumpId;
            p.crouch = false;
            p.dashSeen = p.dashId;
          }
        }
        for (const p of completions) {
          p.eliminations++;
          p.matchEliminations++;
          this.assignTarget(room, p, p.targetId);
        }
        if (!this.legacyBounty && tickMode(room, now, STEP)) {
          this.endRound(room, now);
          continue;
        }
        if (room.tick % 2 === 0) this.broadcast(room);
      }
    }
  }
};

// server/index.ts
async function createGameServer(production = process.env.NODE_ENV === "production" || fileURLToPath(import.meta.url).replaceAll("\\", "/").endsWith("/dist/server.js"), legacyBounty = false) {
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  const rooms = new RoomServer(legacyBounty);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
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
      } catch {
        socket.destroy();
        return;
      }
    }
    if (wss.clients.size >= 600) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });
  wss.on("connection", (ws) => {
    let count = 0;
    let windowStart = Date.now();
    let alive = true;
    ws.on("pong", () => {
      alive = true;
    });
    const heartbeat = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      if (ws.readyState === 1) ws.ping();
    }, 5e3);
    ws.on("message", (raw) => {
      if (Date.now() - windowStart >= 1e3) {
        count = 0;
        windowStart = Date.now();
      }
      if (++count > 90) {
        ws.close(1008, "Too many messages");
        return;
      }
      rooms.message(ws, raw.toString());
    });
    ws.on("close", () => {
      clearInterval(heartbeat);
      rooms.disconnect(ws);
    });
    ws.on("error", () => {
    });
  });
  const timer = setInterval(() => rooms.tick(), STEP * 1e3);
  app.get("/health", (_req, res) => res.json({ ok: true, phase: 6 }));
  let vite;
  if (production) {
    const here = dirname(fileURLToPath(import.meta.url));
    app.use(express.static(resolve(here, "../dist/client")));
    app.get("/", (_req, res) => res.sendFile(resolve(here, "../dist/client/index.html")));
  } else {
    const { createServer: createServer2 } = await import("vite");
    vite = await createServer2({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
    app.use(vite.middlewares);
  }
  return { server, rooms, close: async () => {
    clearInterval(timer);
    for (const ws of wss.clients) ws.terminate();
    await new Promise((r) => wss.close(() => r()));
    await new Promise((r) => server.close(() => r()));
    rooms.sessions.clear();
    rooms.rooms.clear();
    if (vite) await vite.close();
  } };
}
if (process.env.BOUNTY_TEST !== "1") {
  const game = await createGameServer();
  const port = Number(process.env.PORT) || 3e3;
  game.server.listen(port, "0.0.0.0", () => console.log(`Bounty Shift Phase 6 listening on port ${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
    void game.close().then(() => process.exit(0));
  });
}
export {
  createGameServer
};
