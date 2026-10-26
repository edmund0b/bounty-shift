# Bounty Shift — Gameplay Polish & Multiplayer Stability Release Candidate

Foundation: the attached Phase 1 final ZIP, SHA-256 `f44de94b491cb80647df017e3e14cfe272e033205926fdc4ef067e6a07cfe03c`. GitHub main was verified as `b00b52d81bd305b0d95e5b139ddf95f6d00923ea` ("add files2 final gameplay"). Its common files matched the attachment. An untouched pre-update ZIP and an implementation checkpoint were created, checked and saved before final browser testing. No older source replaced a newer implementation.

The release code commit is recorded in the ZIP's `RELEASE_REFERENCE.txt`. It is a local commit on `release/gameplay-stability-2026-10-31`, based on the verified main commit; it has not been pushed or deployed. The source ZIP is the complete current game, not a patch or separate prototype.

## Implemented fixes

### Shared crouching

`MOVEMENT.crouchMultiplier` is 0.45. Normal movement remains 220 units/s; crouch-walking is 99 units/s; sprint remains 330 units/s. Crouch excludes sprint, so holding both cannot yield sprint speed or drain sprint stamina. Camera-relative and diagonal normalization, dash/jump/slide behavior, stamina values and power-up modifiers retain their existing rules. Server motion and client prediction call the same changed function.

The existing bent-knee, lowered-hip crouch clips are retained. Their gait is paced against the new 99-unit reference rather than normal running. Weapon/Tag/flag overlays retain the lower-body pose. The camera smoothly lowers its look target by 0.38 world units during grounded crouching and restores it on standing; ADS FOV, shoulder distance, sensitivity and pitch limits are unchanged.

World collision retains the stable 60-unit full-height body and 14-unit radius. This release does not add low-clearance crawling or dynamic world-collision resizing. Existing gun head/body crouch hit regions remain as implemented. Crouching cannot newly enter a tunnel that would trap the standing character.

### ADS root cause and correction

Right-click previously enabled a finite mouse-cursor fallback and pointer capture without requesting pointer lock. The document mouse-look handler also depended on a secondary activation flag. That path could stop tracking at the window edge or lose continuous look even though ADS remained on.

RMB now requests the same existing pointer-lock mechanism used by normal mouse-look. Mouse movement follows the actual `document.pointerLockElement`, while the existing fallback is retained for denied/unsupported lock. Releasing aim leaves normal look available; Escape still releases the cursor. Mobile remains toggle ADS plus right swipe/left joystick, with independent pointer IDs.

The existing over-the-shoulder zoom, circular reticle, sniper scope, shoulder switching, weapon animations, gun damage, recoil, reload and ammunition are retained. Camera rays and server aim packets still feed the existing authoritative shot system. Origin plausibility, muzzle obstruction, range, firing-rate, ammo/reload and head/body validation were not weakened. Tag Run still excludes firearms under its existing equipment rules; gun tests apply to Flag Run and Kill Race.

### Tag Run

The removed white attack sector and translucent red cylinder remain absent. The accepted-swing 0.35-second upper-body reach and brief server-confirmed contact/audio feedback from Phase 1 remain intact. Misses do not emit successful-contact feedback, and input acknowledgments do not restart an accepted animation.

The floating IT marker now follows the animated head, including crouch/slide posture. The red circle projects to supported ground beneath the player during jumps and follows the existing smoothed rendered position. IT markers hide for disconnected/KO actors; invalid unsupported airborne ground projections are hidden. Transfer removes the previous marker and attaches it to the new IT side. In Duos the existing IT-team semantics intentionally mark eligible teammates; this is not a stale duplicate.

Existing 80-unit range, 60-degree half-angle, 0.6-second unarmed cooldown, two-second former-IT immunity, 135-second rounds, Final Chase and scoring remain unchanged. Server authority, action consumption, geometry checks, time accounting, disconnect grace and three-round results are preserved.

### Flag model, carry and drop

