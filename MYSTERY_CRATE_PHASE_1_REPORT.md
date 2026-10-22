# Bounty Shift — Live Game Integration, Phase 1
## Mystery Crate System & Game Mode Spawning

Status: implemented and locally verified. No deployment, repository push, hosting change or dedicated individual-power integration was attempted. Phase 1 stops for owner review.

## Sources and backup

The authoritative playable foundation is Bounty_Shift_Tag_Run_2.0_Final.zip, SHA256 d91bff8ff293ad980a661c43a0529d6eb4fb74bd50eb7d6391f7ce5cb9925c9e. The approved visual source is Bounty_Shift_Workshop_V7_Stages4-5_Final.zip, SHA256 35581166a66040a4ad11ab915dff6d17e4cac9ce1e073c75120e0e70810de3ec. Both passed CRC inspection and extraction. The complete pre-edit backup is a byte-for-byte copy of the supplied multiplayer ZIP, with all 324 original project files and required source/manifests verified. Both attached originals remain unchanged.

## Implemented changes

The game retains its existing Node/Express service, WebSocket RoomServer, rooms, identity/session flow, character selection, inventory and mode lifecycle. The server/mystery-crates.ts extension uses the existing mode.items and lootPositions paths. It is not another networking, map or inventory system.

The Workshop src/powerups/mystery.ts geometry and absolute-time animation became src/MysteryCrateModel.ts. The adapted model retains reinforced metallic chest panels/corners, cyan/purple accents, glass capsule with metallic end caps, angular question mark, orbiting energy rings, projection platform/beam, travel lights and sparks. Demo receipt/default reward creation and reaction-system imports were removed. The game's existing WeaponKit supplies geometry batching and disposal. No Workshop state manager, demo grant, local reward roll, health rule or preview physics was imported.

src/MysteryCrateEffects.ts keeps one model per authoritative slot and samples animation from server timestamps. Idle floats the capsule while the chest stays grounded. A successful server claim immediately removes availability; presentation opens the top/caps over 1.2s, reveals for 2s and fades over .6s. Respawn changes generation and restores all parts. Thirty model replays and twenty adapter cycles verify stable child/resource ownership and cleanup. No extra render loop or dynamic crate lights are added.

The server selects the actual reward. Only the collector's crate receipt contains its reward ID; everyone can see the collection animation and authoritative cooldown. The private reveal displays the server-selected power's icon/name/rarity, with a matching HUD banner. Existing public equipped/inventory visibility remains unchanged. Weapon chest appearance, weapon rewards, weapon inventory and the separate handheld Mystery Pickup concept remain intact.

## Mode spawning and measured ratios

The original supply remains four weapon chests plus four loose weapons. Loose weapons return 12s after collection, chests are one-shot per round, and player drops do not count as newly generated supply. Flag Run/Kill Race also retain their two original Freeze Ball floor items; those utility items do not count as weapon opportunities. Tag keeps its existing removal of those legacy utility floor items.

| Mode | Target | Active cap | Spawn retry/cadence | Slot respawn delay | Measured crate / weapon opportunities |
|---|---|---:|---:|---:|---|
| Tag Run | 2:1 | 16 | 500ms | 14s | 96 / 52 = 1.846:1 over 135s |
| Flag Run | 1:1 | 8 | 1000ms | 14s | 36 / 36 = 1:1 over 90s |
| Kill Race | 1:1 | 8 | 1000ms | 14s | 36 / 36 = 1:1 over 90s |

These measured counts occurred on every existing map in fifteen authoritative continuous-collection simulations. Initial Tag supply is 16 crates / 8 weapon opportunities = 2:1. Its existing final-five-second cutoff prevents the final crate batch, so full-round supply is 1.846 rather than claiming exact 2:1. The implementation preserves that rule, the 14s crate delay and all weapon availability. Real matches can produce lower ratios when routes are occupied or crates remain uncollected.

Pacing uses a configurable reference budget based on the original continuously serviced weapon schedule. Actual weapon generations and actual crate generations are counted separately. This allows utility-only players to see crate respawns even when weapons remain available on the ground. Budgeting never changes weapon creation/respawn. All mode settings are independent in shared/mystery-crates.ts: zero initial delay, caps/cadence above, 250ms collection debounce, 100-unit living-player clearance, 85 from active weapon pickups, 110 between active crates and 130 from Flag objectives.

