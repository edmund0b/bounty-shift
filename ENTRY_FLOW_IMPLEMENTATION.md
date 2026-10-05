# Bounty Shift multiplayer entry redesign

This updates the existing login and waiting lobby in `bounty-shift-layout`. It continues from the full-screen responsive gameplay build. It adds presentation and guides around the existing multiplayer state and actions; it does not add another multiplayer flow.

## Changed and added files

| File | Responsibility |
| --- | --- |
| `README.md` | Points to this update and its run instructions. |
| `src/main.tsx` | Replaces the previous pre-match JSX with `EntryFlow`, passing the existing name/code, room, player identity, connection, latency, pending state, action dispatcher and start eligibility. Removes the old Test Rules component and prototype footer. Pre-match error wording uses “match” rather than “test”. The WebSocket lifecycle, prediction, input processing and active-match JSX retain their existing behavior. |
| `src/EntryFlow.tsx` | Shared branding/status, real login forms, waiting lobby, native code entry, clipboard feedback, real player/host/readiness displays, map information, informational match settings, Ready/Start/Leave actions, How to Play and Controls drawer. |
| `src/entry.css` | Entry-only cinematic backgrounds, rain/searchlight motion, cut-corner terminals, cyan buttons, responsive columns, laptop height tuning, portrait scrolling, safe-area padding, reduced-motion support and drawer styling. Existing `src/style.css` is unchanged. |
| `public/assets/central-plaza-entry.webp` | Compressed generated menu artwork: rainy nighttime city, globe sculpture, rooftops, cyan reflections, red beacons and right-side hooded human operative. Background artwork contains no functional UI. Both screens use the same environment. |
| `public/assets/central-plaza-preview.webp` | Cropped clean capture from the existing Central Plaza renderer. No map or renderer was rebuilt to make this preview. It is an informational thumbnail, not a second scene. |
| `scripts/entry-map-smoke.mjs` | Tests both real clients entering matches and rendering all five current maps, preserving minimaps/full-screen HUD and returning to the same lobby. Map coverage uses server test fixtures only. |
| `scripts/entry-flow-smoke.mjs` | Two independent browser sessions exercise the complete entry flow, code editing/copy, guide drawers, responsive layouts, ready/unready, host start, existing gameplay transition, leave cleanup and host transfer. Captures real-page previews. |
| `scripts/browser-smoke.mjs`, `scripts/hud-input-mode-smoke.mjs` | Update code extraction and button selectors to the new visible terminology. Existing gameplay regression coverage is retained. |
| `tests/multiplayer.test.ts` | Corrects an existing intermittent test assumption: round-reset elevation is compared against the selected map's defined spawn elevation, rather than assuming every randomly selected map spawns at elevation zero. Gameplay code is unchanged. |

## Reference integration

Reference 1 drives the logo and status positions, dark rainy rooftop setting, right-side operative, centered translucent login terminal, cyan Create Room action, six-slot code appearance and secondary How to Play action. All interactive elements are native React controls connected to the current app.

Reference 2 drives the Private Lobby header, real separated room code and Copy action, player occupancy indicator, left player roster, right map preview/objective/settings, requirements strip and bottom ready/start row. Visible terminology uses PLAYERS, DISPLAY NAME, ROOM CODE and CURRENT MAP.

The logo is live typography plus a vector reticle, shared by both screens. The background is cinematic presentation artwork; it does not claim to reproduce the gameplay map geometry. The map thumbnail shows the real current game geometry. The existing gameplay HUD has not been restyled.

## Real state and actions

