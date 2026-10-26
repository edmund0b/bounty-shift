# Bounty Shift — Tag Run 2.0, Polish Pass 01

Completed against the supplied Powerups Pair1 Final project. No deployment was performed. This release stops at Tag Run Polish Pass 01; Flag Run and Kill Race were not redesigned.

## Balancing and behavior

| Setting | Original | Updated | Configuration |
|---|---|---|---|
| Tag Mystery Box initial / maximum active | 3 / 3 | 3 / 5 | shared/tag-polish.ts, consumed by shared/mystery-crates.ts |
| Tag Mystery Box refill delay | 40 seconds | 10 seconds | TAG_POLISH.crates.respawnMs |
| Tag replenishment check cadence | 2.5 seconds | 250 ms | TAG_POLISH.crates.spawnIntervalMs |
| Sticky Trap Tag lifetime | 5 seconds | 45 seconds | TAG_POLISH.sticky.lifetimeMs; stickyLifetime(mode) |
| Sticky slowing | 35% for 1.5 seconds | Unchanged | shared/pair-powerups.ts |
| Smoke lifetime | 4 seconds | 14 seconds | TAG_POLISH.smoke.durationMs |
| Smoke radius | 95 units / 2.85 m | 118.75 units / 3.5625 m | TAG_POLISH.smoke.radius |
| Smoke expansion / dispersal | Shield-like spheres | 350 ms / final 700 ms | TAG_POLISH.smoke |
| Portal lifetime / cooldown | 8 seconds / 1 second | Unchanged | existing power metadata / TAG_POLISH.portal |

Mystery Boxes remain secret until collection. The server retains generation validation, atomic collection, single private reward, inventory handling, rarity weights, cooldowns and round cleanup. The existing system uses distributed safe map candidates rather than three fixed coordinates. Three initial slots are retained; two more replenish within 500 ms if valid locations are available. Spacing remains 550 units (16.5 m); map geometry is unchanged. Blocked sites retry rather than forcing an unsafe spawn. Refill is at least 10 seconds, subject to safe placement and the existing final-five-second cutoff.

Measured opportunities over a 135-second Tag round: 65 Mystery Boxes versus 52 weapon pickups on each of the five maps, ratio 1.25. Previous measured count was 12 versus 52. These are generated opportunities under the test collection schedule, not a guarantee that every player collects every box. Existing analytical ratio:2 metadata is an aspiration, not an enforced two-to-one spawning budget. Flag Run and Kill Race retain their two-box cap, 50-second respawn and 2.5-second check cadence. Other pickups were not accelerated or reduced.

Sticky Trap retains its hexagonal adhesive presentation, floor placement, 350 ms arming time, 35-unit trigger, one-per-owner / six-per-round cap, owner/team immunity, single activation and 35% slow for 1.5 seconds. Its fixed server deadline does not reset while players move. Existing disconnect, respawn and round cleanup remain legitimate early removal conditions. The existing status strip now shows the owner's placed-trap countdown and the victim's slowing countdown; the HUD was not redesigned.

Smoke now uses 16 soft textured billboards in one instanced draw per cloud, sharing a small procedural texture and geometry. It expands, drifts and disperses without a particle simulation. The same shared radius envelope drives rendering bounds and existing server visibility concealment, including growth, fade and expiration. Vertical extent remains 70 units. Shader clipping prevents visible puffs extending beyond the authoritative horizontal radius. Existing self/team visibility behavior is preserved; smoke conceals avatars/nameplates along intersecting sight lines, without adding collision, damage, stealth or targeting mechanics.

Portal verification found two defects: the destination ring used the source elevation, and standing still could auto-teleport back every second. The destination ring now uses the correct endpoint height; subtle cyan floor circles show the existing activation radius. A same-pair exit latch requires leaving both endpoints before reuse, while preserving the existing one-second cooldown, eight-second lifetime, range, eligible players and collision-safe destination logic. Movement and camera remain usable after teleportation.

## Authority and preservation

The existing Node/Express/WebSocket architecture is retained. The server controls pickup grants, respawn deadlines, trap activation/slowing, smoke visibility and portal position changes. Clients visualize synchronized fields/deadlines; no local visual state grants rewards or changes player positions. No cheat endpoints were added.

The source audit found no deleted source files. Protected map definitions, weapon and character models, combat, movement, traversal, room and mode architecture files are byte-identical to the supplied ZIP. All five maps and all eight skins remain present. Existing inventories, workshops, melee, firearms, animations, IT/tag/scoring rules, 135-second rounds, three-round structure, lobby, minimap and other modes are preserved. Existing Workshop assets are retained; no separate Workshop was rebuilt.

## Executed verification

