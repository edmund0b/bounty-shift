# Bounty Shift — Step 2: Third-person Arena

Continues the approved Step 1 foundation at https://github.com/edmund0b/bounty-shift, based on deployed commit `42e0ed1`. The Render service remains https://bounty-shift.onrender.com. The server, WebSocket protocol, map collision rectangles, combat values, targets, scores, and three-round match lifecycle are unchanged.

Step 2 adds a Three.js WebGL presentation layer: physical neon buildings, façade signage, simple humanoid avatars, a collision-aware third-person chase camera, camera-relative controls, in-world names/health, reticle, and an updated HUD. The supplied concept guides the dark-blue/cyan/magenta palette and framing; these are prototype meshes, not final art.

![Desktop preview](STEP2_PREVIEW.png)

## Step 2 architecture and controls

- `src/scene.ts` owns the 3D scene/renderer, static structures, camera, avatar meshes/labels, interpolation, and disposal. One render loop exists only while the arena is mounted; hidden tabs skip rendering.
- `src/Arena.tsx` hosts the scene, camera-drag input, reticle, graphics errors, and health/stamina/ability HUD.
- `shared/presentation.ts` centralizes world-to-render scale and camera-relative movement/aim conversion. The server still simulates positions in the original two dimensions; visual height is decorative. No physics engine, extra floor, or jump system was added.
- Three.js is a frontend dependency; its vendor chunk is separated for caching. `playwright-core` is a development-only dependency for the optional browser smoke test. Render needs no account/configuration change.
- WASD/arrows move relative to camera yaw. Shift sprints; Space dashes in movement/last-facing direction. Right mouse drag or Q/E turns the camera. Touch Turn L/R buttons rotate it.
- Left click, F, and touch Attack all strike along camera yaw/center-reticle direction. This is close-range melee, not cursor targeting or a projectile; the server still enforces 80-pixel range, arc, walls, and cooldown. Looking around alone does not change idle dash's last movement direction.
- Each client sees their local avatar in cyan and their own Bounty in gold; other avatars retain player colors. This does not reveal anyone else's target. Names/health use depth-tested floating labels.
- Local body faces the camera's aim direction; remote bodies show authoritative movement/attack direction. Camera orientation itself is local, and idle aiming poses are not networked in this version.
- Static meshes are derived directly from `shared/map.ts`, so visible solid buildings match authoritative collision. SOUTH TERMINAL, WEST STORAGE, EAST STORAGE, and WORKSHOP have signage on their existing structures. SIGNAL STATION's façade is presented as CENTRAL PLAZA to mark the central approach. No map geometry was redesigned.
- The camera shortens its trailing distance near buildings/boundaries. The local body fades when the camera is very close. Room and round transitions still unmount/remount the scene cleanly.

## Local build and test

Use Node.js 22 or newer, inside the repository folder:

```sh
npm ci --include=dev
npm run build
npm test
npm start
```

Open http://localhost:3000 in two independent browser windows. Build before testing: the integration test checks production frontend assets. For development use `npm run dev`. `PORT` overrides 3000. Production uses the same URL for the frontend and `/ws`.

## How to play this prototype

1. Create a room, share its six-character code, and have 2–6 players join.
2. Everyone readies up; only the host can start the three-round match.
3. Read your private `BOUNTY: name` HUD. Nobody can target themselves.
4. Knock out that player to earn one Bounty elimination. Knockouts of anyone else earn zero. You can still fight any opponent.
5. After a successful Bounty knockout, your target is reassigned. With two players, it must remain the same opponent; wait for their respawn. With more players, reassignment prefers a different connected opponent, then living candidates within that group. Multiple players may hunt the same person after reassignment.
6. Play each round until the server's 90-second timer expires. Movement and combat freeze; the leaderboard ranks successful Bounty eliminations. Ties share ranks (for example 1, 1, 3).
7. After rounds 1 and 2, the leaderboard stays visible during a five-second NEXT ROUND countdown. Movement and attacks are frozen. The next round starts automatically with fresh health, spawns, movement resources, round counts, and private targets. Match totals persist. After round 3, MATCH COMPLETE shows final placements and WINNER, or MATCH TIED with all top players. Final results stay until the host returns everyone to lobby. Lobby return clears totals, targets, KO, and readiness; players can start a fresh match.

The host can return everyone to the lobby early, cancelling the current match. If a permanent departure leaves fewer than two players during play, the match is cancelled and the remaining player returns to the lobby without a fabricated winner.

## Controls and preserved movement/combat

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows relative to camera | Directional buttons relative to camera |
| Sprint | Hold Shift while moving | Hold Sprint plus direction |
| Dash | Space | Tap Dash |
| Melee | Left click / F toward center reticle | Tap Attack toward center reticle |
| Turn view | Right-drag / Q E | Hold Turn L / Turn R |

