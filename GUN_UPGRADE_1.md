# Bounty Shift — Upgrade 1: Gun Aiming, Damage & Shooting Polish

## Implemented changes

Reconstructed incrementally from the preserved Weapons Integrated V1 ZIP. The original room transport, player sessions, inventory ownership, combat damage application, scoring, KO/respawn, three game modes, map rotation and character selection remain the source of truth.

- Desktop: hold right mouse button for smooth over-the-shoulder ADS on Pistol, Assault Rifle and Shotgun; release returns to the existing camera. V swaps shoulder. Existing click-to-capture mouse behavior and Esc release remain. RMB enables the existing mouse-look fallback while held.
- Mobile: left-side Aim toggles ADS independently of the movement joystick and right-side camera swipe. Landscape/portrait sizing and safe-area offsets are included. Desired aim resumes after a reload; KO, weapon changes, map open, blur and disconnect clear it.
- Sniper: 16-degree scoped FOV versus 62-degree normal FOV (approximately 4.3x angular magnification), circular sight, crosshair/center dot, dark peripheral mask and hidden local avatar. The existing map collision constraint and additional character clearance apply to the camera.
- Pistol ADS FOV 48, rifle 44, shotgun 50. ADS settles for 180 ms before the server accepts its accuracy bonus. ADS does not change movement speed or existing sprint/jump/dash/dodge/crouch/slide rules.
- All four guns raise into an aiming pose, follow aim pitch and face aim direction; gun-specific recoil, existing equip/reload components and hand constraints are reused. Grounded ADS walking/strafing gets directional legs while airborne, crouch, slide and hit-reaction lower-body layers are retained. All eight skins use their unchanged builders.
- Rifle: held trigger/F/touch Attack repeats live fire actions, each consuming one round. Heat accumulates and recovers; the reticle and server spread use the same heat-recovery function and authoritative shot metadata, tied to the selected weapon instance.
- Shooting feedback: bounded muzzle/impact pools, per-gun flash size/color and filtered gunfire noise, one audio event per shotgun blast, headshot/body markers, small damage outputs, elimination confirmation and fixed-screen-size enemy health labels. Existing reload UI and action audio are retained.

## Damage and cadence

Normal health remains 100 HP. No armor or vital-organ system was added.

| Weapon | Body | Head | Minimum live action duration |
| --- | ---: | ---: | ---: |
| Pistol | 10 | 20 | 350 ms |
| Assault Rifle | 30 | 45 | 120 ms |
| Shotgun | 5 per pellet, up to 50 close | 8.5 per pellet, capped at 85 | 1,100 ms |
| Sniper Rifle | 80 | 100 | 1,300 ms |

Shotgun uses ten deterministic sunflower-pattern pellet rays. Full body coverage gives 50 at close range; mixed/partial coverage and falloff yield lower damage. Falloff is 1 through 100 game units from the muzzle, linear to 0.6 at 240 and linear to zero at 550. Pellets aggregate once per target and damage rounds once; it never exceeds 85. Distant/partial hits can be below 30. Existing spawn protection remains immune and physically stops the ray instead of allowing a hit on a player behind it.

## Authority and hit detection

Clients submit existing sequenced inputs, desired ADS and a camera ray, never trusted damage, target or headshot results. The existing server verifies match/round, input sequence, ownership/instance, mode permission, life/freeze, cooldown, action/reload and magazine. Only server action events consume ammo. A unique action/shot ID and event cursor prevent repeat processing.

Head and body boxes follow actual elevation, crouch and active slide. The server checks a bounded plausible camera position and chest-to-camera visibility, casts the camera sight, then casts from the authoritative muzzle toward that sight. Near muzzle cover can block a shot even if the camera can see over it. Map occlusion, nearest target, team rules and protection are resolved server-side. Malformed/non-finite origins are rejected; implausible origins fall back to the chest. There is no lag compensation or client-reported hit acceptance.

A damage intent enters the original room pipeline once per target; that pipeline applies health, stable simultaneous-hit scoring, existing elimination handlers and respawn. Damage and elimination feedback is broadcast for 1.5 seconds (traces 350 ms) so slower renderers can receive confirmations. No alternate health, ready, room, score or map state was created.

Existing shotgun per-shell reload interruption after loading a shell is preserved. Other reloads block shooting until complete. Equip, reload, melee timing and all original weapon builders remain authored V5 source; live firearm firing now uses the cadence above instead of V5 preview timing.

## Files

New shared gun configuration/geometry lives in `shared/gun-config.ts` and `shared/gun-combat.ts`. Existing `server/weapon-combat.ts` handles raycasts/damage intents; `server/rooms.ts` validates/replicates ADS and adds confirmations at its existing elimination transition. `shared/weapons.ts`, `shared/game.ts`, and `shared/presentation.ts` expose the compatible fields/configuration.

`src/Arena.tsx`, `src/main.tsx`, `src/scene.ts`, and `src/weapons/gameplay.ts` connect real inputs, camera and character presentation. `src/CombatFeedback.tsx` and `src/gun-combat.css` add gun-specific UI; `src/LootEffects.ts`/`src/gameplayAudio.ts` extend existing effect/audio owners. `src/ControlsGuide.tsx` documents the new Aim/V controls without removing existing bindings. New gun tests, expanded skin attachment tests and `scripts/gun-browser-qa.mjs` provide reproducible coverage.

## Preservation

`gun-verification/preservation.json` records byte comparison against the input ZIP. All original maps/environments, eight character skin builders, original weapon model/attachment modules, power-ups, melee and mode logic, networking transport, control-input bindings and map rotation are unchanged. The `advanceMotion` implementation is byte-identical. Only optional ADS fields were added to shared movement/view types. There was no melee animation overhaul, game-mode update or unrelated menu/HUD redesign.

## Running

Use Node 22 or later: `npm ci`, `npm run build`, then `npm start`. The existing single Node service still serves the React game and WebSocket endpoint. No new production dependency, credential or environment variable is required. Source and built client/server are included; dependency folders and secrets are excluded.

## Verification status

Latest results: 268 automated tests passed (zero failures/skips), production build passed, and the complete two-client four-gun browser pass passed with zero page errors. See `gun-verification/TEST_RESULTS.md` and raw logs for details. A complete recovery ZIP was saved to persistent storage before browser verification. The final ZIP is created after verification and any required fixes.

## Limits

Browser QA uses two independent Chromium contexts connected through actual sockets and rendered with software WebGL. Test fixtures place real room members on supported existing-map positions and grant existing inventory items; they do not install a production cheat endpoint or replace hit/health calculations. Test-only selection/round clocks are extended for software rendering. Damage is produced by the actual controller ray and authoritative firing path.

This environment cannot certify physical iOS/Android devices, Safari, native pointer-lock behavior on every OS, hardware-GPU frame rate, six-device high-latency play or the subjective quality of synthesized audio on speakers. Scope/peripheral styling, input, live state, geometry, attachment constraints and desktop/mobile browser layouts are checked within these stated limits. Render deployment is reported separately; an available old URL is never evidence that this upgrade deployed.
