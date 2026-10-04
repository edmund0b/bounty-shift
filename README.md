# Bounty Shift — Step 2, Stage 3: Central Plaza

Central Plaza is the first playable map in the existing Bounty Shift project. It extends the Step 1 multiplayer/match foundation and Step 2 third-person renderer/controller. Only this map is enabled; Sky Docks and Nexus Arena are reserved identifiers, with no geometry or random selection yet.

Repository: https://github.com/edmund0b/bounty-shift

Existing public service: https://bounty-shift.onrender.com

![Central Plaza desktop preview](STEP2_PREVIEW.png)

## The map

The playable district is 2600 × 2100 world units, approximately 1.9 times the previous arena's ground area. Five connected regions have different layouts:

- Central Plaza: an open middle with a solid monument base, twin cyan energy pylons, surrounding cover and routes on every side.
- West Depot: industrial buildings, cargo cover, magenta signage, ground lanes and a west loading balcony/catwalk.
- East Storage: asymmetric storage blocks and tighter cargo corners, pink facade lighting, ground connections and an east upper route.
- South Terminal: cyan landmark signage, an open spawn approach, side lanes and nearby cover.
- North Bridge: a raised cross-map route connecting both side catwalks, with a central stair approach and skyline beyond.

The upper network has three wide approaches: west stairs, east ramp and north stairs. Players can ascend on one side, cross the North Bridge and descend elsewhere. Side balconies overlook the plaza without sealing its central approach. Decks permit ground-level passage underneath where there is sufficient clearance; ramps are solid wedges. Building facades and door-shaped lighting panels are closed solids, not entrances. Open lanes around the buildings are real routes.

The rendering is procedural and stylized: dark navy architecture, cyan/magenta trim, generated facade signs, cargo, barriers, sparse planter trees, lane markings and lightweight distant towers. Floor sheen uses materials/painted lighting rather than costly real-time reflections.

## Map architecture and authoritative traversal

- `shared/maps/types.ts` defines bounds, blocks with bottom/top heights, walkable surfaces/ramps, spawns, districts and environment settings.
- `shared/maps/central-plaza.ts` is the single source of map geometry, collision volumes, upper routes and spawn points.
- `shared/map.ts` registers `central_plaza`. `sky_docks` and `nexus_arena` are placeholders only. Rooms carry a map ID; the server, client prediction, renderer and minimap resolve the same definition. No map picker or randomizer was added.
- `shared/traversal.ts` supplies common support-height and volume checks. World X/Y remain horizontal coordinates, rendered as X/Z at `VIEW.scale` (0.03). `elevation` is authoritative feet height in world units. Upper decks are at 100 units, or 3 rendered metres.
- Walking, sprint and dash use the existing shared movement integrator with small collision substeps. Slopes change height continuously; visually marked stairs use smooth collision ramps. Players cannot step directly from the ground onto a bridge, dash through a solid, or walk off an unsupported upper edge. Rails guard edges while leaving ramp mouths and route joins open.
- Prediction uses the same map/traversal functions as the server. Clients continue sending input intent, never their position or elevation. Snapshots/reconnect restore authoritative elevation. Remote interpolation samples the matching support to keep feet on slopes.
- Melee preserves damage, range, arc and cooldown. Hit checks now include vertical distance and a chest-height line through solid volumes/ramp wedges. Ground players cannot hit through an overhead deck at players above them. Low cover below the strike line can be struck over.
- The camera retains Stage 2 free look/obstruction rays, now following the player's elevation and staying above their current floor. Close obstruction slightly increases avatar fading to preserve visibility. Round spawn facing points toward the plaza. No controller replacement, jump, falling/gravity or new ability was introduced.

Eight valid ground spawn positions are spread across outer districts and approaches. Current room capacity remains 2–6. Round starts use these spread positions; respawn retains the existing greatest-clearance choice among valid spawns and existing protection. Round/lobby resets restore ground elevation and all existing reset rules.

## Navigation minimap