- Chase camera follows behind your cyan humanoid avatar, slightly elevated. Visible opponents render as physical avatars with floating labels and health bars.
- Flat 2000 × 1440 city arena: central plaza, solid buildings, alleys, cross streets, and an outside loop. No extra floors or layered tunnels.
- Walking: 220 pixels/second. Sprint: 330. Stamina starts at 100, drains at 28/second, regenerates at 22/second after a 0.6-second delay. Release Sprint after exhaustion before sprinting again.
- Dash: 850 pixels/second for 0.18 seconds, three-second cooldown. Same server collision as walking/sprinting; no wall clipping or dash invulnerability. Rejected cooldown presses are discarded.
- Health: 100. Melee: 25 damage, 80-pixel center distance, 120-degree forward arc, 0.6-second cooldown. One strike hits the nearest eligible player, with walls blocking hits. A nearby non-target may intercept a strike aimed at your Bounty.
- KO lasts five seconds and disables movement/abilities/attacks. Respawn restores health and movement resources at a valid plaza spawn with the greatest available clearance from living opponents.
- Spawn protection lasts 1.5 seconds; the protected player's own accepted attack ends it. Initial round spawn has no protection.
- Same-tick mutual lethal attacks can trade. For multiple attackers hitting the same victim in one tick, stable server player-ID ordering determines the final damage contributor. Exactly one attacker can receive credit for that KO, and only if that victim was their assigned target. Both mutual Bounty completions are checked before any reassignment.
- Respawning preserves your target, round progress, and match total. Reconnecting preserves identity, target, progress, match identity, round number, timer, health, KO, and cooldown while the server remains alive.
- Disconnected players remain vulnerable during the existing ten-second reconnect window. Their targets remain valid. Permanent departures repair affected targets without awarding elimination credit. Departed participants retain earned totals in final results; their later round scores are zero.

## Multiplayer authority and target privacy

Clients send movement, dash, and attack intent only. The server runs about 30 Hz and sends about 15 Hz authoritative snapshots. Shared movement prediction/reconciliation and remote interpolation are preserved. The server owns collision, hit detection, health, KO attribution, respawn, private targets, objective counts, deadlines, and results.

`Player.targetId` and objective progress are server-only fields. Each outgoing state/welcome is serialized for its recipient. The public player array never includes target assignments or reconnect tokens. A client receives only its own target's ID/name and its own round and match elimination counts under `room.objective`. Completed results contain everyone's counts, but no target relationships. Positions/health remain public, as in Phase 3; this is not server fog of war.

Initial assignment uses a shuffled circular order: each player receives one other player, with one incoming target relationship per player. Reassignment does not preserve that one-to-one incoming property; it only guarantees a valid non-self target. This avoids introducing permanent elimination or complicated target chains.

The server checks the absolute deadline before processing movement/damage on a tick. Pending attacks at or after expiry cannot earn credit. Results are a frozen server snapshot. Match state distinguishes lobby, active round (`arena`), `intermission`, and `complete`. `room.match` contains the match ID, round number, countdown, final ranking, winners, and completed-round history. History stores immutable score snapshots without targets. Round constants live in `shared/rounds.ts`; no gameplay endpoint lets clients choose targets, health, damage, credit, duration, or results.

## Foundation hardening

Read [FOUNDATION_AUDIT.md](FOUNDATION_AUDIT.md) for the full transition audit, bug fixes, validation boundary, and centralized constants. No balance values changed. Resume conflicts now retry conservatively without stealing the connected player. Repeated lobby return preserves freshly chosen ready states. Inputs require the current match ID and round number, so reload every device after deployment. Permanent departures release their transport references; earned score records remain until match cleanup. Touch capture/cancellation and narrow-screen containment were fixed without redesign.

## Exact Step 2 changed files

| File | Change |
| --- | --- |
| `src/scene.ts` | New Three.js physical arena, avatars, signage, camera, labels, disposal |
| `src/Arena.tsx` | Third-person viewport, camera drag, reticle, upgraded HUD |
| `src/main.tsx` | Camera-relative movement, aim, Q/E and touch turn controls, instructions |
| `src/style.css` | Neon presentation and responsive HUD |
| `shared/presentation.ts` | New rendering/camera/control constants and conversion helpers |
| `tests/presentation.test.ts` | New camera-relative speed/direction and collision regressions |
| `scripts/browser-smoke.mjs` | New reproducible two-browser rendering/control/match smoke test |
| `package.json`, `package-lock.json` | Three.js/types, development browser test dependency/script |
| `vite.config.ts` | Separate Three.js vendor chunk |
| `README.md` | Step 2 architecture, controls, deployment, acceptance instructions |
| `STEP2_PREVIEW.png`, `STEP2_MOBILE_PREVIEW.png` | Browser-captured prototype previews |

