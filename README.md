# Bounty Shift — Phase 2: Arena Movement

An extension of the deployed Phase 1 multiplayer foundation in https://github.com/edmund0b/bounty-shift. Phase 1 was approved after the owner tested rooms, readiness, live movement, lobby return, and reconnects on separate devices. Phase 2 adds a flat city arena, collision, following camera, sprint/stamina, and dash. There is still no combat, Bounty selection, damage, scoring, rounds, radar, sound, weapons, or final art.

## Local quick start

Node.js 22 or newer. In the repository folder:

```sh
npm ci --include=dev
npm run build
npm test
npm start
```

Open http://localhost:3000 in two independent tabs/windows. The build comes before tests because the HTTP integration test checks the production frontend assets. For development, run `npm run dev`. `PORT` overrides the default 3000. Production remains one Node.js service serving frontend and `/ws` on one URL.

## Controls and test rules

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Directional buttons |
| Sprint | Hold Shift while moving | Hold Sprint plus a direction |
| Dash | Press Space | Tap Dash |

- 2–6 connected players; everyone, including host, must be ready.
- Only the host starts the arena session and returns everyone to the lobby.
- The camera follows your player (white ring), clamped at world edges. It does not show the whole map. Other players render when nearby.
- Buildings are solid and cannot be crossed with walking, sprint, or dash. Players do not collide with one another yet.
- Walk: 220 world pixels/second. Sprint: 330 pixels/second.
- Stamina starts at 100, drains at 28/second while sprinting, and regenerates at 22/second after a 0.6-second delay. Exhaustion ends sprint; release Shift/Sprint before starting again. Sprinting into a wall still uses stamina.
- Dash: 850 pixels/second for 0.18 seconds, up to 153 pixels if unobstructed, with a three-second cooldown. It follows current movement or, while idle, last facing direction. Dash does not grant invulnerability.
- Pressing dash during cooldown is discarded, not queued. Holding Space does not repeat dash. A short line indicates an active dash; the HUD shows ACTIVE, remaining cooldown, and READY.
- There is no winner in this arena test. The purpose is to validate pursuit routes and synchronized movement.

## City layout

The 2000 × 1440 flat map has a central plaza, eight major building blocks, two utility structures, inner alley routes, connecting cross streets, and an outside loop. Shared spawn positions are separated and collision-free in the plaza. Buildings have simple names and colored edges to establish orientation; these are prototype geometry, not final art. The rooftop-labeled block is a solid structure, with no additional floor or jumping system. There are no layered tunnels.

Collision uses the player radius as clearance around rectangular buildings, with axis sliding and movement steps no larger than five pixels. Dash uses the same collision routine. Corners have slightly conservative square clearance rather than exact rounded circle contact.

## What changed

- `shared/map.ts` (new): world layout, solid structures, safe spawns, camera bounds.
- `shared/game.ts`: shared collision and movement/ability simulation, stamina/cooldown state, protocol fields.
- `server/rooms.ts`: authoritative abilities, input validation, ability snapshots, safe spawns; room/lobby/host/reconnect behavior retained.
- `server/index.ts`: health/status labels updated to Phase 2; deployment transport unchanged.
- `src/Arena.tsx` (new): following camera, map rendering, remote interpolation, dash feedback, temporary movement HUD.
- `src/main.tsx`: shared prediction/reconciliation and new keyboard/touch controls; original lobby flow retained.
- `src/style.css`: temporary movement HUD and ability button styling.
- `tests/movement.test.ts` (new): wall/dash collision, route connectivity, stamina, cooldown, camera, prediction agreement, forged input rejection, reconnect state.
- `tests/multiplayer.test.ts`: existing integration regression checks plus synchronized sprint/dash snapshots.

The server still simulates at about 30 Hz and broadcasts at about 15 Hz. Clients send directions and sprint intent, plus monotonically increasing dash request IDs and input sequence numbers. They cannot submit authoritative positions, stamina, or cooldowns. The server consumes each dash request once and validates cooldown. Prediction replays unacknowledged inputs using the same map and movement simulation. Snapshots contain authoritative ability state. Reconnecting preserves stamina and cooldown; starting a fresh test resets them.

## Update the existing GitHub repository

Do not create a replacement repository or Render service.

### Browser upload method