The top-right, north-up SVG minimap is generated directly from the active map's bounds, buildings, cover, walkways, ramps and district locations. The cyan arrow shows only your authoritative position and facing. Upper-floor movement uses the same horizontal X/Y coordinates. No enemy markers, target radar or reveal mechanics were added.

The marker updates in the existing arena render loop. The panel is pointer-transparent and responsively clamped, so it does not capture camera input, displace the arena or add page height. Desktop and narrow/short mobile sizes preserve the existing one-viewport layout.

## Preserved controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows, relative to camera yaw | Lower-left analog joystick, relative to camera |
| Look | Click arena, then mouse-look; Esc releases | Swipe the right half of the arena |
| Sprint | Hold Shift while moving | Hold Sprint while using joystick |
| Dash | Space | Tap Dash |
| Melee | Click while mouse-look is active, or F | Tap Attack |
| Camera fallback | Q/E yaw; cursor-look if pointer lock unavailable | Independent look pointer |

Camera orbit works while stationary. Movement is flattened to horizontal camera yaw, with normalized diagonals. Moving avatars rotate toward their gameplay direction; stationary camera look does not spin the body. Dash uses current movement input, or the avatar's last gameplay facing when idle. Melee uses camera yaw/reticle direction. Name/health sprites still billboard; local cyan, private Bounty gold and other player colors are preserved.

The existing joystick/look pointer-ID separation, touch buttons, focus/cancel clearing, HUD buttons and gameplay-only prevention of page scrolling remain intact. UI clicks do not activate pointer lock. Match screens use the preserved `100vh`/`100dvh` compact-header/flexible-arena/compact-HUD structure; menus and lobby retain normal scrolling where needed.

## Game rules and match foundation

1. Create a room and share its six-character code. Join with 2–6 players, ready up, and have the host start.
2. Each player receives one private Bounty target; nobody targets themselves. Fight any player, but only knocking out your assigned target earns one Bounty elimination. Successful credit reassigns your target; with two players the same opponent remains necessary.
3. Health is 100. Melee deals 25 damage, has an 80-unit range/120-degree arc and a 0.6-second cooldown. One strike hits the nearest eligible player; obstacles and height can prevent hits.
4. KO lasts five seconds. Respawn restores health/resources and grants 1.5 seconds of protection; the protected player's accepted attack ends it. Initial round spawns have no protection.
5. Each of three rounds lasts 90 seconds. Round expiry freezes gameplay and snapshots the leaderboard. A five-second intermission starts the next round automatically, resetting round state while retaining match totals.
6. After Round 3, final totals determine the winner; top ties share victory. Only the host returns everyone to lobby. A fresh match clears all prior scores/history/targets and readiness.

Walking remains 220 units/second; sprint remains 330. Stamina max 100, drain 28/second, regeneration 22/second after 0.6 seconds. Dash remains 850 units/second for 0.18 seconds with a three-second cooldown. Centralized constants remain in `shared/game.ts`, `shared/combat.ts`, `shared/rounds.ts`, `shared/presentation.ts` and `shared/traversal.ts`; existing balance values were not changed.

Server authority still covers movement, health, hit/KO attribution, targets, score, timers, transitions and results. Only the recipient's own target is sent in their objective HUD; public player snapshots never contain other target assignments. Camera position/rotation stays local. Reconnect grace remains ten seconds; identity, health, elevation, target, scores, cooldowns and deadlines are preserved while the room/server exists. Duplicate tabs cannot steal an active identity. Permanent departures repair targets, migrate host authority and cancel play gracefully if too few players remain. See `FOUNDATION_AUDIT.md` for the Step 1 audit history.

## Build and automated validation

Use Node.js 22 or newer inside the repository:

```sh
npm ci --include=dev
npm run build
npm test
npm start
```

Open http://localhost:3000 in two independent browser sessions. The one Node service serves both frontend assets and `/ws`; `PORT` can override 3000. For development, use `npm run dev`. Build before integration/browser tests so production frontend assets exist.

Optional Chromium browser checks:

```sh
npx playwright-core install chromium
npm run test:browser
```

