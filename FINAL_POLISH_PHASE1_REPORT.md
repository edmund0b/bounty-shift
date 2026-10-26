# Bounty Shift — Final Gameplay Polish, Phase 1

Shared movement presentation, attack visual cleanup and Tag Run. Built on the supplied Bounty_Shift_Tag_Run_Polish_01_Final.zip (SHA-256 17bff1937c921fc96574069230781278524a72f5683788495664a63bc876e4e9). The complete pre-edit backup was saved before source changes. No Flag Run or Kill Race mode-specific redesign was undertaken. This report supersedes earlier release notes for this phase.

## Changes and genuine defects addressed

1. Removed the shared arena's old filled RingGeometry attack sector. This was the pale triangular/fan-shaped range visualization. It was created for every avatar and toggled by attackFlash, so it could appear for unarmed, melee and gun actions in all modes. The mesh and its material/geometry/visibility code are removed entirely from live rendering. No production setting can re-enable it. Existing Workshop joint/axes tools remain hidden and separate.
2. Removed the translucent red `tagger-aura` cylinder. Inspection found this was an IT presentation mesh, not an authoritative hitbox; viewed from the side it appeared as a translucent panel. No independent red rectangular targeting hitbox was found. IT identity remains red through a slightly clearer ground ring, a compact overhead IT marker, the existing nameplate and YOU ARE IT HUD. The ground ring keeps its red IT identity even when spawn protection would otherwise make it yellow. Legitimate weapon trails, muzzle flashes, reticles, utility telegraphs and health-hit feedback remain.
3. Fixed the Tag animation trigger. The old reach watched attackSeen, which acknowledges rejected input counters as well as accepted attacks. Rapid cooldown presses could restart the animation. The server now exposes unarmedSerial/unarmedAt only when it actually accepts an unarmed swing. The client samples that fixed timestamp, without restarting on duplicate snapshots, rejected inputs or cooldown spam. Weapon actions and utility throws retain their own animation paths.
4. Refined the existing rig-based Tag reach: 0–0.08 s anticipation, 0.08–0.20 s extension, 0.20–0.35 s recovery. It blends over the current upper-body pose and turns modestly toward the accepted aim direction. It does not change root position, hips, legs, collision or input. Running, crouching, jumping and sliding remain available. A missed accepted attempt still plays the reach. All eight skin rigs are covered by tests; there is no generic sword swing replacement.
5. Replaced the old expanding Tag feedback sphere (up to about one metre radius over 1.6 seconds) with a small 220 ms contact accent (maximum 0.11 m radius). The authoritative server event carries the midpoint between the two players at chest height; it does not depend on an arbitrary local crosshair or client-claimed hit. Only successful transfers emit this event. Existing short Tag tones are retained, limited to fresh events, and the existing notice now distinguishes TAG PASSED from YOU ARE IT. Failed attempts cannot create a successful-contact notice or effect.
6. Fixed a reproduced shared presentation defect: 30 Hz predicted movement was copied directly into the 60/120 Hz rendered avatar. Calculating animation speed from those steps alternated moving and zero-speed samples, continually switching run/idle and interrupting gait blends. AvatarMotion now interpolates render position and smooths translated gait speed. It uses actual elapsed render time for speed, including slow frames; the camera's capped smoothing dt does not accelerate gait. Spawn resets and large teleports snap deliberately instead of animating as a sprint. Ground support/collision checks still constrain rendered interpolation. The same visual adapter serves local and remote players in all modes; the authoritative motion, prediction, reconciliation and network rates are unchanged.
7. Corrected the camera's five-ray footprint to use directions perpendicular to the camera arm, rather than world X/Y offsets that miss grazing side walls at some yaw angles. Added conservative cached world bounds to filter distant solids before raycasting. Reused scratch vectors/intersection storage; updated bounds when a solid's world transform changes. Existing camera distance, pitch, smoothing, floor clearance, shoulder/ADS behavior and controls remain. Projection matrices update only when field of view changes (or the viewport resizes), and recurring hit/freeze colors are reused.
8. Fixed an observed Tag mobile HUD overlap: later CSS had fixed the health panel over the bottom of the objective. Tag touch health now follows the objective in its existing HUD stack; duplicated keyboard hint text is hidden on touch, and portrait utility placement clears the stack. Existing controls, minimap and loadout positions stay intact. Layout assertions cover utility/objective/health/joystick/loadout separation at the tested sizes. The local minimap marker now keeps a red IT fill instead of covering its IT dot with a neutral local marker.

## What did not change

