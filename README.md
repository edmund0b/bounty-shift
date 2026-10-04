# Bounty Shift — Phase 4: Bounty Rounds

Extends the working Phase 1–3 project at https://github.com/edmund0b/bounty-shift. The public deployment remains https://bounty-shift.onrender.com. One Node.js service serves the React/Canvas frontend and WebSocket server. No dependencies, hosting settings, or multiplayer architecture were replaced.

Phase 4 follows the updated individual-target rules: every player secretly hunts another player. This is different from the original single Bounty versus Hunters concept. There are no multi-round matches, radar/scans, weapons, sound, cosmetics, or final art in this milestone.

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
2. Everyone readies up; only the host can start the Bounty round.
3. Read your private `BOUNTY: name` HUD. Nobody can target themselves.
4. Knock out that player to earn one Bounty elimination. Knockouts of anyone else earn zero. You can still fight any opponent.
5. After a successful Bounty knockout, your target is reassigned. With two players, it must remain the same opponent; wait for their respawn. With more players, reassignment prefers a different connected opponent, then living candidates within that group. Multiple players may hunt the same person after reassignment.
6. Play until the server's 90-second timer expires. Movement and combat freeze; the leaderboard ranks successful Bounty eliminations. Ties share ranks (for example 1, 1, 3).
7. Results last five seconds, then everyone returns to the lobby with readiness cleared. Ready up to play another independent round. There is no match total or automatic next round.

The host can return everyone to the lobby early, cancelling the current round. If a permanent departure leaves fewer than two players during play, the round is cancelled and the remaining player returns to the lobby without a fabricated winner.

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
- Respawning preserves your target and round progress. Reconnecting preserves identity, target, progress, health, KO, and cooldown while the server remains alive.
- Disconnected players remain vulnerable during the existing ten-second reconnect window. Their targets remain valid. Permanent departures repair affected targets without awarding elimination credit. Departed participants remain in the end-of-round ranking.

## Multiplayer authority and target privacy

Clients send movement, dash, and attack intent only. The server runs about 30 Hz and sends about 15 Hz authoritative snapshots. Shared movement prediction/reconciliation and remote interpolation are preserved. The server owns collision, hit detection, health, KO attribution, respawn, private targets, objective counts, deadlines, and results.

`Player.targetId` and objective progress are server-only fields. Each outgoing state/welcome is serialized for its recipient. The public player array never includes target assignments or reconnect tokens. A client receives only its own target's ID/name and its own elimination count under `room.objective`. Completed results contain everyone's counts, but no target relationships. Positions/health remain public, as in Phase 3; this is not server fog of war.

Initial assignment uses a shuffled circular order: each player receives one other player, with one incoming target relationship per player. Reassignment does not preserve that one-to-one incoming property; it only guarantees a valid non-self target. This avoids introducing permanent elimination or complicated target chains.

The server checks the absolute deadline before processing movement/damage on a tick. Pending attacks at or after expiry cannot earn credit. Results are a frozen server snapshot. Round constants live in `shared/rounds.ts`; no gameplay endpoint lets clients choose targets, health, damage, credit, duration, or results.

## Exact Phase 4 changed files

| File | Change |
| --- | --- |
| `shared/rounds.ts` | New round constants and public/private round types |
| `shared/game.ts` | Results phase and recipient objective/round snapshots |
| `server/rooms.ts` | Private assignment, credited KO attribution, reassignment, timer/results, departure repair |
| `server/index.ts` | Phase 4 log and health label |
| `src/main.tsx` | Target/count/timer HUD, results screen, updated rules |
| `src/style.css` | Temporary objective HUD style |
| `tests/rounds.test.ts` | New target/round/privacy/credit/lifecycle coverage |
| `tests/multiplayer.test.ts` | Phase label and real WebSocket private-target/result checks |
| `README.md` | Rules, deployment procedure, public test checklist |

`shared/map.ts`, `shared/combat.ts`, `src/Arena.tsx`, movement/combat tests, package dependencies, lockfile, build commands, and deployment configuration are unchanged.