On a Unix shell, an existing compatible binary can be selected with `BOUNTY_QA_BROWSER=/absolute/path/to/chromium npm run test:browser`. `BOUNTY_QA_OUTPUT` selects a screenshot directory. The script arranges local server fixtures and advances test time; it adds no production debug endpoint and is not part of normal startup.

Local validation for this delivery:

- Production TypeScript/frontend/server build passes. Vite retains the advisory Three.js chunk-size warning.
- All 70 automated tests pass, including real independent WebSocket sessions. Added coverage checks map/spawn validity, all approaches, sprint/dash on slopes, a complete west-to-north-to-east upper route and descent, deck underpasses, upper edge constraints, vertical melee, authoritative/predicted elevation agreement, forged-height rejection, elevated reconnect, KO respawn and round reset. Previous room, combat, privacy, scoring, host, reconnect and full-match tests remain.
- Chromium/WebGL checks pass with two independent sessions: stationary pointer-lock yaw/pitch, camera steering, sprint/dash, reticle melee and synchronized health, refresh, actual client-controlled stair ascent, map marker coordinates, real multi-touch joystick/look, three-round transitions, final results and lobby reset. No page runtime errors were observed.
- Eleven viewport sizes pass containment/HUD visibility checks: 1920×1080, 1440×900, 1366×768, 1280×720, 1024×600, 800×450, 640×360, 390×844, 375×667, 320×568 and 844×390.

Browser timers are accelerated for transition checks. Physical phones, public network latency, full-duration matches and performance on actual devices remain owner acceptance checks after deployment.

## Exact changed files for Map 1

Relative to the completed Stage 2 controller:

| Files | Change |
| --- | --- |
| `shared/maps/types.ts`, `shared/maps/central-plaza.ts` (new) | Reusable map model and Central Plaza definition |
| `shared/map.ts` | Registry, active map and compatibility exports |
| `shared/traversal.ts` (new) | Shared support heights, ramp/volume collision and render support sampling |
| `shared/game.ts` | Elevation/map-aware authoritative and predicted movement; snapshot map ID |
| `shared/combat.ts` | Map-aware safe spawns and height/volume-aware hit checks |
| `shared/presentation.ts` | Close-obstruction avatar fade threshold |
| `server/rooms.ts` | Room map identity, map-aware movement/combat/spawns and elevation snapshots |
| `src/environment.ts` (new) | Procedural map geometry, landmarks, signs, skyline and batching |
| `src/Minimap.tsx` (new) | Actual-layout, local-player-only navigation minimap |
| `src/scene.ts`, `src/camera.ts` | Map rendering, elevation-aware avatars/camera and support interpolation |
| `src/Arena.tsx` | Active-map scene/minimap integration and defensive pointer-lock release handling |
| `src/main.tsx` | Active-map prediction, spawn-facing camera initialization and map heading |
| `src/style.css` | Responsive minimap rules only; no-scroll gameplay layout preserved |
| `tests/traversal.test.ts` (new) | Map/height/traversal/network regression tests |
| `tests/camera.test.ts`, `tests/combat.test.ts`, `tests/movement.test.ts`, `tests/multiplayer.test.ts`, `tests/presentation.test.ts` | New-map geometry regressions and elevated network/camera checks |
| `scripts/browser-smoke.mjs` | Minimap, elevated client traversal and Central Plaza preview checks |
| `README.md`, `STEP2_PREVIEW.png`, `STEP2_MOBILE_PREVIEW.png` | Current documentation and browser-captured previews |

No dependency, lockfile, Render configuration, match-rule, room-capacity or scoring changes. The ZIP includes unchanged repository files too.

## Upload to the existing GitHub repository and redeploy