- Display Name stays in the existing App `name` state. Create/join send the same `{type:'create',name}` and `{type:'join',name,code}` messages through the existing dispatcher. The server validates and normalizes the name; lobby rows show the server's `room.players[].name`.
- The code input is one native text input over six visual slots. This preserves keyboard editing, backspace, cursor navigation, paste and mobile keyboard behavior. Input is uppercased and pasted spaces removed. The existing six-character submit gate, nonempty name gate, connection gate and pending gate remain. The server still validates room existence/capacity/duplicate names.
- Lobby code and Copy both use `room.code`. Clipboard API is used when available, with a legacy copy fallback, temporary COPIED feedback and an inline manual-copy message if copying fails. No browser alert is used.
- Player rows consume the existing synchronized `room.players` array. The local row compares `p.id` with the existing local ID. HOST compares `p.id` with `room.hostId`. READY/NOT READY and reconnecting status use `p.ready` and `p.connected`. Empty rows fill up to the imported `MAX_PLAYERS`; they are placeholders for genuine available slots, not fake players.
- Occupancy dots/count show actual connected membership; a disconnected reserved player still occupies its row and shows RECONNECTING.
- The minimum-player indicator mirrors the existing two-connected-player rule. All-ready requires every room member to be connected and ready. The existing App `canStart` calculation remains in place, and the server remains authoritative.
- Ready Up sends the same ready message. The existing unready operation is exposed as CANCEL READY. Host start sends the same `{type:'start'}`. Non-hosts never receive a Start Match button; eligible non-hosts see WAITING FOR HOST. Opening either guide does not send a multiplayer message or reload the page.
- Leave Lobby sends the same `{type:'leave'}`. Existing server removal, room deletion, remaining-client updates, host transfer and session cleanup remain responsible for the result.
- Connection status uses App's actual socket status and measured ping/pong round-trip latency. Milliseconds are omitted until measured. The signal glyph is decorative, not a fabricated signal-strength measurement.

## Map and match configuration

Inspection confirmed the server always opens round one with imported `OPENING_MAP_ID` (currently Central Plaza). Later rounds use the unchanged server random rotation, excluding the previous map. Variant selection is unchanged.

The lobby states “OPENING ROUND · RANDOM ROTATION FOLLOWS”; it does not invent an upcoming random-map selection. The name comes from `MAPS[OPENING_MAP_ID]`. Round count comes from `room.match.totalRounds`; round duration comes from shared `ROUND.durationMs`; capacity comes from `MAX_PLAYERS`. Settings are informational. Night describes the fixed menu/first-map atmosphere rather than an added editable time setting. No map selector, altered probabilities or new selection timing was introduced.

## Guides and actual controls

How to Play reworks the old development-facing rules into the actual assigned-target scoring, melee/wall behavior, health/damage, respawn protection, round scoring, intermission, total-match scoring/ties and room-start requirements. It is accessible from login and lobby. Control instructions are confined to the lobby Controls drawer.

Desktop controls confirmed in `main.tsx` and `Arena.tsx`:

| Action | Input |
| --- | --- |
| Camera-relative movement | WASD or arrow keys |
| Sprint | Hold Shift |
| Dash | Space |
| Attack | Left click after activating mouse-look, or F |
| Camera | Click arena to activate mouse-look; Q/E fallback |
| Release cursor | Escape |

Mobile controls confirmed in the same current game:

| Action | Input |
| --- | --- |
| Camera-relative movement | Left joystick |
| Camera | Drag the open right half of the game canvas |
| Sprint | Hold Sprint |
| Dash | Tap Dash |
| Attack | Tap Attack |

The drawer uses the same live `(pointer:coarse)` capability query as existing gameplay presentation. It updates on capability changes. It overlays the lobby, supports close/outside click/Escape, traps keyboard focus and returns focus to the opener. It does not disconnect or alter ready state.

## Responsive and performance behavior

Both screens fill the viewport through a dedicated entry wrapper. Shared fixed cover artwork preserves aspect ratio. Desktop and laptop layouts retain two columns; small screens stack the lobby. A portrait lobby may scroll to keep inputs, room actions and guides legible. Entry scrolling never changes the existing gameplay `match-open` overflow handling.

