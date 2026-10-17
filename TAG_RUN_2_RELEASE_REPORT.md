# Bounty Shift — Tag Run 2.0 release report

Completed against the supplied Gun Combat Upgrade 1 final project. Recovery and implementation ZIPs were saved before extensive testing. This release includes complete source, assets, compiled client/server, configuration, README, changelog and test evidence.

## Gameplay and authority

- Hot Potato: exactly three 135-second rounds. Solo supports 2–6 players; Duo uses the existing complete teams for 2v2 and 2v2v2. The IT side at zero loses; all other sides survive.
- Survivors each earn the existing one round point. Round order is least IT time, most successful tags, then stable team ID. Match order is most round points, least cumulative IT time, most tags, then stable team ID. Collected/used power-up counts also appear in results. Tag transfers award no HP damage, KO or elimination points.
- Existing attacks validate active status, side ownership, contact range/facing/LOS, cooldown and immunity. One action can transfer once; no same-tick chains. The former IT team receives 2s tag-back immunity. New IT teams recover from restricted escape/freeze states. The server locks results at expiration.
- Mystery capsules use validated existing map loot positions. E interaction validates distance/LOS/capacity. Rewards are chosen by the server only after collection; one utility at a time. A utility instance token and round epoch prevent forged/stale activations and duplication.
- Central configuration: common/rare/epic/legendary weights 55/30/13/2; active capsule counts 2/3/4/4/5 for 2–6 players; consumed capsule respawn 14s; no respawn during final 5s. Seal reward is capped at one per round and one use per player per match.
- Collision-safe movement wraps the unchanged base controller. Teleports require supported clear routes; force/dash uses small collision substeps and boundary limits. Timed effects are server-owned, with freeze immunity, escape locks, force immunity and portal reentry guards. Reconnection uses the existing room/session membership system.

## All 20 powers

| Power | Rarity | Implemented behavior |
|---|---|---|
| Smoke Screen | Common | 4s cloud masks opponent avatar/nameplate visibility; movement unchanged |
| Speed Surge | Common | 20% movement boost for 3s; normal stamina costs |
| Sticky Trap | Common | Ground trap up to 5s; first opponent slowed 35% for 1.5s |
| Jump Pad | Common | Supported ground pad for 8s; upward/forward launch |
| Footprint Tracker | Common | Nearby recent trails for 5s; ghost/sealed/invisible trails excluded |
| Healing Burst | Common | +35 stamina, capped at 100; clears ordinary slow |
| Bounce Bomb | Common | Directional airborne projectile and collision-safe knockback |
| Freeze Ball | Rare | 2s freeze followed by 3s freeze immunity |
| Gravity Bomb | Rare | Approximately 4m pull field for 2.5s; obstacle-aware |
| Ghost Step | Rare | 5s footstep/trail suppression; still visible and taggable |
| Flash Pop | Rare | 1.25s nearby opponent distortion without whiteout |
| Magnet Boots | Rare | 70% knockback resistance for 5s |
| Reverse Pulse | Rare | Instant outward push within approximately 4m |
| Trap Clone | Rare | 5s decoy; attack bursts into 1.5s slow cloud; never IT |
| Blink Beaker | Rare | Up to 7m along a validated supported clear route |
| Clone Decoy | Epic | 4s moving skin clone; real player invisible to opponents and cannot tag |
| Phase Dash | Epic | 0.4s directional burst; cannot cross walls/bounds |
| Portal Pair | Epic | Two safe endpoints for 8s; 1s reentry lockout |
| Time Bubble | Epic | 3s field slows opponents 25%; owner/timer unaffected |
| Seal Tug | Legendary | 6s stationary protection/invisibility; same-position return; unavailable final 6s |

## Presentation and controls

Unarmed Tag uses a 0.42s upper-body reach without root/hip/foot displacement. Existing melee animations remain. IT has a red aura/label/minimap marker, transfer announcement/effect/audio and nearby warning. Final 20s adds FINAL CHASE, stronger aura and accelerating synthesized chase music; final 10s gives IT coarse pings every 2s, and final 5s shows countdown.