1. Download and extract `Bounty_Shift_Step_2_Stage_3_Central_Plaza.zip`. Open its `bounty-shift` folder.
2. Open https://github.com/edmund0b/bounty-shift on the branch connected to Render. Choose Add file → Upload files.
3. Drag the folders `src`, `shared`, `server`, `tests`, `scripts`, plus `README.md`, `STEP2_PREVIEW.png`, `STEP2_MOBILE_PREVIEW.png`. Upload their contents with the paths intact. Do not drag the enclosing `bounty-shift` folder or the ZIP. Do not upload `node_modules`, `dist` or `.git`.
4. Before committing, confirm these new paths: `shared/maps/types.ts`, `shared/maps/central-plaza.ts`, `shared/traversal.ts`, `src/environment.ts`, `src/Minimap.tsx`, `tests/traversal.test.ts`. Also confirm the updated `server/rooms.ts`; both server and client must receive this update together.
5. Commit message: `Add Step 2 Stage 3 Central Plaza map`.
6. Wait for the existing Render auto-deploy. If disabled, open the existing service and choose Manual Deploy → Deploy latest commit. Keep build `npm ci --include=dev && npm run build`, start `npm start`, and existing environment/root-directory settings. No new service or account is needed.
7. Wait for Live and verify the new commit. Refresh all devices at https://bounty-shift.onrender.com. Redeploy resets in-memory rooms, so create a fresh room. The header should say `Step 2 · Central Plaza` and the minimap should appear. Do not leave an older client tab running against the updated map/height protocol.

## Public-device acceptance checklist

Start with two separate devices, ideally on different networks; repeat with at least three players when practical.

- Create/join, ready up and start with existing host controls. Check separate safe spawns, correct private targets, initial health/resources and the minimap.
- From South Terminal, reach Central Plaza, West Depot and East Storage using main and side routes. Use cover to break sightlines. Confirm solid buildings block movement and open lanes remain open.
- Ascend west stairs, cross the North Bridge to the east catwalk and descend the east ramp. Try the central north stairs in both directions. Sprint/dash on slopes and decks: no height jumps, sinking, falling through floors, edge escape or wall clipping. Walk underneath a deck on the ground where clearance permits.
- Orbit/tilt while stationary and while climbing. Test near-wall camera compression/recovery. Confirm remote players' positions/facing/height agree on both devices.
- Check your cyan minimap arrow follows actual horizontal position and facing on ground and high ground; opponents never appear on it.
- Test camera-facing melee on ground, on a slope and on the upper route. Out-of-range, wall/deck-blocked and wrong-elevation hits must fail. Both devices must agree on damage, KO and Bounty credit. A non-target KO still earns zero objective credit.
- KO and respawn: valid ground spawn, full health, protection, existing cooldown/reset behavior, target and score retention. Refresh while elevated/damaged/KO and reconnect within grace; there must be no duplicate body or reset score.
- Finish the full three-round match. Confirm synchronized expiry/intermission, fresh spawns/health/round scores, persistent match totals, refreshed private targets, final winner/tie and host lobby return. Start a fresh second match and verify old state is cleared.
- Test host disconnect/migration and a permanent target departure with three players. With fewer than two remaining, play must end cleanly.
- On a physical phone, stand still and swipe to look; simultaneously use the left joystick and right look region. Test touch Sprint/Dash/Attack, all ramps and turns, release/cancel/app switch and portrait/landscape. The minimap must not obstruct controls.
- Resize desktop and rotate mobile: header, target/timer, arena, bottom HUD and buttons remain visible together with no page scrolling or zoom adjustment.

## Performance and remaining limits

Static decorative boxes/trim/skyline are instanced by cached material. Main collision meshes remain individually available to camera ray checks. Unit geometries, signs and materials are reused; floor/sign textures are generated locally. No large asset downloads, additional dependencies, heavy reflection/bloom/shadow systems or extra real-time lights were added. Resources are disposed when leaving/changing the arena, and the minimap shares the existing animation loop.

This is a procedural playable interpretation of the concept, not final environment/character art. Vertical traversal is supported surfaces/ramps rather than general jumping/falling physics. Camera compression in tight spaces and real-phone frame rate still need public playtesting. WebGL/hardware acceleration is required. Existing single-instance in-memory hosting/restart limits, ten-second reconnect window and melee without latency rewind remain unchanged. Only Central Plaza is playable; future maps, random selection, radar and further gameplay features are not implemented.

The next step is owner testing and fixing Map 1 issues. Map 2 work waits for a separate instruction. Challenge deadline: October 31, 2026 at 11:59 PM Pacific; final submission needs the project title, public link and preview image.
