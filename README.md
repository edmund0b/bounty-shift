# Bounty Shift — Phase 5: Complete Match Flow

Extends the working Phase 1–4 project at https://github.com/edmund0b/bounty-shift. The public deployment remains https://bounty-shift.onrender.com. One Node.js service serves the React/Canvas frontend and WebSocket server. No dependencies, hosting settings, or multiplayer architecture were replaced.

Phase 5 follows the updated individual-target rules: every player secretly hunts another player. This is different from the original single Bounty versus Hunters concept. This milestone adds three-round matches; radar/scans, weapons, sound, cosmetics, and final art remain out of scope.

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
| Move | WASD / arrows | Directional buttons |
| Sprint | Hold Shift while moving | Hold Sprint plus direction |
| Dash | Space | Tap Dash |
| Melee | Click inside arena to aim; F attacks facing forward | Tap Attack facing forward |

- Camera follows your player, shown with a white ring. Nearby other players render normally.
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

## Exact Phase 5 changed files

| File | Change |
| --- | --- |
| `shared/rounds.ts` | Match constants/types and private match totals |
| `shared/game.ts` | Intermission/complete phases and match snapshots |
| `server/rooms.ts` | Match lifecycle, persistent credit, round reset/transition, final ranking |
| `server/index.ts` | Phase 5 log and health label |
| `src/main.tsx` | Round number, round/match totals, countdown, final winner/tie screen |
| `tests/rounds.test.ts` | Existing round tests adapted to automatic next round |
| `tests/match.test.ts` | New complete-match, totals, reset, tie, reconnect, departure tests |
| `tests/combat.test.ts` | Spawn revision assertion updated for round initialization |
| `tests/multiplayer.test.ts` | Phase label, intermission state, spawn revision checks |
| `README.md` | Rules, deployment procedure, public test checklist |

`shared/map.ts`, `shared/combat.ts`, `src/Arena.tsx`, `src/style.css`, movement tests, package dependencies, lockfile, build commands, and deployment configuration are unchanged.

## Upload into the existing GitHub repository

1. Download and extract `Bounty_Shift_Phase_5.zip`.
2. Open https://github.com/edmund0b/bounty-shift and select the existing deployed branch, normally `main`.
3. Choose Add file → Upload files.
4. From inside the extracted `bounty-shift` folder, drag the folders `server`, `shared`, `src`, `tests`, and the file `README.md` into the upload area. Folder drag-and-drop preserves nested paths. The unchanged files inside those folders are included deliberately.
5. Do not upload the ZIP or enclosing `bounty-shift` folder itself. Do not flatten paths. Do not upload `node_modules`, `dist`, or `.git`.
6. Check paths include `server/rooms.ts`, `shared/rounds.ts`, `src/main.tsx`, and `tests/match.test.ts`. If they show only filenames or a nested `bounty-shift/server/...`, cancel and fix the upload before committing.
7. Commit to the existing deployed branch using `Add Phase 5 complete match flow`.
8. Verify the new file `tests/match.test.ts` appears at that exact repository path.

If using Git instead, copy those folders/file into your existing checkout, inspect changes, then:

```sh
git status
git add README.md server shared src tests
git commit -m "Add Phase 5 complete match flow"
git push origin main
```

Use your actual deployed branch if different. Do not create a new repository or service.

## Redeploy the existing Render service

1. Open the existing Bounty Shift Web Service in the Render dashboard.
2. Auto-deploy should run after the GitHub commit. If disabled, choose Manual Deploy → Deploy latest commit.
3. Keep build `npm ci --include=dev && npm run build`, start `npm start`, `NODE_ENV=production`, and existing service/root-directory settings. No configuration or billing changes are needed.
4. Wait for Live and confirm Render shows the new commit.
5. Reload both devices at https://bounty-shift.onrender.com. Existing rooms expire on redeploy; create a fresh room.
6. Confirm the header says `Phase 5 · Complete match flow`. https://bounty-shift.onrender.com/health should report `{"ok":true,"phase":5}`.

## Public two-device acceptance checklist

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
- On mobile, verify direction, Sprint, Dash, and Attack remain usable.

Phase 5 is ready for deployment/testing, not publicly accepted until this checklist passes. Report device/browser, the inputs used, and what each screen showed.

## Validation and known limits

The production build and 31 automated tests pass, including actual independent WebSocket clients. Tests cover prior movement/combat regressions plus 2–6 private assignments, no self-targets, target/non-target credit, reassignment, mutual and multiple lethal contributors, protected respawn, expiration freeze, shared-rank results, reconnect state, permanent departure repair, and lobby reset.

Browser visual/input QA and public physical-device testing are not claimed by this build. Those remain the owner's acceptance gate. Temporary UI is intentional. No new browser dependency was introduced.

Completed-round score history is held in memory during the match. Final results stay until host return; no cross-match persistence exists. Basic touch controls are retained. High latency can cause movement corrections and melee misses because hit detection uses current server positions without latency rewind. Render Free sleep/restarts can discard in-memory rooms. Keep one server instance. All player positions are sent to clients; no fog-of-war privacy guarantee exists yet. Target assignments themselves are recipient-private, but players can of course tell one another their targets outside the game.

## Challenge deadline

October 31, 2026 at 11:59 PM Pacific. Final submission needs title, public URL, and preview screenshot. This match-flow milestone is not the final submission. Phase 6 has not begun.