All server files, map/combat/round/game definitions, foundation tests, hosting commands, and `FOUNDATION_AUDIT.md` are unchanged.

## Optional browser smoke test

After building, install a local test browser and run:

```sh
npx playwright-core install chromium
npm run test:browser
```

If you already have a compatible Chromium binary, use `BOUNTY_QA_BROWSER=/absolute/path/to/chromium npm run test:browser` on a Unix shell. Screenshots go into the temporary `bounty-shift-qa` directory; `BOUNTY_QA_OUTPUT` can override that directory. Test fixtures only arrange server positions/advance timers inside the local test process; no debug endpoint is shipped. The script is not run during normal Render startup or `npm test`.

## Upload into the existing GitHub repository

1. Download and extract `Bounty_Shift_Step_2_Third_Person.zip`.
2. Open https://github.com/edmund0b/bounty-shift and select the existing deployed branch, normally `main`.
3. Choose Add file → Upload files.
4. From inside the extracted `bounty-shift` folder, drag the folders `shared`, `src`, `tests`, `scripts`, and the files `package.json`, `package-lock.json`, `vite.config.ts`, `README.md`, `STEP2_PREVIEW.png`, and `STEP2_MOBILE_PREVIEW.png` into the upload area. Folder drag-and-drop preserves nested paths. The unchanged files inside those folders are included deliberately.
5. Do not upload the ZIP or enclosing `bounty-shift` folder itself. Do not flatten paths. Do not upload `node_modules`, `dist`, or `.git`.
6. Check paths include `src/scene.ts`, `shared/presentation.ts`, `scripts/browser-smoke.mjs`, and `tests/presentation.test.ts`. If they show only filenames or a nested `bounty-shift/server/...`, cancel and fix the upload before committing.
7. Commit to the existing deployed branch using `Add Step 2 third-person neon arena`.
8. Verify the new files `src/scene.ts` and `shared/presentation.ts` appear at those exact repository paths.

If using Git instead, copy those folders/file into your existing checkout, inspect changes, then:

```sh
git status
git add README.md STEP2_PREVIEW.png STEP2_MOBILE_PREVIEW.png shared src tests scripts package.json package-lock.json vite.config.ts
git commit -m "Add Step 2 third-person neon arena"
git push origin main
```

Use your actual deployed branch if different. Do not create a new repository or service.

## Redeploy the existing Render service

1. Open the existing Bounty Shift Web Service in the Render dashboard.
2. Auto-deploy should run after the GitHub commit. If disabled, choose Manual Deploy → Deploy latest commit.
3. Keep build `npm ci --include=dev && npm run build`, start `npm start`, `NODE_ENV=production`, and existing service/root-directory settings. No configuration or billing changes are needed. Upload the updated package manifest AND lockfile so Render installs Three.js.
4. Wait for Live and confirm Render shows the new commit.
5. Reload both devices at https://bounty-shift.onrender.com. Existing rooms expire on redeploy; create a fresh room.
6. Confirm the header says `Step 2 · Third-person prototype`. https://bounty-shift.onrender.com/health should report `{"ok":true,"phase":6}`.

## Step 2 public-device acceptance checklist

Reload every device after deployment. A full match takes about 4 minutes 40 seconds. Test first with two devices, then at least three players where practical. This is the public acceptance gate for the first third-person version.

First use two devices on the same public URL, ideally on different networks. Then repeat objective tests with 3–6 players.