All five maps, all eight characters/skins, character selection, room codes, ready/lobby flow, WebSocket architecture, weapon models and animations, melee/firearm damage, pickups, power-ups, workshops, inventory, map rotation, scoring definitions and match systems remain present. Tag Polish 01's 10-second crate respawn, five-box cap, 45-second Sticky Trap, 14-second Smoke Screen with 25% larger radius, and Portal Pair fixes are retained.

Tag range remains 80 units, half-angle remains 60 degrees, unarmed cooldown remains 0.6 seconds, and previous-IT immunity remains two seconds. Server checks still require the eligible connected/live IT side, a valid opponent, range/orientation, clear solid-geometry line of sight, no protection/seal/invisibility restrictions being violated, and a fresh action. One input cannot yield multiple successful transfers. No hitbox/range widening, rewind, new lag-compensation rule or scoring rebalance was added. The network test includes an actual approximately 60 ms delayed request; real WAN latency/loss and perception during a fast chase still need device playtesting.

IT assignment, transfer counts, time accounting, survivor ranking, the rule that holding IT at zero loses, three 135-second rounds, match wins/results, disconnect grace and return-to-lobby behavior were audited and regression tested. The former IT side loses IT immediately and retains its existing anti-immediate-retag immunity. Disconnecting IT does not discard the role during reconnect grace. No win-condition defect was found requiring a rule change.

## Files changed

| Existing file | Change |
|---|---|
| server/rooms.ts | Timestamp/serial for accepted unarmed swings; include them in synchronized player views |
| server/tag-run.ts | Contact position in an existing successful-transfer event only |
| shared/combat.ts | Optional accepted-unarmed presentation fields and reset defaults; combat constants unchanged |
| src/scene.ts | Remove range sector/red cylinder; IT marker/ring, shared visual movement adapter, accepted Tag reach, allocation/projection improvements; actual-render diagnostics |
| src/tag-animation.ts | Short layered reach and accepted-swing age helper |
| src/camera.ts | Perpendicular near-plane footprint, cached conservative broad phase and reused scratch storage |
| src/Arena.tsx | Pass local identity to existing minimap |
| src/Minimap.tsx | Correct IT key lookup and local IT marker presentation |
| src/ModeHud.tsx | Existing IT state attribute and compactable duplicated control hint |
| src/TagHud.tsx | Existing server-confirmed Tag notice, no independent Tag/IT state |
| src/TagVisuals.ts | Tiny brief successful-contact effect; fresh-event Tag sound guard |
| src/tag-run.css | Scoped Tag mobile overlap correction |

New implementation: src/avatar-motion.ts. New verification: tests/final-polish.test.ts, tests/final-polish-network.test.ts, scripts/final-polish-browser-qa.mjs, scripts/profile-camera.mjs, scripts/profile-gait.mjs. README.md, DEPLOYMENT_STATUS.md, FINAL_POLISH_PHASE1_STATUS.md, FINAL_POLISH_PHASE1_REPORT.md and final-polish-verification/ contain current release documentation/evidence. Production build outputs are included. package.json and package-lock.json are unchanged; no dependency was added.

## Executed test results

| Check | Result |
|---|---|
| Final production build (TypeScript + Vite + server bundle) | Passed; existing large-chunk warning only |
| Full final automated suite | 373 passed, 0 failed, 0 skipped; 143.2 seconds |
| Focused final unit + real two-client network cases | 17 passed, 0 failed; 4.6 seconds |
| Final desktop + mobile-touch browser run | All eight scenario groups passed; zero page/shader errors |
| Six live WebSocket client regression | Passed in the full suite, including real crate/smoke/trap timers and synchronization |
| All five map movement regressions | Passed |
| All eight skin / upper-body Tag layering regressions | Passed |
| Extracted packaged production build | HTTP health/index/hashed assets and two-client start/accepted-unarmed/Tag transfer passed |
| Preservation audit | 74 protected source files byte-identical; no source deletion |


The six-client tests inherited from Polish 01 were rerun as part of the full suite. They exercise actual 10-second refill, 14-second smoke and 45-second trap expiry over real sockets. New focused tests add all-map movement/camera-relative normalization, sprint stamina/release, dash duplication/collision behavior, jump/landing, crouch/slide recovery, render gait stability, camera corner footprint/cache refresh, all-skin lower-body preservation, accepted-swing cooldown spam, misses/walls/freeze rejection, exact contact lifetime/location, utility-throw separation, reconnect and scoring.

