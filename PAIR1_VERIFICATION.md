# Bounty Shift — Phase 2: Bounce Bomb + Sticky Trap

## Delivery status

Complete playable multiplayer project based on the supplied Phase 1 game. No deployment or Render change was performed. Only this pair received new live integration; no further Workshop powers were added to other modes.

The complete pre-edit backup and initial checkpoint were verified and delivered before extended testing. The final archive includes source, assets, lockfile, production client/server, tests and this report. Dependencies are installed with `npm ci`; `node_modules` and local browser binaries are intentionally excluded.

## Source and preservation

- Foundation: `Bounty_Shift_Mystery_Crate_Integration_Final.zip`, SHA256 `dfa2efb690db5b03483350d5df49d695fffc52a4c4001cdb6133fe10b6352969`.
- Workshop: `Bounty_Shift_Workshop_V7_Stages4-5_Final.zip`, SHA256 `35581166a66040a4ad11ab915dff6d17e4cac9ce1e073c75120e0e70810de3ec`.
- Both original ZIPs passed CRC and required-source inspection before extraction. No source reconstruction was needed.
- Byte comparison confirms 59 protected original files are unchanged, including map definitions, traversal, base movement/combat, gun configuration, weapon models/attachments, all eight character skins/registry and the WebSocket service entry point. See `pair-verification/source-audit.json`.
- Rooms, host authority, teams, match scoring, timers, map selection/rotation, weapon damage/ADS/ammo/reload, melee, health, KO and respawn retain their existing implementations. The existing mode/tick/input flow calls the new pair module; it was not replaced.
- The minimap and existing controls remain. Only pair utility presentation and receipt wording were added to the HUD. No general HUD, login, lobby, inventory-capacity, map or game-mode redesign.
- Old hashed production JS bundles are replaced by the current build, as expected. Earlier release documents remain as history; this report takes precedence for this phase.

## Crate pacing and root cause

The prior configuration deliberately allowed 16 active crates in Tag and 8 in other modes, using an opportunity-budget scheduler. Inspection found one server tick scheduler rather than duplicated crate timers. High configured counts, independent geometry/material allocation and individual spark meshes accounted for substantial crate cost.

| Mode | Active cap | Collection-to-respawn minimum | Retry cadence |
| --- | ---: | ---: | ---: |
| Tag Run | 3 | 40 s | 2 s |
| Flag Run | 2 | 50 s | 2.5 s |
| Kill Race | 2 | 50 s | 2.5 s |

Each mode is independently configurable in `shared/mystery-crates.ts`. A blocked spawn can occur later; cooldowns never guarantee an unsafe location. Active crates remain at least 550 game units (16.5 m) apart, 100 units from players, 85 from other pickups and 130 from Flag objectives. Footprint, support, bounds and line-of-sight checks use existing reachable loot-route candidates. Cooled-down slots are reused with new generations; identities are replaced across rounds. Weapon counts and respawn intervals are unchanged.

Candidate/anchor calculations are cached per room/map/crate lifecycle. Spawn searches run at the bounded retry cadence. Opportunity accounting uses a separate weakly held set on every tick so fast-collected weapon respawns cannot be missed between spawn searches. It never drives the new hard caps.

### Measured opportunity ratios — target remains unmet

A 100 ms server simulation continuously collected weapons, existing floor utilities and crates throughout actual 135/90-second rounds on all five maps:

| Mode | Weapon opportunities | Crates | Existing floor utilities | Total power-ups / weapons |
| --- | ---: | ---: | ---: | ---: |
| Tag Run | 52 | 12 | 0 | 0.231 |
| Flag Run | 36 | 4 | 16 | 0.556 |
| Kill Race | 36 | 4 | 16 | 0.556 |

These exact rows were measured across all five maps; see `pair-verification/spawn-ratios.json`. The requested >1 Tag and approximately 1 other-mode ratios are not achieved under the requested caps/cooldowns and unchanged weapon spawns. The scarcity settings take priority in this build. Weapons were not removed, slowed or reduced to manufacture a ratio. This needs playtest feedback; it is not represented as completed balancing.

## Measured performance

Combined effect of lower caps, shared geometry/static materials, two independently animated materials per crate, 8 batched sparks instead of 20 separate sparks, distant particle suppression and 5 Hz distant sampling. Reinforced chest, glowing capsule, question mark, rings, opening and private reveal remain.

Controlled six-player Central Plaza fixture, Node runtime, 1,000 updates/ticks:

| Measurement | Phase 1 | Phase 2 |
| --- | ---: | ---: |
| Active Tag crates | 16 | 3 |
| Crate meshes | 736 | 84 |
| Crate triangles | 98112 | 17964 |
| Unique crate geometries | 432 | 28 |
| Unique crate materials | 112 | 11 |
| Crate construction, ms | 95.762 | 19.788 |
| Crate update, ms/frame | 0.021 | 0.003 |
| Server tick, ms | 0.674 | 0.632 |
| Serialized snapshot, bytes | 14911 | 12429 |
| Crate scene objects after disposal | 0 | 0 |

Node runs do not create canvas textures, so the texture count is not a GPU memory measurement. Timing samples are small and machine-specific; the modest server-tick change does not establish a general networking speedup.

Separate actual-browser measurement: six connected clients, one rendered browser and five WebSocket clients, Chromium SwiftShader software GPU, 1280×720 at DPR 0.5, five-second sample after warm-up:

| Measurement | Phase 1 | Phase 2 |
| --- | ---: | ---: |
| Sampled frames | 27 | 20 |
| Mean draw calls/frame | 1308.4 | 701.7 |
| Mean frame interval, ms | 185.96 | 226.24 |
| p95 frame interval, ms | 619.7 | 543.2 |

Draw calls fell materially, but mean frame interval did not improve in this software-rendered run. Severe lag is not claimed fully resolved. The remaining full scene and articulated character workload is expensive in this environment; hardware GPU/phone profiling is still required to establish the remaining live-device bottleneck. No unrelated maps/skins were simplified. Initial and controlled raw measurements are retained with the delivery evidence; reproducible profiling scripts are included.

No cosmetic animation packets or new per-frame network loops were added. Existing snapshots carry bounded projectile/trap/event state. Disposal tests leave zero crate/effect scene objects. These are bounded cleanup checks, not an overnight memory-leak soak.

## Bounce Bomb

Approved V7 blue/orange grenade geometry from `src/gadgets/models.ts`, held pose from `src/gadgets/preview.ts`, throw targets from `src/powerups/activation.ts`, reaction and blue/orange ring presentation adapted from `src/powerups/reactions.ts` and `polish.ts`. Workshop demo physics, mannequins, rewards and health are not imported.

The existing utility nonce/epoch and input flow queue a server action. The item remains owned during preparation, releases at 640 ms and consumes through the existing utility function once a projectile is created. Switching slots, invalid ownership, KO, freeze or disconnect before release cancels the pending action. Dash/slide defers action start until the current burst ends; recovery ends at 1,350 ms. Gun/ADS actions keep animation priority.

Camera direction, including mobile swipe pitch, supplies the throw. Horizontal/vertical direction is normalized before a configurable loft is added. The server tracks trajectory and sweeps at no more than 4 game units per substep against walls, bounds, ramps, floor/surfaces and player bodies. Impact or fuse detonates at the authoritative position. Clients interpolate only the visible projectile. Shockwave rings expand toward the configured radius; clients do not decide hits.

The blast tests radius, height, line of sight, teams, protection, restricted Tag states and force immunity. It applies outward/upward force with falloff and a maximum impulse; the owner can self-launch. Existing movement/gravity, collision-safe sweeps, bounds and landing fallback handle the result. No explosive damage, fall-damage rule, kill, score, flag-possession or IT mutation is introduced. An explosion is removed once, with one event/target list. Existing Magnet Boots resistance and force immunity are respected.

| Initial live setting | Value |
| --- | --- |
| Throw speed | 300 units/s (9 m/s), plus vertical loft |
| Gravity / loft | 650 units/s² / 140 units/s |
| Fuse / impact | 900 ms / enabled |
| Radius | 133.333 units (4 m) |
| Horizontal / vertical force | 400 / 300 units/s before falloff/cap |
| Maximum combined applied impulse | 450 units/s |
| Horizontal decay window | 600 ms; existing gravity owns the full flight |
| Self multiplier / minimum falloff | 1 / 0.25 inside radius |
| Friendly fire / force immunity | Off for teammates; owner included / 200 ms |
| Utility cooldown | 1,000 ms |

These are documented initial live defaults in `shared/pair-powerups.ts`. The earlier Tag implementation used a single-target 650-unit/s projectile, 1,600 ms lifetime and roughly 260 horizontal/250 vertical force with 1-second force immunity. The new radial implementation intentionally changes those pair-specific values for the requested shockwave behavior; it does not silently retune other abilities. Workshop animation timing is reused, while its demonstration trajectory is not treated as server physics.