Utility HUD reveals icon, name, rarity, availability and effect timers. E collects; 3 selects utility; existing F/Click/Attack activates it. The contextual USE button works on desktop/touch without changing weapon selection. Q/C camera controls remain. Touch joystick and camera swipes still work simultaneously. Safe-area-aware layouts keep the new utility button clear of existing controls.

Workshop V5 was reference only. Its six compatible device models already in the main game are reused; remaining fields/capsules/portals/decoys use lightweight geometry and the existing skin rigs. No second multiplayer, inventory, team or map system was created.

## Executed verification

- Latest complete automated suite: 309 passed, 0 failed, 0 cancelled, 0 skipped; about 47 seconds. Includes original gun/combat/network/movement/maps/skins regressions.
- Tag-focused tests exercise 2/3-player Solo, 4/6-player Duo, all three rounds, exact 135s durations, team/IT time/ranking, immunity, final loser, all 20 effects, forged/stale activation rejection, pickup contention/capacity/respawn/rarity boundaries, freeze, clones, blink/portal collision, Seal limits, five-map safe pickup placement and upper-body reach on all eight skins.
- Two independent real WebSocket clients: all 20 power activations, synchronization, ownership/forged requests, mystery contention, reconnection and three-round results passed.
- Two independent Chromium browser contexts: real room creation/join, ready/start, character selection, E mystery collection/reveal, F tag transfer with unchanged HP, all 20 actual UI activations and synchronized consumption, mobile USE, simultaneous joystick/camera, FINAL CHASE/countdown and match results passed. Zero page errors.
- Mobile emulation layouts: 844×390, 390×844, 375×667 and 640×360. New utility panel stayed in viewport, did not overlap tested existing touch controls/loadout/minimap/status, and introduced no scrolling.
- Extracted production ZIP smoke passed: health/index/assets, two real WebSocket create/join clients and leave cleanup. ZIP CRC and extracted source/asset byte comparisons passed.
- Production TypeScript/client/server build passed. Vite reports the existing large-bundle advisory; it does not fail the build.
- Original map geometry, all eight character builders, firearm config/combat/ADS adapter, base advanceMotion implementation, map rotation and Flag Run/Kill Race rule bodies pass byte-preservation checks. See preservation.json.

## Limits and deployment

Browser verification uses software rendering, reduced rendering resolution and deterministic server fixtures to place actors/grant individual powers; test clocks are extended while cycling powers, then advanced through results. Tests assert each actual round duration is 135s, but this is not a real-time 6m45s endurance or internet latency/load certification. Duo and five-map pickup coverage are automated; rendered browser sessions used two players in Central Plaza. Physical iOS/Android, Safari, native pointer capture, large player load and high-latency sessions remain unverified. Audio was exercised in-browser but not audited on physical speakers.

Smoke preserves friendly-team visibility. Magnet Boots implements resistance; the foundation has no separate slippery-surface/ice-friction simulation, so no new global ice physics was introduced. The new Tag visuals/audio use procedural effects rather than new studio animation/audio assets. These are explicit implementation boundaries.

Deployment status is recorded in DEPLOYMENT_TAG_RUN_2.md. A successful local build or an existing live URL alone is not deployment confirmation.

## Deployment outcome

NOT DEPLOYED. Local verification passed: 309 automated tests, production build and two-client Chromium Tag Run verification. The GitHub integration rejected creation of the deployment tree with HTTP 403, Resource not accessible by integration. No commit was created or branch moved, and no Render deployment was triggered. No new hosting system was created.

Repository main was inspected before the attempt: c1636257854fb92d46cd9aeee645d34e4b8a1124, “Add files gun combat upgrade.” Its server/shared/src files match the supplied foundation; no unreviewed source changes were overwritten.

Existing game URL: https://bounty-shift.onrender.com
This is the existing deployment address, NOT a verified Tag Run 2.0 deployment. Publish the contents of the final verified ZIP to the existing repository and deploy through the existing Render service when write access is available. Use existing Node 22 build/start commands: npm ci && npm run build; npm start. No Render configuration was changed.

The existing public URL returned HTTP 200 but still loads the Gun Upgrade 1 bundle. Tag Run 2.0 is not live.
