# Bounty Shift — Control System Update

Updated from Bounty_Shift_Chest_Freeze_Polish.zip. Includes complete source, assets, dependency lockfile, tests, and the compiled production build in dist/. Install dependencies with npm ci, then npm start to run the included build; npm run build rebuilds the project.

## Desktop controls

| Input | Action |
|---|---|
| WASD (arrows also retained) | Normalized, camera-relative movement |
| Space | Immediate normal jump |
| Space twice within 240 ms | Existing dash; the second press does not jump again |
| Left Shift held | Existing sprint/stamina; release stops sprint |
| X tap | Toggle crouch |
| X held for 220 ms | Existing slide, once per deliberate hold; requires movement |
| Z | Existing dodge |
| E | Contextual open / pick up / interact |
| Mouse / Q and R | Camera look / secondary horizontal rotation |
| Left click / F | The same validated attack or utility throw action |
| 1 / 2 / 3 or click a slot | Select Weapon / Carry / Utility |
| Esc | Release cursor; does not leave the match |
| M | Open or close the existing live map |
| H or Show/Hide Controls | Toggle instructional hints only |

The first Space press responds immediately. A quick second press adds the existing dash rather than a second jump. Holding or repeating Space does not jump repeatedly. Tap X again to stand; jumping or evading also exits crouch. Crouch uses a synchronized stance and visibly lowers the block character without changing established movement speeds.

## Mobile

Left joystick and independent right-side look pointer remain simultaneous. The right thumb controls provide Jump, Dash, held Sprint, Attack, tap Crouch / hold Slide, Dodge, and contextual OPEN / PICK UP / INTERACT. All three loadout slots are tappable. The minimap expands and its close button returns to gameplay. Hiding instructional hints keeps the actual touch buttons and essential HUD visible.

## Gameplay integration

Bindings and timing thresholds are centralized in shared/control-input.ts. Keyboard and touch route to shared client actions, then the existing authoritative server input, interaction, and combat paths. Jump physics are shared by server and client prediction, with supported landing and collision checks. Invalid airborne jump requests are consumed rather than queued. Unsafe landings against non-playable solids or outside authored support return to the valid takeoff support without introducing a fall-damage system.

Weapons are stored in Slot 1, the existing authoritative flag represents Slot 2 Carry, and Freeze Ball is stored in Slot 3. Switching slots changes heldItem on the server and synchronizes to other players. Empty Carry/Utility slots do not equip phantom items. Consuming a utility restores Slot 1. Inventory clears on elimination and round reset and survives valid reconnects. No extra slots were added.

Existing speed, stamina, dash/dodge/slide timings and velocities, damage, range, cooldowns, health, respawn, chest loot/timing, Freeze Ball speed/lifetime/freeze duration, round duration, scoring, and mode loot tables remain intact. Arena geometry, environment rendering, chest art, and Freeze Ball effects were preserved.

## Verification

- TypeScript check and client/server production build passed.
- 148 automated tests passed, including existing multiplayer room, readiness, host authority, reconnect, mode/team, combat, KO/respawn, scoring, rounds, rotation, traversal, chest and Freeze Ball tests.
- New tests cover Space edges/repeats/double press; X tap/hold/cancel; synchronized jump and airborne rejection; landing across all five arenas; jump/dash collision at all arena spawns in eight directions; validated category selection and stale/invalid equipment requests.
- Desktop browser QA with a real second WebSocket client covers WASD, jump, double-Space dash, sprint/release, crouch/slide, dodge, Q/R, pointer lock, mouse movement/click, F, Esc, E chest/pickup, keyboard/click equipment selection, utility consumption, M, H, clickable hint toggle, and map close.
- Mobile landscape browser QA covers simultaneous joystick/look, touch movement abilities, attack, contextual chest/pickup, slot selection, utility throw, map open/close, essential controls after hiding hints, and no document scrolling. Browser tests reported no page or graphics errors. Mobile QA uses touch emulation, not a physical-device performance measurement.
- Compiled production server smoke test passed with served client assets and synchronized two-player Tag over real WebSockets.

Reproduce the portable checks with:

```
node node_modules/typescript/bin/tsc --noEmit
node scripts/portable-build.mjs
node --import ./scripts/portable-loader.mjs --test --test-concurrency=1 tests/*.test.ts
node scripts/bundle-smoke.mjs
node --import ./scripts/portable-loader.mjs scripts/controls-browser-qa.mjs
node --import ./scripts/portable-loader.mjs scripts/controls-browser-qa.mjs --mobile
```

Browser QA defaults to installed Windows Edge. Set BOUNTY_QA_BROWSER to another Chromium executable if necessary. Older browser scripts document prior HUD iterations; the package test:browser scripts now run the current control QA.

The live Render deployment was not updated. This delivery contains the tested local source/build for the existing deployment workflow.