## Sticky Trap

Approved V7 hexagonal/orange mechanical model and two-hand holding/placement gesture, adapted to the real selected skin with hand attachment. The compact grounded device has restrained emissive detail and no large idle radius. A triggered trap displays expanding orange rings and adhesive strands around the target's feet, plus a slowing/recovery pose.

Placement validates a grounded player, reachable forward point, footprint support, slope/normal, walls, bounds, line of sight and other players. It is checked at request and release. Invalid placement retains the utility and nonce. The consumed item becomes a stationary server object with the actual surface normal; it never follows its owner.

| Initial live setting | Value |
| --- | --- |
| Forward placement / footprint | 36 / 12 game units |
| Maximum slope | 0.4 |
| Arm delay | 350 ms |
| Trigger radius | 35 units (1.05 m), with height/LOS validation |
| Movement multiplier / duration | 0.65 / 1,500 ms |
| Untriggered lifetime | 5,000 ms |
| Maximum untriggered traps | 1 per player, 6 per round |
| Triggered presentation | 1,500 ms |
| Eligibility | Opponents only; owner and teammates excluded |

The existing 35% slow, 1.5-second effect and 5-second lifetime are preserved. Added timing/placement/limit defaults are explicit above. One eligible target triggers the trap once. Slow combines with existing Tag slows without multiplying duplicate penalties. Healing Burst clears it. Effects expire; owner death/disconnect/respawn and round/map transitions remove obsolete state. Respawn versions prevent a previous life's slow/force from persisting.

## Inventory, rewards, controls and synchronization

No second utility inventory or reward ownership state exists. Existing capacity rejects collection while the utility slot is occupied. Server collection changes the crate and inventory synchronously, and existing private receipts reveal a reward only to its owner. Epoch/generation/nonce checks reject stale or forged claims and duplicate activations.

- Tag retains the already implemented 20-power roster and original Common/Rare/Epic/Legendary weights 55/30/13/2. This pair now uses the new authoritative modules. No additional Tag power was newly added.
- Flag Run and Kill Race temporarily permit only the existing Freeze Ball plus Bounce Bomb and Sticky Trap in crate rewards. Rarity weights themselves are unchanged. Eligible Common 55 and Rare 30 weights are renormalized: Bounce 32.3529%, Sticky 32.3529%, Freeze 35.2941%; Common is split equally between the pair. Epic/Legendary are absent because no newly approved items from those tiers are enabled in these modes.
- `PAIR.enabledRewards` controls the temporary non-Tag expansion. Workshop-only reward logic and other demo abilities are excluded.
- Desktop retains 3 to equip utility, F/click to activate; the existing USE button also works. Mobile retains the same utility slot/USE interaction, movement joystick, camera swipe and other touch controls. No new binding.
- Existing snapshots synchronize action release, projectile trajectory, detonation targets, trap position/normal/arming/trigger/expiry and movement effects. No client damage/force/placement decision is authoritative. No production fixture, cheat route, clock endpoint or fake player state was added.

## Verification — automated versus manual

All results below are automated. No human multiplayer playtest, physical mobile device test or live Render deployment test was performed.

| Check | Executed result |
| --- | --- |
| Full `npm test` regression run | 338 passed, 0 failed; approximately 162 seconds |
| Final pair/crate checks after counter/immunity corrections | 30 passed, 0 failed, including two newly added cases |
| Final Tag compatibility checks | 41 passed, 0 failed |
| Production TypeScript/client/server build | Passed; existing large-chunk warning remains |
| Two independent WebSocket clients | All three modes; contested collection, private receipts, actual 40/50-second wall-clock cooldowns, stale generations, reconnect and three-round lifecycle |
| Two independent rendered browser contexts | Desktop 1280×720 and mobile/touch 844×390; all three modes; real UI create/join/ready/start, E collection, desktop F throw, mobile USE placement, matching projectile/detonation/trigger updates and rendered effects; no page errors |
| Reverse input browser pass | Kill Race mobile swipe/throw and desktop F placement; matching effects on both clients; no page errors |
| Six-player checks | Actual six connections for performance; authoritative six-trap ownership/limit/cleanup simulation; existing six-player room/mode regression coverage |
| Eight skins | Held models, two-hand trap grip, throw/place/recovery poses, finite joints and unchanged root/legs; existing locomotion/weapon tests |
| Maps | All five existing map geometry/collision/crate-distribution checks and rotation/match tests; source bytes unchanged |
| Flag carrier | Possession/position remain authoritative under force/slow; no power-up score rewrite |
| Combat regressions | Existing gun damage, hit regions, sniper headshots, ammo/reload/ADS, melee, KO/respawn and mode scoring tests pass |
| Resource cleanup | Repeated crate lifecycle and pair effect disposal; no leftover scene roots in checked fixtures |