- Create/join, verify room code, host, ready requirements, and host-only start.
- Both players spawn with 100 health, full stamina, and available dash. Each sees only their own target HUD; neither targets themselves. In two-player mode each targets the other.
- Walking, sprint/stamina, dash cooldown, camera, map collision, and movement synchronization still work.
- Land a normal hit: both screens agree on health. Wall-blocked and out-of-range attacks still miss; cooldown still applies.
- KO your assigned target: your elimination count increases exactly once. The other player sees KO and respawns after five seconds. Your private target updates without a self-target.
- In two-player mode, confirm the same opponent remains the target after success and can be hunted again after protection expires.
- With at least three players, KO a non-target: health/KO works, but your objective count does not increase and your target stays unchanged.
- Test sprint/dash while attacking, mutual lethal attacks, and two attackers hitting one victim. Compare counts and health across devices.
- Refresh during an active round, after earning credit, and during KO. Reconnect within ten seconds should preserve identity, target, credit, health, and countdown.
- Let round 1 expire. Both screens enter intermission together, with identical counts/ranks and a synchronized NEXT ROUND countdown. Movement and attacks cannot alter results.
- Confirm round 2 starts automatically after five seconds: fresh health/spawn/stamina/dash, round score zero, match total preserved, valid private targets. Repeat for round 3.
- After round 3 verify MATCH COMPLETE, identical total scores and final placements, correct winner or shared tie (including all-zero scores). Wait longer than five seconds: final results must remain. Host returns to lobby, then start a fresh second match: all counts and history are cleared.
- Refresh during intermission: same match, round, countdown, and totals return without duplicate players. Host returns everyone to lobby mid-round or intermission; ready states/targets/KO clear. Test host reconnect/transfer and a permanent target departure with three players; affected targets repair without free credit.
- With two players, let one leave permanently: the remaining player returns to lobby cleanly.
- In the lobby, refresh a non-host and host; check identity, host migration, and ready requirements. Reconnected players need to ready again in lobby.
- Refresh while damaged, after scoring, during KO, shortly after protected respawn, in rounds 2/3, and on Match Complete. Check unchanged identities, health, targets, counts, deadlines, and final results. No duplicate bodies or host takeover.
- Open a duplicate tab: the original player remains intact. The duplicate waits briefly and shows a controlled conflict if the original stays connected. Close the original and retry within the grace window to recover the same player.
- Briefly interrupt one device's network and restore it. Old-connection cleanup may show Recovering session before resuming. Longer interruptions may exceed the reconnect window; the other player's room must stay healthy.
- On mobile widths around 320–390px, check accessible buttons and uncut HUD/results. Hold direction plus Sprint, tap Dash/Attack, cancel a touch by dragging/releasing outside, then switch apps briefly; movement must stop when controls release or the tab loses focus.
- After everyone leaves or disconnects past grace, the room code must stop accepting joins. Create a new room and complete a fresh match without leftover scores or players.

Step 2 is ready for deployment/testing, not publicly accepted until this checklist passes. Report device/browser, the inputs used, and what each screen showed.

## Validation and known limits

The production build and 57 automated tests pass, including actual independent WebSocket clients. Tests cover prior movement/combat regressions plus 2–6 private assignments, no self-targets, target/non-target credit, reassignment, mutual and multiple lethal contributors, protected respawn, expiration freeze, shared-rank results, reconnect state, permanent departure repair, and lobby reset.

A local Chromium/WebGL smoke test passed with two independent browser sessions: scene rendering, camera-relative forward movement, view rotation, sprint/dash, reticle melee, synchronized health, refresh recovery, 390px layout without horizontal overflow, all three round transitions, final results, and host lobby reset. Desktop/mobile screenshots were inspected. The browser test advances server time to test transitions; it does not replace a full-duration public match on real devices.

## Step 2 public visual/control checks

- Local avatar is visible from behind with cyan accents; the Bounty has gold accents. Names and health bars render in-world and disappear behind solid geometry.
- Right-drag / Q E / touch Turn L/R rotate smoothly. Forward movement follows the new view; diagonal speed is normalized. Orbit at walls/corners and verify the camera pulls forward rather than showing inside a building.
- Walk the current map routes and locate South Terminal, Central Plaza, West Storage, East Storage, and Workshop signage. Decorative façade panels are closed, not walkable doors.
- Meet within melee distance, aim the center reticle, and use Click/F/Attack. Check wall misses, health, KO/respawn, score, and protection on both devices.
- Complete a real three-round match, refresh during play and intermission, then return to lobby/start fresh. Test 3–6 players and phones where possible.
- On actual touch devices, hold direction plus Sprint, turn, dash, attack, release outside buttons, and switch apps briefly. Confirm no stuck movement. Software browser layout checks do not certify physical touch behavior.

## Remaining limitations and next follow-ups

WebGL 2/hardware acceleration is required; failure shows a controlled graphics message, not a 2D fallback. The Three.js vendor chunk triggers Vite's advisory size warning; production compilation succeeds. Floor sheen comes from materials and painted lighting, not real mirrored players/buildings. No bloom, expensive shadows, final assets, camera pitch/orbit zoom, weapons, radar, or advanced animation pass.

Near-wall camera compression can reduce visibility; this needs real-device playtesting. Mobile controls are usable prototype buttons; portrait mode needs scrolling to the controls. Local aim pose is not replicated as an idle remote pose. Existing map/spawn locations are preserved, so they do not reproduce the concept's exact plaza composition. We should tune camera distance/framing and touch ergonomics after owner testing, then separately design the arena/characters/combat presentation.

In-memory rooms/scores disappear on restart. Ten-second server-observed reconnect grace remains finite. Melee uses current server positions without latency rewind. All positions/health remain public; private target relationships remain recipient-only. Keep one server instance. The Step 1 audit remains in `FOUNDATION_AUDIT.md`.

## Challenge deadline

October 31, 2026 at 11:59 PM Pacific. Final submission needs title, public URL, and preview screenshot. This match-flow milestone is not the final submission. This is the first Step 2 presentation milestone; further redesign awaits owner feedback.