## Upload into the existing GitHub repository

1. Download and extract `Bounty_Shift_Phase_4.zip`.
2. Open https://github.com/edmund0b/bounty-shift and select the existing deployed branch, normally `main`.
3. Choose Add file → Upload files.
4. From inside the extracted `bounty-shift` folder, drag the folders `server`, `shared`, `src`, `tests`, and the file `README.md` into the upload area. Folder drag-and-drop preserves nested paths. The unchanged files inside those folders are included deliberately.
5. Do not upload the ZIP or enclosing `bounty-shift` folder itself. Do not flatten paths. Do not upload `node_modules`, `dist`, or `.git`.
6. Check paths include `server/rooms.ts`, `shared/rounds.ts`, `src/main.tsx`, and `tests/rounds.test.ts`. If they show only filenames or a nested `bounty-shift/server/...`, cancel and fix the upload before committing.
7. Commit to the existing deployed branch using `Add Phase 4 bounty rounds`.
8. Verify the new files `shared/rounds.ts` and `tests/rounds.test.ts` appear at those exact repository paths.

If using Git instead, copy those folders/file into your existing checkout, inspect changes, then:

```sh
git status
git add README.md server shared src tests
git commit -m "Add Phase 4 bounty rounds"
git push origin main
```

Use your actual deployed branch if different. Do not create a new repository or service.

## Redeploy the existing Render service

1. Open the existing Bounty Shift Web Service in the Render dashboard.
2. Auto-deploy should run after the GitHub commit. If disabled, choose Manual Deploy → Deploy latest commit.
3. Keep build `npm ci --include=dev && npm run build`, start `npm start`, `NODE_ENV=production`, and existing service/root-directory settings. No configuration or billing changes are needed.
4. Wait for Live and confirm Render shows the new commit.
5. Reload both devices at https://bounty-shift.onrender.com. Existing rooms expire on redeploy; create a fresh room.
6. Confirm the header says `Phase 4 · Bounty rounds`. https://bounty-shift.onrender.com/health should report `{"ok":true,"phase":4}`.

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
- Let the full 90 seconds expire. Both screens enter results together, with identical counts/ranks. Movement and attack inputs cannot alter the results.
- Check ties (including everyone on zero). Results show shared ranks and return everyone to lobby after five seconds.
- Ready/start again: health/resources/progress reset and new valid targets are assigned.
- Host returns everyone to lobby mid-round; ready states/targets clear. Test host reconnect/transfer and a permanent target departure with three players; affected targets repair without free credit.
- With two players, let one leave permanently: the remaining player returns to lobby cleanly.
- On mobile, verify direction, Sprint, Dash, and Attack remain usable.

Phase 4 is ready for deployment/testing, not publicly accepted until this checklist passes. Report device/browser, the inputs used, and what each screen showed.

## Validation and known limits

The production build and 27 automated tests pass, including actual independent WebSocket clients. Tests cover prior movement/combat regressions plus 2–6 private assignments, no self-targets, target/non-target credit, reassignment, mutual and multiple lethal contributors, protected respawn, expiration freeze, shared-rank results, reconnect state, permanent departure repair, and lobby reset.

Browser visual/input QA and public physical-device testing are not claimed by this build. Those remain the owner's acceptance gate. Temporary UI is intentional. No new browser dependency was introduced.

Results disappear after five seconds; no history or persistent match score exists. Basic touch controls are retained. High latency can cause movement corrections and melee misses because hit detection uses current server positions without latency rewind. Render Free sleep/restarts can discard in-memory rooms. Keep one server instance. All player positions are sent to clients; no fog-of-war privacy guarantee exists yet. Target assignments themselves are recipient-private, but players can of course tell one another their targets outside the game.

## Challenge deadline

October 31, 2026 at 11:59 PM Pacific. Final submission needs title, public URL, and preview screenshot. This single-round milestone is not the final submission. Phase 5 has not begun.