The old carried world flag was positioned above the player's body, producing a pole-through-head appearance. A modest silver pole and gold cloth now attach to the off-hand wrist with the existing arm IK. The model is scaled to approximately the same size as its world pickup, the pole is beside the body, and the cloth extends outward. A small backward tilt and blended grip overlay preserve lower-body idle/walk/run/crouch/jump/slide transitions. KO hides the model; drop/release fades the arm overlay back. Weapon state, damage and movement abilities are unchanged; the off hand prioritizes the carried flag while the weapon remains in the other hand.

Only a spawned/dropped flag has a world model. A carried flag is rendered once on its actual carrier; other clients consume the same server ownership. Models/materials/geometries are disposed when avatars/scenes are removed.

G previously handled only a weapon instance, making it ineffective for an empty-handed flag carrier. G / DROP now drops the carrier's flag first, otherwise the equipped weapon. The mobile loadout exposes DROP FLAG. Ownership, epoch, health and existing action checks remain server-side. A drop removes the carry model, restores the world pickup, cancels capture and preserves inventory. Unsupported airborne drops use existing supported drop placement/fallbacks, rather than leaving a floating uncollectible flag.

### Exact capture rules

Configuration: `shared/flag-capture.ts`.

- Five uninterrupted seconds, using server `startedAt`/`endsAt` timestamps.
- Alive, connected, unfrozen server-confirmed carrier; inside the existing 65-unit capture radius with clear geometry and a valid active round.
- Stationary: no meaningful movement input, no dash/airborne motion; observed speed at most 2 units/s and total drift within 0.5 units of the attempt anchor. Input tolerance is 0.0001 for numerical noise. Deliberate slow movement and cumulative creep reset the attempt.
- Moving, leaving, dropping, KO, disconnect, ownership change, freezing/ineligibility or round end cancels progress. Restart requires a fresh full five seconds.
- Ordinary nonlethal damage alone does not cancel capture. Displacement, KO or another actual eligibility failure does. No unrelated "any damage cancels" rule was added.
- Completion awards the existing one round-win match point exactly once and uses the existing round transition. Clients cannot declare completion or submit elapsed capture time.
- The ordinary Flag round timer remains 90 seconds. The existing timeout runs first: if the round expires before completion (including a completion deadline exactly at the buzzer), no capture or overtime is awarded; the existing no-capture timeout gives no round winner.

Carrier, nearby teammates and nearby opponents receive a countdown/progress bar, respectively CAPTURING FLAG, TEAM CAPTURING FLAG and ENEMY CAPTURING FLAG. Opponent notification range is 500 map units and uses already-public flag ownership/position. Interruption feedback follows the canceled attempt's owner even after dropping. Completion feedback uses the existing result screen. HUD and How to Play explain the new rule.

The capture circle now depicts the existing authoritative 65-unit radius; the previous smaller visual ring did not match that radius. No capture-zone location or gameplay radius was enlarged.

### Weighted map rotation

| Map | Round 2 base weight |
|---|---:|
| Central Plaza | 5 |
| Scorched Point | 24 |
| Aerie Sky-Port | 24 |
| Outlaw's Canyon | 24 |
| Viking's Fjord | 23 |

Round 1 remains Central Plaza, guaranteed. Round 2 uses these weights, including a rare Central Plaza repeat. Round 3 excludes the Round 2 map when alternatives exist and normalizes the remaining weights. Thus the Round 3 conditional probability of Central Plaza is zero if Round 2 was Central Plaza, or roughly 6.5–6.6% otherwise; the table lists weights, not a fixed marginal Round 3 distribution. There is no fixed map sequence.

Selection remains on the existing multiplayer server using cryptographic `randomInt(totalWeight)`. Existing next-map replication, variants, map loading/spawns, score persistence, reconnect and cleanup paths remain. No map geometry, hazards or art was rebuilt.

## Files changed

Existing source/tests:

- `server/modes.ts`
- `server/rooms.ts`
- `shared/game.ts`
- `shared/map-rotation.ts`
- `shared/modes.ts`
- `shared/presentation.ts`
- `src/Arena.tsx`
- `src/EntryFlow.tsx`
- `src/LoadoutHud.tsx`
- `src/ModeHud.tsx`
- `src/ModeLobby.tsx`
- `src/animations/gameplay.ts`
- `src/main.tsx`
- `src/scene.ts`
- `tests/aerie.test.ts`
- `tests/final-polish.test.ts`
- `tests/maps.test.ts`
- `tests/modes.test.ts`
- `tests/outlaw.test.ts`
- `tests/tag-run.test.ts`
- `tests/viking.test.ts`

New source/verification scripts:

- `scripts/flag-quality-check.mjs`
- `scripts/stability-browser-qa.mjs`
- `server/flag-capture.ts`
- `shared/flag-capture.ts`
- `src/FlagCaptureHud.tsx`
- `src/flag-capture.css`
- `src/flag-carry.ts`
- `tests/stability-network.test.ts`
- `tests/stability.test.ts`

Release documentation/evidence: README.md, DEPLOYMENT_STATUS.md, STABILITY_STATUS.md, STABILITY_RELEASE_REPORT.md, stability-verification/. Current production build outputs are included. Historical preview/build files present in the verified GitHub tree but missing from the input ZIP were retained without overwriting current files; they are not a source rollback.

Tests with old uniform-selection or instant-capture expectations were updated to the explicitly requested rules. A test-only flat arena is removed before a real-map round-rotation test; otherwise random selection could choose that fixture without authored anchors. This is test isolation, not a production map change.

## Executed verification

| Executed check | Result |
|---|---|
| Final complete automated suite | 401 passed, 0 failed, 0 skipped; 150.2 seconds |
| Focused movement/capture/rotation/network run | 27 passed, 0 failed |
| Final carry-pose suite after visual correction | 26 passed, 0 failed, including all-eight-skin upright grip check |
| Earlier targeted mode/map/Tag checks | 97 passed, 0 failed |
| Real two-socket capture tests | Full five-second capture, slow-input/drop/disconnect/reset/resume, exactly-once score and premature timeout passed |
| Browser suite | 27 scenario groups passed; zero page/shader errors |
| Dedicated default-camera carry check | Standing/crouched grip, pickup/drop passed; rendered images inspected |
| Production build | TypeScript + Vite + server bundle passed; existing chunk-size warning remains |
| Fresh extracted install/build | npm ci and npm run build passed |
| Extracted compiled-server smoke | HTTP assets, two-socket Flag match, five actual stationary seconds, one point, synchronized R2/R3/no-repeat/spawns/score passed |
| Preservation | 66 protected map/skin/weapon/power/rule source files byte-identical to the input; no source deletion |


Seeded 500,000 Round 2 selections:

| Map | Count | Measured share |
|---|---:|---:|
| Central Plaza | 25,087 | 5.0174% |
| Scorched Point | 119,840 | 23.9680% |
| Aerie Sky-Port | 120,154 | 24.0308% |
| Outlaw’s Canyon | 119,540 | 23.9080% |
| Viking’s Fjord | 115,379 | 23.0758% |

Exact bucket-count tests additionally verify normalization after excluding each possible Round 2 map. Round 1 was guaranteed throughout the simulation.

The two-client capture test measures five real seconds and verifies very slow movement intent, G drop, disconnect/resume, ownership synchronization, exactly-once score and a separate real timeout before completion. It uses actual sockets and normal input/actions; fixture setup positions players and accelerates initial flag availability. Existing six-client and full-game regressions are rerun in the full suite.

