# Full-screen responsive gameplay HUD

This update changes the presentation of the existing match, using one game, renderer, controller and multiplayer state. It does not change map geometry, spawns, balance, server behavior, rotation or match rules. The current five-map source is retained, including Viking's Fjord; no additional map work was performed.

## Changed files

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | Existing match data now feeds a compact top-left overlay. Renders one shared player-status component, retains Lobby/Leave access, and presents mobile action icons. Removes active-match instruction text, player legend and development footer. Clears held touch input if primary pointer capability changes. |
| `src/GameHud.tsx` | New lightweight presentation component for real health/stamina, contextual KO/protection/exhaustion, a small code-native robot portrait and three action icons. No gameplay state or renderer is introduced. |
| `src/Arena.tsx` | Retains the existing scene, camera/input listeners, minimap, reticle and joystick. Removes the old external four-column status/action panel and mouse-look instruction overlay. Canvas accessibility name follows the active map. Joystick releases input when pointer capability changes. |
| `src/style.css` | Replaces the old match flex/page shell with a full-viewport surface and HUD overlays. Defines desktop/mobile placement, compact bars, touch circles, safe areas, no-scroll match behavior and responsive sizing. Menu/lobby layout is retained. |
| `index.html` | Adds `viewport-fit=cover` for safe-area handling and removes the development suffix from the browser title. |
| `scripts/browser-smoke.mjs` | Extends existing two-client QA with full canvas/backing-buffer checks, HUD positioning, one status display, capability-specific controls, landscape/portrait resizing and simultaneous joystick/look/action contacts. |
| `scripts/hud-input-mode-smoke.mjs` | Tests five touch/fine-pointer capability switches in the same connected match, without reloading or duplicating the HUD/canvas. |
| `README.md`, this report | Current implementation, test scope and same-project upload instructions. |
| `FULLSCREEN_DESKTOP_PREVIEW.png`, `FULLSCREEN_MOBILE_PREVIEW.png` | Captures of the real running match from browser QA, not mockups or production map overrides. |

## Full-screen renderer and resize

During a match, the existing main element occupies the usable viewport with a `100vh` fallback and `100dvh` height. The arena and existing canvas fill it absolutely with no outer padding, card, header space or footer. Match information, status, minimap, reticle and touch controls overlay the world. Only the match applies document overflow/overscroll restrictions; menu and lobby retain normal document behavior.

The existing `src/scene.ts` resize code is unchanged. Its render loop reads canvas client dimensions and, when they change, calls `renderer.setSize(width, height, false)`, updates `camera.aspect` and calls `camera.updateProjectionMatrix()`. CSS is therefore not stretching an old drawing buffer. Resizing does not recreate the scene, reset the match/player or replace the camera. Scene effects still depend on player identity and authoritative map/variant, not viewport dimensions.

## One HUD, two presentations

Primary pointer capability selects the presentation through `(pointer: coarse)`. This avoids user-agent sniffing and avoids showing touch controls merely because a mouse-controlled desktop window is narrow. Width/height media queries and `clamp()` adjust component size. A touch phone/tablet uses the mobile HUD; a fine primary pointer uses the desktop HUD. Capability-change listeners clear held touch inputs and joystick displacement rather than allowing invisible controls to keep moving the player.

There is one match/objective overlay and one player-status component. Round, total rounds, map/variant, room code, connected count, private bounty, round eliminations, match total and remaining seconds come directly from the existing `RoomView`. No parallel HUD countdown, fake names or local map selection is added.

Health uses the existing authoritative player health and `COMBAT.maxHealth`. Stamina uses the existing predicted local motion, falling back to the authoritative player, and `MOVEMENT.staminaMax`. Native progress values drive the bars; damage, sprint drain and regeneration remain real game behavior. Conditional KO/protection/exhaustion text remains useful player information, with no permanent control instructions or readiness panels.

