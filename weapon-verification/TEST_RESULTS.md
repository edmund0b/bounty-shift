# Weapons Integrated V1 — executed verification

Executed locally on October 16, 2026. No staging or live deployment was performed.

| Check | Result | Evidence / practical scope |
| --- | --- | --- |
| Complete main-game regression suite | 242 passed, 0 failed | `main-tests.txt`; existing rooms, ready/start/selection, movement, camera/control math, modes, health/KO, scoring, maps, rotation, geometry and new integration tests |
| Production build and TypeScript check | Passed | `build.txt`; Vite client plus bundled Node server |
| Supplied Workshop V5 source tests | 30 passed, 0 failed | `workshop-source-tests.txt`; source validation, separate from main game suite |
| Supplied Workshop V5 source build | Passed | `workshop-source-build.txt` |
| All 72 character/weapon combinations | Passed automated attachment/pose checks | `attachment-tests.txt`; eight characters × nine weapons, source action sampling, wrist errors under 0.035 render units, finite poses, root invariance and gameplay movement/action layering |
| V5 animation/server timing equality | Passed | Source durations and contact/shot/reload events match extracted server configuration |
| Three-minute dagger finisher | Passed | 5,400 samples at 30 Hz without accumulated actor-root drift |
| All five maps / all three loot permissions | Passed | Main tests generate 75 full randomized map/mode loot sets, validate support and separation, and sample 300 chest rewards per mode |
| Two actual WebSocket clients | Passed for all three modes | `network-tests.txt`; all permitted weapons, pickups, rewards, equipment, action snapshots, ammo, drops, reconnect, three rounds/results and return to lobby |
| Two actual Chromium client contexts | Passed for all three modes | `browser-all-modes.txt`; running compiled client, real UI create/join/ready/start/selection, correct sources, replicated rendered weapons, attacks, reloads, drops and full round/results flow |
| Touch actions | Passed for all nine weapons in Kill Race | `browser-touch.txt`; actual emulated touch pickup/attack/drop, gun reload buttons, remote state and ammo |
| Final portrait overlap correction | Passed | `browser-portrait.txt`; 390×844 touch viewport with rifle, containment/no page scroll and inventory-versus-minimap/joystick/actions/hints non-overlap assertions; corrected screenshot inspected internally |
| Preservation / backup audit | Passed | `provenance.json`; original backup SHA-256 equals supplied main ZIP, 15 source V5 transfers exact; 44 critical original map/environment/character/minimap/rotation files unchanged |

Extracted-archive smoke test: the compiled game served `/health`, client HTML and every linked bundle; two real WebSocket clients created/joined the same lobby. Dependency modules were supplied from the local test runtime and are not bundled in the ZIP. CRC validation and byte comparisons of every extracted file passed.

## Security and mechanics exercised

- Tag rejects forged firearm pickups, equip/fire/reload and strips invalid gun ownership; UI hides firearm ammo and reload controls.
- Correct two-ground/seven-chest pools with Tag filtering; chest opening does not grant equipment; pickup claims are atomic.
- Capacity, explicit replacement, synchronized drops and preserved instance/ammo state; invalid/stale epoch and ownership messages cannot mutate equipment.
- Source-event damage timing, exactly-once event consumption, allowed target checks, walls/cover and muzzle obstruction.
- All starting magazine/reserve values; exhaustion, partial final reserve, magazine seating, shell insertion, reload interruption and sniper bolt/action gating.
- Tag IT transfers without health damage; Kill Race weapon KO scores once; Flag Run can fire while carrying its independent objective.
- Frozen/dead clients cannot use equipment actions. Existing freezes, respawn, simultaneous damage and resets remain in the full regression suite.
- Reconnect snapshots retain collected equipment/ammo and consumed world pickup state; incomplete actions are canceled on disconnect.
- Source slide timing/poses and decelerating authoritative velocity preserve original 168-unit travel; existing jump and other control regression tests pass.

## What these tests do and do not establish

Browser QA uses independent desktop (1440×900) and emulated touch landscape (844×390) contexts, plus portrait (390×844). It uses genuine clients and WebSockets with controlled server fixtures to position real players, isolate each reward and advance round clocks. Selection time is extended only in the QA process to accommodate slow software rendering. Source timing and ammo remain real; fixture helpers do not ship as enabled gameplay paths.

Rendering used headless Chromium 153 with SwiftShader, reduced pixel ratio and throttled render callbacks. This establishes functionality and inspected layouts, not physical-device FPS, Safari compatibility, actual phone notch behavior, Internet latency tolerance or a six-player balance playtest. Those remain release playtests. All five maps were tested through authoritative placement, movement/collision/rotation tests; the current weapon browser sweep performs each weapon on Round 1 Central Plaza and follows existing later-round rotation, rather than manually traversing every loot position on every map.

The 72-combination checks are automated geometry/pose/grip checks and source regression tests. Desktop and mobile gameplay screenshots were inspected internally, but every frame of every character/weapon combination has not been manually reviewed for armor intersections. Exact V5 hammer and gun attachment fixes were preserved. Server melee uses documented forgiving range/cone volumes synchronized to source contact times, not a streamed client mesh collision system.

The additional weapons introduce new documented damage/range/spread/loot defaults in `shared/weapons.ts`; final competitive balance remains for playtesting. No final-balance, production-deployment or physical-device certification is claimed.

## Reproduce

```sh
npm ci
npm test
npm run build
```

For real browser QA, install Chromium and set `BOUNTY_QA_BROWSER` to its absolute executable path:

```sh
npm run test:browser:weapons
```

For the extra touch sweep, set `BOUNTY_QA_TOUCH=1` and `BOUNTY_QA_MODES=kill_race`. To isolate a weapon, set `BOUNTY_QA_WEAPONS=assault-rifle` (or another canonical ID). These variables are read by the QA script only. Internal browser captures are deliberately excluded from this deliverable.