Browser testing uses independent desktop and mobile-touch contexts in the running game. It exercises actual create/join/ready/start/character selection, Tag transfers and IT displays, Final Chase, movement/crouch camera, all four guns' RMB-only pointer lock/horizontal and vertical ADS/strafe/fire/exit, mobile ADS plus simultaneous joystick/right swipe, flag pickup/attachment/G and touch DROP, progress/interruption and five real stationary seconds, results and lobby return. Existing gun validation tests cover reticle/ray/head/body/muzzle-obstruction behavior. Browser fixtures control reachable positions, grants and round clocks; full match progression is accelerated where stated. No test endpoint or client-authoritative gameplay rule is shipped.

The browser suite covers all four guns in both Flag Run and Kill Race, including RMB-only capture, real horizontal/vertical mouse input, strafe/fire/release, sniper scope, and simultaneous two-finger mobile joystick/camera events. The touch session is retained throughout testing so CDP detach cannot silently revert emulation. Tag controls/HUD were checked at 844×390, 390×844 and 640×360; Flag capture/nearby opponent feedback and mobile flag pickup/drop were rendered at 844×390. Physical device/notch behavior and other capture-HUD combinations remain manual checks.

A final visual inspection found and corrected a quaternion aliasing error in the newly added flag overlay: blending used the destination quaternion as both source and destination, restoring the old pose instead of its IK solution. The corrected blend retains the solved hand grip and compensates torso/hip lean to keep the pole upright. The added all-skin crouch/slide orientation regression and the dedicated in-game standing/crouched inspection both passed. Early browser runs also encountered a test-only blocked movement location and transient short-animation sampling under software-rendering load; the final suite uses clear floor and bounded sampling, without changing collision or the 0.35-second Tag animation.

Production build includes TypeScript, Vite and the Node server bundle. The archive is CRC-checked, extracted, installed/built, and smoke-tested using its compiled server. Source/asset comparison evidence is included in `stability-verification/`.

## Preservation and performance

All three modes, all five maps, all eight skins, weapons, power-ups, workshops, room/lobby/character selection, health/KO/respawn, inventory, existing Tag polish, camera/reticle art and match systems are retained. Map, skin and weapon-model/combat source preservation is byte-checked. The server still simulates at 30 Hz and broadcasts at its existing cadence; no new per-frame network messages or animation protocol was introduced.

The flag uses three small meshes and has mutually exclusive world/carried visibility. No new particles, lights, renderer, physics engine or network architecture were added. Browser screenshots are internal inspection evidence, not separate deliverables. Software rendering is used for automated browser checks, so they do not establish real hardware FPS.

## Remaining limitations, ranked

- High: no unresolved functional failure identified in the executed checks. This is not a claim that untested devices or every animation/geometry combination are certified.
- Medium: physical iOS/Android and desktop GPU performance, actual internet latency/loss and long-session soak remain manual release checks. Two rendered contexts and six socket clients on one host are not six physical devices. Rendered visual inspection covers two skins/Central Plaza; automated coverage spans all eight rigs and all five maps.
- Low: the existing large Vite chunk warning remains. Dynamic crouch world-collision height is intentionally not introduced; safe full-height collision is retained.

## Start and deployment status

Node.js 22+ (existing project requirement):

```sh
cd bounty-shift
npm ci
npm run build
npm start
```

Open http://localhost:3000. A second device on the same network can use the server computer's LAN address and port 3000, with local firewall access enabled. Use the existing room code/ready/character-selection flow.

```sh
npm test
node --import tsx --test tests/stability.test.ts tests/stability-network.test.ts
BOUNTY_QA_BROWSER=/path/to/chromium node --import tsx scripts/stability-browser-qa.mjs
```

No production deployment or GitHub push was performed. The existing URL is https://bounty-shift.onrender.com; this release is not claimed live there. No authenticated Render deployment control was available in this session. To deploy after review, apply the release source to the existing repository/service, retain its environment settings, use `npm ci && npm run build` and `npm start`, deploy the reviewed commit, then verify `/health` and a real two-device create/join/start/ADS/Tag/flag-capture flow. Do not create a second service or room system. The ZIP includes complete source/assets/tests/build/docs; node_modules and Git history are excluded and restored through normal tooling.