On mobile, the status component flows directly below match/objective information at the top-left. Its portrait is hidden, and health/stamina become compact horizontal green/blue bars. On desktop, the same component is fixed at the bottom-left with a small portrait and a thinner stamina bar. The portrait is a simple SVG representation of the existing blocky robot identity with cyan local-player accents; it requires no second scene, camera or character-rendering system.

## Existing inputs retained

The original joystick writes to the original `stick` ref, using the existing dead zone/direction logic. The existing input loop combines it with keyboard input and calls the same camera-relative movement function. Movement, sprint, dash, combat and network messages are unchanged.

Sprint holds the existing `Shift` action through pointer capture and the existing pointer-ID map. Dash increments the existing dash request ID. Attack calls the existing reticle/camera-aim attack function. The new SVG icons are presentation only. Each contact has its own pointer identity; releasing an action does not cancel the joystick or camera contact. Cancellation, lost capture, blur, visibility changes, respawn and reconnect continue clearing the corresponding held inputs.

Right-half canvas swipes use the existing independent camera-look pointer and camera controller. Joystick/actions are separate interactive elements and do not start canvas camera drags. Informational HUD components use `pointer-events: none`, so they pass input to the game; Lobby/Leave and mobile controls opt back into pointer interaction. Desktop WASD/arrows, Shift, Space, F/locked click, Q/E, mouse-look, pointer lock and Esc retain their original bindings.

Gameplay-only `touch-action: none`, selection/callout prevention, existing pointer-event `preventDefault()` handling and match overflow restrictions prevent touch input from scrolling/selecting the page. No global browser restriction is added outside the match. Safe-area top/right/bottom/left insets protect match information, minimap, status, joystick and actions. Landscape is the primary mobile layout; portrait/orientation changes still resize cleanly.

## Minimap, reticle and preserved systems

`src/Minimap.tsx` is unchanged: authoritative active map metadata chooses its SVG layout and world bounds. Player markers retain the existing world-coordinate transformation. The minimap remains top-right across presentations, with compact responsive styling. The existing reticle remains at 50%/50% of the full viewport canvas.

Desktop hides both joystick and all three touch actions by default, regardless of narrow window width. Its bottom-right has no HUD, inventory placeholder, control instructions or readiness text. Mobile has no bottom-left portrait/status display competing with the joystick. There is only one health/stamina DOM instance after resize or mode changes.

A source-hash comparison against the pre-HUD baseline confirms that all `shared` and `server` files, map definitions, `src/scene.ts`, `src/environment.ts`, `src/camera.ts` and `src/Minimap.tsx` are unchanged. Round 1 remains Central Plaza, subsequent maps remain server-selected, Aerie variants remain Aerie-specific, and matches still use three rounds. Existing map cleanup and reconnection paths are preserved.

## Validation and practical limits

Production build and all 108 existing unit/integration tests passed. Browser regression covers two independent sessions, three complete matches, all five maps, both Aerie variants, authoritative transitions, reconnection, health damage, stamina drain/regeneration, desktop movement/mouse/pointer lock, mobile multitouch and viewport containment. A separate live-mode test passes five coarse/fine switches with the same canvas, player identity/position, map, round and connection. Run it with `node --import tsx scripts/hud-input-mode-smoke.mjs` (or set `BOUNTY_QA_BROWSER` to the installed Chromium executable). The HUD checks cover 11 fine-pointer desktop sizes and seven coarse-pointer mobile sizes (including landscape, small landscape and portrait), one health/stamina instance, actual drawing-buffer aspect, centered reticle, correct status placement and hidden desktop touch controls. See the README and real-game previews. Browser QA uses two independent sessions and actual WebGL, keyboard, mouse/pointer lock and Chromium touch contacts. Test-only in-process fixtures accelerate round transitions and guarantee coverage of every registered map and both Aerie variants; they do not add production map selectors or endpoints.

These checks are browser emulation, not physical iPhone/Android hardware tests. Safe-area CSS is present, but notch behavior, browser edge gestures and sustained GPU frame rate need a physical-device playtest. The current maps remain procedural map-first art. No inventory, Controls side panel, lobby redesign, new game mechanics or polish phase is included.