Safe areas are applied to the entry wrapper and drawer. Buttons use visible keyboard focus. The main actions have large touch targets. The code field uses native input semantics rather than six independent input states. Motion uses a light CSS rain layer and one slow searchlight gradient, with reduced-motion support and no continuous DOM rebuilding. The compressed background is reused by both screens. No WebGL menu renderer or new portrait renderer was introduced.

## Preservation

A SHA-256 comparison against the pre-task sources confirms all `shared/*.ts` and map files, both server files, `Arena.tsx`, `scene.ts`, `camera.ts`, `environment.ts`, `GameHud.tsx` and `Minimap.tsx` are unchanged. Existing `src/style.css` and `index.html` are unchanged. Active-match rendering, input handlers, keyboard mapping, independent touch pointers, camera, health/stamina, combat, prediction, networking, map loading and rotation remain the same.

There is no duplicate room system, ready system, multiplayer subscription, fake player list or fake map selection. Central Plaza, Scorched Point, Aerie Sky-Port, Outlaw's Canyon and Viking's Fjord are preserved. No inventory, combat redesign, gameplay HUD redesign or unrelated page redesign was added.

## Validation

- Production TypeScript/Vite/server build: passed.
- 108 automated tests: passed after correcting the existing random-map spawn-elevation test assumption.
- Dedicated entry-flow browser test: passed with two independent sessions, desktop and Chromium touch emulation. Covers native code editing/insertion/deletion; correct clipboard contents; create/join/name continuity; synchronized roster, ready and cancel-ready; non-host restrictions; host start into the original renderer; guide dismissal; mobile guide content; eight viewport sizes; standard laptop no-scroll fit; player leave, rejoin, host leave/transfer and final room cleanup. No browser runtime errors.
- Focused two-client map browser check: passed for Central Plaza, Scorched Point, Aerie Sky-Port, Outlaw's Canyon and Viking's Fjord. Both clients render the same map, retain one minimap and status display, fill the viewport and return to the real lobby. Test-only map fixtures cover every registered map; production selection code is unchanged.
- Five live coarse/fine pointer switches: passed in the existing HUD regression, retaining one renderer/player identity and unchanged map/round/connection.
- The long existing traversal browser script did not pass completely. One run reached Fjord and failed a stamina observation after a long climb; another failed a Canyon touch-displacement fixture. These failures are outside the entry-flow checks; this report does not claim the complete legacy traversal script passed. The 108 automated tests, dedicated entry-flow checks and focused five-map rendering checks pass.
- Full-duration real-time rotation check: three independent WebSocket clients completed a 280.2-second three-round match, agreed on all transitions, restored the same identity/map after reconnect, received results and returned to a fresh Central Plaza opening.
- Physical iPhone/Android soft-keyboard behavior, platform clipboard permissions and real safe-area/browser chrome behavior still need device playtesting. Chromium emulation is not a physical-device test.

## Artwork generation record

Built-in image generation was used for the menu asset only. The exact generation prompt was:

> Use case: stylized-concept. Asset type: production game menu background, widescreen 16:9. Create cinematic realistic Bounty Shift Central Plaza nighttime urban environment matching the two reference images in this conversation. ONLY environmental artwork; NO logo, NO UI, NO panels, NO buttons, NO text except optional tiny architectural CENTRAL PLAZA signage. Elevated rooftop view over a dense city plaza, tall dark buildings and illuminated windows, a blue-lit globe sculpture in the left lower middle, cyan neon, wet reflective black rooftops, restrained red navigation lights, subtle rain and mist, distant searchlight beams. On the far RIGHT edge a mysterious human operative in a dark hooded street tactical jacket and cargo pants, viewed from behind looking over the city, cyan rim light, not a robot. Keep central 55% naturally darker with skyline still visible, usable behind a real HTML login/lobby interface. Rich architectural detail on left and right, atmospheric depth, dark navy/slate/black palette, scattered warm windows, realistic game key art, no excessive futuristic spaceships. Output an actual background asset without any interface or typography.

Final project asset path: `public/assets/central-plaza-entry.webp`. The generated original is retained separately; the project uses the compressed copy.