| Check | Actual outcome |
|---|---|
| Production build: TypeScript, Vite, server bundle | Passed; existing large-client-chunk warning remains |
| Full automated suite (`npm test`) | 356 passed, 0 failed, 0 skipped; 193.4 seconds |
| Final focused polish unit suite | 15 passed, 0 failed |
| Two-, three-, four-, five-, six-player simulations | Passed collection fairness, independent refill, duplicate rejection, cap and cleanup |
| Six separate live WebSocket clients | Passed contested pickup, private reward, reconnect, real 10-second refill, real 14-second smoke, 30-second trap retention, 45-second expiration, trap trigger/slow expiry, teleport, all-client synchronization and three-round/results/lobby cleanup |
| Two separate rendered browser contexts | Desktop and mobile-touch both created/joined the real room, readied, selected characters and entered the arena |
| Browser pickup path | Desktop E and mobile interaction collected; private reward, disappearance and actual 10-second refill synchronized |
| Browser Sticky path | Mobile USE deployed; fixed position retained beyond 30 real seconds; both clients rendered activation; slowing expired |
| Browser smoke path | Three simultaneous clouds on both WebGL clients; correct radius/lifetime, one draw per cloud, cleanup; screenshots inspected internally |
| Browser portal path | Correct linked presentation/position synchronization, no standing-still return loop after 1.3 seconds, W movement and eight-second cleanup |
| Touch layout | 844x390, 390x844 and 640x360; utility remained on-screen without overlapping movement/minimap/loadout or introducing scrolling |
| Browser match flow | Three rounds, results and current-host return to lobby passed; zero page errors and zero shader errors |
| Renderer resource test | Six clouds share one geometry/texture, 96 billboard instances in six draws; boundary uniforms, destination height and scene/listener cleanup passed |
| Core/power regressions | Full suite passed IT assignment/tag transfer, scoring, cooldowns, round completion, all 20 powers including Clone Decoy, Invisibility, Ghost Step and Jump Pad, inventory, weapons, maps and character/animation tests |

Browser fixtures place players, grant test utility items and advance round boundaries inside the test process. The browser checks assert the real 135-second round configuration before temporarily extending one test round to 240 seconds to finish visual checks. Three-round completion is fixture-accelerated, not a full human-played match. Six WebSocket clients are real connections on one local host, not six physical devices. The browser used two skins; coverage across all eight skins comes from automated regression tests. Rendered VFX inspection was in Central Plaza; map safety/spawn/portal behavior was tested automatically on all five maps.

## Performance evidence and limits

Each cloud uses one draw instead of the previous five sphere draws (six clouds: 6 versus 30). No physics particle simulation or full-screen postprocessing was added. Shared resources are created lazily, removed from scenes on expiry and disposed at teardown. Short browser samples used two simultaneous SwiftShader/software-GPU contexts at reduced device pixel ratio. They are too small and too slow to establish hardware performance:

| Sample | Frames | Mean interval | Mean scene draw calls |
|---|---|---|---|
| noSmoke | 6 | 458.2 ms | 164.2 |
| threeSmoke | 8 | 348.6 ms | 164.0 |

The baseline was already slow; the shorter smoke sample must not be interpreted as an FPS improvement. Physical desktop/mobile GPU frame rate, network latency/loss over the internet, human six-player balance, long-session memory behavior and every possible environmental overlap remain unverified. No claim of universal smooth mobile performance is made. Hardware playtesting is the remaining performance acceptance step; no production defect was identified in the executed checks.

## Actual file changes

Gameplay/configuration: `shared/tag-polish.ts` (new), `shared/mystery-crates.ts`, `shared/pair-powerups.ts`, `shared/tag-run.ts`, `server/mystery-crates.ts`, `server/pair-powerups.ts`, `server/tag-run.ts`.

Presentation: `src/SmokeScreen.ts` (new), `src/TagVisuals.ts`, `src/pair/presentation.ts`, `src/TagHud.tsx`, `src/scene.ts` (extends existing canvas diagnostics for browser verification).

Tests/tools: `tests/tag-polish.test.ts` (new), `tests/tag-polish-network.test.ts` (new), `scripts/tag-polish-browser-qa.mjs` (new), `tests/mystery-crates-network.test.ts`, `tests/mystery-crates.test.ts`, `tests/tag-run.test.ts`, `crate-verification/spawn-ratios.json`.

Documentation/evidence: `README.md`, `DEPLOYMENT_STATUS.md`, `TAG_RUN_POLISH_01_STATUS.md`, `TAG_RUN_POLISH_01_VERIFICATION.md`, `tag-polish-verification/`. Built client/server outputs are included. No package dependencies were added; package.json and lockfile are unchanged. Historical reports are retained and describe earlier releases.

## Run the complete project

Requires Node.js 22 or later. Extract the ZIP, then:

```sh
cd bounty-shift
npm ci
npm run build
npm start
```

Open http://localhost:3000. Create a room, join from a second client using its real code, ready both players, start and equip characters. Use existing E / touch interaction to collect, and F / existing utility controls / mobile USE to deploy. For another device, use the server computer's LAN address and permit port 3000 on the local firewall.

```sh
npm test
node --import tsx --test tests/tag-polish.test.ts tests/tag-polish-network.test.ts
BOUNTY_QA_BROWSER=/path/to/chrome-headless-shell node --import tsx scripts/tag-polish-browser-qa.mjs
```

The browser QA requires a compatible locally installed Chromium executable; it writes temporary review files outside the game directory. Source, public assets, lockfile, tests, documentation and production build are included; node_modules is intentionally excluded and restored by npm ci. The final archive is CRC-tested, extracted and byte-compared against packaged files. An extracted-build HTTP/assets/two-socket smoke result is included separately in tag-polish-verification/archive-smoke.json.

## Deployment and stop point

Not deployed. No production URL was updated, no repository was pushed, and no Render deployment was triggered. This deliverable is for local review. A complete pre-edit backup and implementation checkpoint were saved before final browser verification. Final source and this report are delivered together. Work stops here; Flag Run, Kill Race and unrelated upgrades were not started.
