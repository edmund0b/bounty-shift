# Bounty Shift — Workshop-to-game integration

The destination is the supplied `Bounty_Shift_Control_System_Update.zip`. The supplied Workshop/environment archive is the content source. The game was not replaced with the Workshop's older runtime.

## Finished maps

All five map definitions, architectural plans and environment renderers were ported directly from the Workshop's matching game/vendor source: Central Plaza, Scorched Point, Aerie Sky-Port, Outlaw's Canyon and Viking's Fjord. The definitions and visual builders are byte-identical to those source files. This includes the finished layouts, interiors, stairs, ramps, bridges, rooftops, scenery, materials and generated atmosphere assets. No alternate interpretations or prototype arenas were created.

`shared/maps/*`, `src/environments/*` and `src/environment.ts` contain the transferred content. The existing five-entry `shared/map.ts` registry and `shared/map-rotation.ts` remain unchanged. Round 1 stays Central Plaza. The supplied rotation excludes the immediately previous map; it can select Central Plaza again in Round 3. That existing behavior was retained rather than silently changing the probabilities.

The existing traversal, movement, jump, collision, combat and camera controller algorithms remain intact. Three authored capture anchors in `shared/map-anchors.ts` were adapted to the new layouts/elevations so the current game's existing modes can operate there. All spawn positions have valid support and collision clearance. The minimap consumes the same real map definitions. The scene's fog range/far clipping were widened to accommodate the finished larger environments.

Only the current map is built. Environment geometry/material instancing and disposal come from the Workshop. Scene replacement disposes environment and character resources; resources are not left active across map changes. No new hazard rules were invented: implemented environmental presentation and current runtime rules are retained.

## Eight actual Workshop characters

The exact source registry order is VOLTRIX, KIRIN, EMBERJACK, MOSSBYTE, NOVAA, GRAVEL, LUMI and SHADE. The reference illustration calls the first character VOLT; the actual supplied Workshop calls it VOLTRIX. Its source name and stable `voltrix` ID were retained.

`src/characters/` contains the actual procedural models, detailed skin builders, anatomy, rig, generated textures, materials and accessories. `src/animations/player.ts` contains the existing Workshop animation implementation. There are no omitted external model files: these particular assets are built from source. Exactly eight IDs are validated in `shared/characters.ts`.

`src/scene.ts` resolves each replicated player character ID to that model. All characters share the current movement, health, stamina, attack range and collision rules. A common visual scale adapter aligns the source feet datum with the game's floor. Existing nameplates, hit feedback, KO appearance, protection rings and current held-item effects remain connected.

The source idle, walk/run/sprint, dash, attack and hit poses are mapped to existing gameplay state. Jump height, crouch/slide and KO/respawn transforms continue using current gameplay state. The Workshop explicitly marks its dedicated jump/land animation clips as not created; no new clips or animation polishing were invented here. Skin choice has no gameplay bonuses. Respawns and every later round keep the same confirmed ID.

## Circular selection and authoritative flow

`src/CharacterSelection.tsx` adapts the Workshop Engine's eight-model, 5.2-radius rotating lineup, outward-facing models, lighting, idle animation, drag sensitivity, angular velocity and exponential damping. Models are built once per selection screen, not on every rotation. Desktop mouse and mobile touch can rotate the circle; model clicking, previous/next buttons and keyboard-accessible shortcuts can focus a character. Focusing is separate from Equipping. The featured model sits at the front of the circle. The screenshot reference informs HUD styling; no card grid, powers or classes were added.

`src/character-selection.css` supplies the dark/cyan layout, timer, real participant statuses, focused name, Equip/waiting state and responsive safe-area spacing. The existing login, lobby, gameplay HUD and controls styling are unchanged.

The existing WebSocket connection carries two new messages: `choose_character` and `character_prepared`, both scoped to the match ID. `server/rooms.ts` extends the existing room phase state with `character_selection` and `match_loading`; `shared/game.ts` exposes their state and selected IDs. Host permission, minimum count, readiness and current mode/format gates are checked before entering selection.

The server owns a 30-second choice deadline and 39-second total window. Clients display remaining time from authoritative room timestamps. A valid first Equip is immutable; repeated, stale and invalid messages are rejected. Duplicate skin choices across players are allowed. At 30 seconds the server randomly assigns each remaining participant from the eight validated IDs. Reconnects restore the same epoch, deadline and assignments; the deadline is never extended by a client.

When all assignments are valid, loading begins immediately. The client builds and renders the actual active arena scene behind an opaque preparation overlay and acknowledges successful preparation. A reconnecting prepared client re-acknowledges through the existing connection. The server starts the existing Round 1 initialization only when every required client is connected, assigned and prepared. No fake progress bar or second Start button exists. If preparation is incomplete at 39 seconds, the room safely returns to the lobby rather than starting invalid state.

The existing match ID/round initialization, scoring, results and three-round progression remain in place. Character selection runs once per match, never between rounds. Returning to the lobby clears assignments; the next host start creates a fresh selection epoch. Leave, disconnect grace and host migration continue using the existing room cleanup rules.

## Validation and preservation

- TypeScript and production client/server build passed.
- All 162 game tests passed, including existing/adapted regressions and the new eight-model rig/detail/animation/disposal test. Existing controller/combat rule tests use explicitly frozen test geometry; updated authored maps have separate traversal coverage. Test-only clients now complete selection/preparation before their gameplay assertions.
- Selection tests cover host gates, invalid/stale/duplicate requests, six-player duplicates, immutability, precise timeout assignment, incomplete-loading timeout, reconnect, host transfer, permanent leaves, all eight character identities, KO/respawn, three rounds, results and new-match resets.
- Finished map tests cover spawns, stairs, bridges, upper/lower routes, interiors, collision and disposal. The Central Plaza inspector verifies nine building roof routes and the complete lower transit shortcut. Jump, sprint and dash are checked against every authored spawn across all maps.
- The original Workshop source was not edited. Its production build and all eight Workshop tests passed.
- Browser previews were captured from the real running game: desktop/mobile circular selection and all five gameplay environments. All eight character models were rendered through the real arena component. Two independent clients exercised real create/join/ready/start, equip replication, touch browsing and early preparation/start, desktop movement/jump/attack and the minimap.

### Remaining verification limits

Physical phones, real GPU performance and sustained public high-latency sessions were not tested. Headless Chromium uses software graphics; a full-page reload during selection exceeded the existing 10-second reconnect grace and removed the player. That policy was intentionally preserved. Server token-resume tests pass; connection recovery and real 30-second timeout browser results are recorded in the accompanying verification files. A physical-device reload within the existing grace window should be playtested.

No weapons, inventory, chests, power-ups, controls, combat balance or unrelated UI were added or redesigned. The supplied game already contains some of those systems; they were preserved rather than rolled back. Input bindings, shared controller/traversal/combat code, mode rules, HUD components, login/lobby UI and map-rotation source were left unchanged.

## Delivery and deployment

`Bounty_Shift_Workshop_Integrated_Game.zip` is the complete updated game: client/server/shared source, all required procedural model/map resources, public assets, manifests, tests, documentation and a fresh production build. Extract it, open the `bounty-shift` folder, install with `npm ci`, then run `npm run dev`; production uses `npm run build` and `npm start` on Node 22 or newer. Do not run the archived older game instead.

The existing Render deployment was not updated. No connected Render deployment workflow or deployment credentials are supplied by these archives or available in this session. Existing hosting configuration and the single Node/WebSocket service are preserved. Deploy this updated project through the existing Render service when that workflow is available; no second deployment was created.
