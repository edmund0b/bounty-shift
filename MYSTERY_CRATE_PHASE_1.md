# Live Game Integration — Phase 1: Mystery Crates & Mode Spawning

Phase 1 final verification is recorded in crate-verification/TEST_RESULTS.md. No deployment is authorized or attempted.

## Sources and architecture

Playable foundation: attached Bounty_Shift_Tag_Run_2.0_Final.zip, SHA256 d91bff8ff293ad980a661c43a0529d6eb4fb74bd50eb7d6391f7ce5cb9925c9e. Workshop: attached Bounty_Shift_Workshop_V7_Stages4-5_Final.zip, SHA256 35581166a66040a4ad11ab915dff6d17e4cac9ce1e073c75120e0e70810de3ec. Both archives passed CRC verification, extracted, and required files were inspected. The pre-edit backup is an exact copy of the supplied complete game, verified byte-for-byte.

The existing Express/Node/WebSocket service and RoomServer still own rooms, identities, actions, inventory, combat and the three-round lifecycle. Existing world items represent crates with source=mystery. E/touch interactions retain match/round validation and now include a crate generation number. The server alone grants rewards; Workshop simulations, demos, local roll state and character reactions were not imported.

Workshop src/powerups/mystery.ts supplies the reinforced chest, panel/corner geometry, glass cylinder, end caps, angular question mark, two orbiting rings, platform, projection beam, travel lights and 20 sparks. MysteryCrateModel.ts adapts its imports and removes the demonstration receipt/reward factory. Existing game WeaponKit supplies batching/resources. A separate effects adapter samples Workshop animation against authoritative timestamps and only attaches an actual reward label for the collector. Existing handheld Mystery Pickup and weapon chest remain separate assets.

## Spawning

shared/mystery-crates.ts centralizes mode caps, cadence, spacing, cooldown and animation timings. server/mystery-crates.ts extends existing lootPositions and mode.items; it does not replace buildLoot.

Original weapon availability is unchanged: four weapon chests, four loose weapons, plus two legacy Freeze Ball floor items in Flag Run/Kill Race. Loose weapons respawn 12s after consumption; chests are one-shot per round; player-dropped weapons are not new generated opportunities. Tag retains its pre-existing removal of legacy utility floor items.

| Mode | Target | Maximum active/slots | Initial delay | Spawn retry/cadence | Consumed-slot delay | Stop before round end |
|---|---|---:|---:|---:|---:|---:|
| Tag Run | 2 crate : 1 weapon opportunity | 16 | 0 | 500ms | 14s | 5s |
| Flag Run | 1 : 1 | 8 | 0 | 1000ms | 14s | 0 |
| Kill Race | 1 : 1 | 8 | 0 | 1000ms | 14s | 0 |

The pacing budget uses the original weapon supply under comparable continuous servicing: initial weapon opportunities plus four floor opportunities per original 12s respawn window. Actual weapon and crate generations are separately counted. This reference budget permits crates to respawn even if players prefer utilities and leave weapons on the ground; it never removes or generates weapons. Available crates do not duplicate themselves merely to spend the budget. Caps, occupied routes, cooldowns and Tag's last-five-second cutoff may defer supply below the ratio. Ratios must be measured in tests, not inferred from these settings. Live ratios depend on collection and safe-space availability.

Each spawn shuffles existing connected loot-route points and validates the chest footprint, map bounds, supported ground, LOS, 100-unit clearance from living players, 85 from active weapon pickups, 110 between active crates and 130 from Flag objectives. Crates never relax these checks to fill a quota. A cooled-down slot can relocate to a newly chosen safe point with a new generation; physical map geometry is unchanged.

## Collection, rewards and inventory

Existing server identity, phase and match/round epoch guards run before interaction. Crate generation rejects delayed requests from a prior respawn. Server checks membership, socket, HP, freeze/seal restrictions, distance/LOS, live item identity, availability, one-utility capacity and a 250ms collection debounce. Synchronous claim/grant prevents simultaneous duplicate collection. Crate is unavailable immediately; animation does not gate authority.

Tag already implements its 20 powers. This phase retains that existing roster, names, durations, restrictions and configurable rarity weights 55/30/13/2; Seal Tug limits remain. Flag Run/Kill Race crates award only their existing end-to-end Freeze Ball, using the original 3s freeze behavior and existing utility selection/attack controls. No Workshop-only or unfinished ability enters those modes, and no new individual ability mechanics are implemented.

Inventory remains two weapon slots plus one utility slot, with the existing full-slot rejection policy. Collection issues the existing utility-instance token; 3 + F/click/Attack activates via the existing mode-specific path. Tag's contextual USE is preserved. No new key binding or competing inventory is introduced.

Crate collection receipts reveal reward details only to the collector. Public clients get position/availability/collection timestamp for animation, not the private receipt reward. Existing equipped-item/inventory visibility remains as it was in the foundation. Late/reconnecting clients receive current generation/receipt and sample the current animation rather than replaying an old grant.

## Presentation and lifecycle

Crate scale .8 renders a roughly 1.04m wide chest with floating capsule top at approximately 1.8m; grounded at actual authoritative elevation. Idle remains grounded with hovering capsule/rings/lights/beam. Collection begins immediately with a 1.2s open, 2s reward reveal and .6s fade. A short HUD receipt identifies actual name/rarity and utility slot, including non-Tag Freeze Ball. Reset samples the original neutral state for the new server generation. One model per bounded slot is reused; removal/dispose frees kit resources and reward textures. No dynamic crate lights or independent animation loop are added.

Collection is a world-crate animation: no new character pose overrides locomotion/combat. All eight existing character builders and movement animation files are preserved. Round finish disables crates/clears receipts; new rounds get fresh state and item IDs. Existing room cleanup and session reconnection remain responsible for ownership and lifecycle. No standalone timeout can spawn into a finished room.

The supplied Workshop model is retained, not claimed to match an unseen original reference image exactly. No original reference image was supplied in this request. Metallic/glass/glow detail is the Workshop version; labels are server-selected power icon/name rather than a wholesale import of all Workshop power models. Dedicated individual power visuals/holding/reactions remain future owner-approved phases.

## Setup and verification

Node.js 22+: npm ci; npm run build; npm start. npm test runs existing and new regressions. Final executed tests, measured ratios and limitations will be recorded in crate-verification/TEST_RESULTS.md. No deployment or production settings change is permitted in this phase.

## Measured spawn results

Round-length authoritative collection simulations ran for all fifteen map/mode combinations. All five maps measured 96 crate opportunities / 52 weapon opportunities = 1.846:1 for Tag Run (135s), and 36 / 36 = 1:1 in each other mode (90s). Tag begins at 16 / 8 = 2:1; its existing final-five-second cutoff defers the last supply batch while weapons remain unchanged. This closest safe starting implementation preserves that existing rule, the 14s crate cooldown and all weapon availability. Real matches may differ because occupancy and collection are not continuous. Raw counts and methodology are in crate-verification/spawn-ratios.json.

See WORKSHOP_POWER_INTEGRATION_MAP.md for every existing ability and the safe boundaries of later Workshop presentation reuse. Those dedicated integrations were not begun.
