# Bounty Shift — Phase 3: Combat

An extension of the deployed Phase 1 multiplayer foundation in https://github.com/edmund0b/bounty-shift. Phase 1 was approved after the owner tested rooms, readiness, live movement, lobby return, and reconnects on separate devices. Phase 2 was deployed and approved after a public two-device test. Phase 3 extends it with health, melee, damage, knockouts, and respawning. There is still no Bounty selection, scoring, rounds, radar, sound, weapons, or final art.

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
| Attack | Left click inside arena to aim at cursor; F uses movement facing | Tap Attack toward movement facing |

- 2–6 connected players; everyone, including host, must be ready.
- Only the host starts the arena session and returns everyone to the lobby.
- The camera follows your player (white ring), clamped at world edges. It does not show the whole map. Other players render when nearby.
- Buildings are solid and cannot be crossed with walking, sprint, or dash. Players do not collide with one another yet.
- Walk: 220 world pixels/second. Sprint: 330 pixels/second.
- Stamina starts at 100, drains at 28/second while sprinting, and regenerates at 22/second after a 0.6-second delay. Exhaustion ends sprint; release Shift/Sprint before starting again. Sprinting into a wall still uses stamina.
- Dash: 850 pixels/second for 0.18 seconds, up to 153 pixels if unobstructed, with a three-second cooldown. It follows current movement or, while idle, last facing direction. Dash does not grant invulnerability.
- Pressing dash during cooldown is discarded, not queued. Holding Space does not repeat dash. A short line indicates an active dash; the HUD shows ACTIVE, remaining cooldown, and READY.
- There is no winner or score in this combat test. The purpose is to validate melee, damage, knockouts, respawn, and synchronized movement.

## Phase 3 combat rules

- Everyone starts at 100 health. A valid strike deals 25 damage.
- Melee checks an 80-pixel center-to-center range and a 120-degree forward arc. Aim toward the target with a canvas click, or use F / touch Attack in the last movement-facing direction.
- Each strike hits at most one player: the closest unprotected, living target in range and arc, with an unblocked line through the buildings. Equal distances use a stable ID tie-break.
- All successful swings and misses use a 0.6-second cooldown. Repeated clicks during cooldown are discarded, not queued. Holding F does not auto-repeat.
- Clients send intent only. The server owns hit detection, damage, health, cooldown, KO, and respawn. No client endpoint accepts damage or health changes.
- Simultaneous swings are gathered from the same server tick before damage is applied. Mutual lethal attacks can both knock out their targets. Multiple attackers can damage the same target in that tick.
- At zero health, a player is knocked out for five seconds and cannot move, sprint, dash, or attack. The camera stays with their KO position until respawn. A KO label and countdown explain the state.
- Respawn restores full health and movement resources. It selects a collision-free plaza spawn with the greatest minimum distance to living opponents. This is a best available position, not guaranteed isolation when all spawn points are occupied.
- Respawn protection lasts 1.5 seconds. The player cannot receive damage during protection; their own accepted attack immediately ends it. Initial session start does not grant protection.
- Dash provides no invulnerability. Sprint and dash can accompany attacks.
- Hit feedback is a white flash, authoritative health bars, and a brief attack arc. The arc is a range indicator and may visually overlap a building; damage is still blocked by the wall.
- Reconnecting retains health, KO countdown, protection, and cooldown while the server is alive. Disconnected players remain vulnerable during the reconnect grace window. Returning to lobby and starting a fresh test resets combat state.

## City layout

The 2000 × 1440 flat map has a central plaza, eight major building blocks, two utility structures, inner alley routes, connecting cross streets, and an outside loop. Shared spawn positions are separated and collision-free in the plaza. Buildings have simple names and colored edges to establish orientation; these are prototype geometry, not final art. The rooftop-labeled block is a solid structure, with no additional floor or jumping system. There are no layered tunnels.

Collision uses the player radius as clearance around rectangular buildings, with axis sliding and movement steps no larger than five pixels. Dash uses the same collision routine. Corners have slightly conservative square clearance rather than exact rounded circle contact.

## Phase 3 files changed

- `shared/combat.ts` (new): combat constants/types, range/arc and building line checks, safe spawn selection.
- `shared/game.ts`: attack intent and authoritative combat fields in shared message types.
- `server/rooms.ts`: health, cooldown, same-tick attacks/damage, KO, protected respawn, state preservation on reconnect.
- `server/index.ts`: Phase 3 health/status labels; transport and deployment unchanged.
- `src/main.tsx`: click/F/touch Attack, combat instructions, KO/respawn prediction resets.
- `src/Arena.tsx`: attack arc, hit flash, health bars, KO/protection feedback, temporary combat HUD, snapping on respawn.
- `src/style.css`: temporary combat HUD styling.
- `tests/combat.test.ts` (new): authority, wall/range/cooldown, simultaneous damage, KO/respawn/protection, movement during combat, and reconnect coverage.
- `tests/multiplayer.test.ts`: existing regressions plus two live clients agreeing on damage, KO, reconnect, and protected respawn.
- `README.md`: Phase 3 rules, update procedure, acceptance checklist.