Each spawn shuffles existing connected loot-route candidates; footprint, supported elevation, collision, hazards and boundaries are validated. Current candidate pools contain 68/35/62/64/73 points respectively for Central Plaza/Scorched Point/Aerie Sky-Port/Outlaw's Canyon/Viking's Fjord in the inspected project. Live eligible counts shrink with occupancy and objectives. Additional crate-specific map geometry or spawn coordinates were not added. Failed placements retry without relaxing validation. Respawns may relocate a slot to another eligible point.

## Collection and inventory authority

The existing interaction message retains match/round identity guards and now carries itemGeneration. Stale generations, stale match/round requests, unknown objects, out-of-range/through-wall collection, disconnected/KO/frozen actors, sealed Tag players and full utility slots are rejected. A synchronous claim/grant gives one winner for contention and repeated packets. A new utility instance token uses the existing inventory ownership path; animation cannot grant, roll or re-collect an item.

The existing one-utility capacity policy is unchanged: no stacking, overflow, replacement or new drop policy. Both weapon slots and their switching remain intact. E and existing touch interaction collect the crate; 3 + F/click/Attack uses the utility. Tag's contextual USE button remains unchanged. The private reward banner is informational and does not capture touch or interrupt movement. No new character collection pose is applied; all eight skins retain their movement/combat animation priorities.

Tag Run already contains twenty functional abilities, so its current eligible roster, names, durations, restrictions and configurable 55/30/13/2 rarity weights are reused. Seal limits remain. The Workshop's differently named/tuned previews do not override them. Flag Run/Kill Race currently implement Freeze Ball end-to-end, so their crates award only that utility, with the original 3s freeze. No unfinished Workshop ability enters their reward pool. No dedicated Bounce Bomb or other individual ability polish was begun. WORKSHOP_POWER_INTEGRATION_MAP.md identifies reusable candidates and mismatches for all twenty existing Tag abilities, including V7 abilities absent from the main roster.

## Lifecycle, compatibility and files

Crates initialize within beginMode, tick within the existing tickMode, and stop/clear receipt state in finishMode. New rounds receive fresh IDs/state; late packets cannot mutate previous rounds. Reconnecting clients receive current generation, position, availability and their own current receipt. Existing room/session cleanup remains in place. There are no orphan standalone respawn timeouts.

New production files: shared/mystery-crates.ts, server/mystery-crates.ts, src/MysteryCrateModel.ts, src/MysteryCrateEffects.ts, src/CrateReward.tsx and src/mystery-crates.css. Integration edits: shared/modes.ts (crate state/item fields), shared/game.ts (interaction generation), server/modes.ts (existing lifecycle/interaction calls), server/tag-run.ts (retire the old competing capsule spawn/respawn loop only), server/rooms.ts (generation validation/private view), src/main.tsx (generation and reward banner), src/LootEffects.ts and src/scene.ts (crate rendering), src/InteractionPrompt.tsx (crate label). Tests/scripts/docs and compiled output are included. The old Tag spawn/count assertions were updated for this explicitly requested spawn integration; gameplay tests were retained.

The preservation audit passes 29 checks, including byte-identical weapon spawn code, weapon/gun configs and damage systems, inventory implementation, character builders, weapon models/adapters, movement animations, camera, map geometry, map rotation, base advanceMotion and Flag Run/Kill Race rule bodies. Tag's transfer, ability activation/reward policy and results bodies remain byte-identical. Timers remain 135s Tag and 90s other modes, three rounds each. Complete raw comparisons are in crate-verification/preservation.json.

## Tests and remaining limits

# Mystery Crate Integration — Phase 1 verification

Automated suite: 325 tests passed; zero failed, cancelled or skipped. Duration 118.6s. Raw output: automated-tests.txt. Production TypeScript/Vite/esbuild output passed; Vite retains a non-failing large-chunk advisory. Raw build output: build.txt.

Two independent actual WebSocket clients exercised all three modes with simultaneous collection, one authoritative winner, collector-only receipt details, a real wall-clock wait through the 14s cooldown, synchronized respawn, generation replay rejection, session reconnection and three-round/lobby cleanup. That dedicated test passed in 46.3s.