1. Download and extract the Phase 2 ZIP on your computer.
2. Open https://github.com/edmund0b/bounty-shift and select your existing deployed branch (normally `main`).
3. Choose **Add file → Upload files**.
4. Drag the folders `server`, `shared`, `src`, `tests`, and `README.md` from inside the extracted folder into the upload area. Use drag-and-drop folders so their paths are retained. Do not upload the ZIP or enclosing folder. Do not upload `.git`, `node_modules`, or `dist`.
5. Confirm the upload paths include `server/rooms.ts`, `shared/map.ts`, `src/Arena.tsx`, and `tests/movement.test.ts`. If paths are flattened, cancel and ask for help before committing.
6. Enter `Add Phase 2 city movement, sprint and dash`. Commit to the existing deployed branch.
7. Confirm GitHub has those files at the same paths. Existing files should be replaced, and the three new files should be added. No deployment setting or dependency change is required.

### Git method, if you already have Git installed

Clone the existing repository, copy the extracted updated files into that checkout, then use:

```sh
git status
git add README.md server shared src tests
git commit -m "Add Phase 2 city movement, sprint and dash"
git push origin main
```

Use your actual deployed branch if it is not `main`. Inspect `git status` first; do not delete the repository or old commits.

## Update the existing Render deployment

1. Open your existing `bounty-shift` Web Service in the Render dashboard.
2. If auto-deploy is enabled, the GitHub commit should start deployment. Otherwise choose **Manual Deploy → Deploy latest commit**.
3. Keep the same service, Free instance, region, and public URL. Build: `npm ci --include=dev && npm run build`; start: `npm start`; `NODE_ENV=production`; root directory empty; optional health check `/health`.
4. Wait for **Live**, and verify the deployment references the new commit.
5. Open the public game link, which ends in `.onrender.com`. A `dashboard.render.com/...` address is the management page, not the game.
6. Reload both devices after deployment. Previous rooms are temporary and will expire across the server restart. Create a fresh room.
7. Confirm the screen says **Phase 2 · Arena movement test**. `/health` now reports `phase: 2`.

## Phase 2 public two-device acceptance checklist

Use the same public URL on two devices, preferably one on Wi-Fi and one on cellular.

1. Create/join a room; confirm names, host, readiness, and start requirements still work.
2. Enter the arena; confirm both players spawn in the central plaza.
3. Move away from spawn; confirm the camera follows and map content extends beyond the view.
4. Meet up again; confirm each screen sees the other player's movements when nearby.
5. Try walking and sprinting into every side of a building; neither should pass through.
6. Move diagonally against walls and corners; verify sliding without clipping or getting stuck.
7. Hold Shift while moving; confirm increased speed and stamina drain. Release it; confirm delayed regeneration. Exhaust stamina; confirm normal movement continues and sprint resumes after release/recharge.
8. Press Space while moving in different directions; confirm a short burst. Press again before three seconds; confirm no second dash. Wait for READY and try again.
9. Dash directly into buildings, at corners, and along map edges; verify no wall penetration or out-of-bounds movement.
10. Sprint/dash simultaneously near the other player. Stop and compare positions. Verify no persistent disagreement or teleporting through walls.
11. Refresh during a cooldown; reconnect should preserve identity and remaining stamina/cooldown, not create a duplicate or reset abilities.
12. Return to lobby and start again; confirm clean spawns, full stamina, and available dash.
13. Repeat with 3–6 players when possible. On phones, check movement plus Sprint and Dash buttons.

Phase 2 remains awaiting acceptance until this public test passes. Send the game URL and any issues with device/browser, input sequence, and what each screen showed. A screenshot/video of clipping or desync is useful.

## Validation and limits

- Automated checks cover the existing real WebSocket room flow, two-client matching snapshots with sprint/dash, six-player capacity, wall blocking from every side, fast movement collision, diagonal wall sliding, connected map routes, stamina exhaustion/recovery, dash cooldown, camera clamping, prediction agreement, ability spoof rejection, and reconnect state.
- Browser visual/input verification is not claimed unless separately reported. A browser executable was not available during the original build workflow; public physical-device testing is the final acceptance gate.
- All player positions are still delivered to each client, although the camera only renders nearby players. This is not server-enforced fog of war or hiding; that belongs to a later phase.
- No player-player collision, combat, invulnerability, or role-based abilities.
- Basic touch controls are retained, with temporary Sprint/Dash buttons. Mobile browser suspension can exceed the ten-second reconnect window.
- Render Free may sleep or restart. Rooms disappear on server restart/redeploy. Use one server instance; no scaling/database/account infrastructure was added.
- High latency can cause visible corrections; please report persistent jitter. Position interpolation avoids drawing a player inside a solid block by snapping to its valid authoritative position when necessary.

## Challenge deadline

October 31, 2026 at 11:59 PM Pacific. Final deliverables will be title, public game URL, and preview screenshot. This Phase 2 movement milestone is not the finished game submission.
