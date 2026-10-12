# Bounty Shift — Workshop movement animation integration

2026-10-11

This update starts from **Bounty_Shift_Polish_Updates.zip** and transfers movement/reaction motion from **Bounty_Shift_Workshop_Latest_Checkpoint.zip**. The supplied multiplayer game remains the main project. The Workshop itself and its weapon/combo work are not modified.

## What changed

The main rendering path in `src/scene.ts` now creates one `GameplayAnimator` per existing avatar. `src/animations/gameplay.ts` selects visual states from local predicted motion or remote replicated motion, actual translated speed, vertical velocity, crouch/evade state, health changes and the existing KO/respawn fields. It does not modify player physics, inputs, health, scoring, server clocks or camera targets.

The movement and reaction keyframes are in `src/animations/clips.ts`. Their channel values, sampling curves, event markers, durations and complete movement reference sequences come from the supplied Workshop. All 420 sampled comparisons against the source passed. Only authorized clips were copied; Attack 1/2/3 and Full Combo are excluded. `src/animations/locomotion.ts` reuses the Workshop's procedural idle/walk/run/sprint formulas. The original `src/animations/player.ts` remains unchanged for existing character preview and attack hooks.

`src/animations/motion.ts` transfers the Workshop's two-bone foot solver, rig reset and pose blending. The compatibility adaptations keep preview horizontal travel in place, suppress preview jump lift because the existing physics already supplies elevation, and solve collapse contact against the actual rendered platform height. The floor check uses cached character geometry rather than hidden held-item/debug geometry. A completed held collapse reuses its correction instead of recomputing whole-model bounds every frame.

The rigs and every skin file in the supplied Workshop and game are identical, so no models were substituted or rebuilt. All eight canonical game IDs remain intact: VOLTRIX (the requested Volt), KIRIN, EMBERJACK, NOVAA, GRAVEL, MOSSBYTE, SHADE and LUMI. Their names, palettes, mesh detail, proportions, portraits and selection behavior remain unchanged.

## Gameplay-driven timing

| State | Workshop reference | Main-game behavior |
|---|---|---|
| Idle | 3 s procedural loop | Breathing/head motion; camera orbit alone stays idle |
| Walk / Run / Sprint | 1.2 / 0.8 / 0.65 s | Selected and paced from actual movement speed; normal full movement uses run, lower analog movement uses walk |
| Dash | 0.78 s | Clip phase fits the existing 0.18 s dash; existing 0.24 s dodge uses the same compatible movement pose |
| Jump start | 0.38 s | Preparation/takeoff compressed into the first 0.12 s of the existing jump; physical jump is immediate |
| Airborne | 0.55 s | Loops while rising after takeoff; late snapshots advance to the current physics stage |
| Falling | 0.36 s | Uses descending vertical velocity; holds the appropriate final fall pose during longer falls |
| Landing | 0.46 s | Triggered once by actual touchdown; controls and movement remain active |
| Slide entry / travel | 0.42 / 0.72 s | Entry fits the first 0.12 s of the existing 0.42 s slide; travel follows its remaining physical lifetime |
| Slide exit | 0.50 s | Visual rise after the real slide ends, with no extra slide movement |
| Crouch enter / idle / walk / exit | 0.40 / 2.00 / 1.35 / 0.45 s | Actual crouch toggle controls lifetime; crouch stays active indefinitely and never auto-stands when a preview finishes |
| Hit reaction | 0.62 s | Health-decrease edge triggers one reaction; duplicate snapshots do not restart it |
| Elimination | 1.75 s | Existing server KO starts collapse; final pose holds until the unchanged five-second respawn |
| Knockback / recovery | 1.05 / 0.45 s | Source clips and visual hook are available, but the supplied game has no knockback mechanic to trigger them |

Complete Jump, Complete Slide, full Crouch and Knockback → Recovery are retained as references. The runtime selects individual stages; it does not impose their full preview durations on gameplay.