Measured continuous-collection simulations use actual server item generation/interaction logic at 100ms steps, across complete 135s Tag and 90s other-mode rounds, on all fifteen map/mode combinations. Counts are identical across the five maps: Tag 96 crates / 52 weapons = 1.846:1; Flag Run 36/36 = 1:1; Kill Race 36/36 = 1:1. Tag starts 16/8 = 2:1. Its existing final-five-second cutoff delays the final batch; weapons were neither removed nor slowed. See spawn-ratios.json for raw per-map counts. This measures saturated servicing; player behavior and occupied space can change actual live ratios.

Spawn tests cover supported footprints, reachable existing routes, bounds, map hazards/walls, player/pickup/crate spacing, objective clearance, randomized locations, caps/cooldowns, final-five cutoff and round cleanup. Authority tests cover range/LOS, forged objects, HP/freeze/seal restrictions, full utility, forged reward/position fields, current match/round/generation, duplicated requests and receipt visibility.

Workshop geometry and animation tests cover chest/caps/rings/question mark, idle/open/reveal/fade/reset, thirty replays without accumulating child meshes/resources, and effect-adapter slot reuse/disposal over twenty cycles. All eight character rigs are sampled through idle, walking, sprint, airborne, crouch, slide and dash with collection inventory present. No collection pose writes character transforms. Existing character/gun/KO/recovery/movement tests also pass in the complete suite.

Two independent Chromium contexts (desktop and mobile emulation) passed actual create/join/ready/character selection and all three modes. Each mode verified synchronized crate positions/availability, E collection, collector-only matching reveal, server-authorized reset, touch collection, three-round completion and return to lobby. Existing Freeze Ball activation was exercised in both non-Tag modes. Page error lists were empty. Raw browser-three-modes.txt records that pass.

Final mobile layout verification passed at 844×390, 390×844, 375×667 and 640×360. The new reward banner stayed in the viewport and did not intersect tested match/health/minimap/loadout/utility/touch-control rectangles; document scrolling did not increase. The temporary hint is omitted in very small landscape reward banners; the existing gameplay controls and utility card remain. Raw browser-mobile-layout.txt records the pass.

Chromium used SwiftShader software rendering with reduced device-pixel ratio and throttled animation frames. Server fixtures moved actors to supported crate points, advanced browser reset eligibility, and fast-forwarded results. The separate network test waited the real 14s cooldown. These checks are functional/visual tests, not physical-device performance or high-latency/load certification. Physical iOS/Android, Safari and native pointer capture were not tested.

No production deployment was authorized or attempted. Final archive integrity, extraction and compiled production smoke results are recorded in archive-smoke.txt after packaging.


The original visual reference image was not supplied in this request. The imported Workshop design is preserved and checked in the rendered game, but no exact-reference-match claim is made. Metallic detail/question mark/glass/glow remain the V7 model's implementation. Reward reveal uses an actual server-selected icon/name label rather than importing every individual Workshop power model. Later held/activation/reaction polish remains an owner-approved follow-up.

## Deliverables and next review

- Bounty_Shift_Mystery_Crate_Integration_PreEdit_Backup.zip: verified complete original game, saved before edits.
- Bounty_Shift_Mystery_Crate_Integration_Checkpoint.zip: complete implementation saved, extracted and linked before lengthy browser tests.
- Bounty_Shift_Mystery_Crate_Integration_Final.zip: complete verified final game, including frontend/backend/assets/maps/characters/weapons/configuration, manifests, README, changelog and test evidence.
- This report and the future integration map document all completed work and review boundaries.

Start locally with Node.js 22+: npm ci; npm run build; npm start. Do not deploy this phase without owner approval. Stop for Mystery Crate review before the intended first dedicated Bounce Bomb phase.

Final archive validation passed: CRC, successful extraction, all extracted project bytes matched the final workspace, and required files were present. The extracted compiled production server passed health/index/all linked bundle fetches, two-client create/join/ready/character selection, exact 135s Tag configuration, generation-validated crate collection, private receipt and leave/room cleanup. See crate-verification/archive-smoke.txt.