`shared/map.ts`, `tests/movement.test.ts`, package dependencies, build/start commands, and deployment configuration are unchanged. The server still runs about 30 Hz with about 15 Hz snapshots. New attack request IDs are monotonically increasing and consumed once; the client never predicts damage. All combat timers and outcomes appear in authoritative snapshots. The existing shared movement prediction and reconciliation remain in use. KO and respawn clear pending movement prediction to avoid replaying old inputs at a new spawn.

## Update the existing GitHub repository

Do not create a replacement repository or Render service.

### Browser upload method

1. Download and extract the Phase 3 ZIP on your computer.
2. Open https://github.com/edmund0b/bounty-shift and select your existing deployed branch (normally `main`).
3. Choose **Add file → Upload files**.
4. Drag the folders `server`, `shared`, `src`, `tests`, and `README.md` from inside the extracted folder into the upload area. Use drag-and-drop folders so their paths are retained. Do not upload the ZIP or enclosing folder. Do not upload `.git`, `node_modules`, or `dist`.
5. Confirm the upload paths include `server/rooms.ts`, `shared/combat.ts`, `src/Arena.tsx`, and `tests/combat.test.ts`. If paths are flattened, cancel and ask for help before committing.
6. Enter `Add Phase 3 melee combat, health and respawning`. Commit to the existing deployed branch.
7. Confirm GitHub has those files at the same paths. Existing files should be replaced, and the two new files should be added. No deployment setting or dependency change is required.

### Git method, if you already have Git installed

Clone the existing repository, copy the extracted updated files into that checkout, then use:

```sh
git status
git add README.md server shared src tests
git commit -m "Add Phase 3 melee combat, health and respawning"
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
7. Confirm the screen says **Phase 3 · Combat test**. `/health` now reports `phase: 3`.

## Phase 3 public multiplayer acceptance checklist

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
11. Refresh during a cooldown; reconnect should preserve identity, health/KO, and remaining stamina/cooldown, not create a duplicate or reset abilities.
12. Return to lobby and start again; confirm clean spawns, full stamina, and available dash.
13. Repeat with 3–6 players when possible. On phones, check movement plus Sprint and Dash buttons.

14. Meet in the plaza. Aim at the other player and attack once: target health should become 75 on both screens. Spam click/F: cooldown must prevent rapid damage.
15. Attack from beyond range or facing away: health should not change. Test opposite sides of a building corner: walls must block damage.
16. Land four separated hits: the target reaches zero, cannot move/sprint/dash/attack, and sees the five-second KO countdown.
17. After respawn, check full health, safe position, and the gold protection ring. Try hitting during protection; health should stay full. The protected player's accepted attack must remove protection.
18. Sprint/dash while attacking, then test simultaneous strikes. Verify identical health/KO outcomes on both screens.
19. Refresh after taking damage or during KO: same identity and combat state should return. Test multiple attackers with 3–6 players if available.

Phase 3 remains awaiting acceptance until this public test passes. Send the game URL and any issues with device/browser, input sequence, and what each screen showed. A screenshot/video of clipping or desync is useful.

## Validation and limits

- Automated checks cover the existing real WebSocket room flow, two-client matching snapshots with sprint/dash, six-player capacity, wall blocking from every side, fast movement collision, diagonal wall sliding, connected map routes, stamina exhaustion/recovery, dash cooldown, camera clamping, prediction agreement, ability spoof rejection, and reconnect state.
- Browser visual/input verification is not claimed unless separately reported. A browser executable was not available during the original build workflow; public physical-device testing is the final acceptance gate.
- All player positions are still delivered to each client, although the camera only renders nearby players. This is not server-enforced fog of war or hiding; that belongs to a later phase.
- No player-player collision, dash invulnerability, weapons, Bounty mechanics, scoring, rounds, or role-based abilities. Melee uses current server positions without latency rewind, so high latency may produce a visible miss/correction.
- Basic touch controls are retained, with temporary Sprint/Dash buttons. Mobile browser suspension can exceed the ten-second reconnect window.
- Render Free may sleep or restart. Rooms disappear on server restart/redeploy. Use one server instance; no scaling/database/account infrastructure was added.
- High latency can cause visible corrections; please report persistent jitter. Position interpolation avoids drawing a player inside a solid block by snapping to its valid authoritative position when necessary.

## Challenge deadline

October 31, 2026 at 11:59 PM Pacific. Final deliverables will be title, public game URL, and preview screenshot. This Phase 3 combat milestone is not the finished game submission.