Compatible poses blend over 0.09 s using reusable position/quaternion/scale buffers. Animation clocks use actual elapsed render time independently of the existing capped camera interpolation. Gait phase remains continuous through speed changes. Eliminated players cannot play normal locomotion. Freeze pauses the current visual pose, and authoritative respawn resets the timeline. Camera framing continues following the original actor position, not animated pelvis offsets. The existing 3D nameplate follows head height, retaining its original style and dimensions instead of floating far above a crouched or collapsed body.

The old uniform crouch/slide squash and KO root sinking are replaced by the actual articulated poses. Hit reactions preserve the real crouch/slide lower stance, and a collapse from crouch blends from the low pose rather than standing first. Existing melee and Freeze Ball throw/held-item hooks remain active; existing attack posture is applied without standing up the crouched/sliding lower body. No Workshop weapon attacks, reloads, recoil, switching animations, melee combos, forces or powers are introduced.

## Multiplayer and preservation

No server or shared gameplay/network file changes are needed. Animations derive from existing snapshots and local prediction; no animation frames or extra packets are sent. Temporary reconnects restore the current replicated stance. Avatar timelines and their cached poses are released with existing scene/roster cleanup, and weak rig caches do not retain removed actors.

The source-preservation audit verifies unchanged server code, shared movement/combat/mode/map code, all five arena definitions and environment builders, all character assets and portraits, CSS/HUD/control layout, and the old attack implementation. Existing room/ready/selection/loading/match flow, inventory, chest/freeze systems, controls, minimaps, camera behavior and deployment configuration remain the supplied version. Gameplay speeds, stamina, jump height/gravity, dash/dodge/slide distances and durations, damage, range, cooldowns, freeze duration, timers and scoring are not rebalanced.

Only the rendering path and new movement animation modules change production behavior. The production smoke-test helper was updated to use the existing character-selection/prepared handshake rather than assuming the older immediate-start flow.

## Build and run

Use Node 22 or newer:

```
npm ci
npm run build
npm start
```

The complete ZIP includes the tested production client and server under `dist/`, so `npm ci` followed by `npm start` runs the included build.

This Windows sandbox rejected the standard Vite config-loading step when esbuild attempted to enumerate a restricted parent directory. TypeScript compilation succeeded. The supplied portable builder then produced the client and server successfully without changing build/deployment configuration:

```
node node_modules/typescript/bin/tsc --noEmit
node scripts/portable-build.mjs
node --import ./scripts/portable-loader.mjs --test --test-concurrency=1 tests/*.test.ts
node scripts/bundle-smoke.mjs
node --import ./scripts/portable-loader.mjs scripts/movement-browser-qa.mjs
```

Browser QA defaults to Windows Edge; `BOUNTY_QA_BROWSER` can name another Chromium executable. Its software-GPU settings and frame cap are test-page adjustments only, not production changes.

## Testing and limits

The detailed final checklist and recorded results are under `movement-verification/`. Tests cover real gameplay physics and all eight original rigs. The browser checks use two isolated clients connected to the real room server and the compiled frontend. Character/map/long-fall fixtures are confined to the test runner; actual input, networking, damage, score and respawn checks use existing game actions.

Brief animation sub-stages can fall between rendered frames on the software GPU. Recorded state histories identify what each browser actually displayed. The rig/timeline tests separately exercise every individual stage and source pose; the browser audit does not pretend every short stage was visibly sampled on every client.

Live knockback/recovery is **NOT TESTED** because no current gameplay mechanic triggers knockback. Their motion and explicit visual hook are tested on the existing rigs, without adding forces. Physical phones, real-GPU performance and sustained public-network play are **NOT TESTED**. No connected Render deployment workflow is available, so the live site was not updated.

Final automated verification: **183 tests passed**, TypeScript check passed, the portable client/server production build passed, and the compiled-server two-WebSocket Tag smoke test passed through the existing character-selection/loading handshake. Real browser audits covered eight skins and supported stance on all five arenas, plus desktop movement/jump/slide/crouch/combat and mobile movement/look/jump/sprint/crouch/reconnect. Short mobile slide render windows were not consistently captured under the software GPU; this is explicitly recorded rather than claimed as a completed live pose check. Every individual movement/reaction pose and its timeline is covered by the 14 new automated integration tests.