Browser setup uses two independent contexts: desktop 1280x720 and touch/mobile 844x390, with additional touch layout checks at 390x844 and 640x360. It uses the actual login/create/join/ready/start/character-selection UI, desktop F/keyboard movement and mobile Attack. It verifies real two-second anti-retag immunity, actual rendered IT markers and reach samples, successful feedback, missed attempts, sprint/Tag, jump/landing, double-space dash, crouch/stand, hold-slide exit, map dismissal, three-round results/return-to-lobby, and unarmed/melee/firearm attacks without debug sectors in all three modes. Browser fixtures set reachable player positions, inventory items and test round time; three-round progression is accelerated inside the test process. No fixture endpoint is exposed by the production server.

Browser VFX inspection is in Central Plaza with two character skins. All-map and all-eight-skin coverage comes from automated tests, not a claim that every combination was manually played. Browser rendering uses SwiftShader at reduced device pixel ratio; this verifies interaction and render correctness, not physical mobile performance. No page or shader error is allowed in the successful browser run. Internal screenshots were inspected; they are not separate deliverables.

Early verification found and corrected test-harness sequence reuse, a TypeScript annotation issue that temporarily left an older browser bundle, and transient-notification timing assertions. The final build and results below use the corrected files; those resolved harness failures are not outstanding gameplay defects.

## Measurements

| Benchmark | Before | After |
|---|---|---|
| 2,000 camera constraints against 240 solids, one local run | 193.0 ms | 64.8 ms |
| False idle frames during 1.5 s steady movement, 60 Hz display | 45 | 0 |
| False idle frames during 1.5 s steady movement, 120 Hz display | 135 | 0 |
| Spurious gait state changes over that interval | 90 | 0 |


Camera timings are a small synthetic CPU benchmark with 240 static solids, 2,000 constraints and the same Node host. They are not a whole-game FPS result. Broad-phase filtering is conservative; it does not remove map geometry or reduce collision checks in gameplay. Gait measurements count false idle frames/state transitions during continuous movement after the initial half-second warm-up. Scene resources and animation buffers are reused; no new physics particle simulation, full-screen postprocess or network architecture was added.

## Remaining issues and limitations, ranked

- Critical/high: no unresolved defect identified in the executed checks. This is not a guarantee against issues outside that coverage.
- Medium: physical iOS/Android and desktop GPU performance, actual multi-device internet latency/loss, and long-session memory/network soak remain manual checks. Software-rendered browser timing cannot establish hardware FPS. Camera collision is still a lightweight five-ray footprint, not a complete swept-volume camera solver for every possible map corner.
- Low: the existing Vite large-chunk warning remains. No broad bundling or environment-detail reduction was attempted in this focused pass.

No further mode-specific work was started. Human Tag Run chase/balance playtesting on at least two real devices is the recommended next review step.

## Run and deploy

Requires Node.js 22 or later, as specified by the existing project. Extract the complete ZIP and run:

```sh
cd bounty-shift
npm ci
npm run build
npm start
```

Open http://localhost:3000, create a room, join its code from a second client, ready both, start and equip characters. For a second device on your network use the host computer's LAN address and allow its server port through the local firewall. Existing controls remain: WASD/arrows; hold Left Shift to sprint; Space jump, double Space dash; X toggle crouch/hold slide; Z dodge; F/click attack; mouse look and Q/C fallback; Escape releases cursor; joystick/right swipe and existing touch actions on mobile. Weapon-specific controls remain unchanged.

```sh
npm test
node --import tsx --test tests/final-polish.test.ts tests/final-polish-network.test.ts
BOUNTY_QA_BROWSER=/path/to/chrome-headless-shell node --import tsx scripts/final-polish-browser-qa.mjs
node --import tsx scripts/profile-camera.mjs
node --import tsx scripts/profile-gait.mjs
```

The browser QA requires a compatible locally installed Chromium executable and writes temporary screenshots/evidence outside the game directory. node_modules is excluded from the ZIP and restored with npm ci; complete source, assets, lockfile, tests, documentation and production build are included. ZIP CRC and packaged-file comparisons are checked; extracted-build startup/assets/two-socket verification is recorded in final-polish-verification/archive-smoke.json.

Deployment status: not deployed. No repository push, production environment change or Render deployment was attempted. To deploy after review, commit this project to the existing repository/service, retain Render's existing service and environment settings, use build command `npm ci && npm run build` and start command `npm start`, deploy the reviewed commit, then verify `/health` and a two-device room/create/join/start/Tag flow. Do not create a second multiplayer service or replace its room architecture. Earlier deployment URLs/status reports in the archive are preserved historical records, not proof that this release is live.