The 338-case broad run preceded the final opportunity-counter and force-immunity compatibility adjustments. The 71 targeted passes were run after those adjustments. Counts overlap and must not be added as distinct test cases. The complete suite now contains the two added regression cases; a further full-suite replay was not necessary for the scoped final adjustments.

Browser QA is fixture-assisted: player positioning, round-end fast-forward and repeated real crate lottery selections make each requested ability reachable deterministically within a bounded run. Actual input, WebSocket protocol, server effects and WebGL rendering are exercised. No fixture is exposed by the production service. Match completion in browser QA uses existing server transitions with a fast-forwarded clock, not three human-played rounds. Real cooldown timing is independently tested by actual sockets.

Browser rendering used low DPR and SwiftShader to run in this environment. The gameplay scenes inspected in these browser checks were Central Plaza; the other maps have automated construction/collision/rotation coverage rather than a new physical-GPU visual playtest. Two skins are selected in these browser passes; all eight have automated rig/animation checks. Existing movement, crouch, slide, dash, jump, melee, guns and camera regression coverage remains in the suite.

### Remaining review and limits

1. Hardware GPU and real landscape phone performance/playability remain unverified. Draw-call reduction is measured; smooth FPS is not established and software-rendered mean frame time remains poor.
2. The requested long-term power-up/weapon ratios remain below target at the requested caps/cooldowns. No weapon reductions were made.
3. Pair force/fuse/arming/visibility defaults need human playtesting across Tag, Flag and Kill. Foot-web clarity, hand alignment on all eight skins and crowded combat should be reviewed on normal rendering hardware.
4. No long-duration memory soak, WAN latency/loss simulation, six simultaneously rendered browser players or exhaustive pair-on-every-map hardware visual test was completed.
5. No deployment occurred. This phase stops for approval; no next pair is integrated.

## Files changed

New: `shared/pair-powerups.ts`, `server/pair-powerups.ts`, `src/pair/models.ts`, `src/pair/animation.ts`, `src/pair/presentation.ts`, `tests/pair-powerups.test.ts`, pair browser/profile scripts and verification evidence.

Modified: `shared/modes.ts` (optional pair state), `shared/mystery-crates.ts` (mode pacing/eligibility), `shared/tag-run.ts` (Bounce description), `server/modes.ts` (pair lifecycle/use/tick), `server/rooms.ts` (existing utility and prediction/motion integration), `server/tag-run.ts` (pair delegation, shared cooldown/slow compatibility), `server/mystery-crates.ts` (caps/caching/eligible rewards/accounting), `src/main.tsx` (pair utility/aim/prediction), `src/scene.ts` (models/poses/effects/disposal), `src/TagHud.tsx` (existing-style utility presentation), `src/CrateReward.tsx` (neutral utility receipt), `src/MysteryCrateModel.ts` and `src/MysteryCrateEffects.ts` (shared resources/batching/distant sampling). Existing crate/Tag tests were updated for intentional pacing, eligibility and delayed valid release rather than removing their behavior checks. Build output, README and current measured ratios are refreshed.

## Run and reproduce

Node.js 22 or later:

```sh
npm ci
npm run build
npm start
```

Create/join a room in two clients, ready, start, choose characters and enter the existing modes. Verification commands:

```sh
npm test
node --import tsx --test tests/pair-powerups.test.ts tests/mystery-crates.test.ts tests/tag-run.test.ts tests/tag-network.test.ts
BOUNTY_QA_BROWSER=/path/to/chromium node --import tsx scripts/pair-browser-qa.mjs
PAIR_QA_REVERSE=1 PAIR_QA_MODES=kill_race BOUNTY_QA_BROWSER=/path/to/chromium node --import tsx scripts/pair-browser-qa.mjs
node --import tsx scripts/pair-profile.mjs
BOUNTY_QA_BROWSER=/path/to/chromium node --import tsx scripts/pair-browser-performance.mjs
```

Raw pass logs, measurements, source audit and both browser result files are in `pair-verification/`. Archive verification checks CRC, extraction and byte-for-byte comparison; the extracted production HTTP/WebSocket smoke result is included there after packaging.
