# Bounty Shift gameplay update

## What changed

The existing Node/Express/WebSocket server, room codes, host migration, readiness, reconnect grace, third-person camera, camera-relative prediction, collision, stamina, sprint, dash, melee, health, KO, five maps, and three-round match flow remain in place.

The host now selects Tag, Flag Run, or Kill Race and a single Solo/Duo format. Changes are synchronized and clear readiness. Solo requires 2–6 players; Duo requires exactly 4 or 6. Teams are assigned by lobby order at match start and stay fixed for all rounds. Friendly fire is disabled. A permanent departure that invalidates Duos returns the room to the lobby; reconnecting within the existing grace period preserves the team.

- **Tag:** one player/team is IT. A validated melee hit transfers IT, with 1.2 seconds of retag protection. The IT side loses at timeout; each safe side earns one round point. No damaging melee in Tag. Freeze balls can be used by any player against opponents, freeze for three seconds, and are consumed when thrown.
- **Kill Race:** all enemy eliminations count, independently of old Bounty targets. Solo ends at 90 seconds. Duos also end immediately at 15 team eliminations. Highest score wins; tied leaders share the round point.
- **Flag Run:** loot/fight for 30 seconds, with an incoming notice in the final five seconds. One flag spawns at a valid map anchor. Use picks it up; delivering it to the cyan capture ring wins. KO, disconnect, or leaving drops the flag. Timeout without a capture awards no round point.

Match standings count round wins across exactly three rounds. Central Plaza remains the opening map; later maps use the original random rotation. Maps are not selectable. The final screen remains until the host returns everyone to the lobby.

## Controls and items

Existing WASD/arrows, camera, Shift sprint, Space dash, click/F attack, touch joystick, touch camera, and mobile ability controls remain. Added controls:

| Action | Desktop | Touch |
|---|---|---|
| Open chest / claim loot / recover flag | R | USE |
| Throw held freeze ball | F / attack click | ATTACK |
| Dodge | Z | DODGE |
| Slide while moving | X | SLIDE |

Opening a chest reveals loot; a second use claims it. Chest loot is resolved once on the server, even when players contend for it. Floor loot refreshes after 12 seconds; chests do not refill during a round. Tag loot is freeze balls only. Combat modes supply blades (25 damage, 0.38-second cooldown) and hammers (40 damage, 0.9-second cooldown); unarmed melee retains the original 25 damage / 0.6-second cooldown. Picking up a new item replaces the held item.

Dodge and slide share the controller's collision and dash cooldown, with distinct durations/speeds. They do not grant invulnerability. The server's KO timer drives the visible respawn countdown. The animation-state adapter leaves animation timing separate from gameplay.

## Architecture and audit

The supplied ZIP uses `server/rooms.ts` as the room and match controller and `server/index.ts` for sockets, heartbeat, rate limiting, and serving. `shared/game.ts` implements shared prediction/motion. `shared/combat.ts` supplies melee geometry, wall tests, and safe respawns. `shared/rounds.ts` supplies the 90-second / three-round flow. Five map definitions and `shared/traversal.ts` remain the source of geometry and walkability. `src/main.tsx` handles networking and inputs; `scene.ts` presents Three.js world state; `EntryFlow.tsx` handles lobby entry.

New mode contracts and balancing constants live in `shared/modes.ts`; rule lifecycle hooks live in `server/modes.ts`. Map-specific capture anchors and loot anchors live in `shared/map-anchors.ts`. Scorched Point's capture ring uses its raised platform elevation. Loot positions reuse each map's validated spawn anchors; they can be authored independently later without changing mode rules. `ModeLobby.tsx` and `ModeHud.tsx` extend the existing UI. World meshes only present server state.

The previous Bounty behavior is retained internally through `RoomServer(true)` / `createGameServer(true, true)` for regression coverage and possible future extraction into a selectable ruleset. It is not exposed as a fourth mode. Existing Bounty tests explicitly request it; new mode tests use the normal default server.

The ZIP did **not** contain a separate jump system or a character selector. Those were not removed or fabricated. Jump/fall and pickup/throw animation names are reserved in the presentation adapter; full character animation remains future work. Loot and mode artwork are deliberately simple, using the existing city art and procedural meshes. No annotation boxes from the reference were added.

For development-only round diagnostics, set `BOUNTY_DEBUG=1`. Logs contain mode, format, map, teams, IT, flag state, and loot table, without session tokens.

## Build, run, verify

Normal deployment commands remain:

```sh
npm ci
npm run build
npm start
```

Node 22+ is required. Render should use `npm ci && npm run build` as its build command and `npm start` as its start command. The server continues to use Render's `PORT`. Replace the connected repository's game files with this project and deploy through the existing service. No deployment credentials are included and the live Render service has not been changed by this package.

Tests:

```sh
npm test
node --import tsx scripts/modes-browser-smoke.mjs
```

Set `BOUNTY_QA_BROWSER` to an installed Chromium executable for the browser test. Browser checks launch isolated test profiles and never use personal browsing data.

This Windows sandbox blocks native esbuild ancestor lookup and tsx's OS user lookup. Optional portable verification scripts avoid those platform-specific operations, using TypeScript and Vite/Rollup:

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/portable-build.mjs
node --import ./scripts/portable-loader.mjs --test --test-concurrency=1 tests/*.test.ts
node --import ./scripts/portable-loader.mjs scripts/modes-browser-smoke.mjs
```

The portable build emits the same `dist/client` and `dist/server.js` entry locations. See the accompanying verification report for checks actually run. These checks cannot guarantee zero regressions on every device or production network.
