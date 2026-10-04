# Step 1 foundation audit — Phase 6

Baseline: deployed Phase 5 commit `a2381e2` from the existing repository. No gameplay balance, architecture, hosting, map, or presentation redesign. Three rounds, 90 seconds each, five-second intermissions.

## Transition audit

| State/event | Authoritative rule and verification |
| --- | --- |
| Lobby | Create/join validation, duplicate names, six-player cap, no mid-match join; existing WebSocket tests |
| Ready | Boolean updates only in lobby; repeated same value safe; active-phase rejection tested |
| Match start | Host only, 2–6 connected ready players, one fresh match ID; repeated start cannot reset match |
| Round start | Only lobby/intermission with a live room/match, at most three rounds, valid shared spawns; health/resources/round count reset; match totals persist |
| Active round | Input requires current match ID/round number and bounded sequence/axes/request counters; only server motion/hit logic changes gameplay |
| KO | Damage clamped to zero, eligible swings gathered before application; one final contributor; repeated attacks cannot duplicate credit |
| Respawn | Five-second server tick countdown, validated spawn, full health/resources and temporary protection; identity/target/scores remain |
| Bounty completion/reassignment | Pre-tick relationship checked; only verified target KO increments both counters once; no self-target; wrong victim earns zero |
| Round ending | Deadline checked before movement/damage; one snapshot/history entry; all movement and combat stop |
| Intermission | Input/ready/start rejected; server timestamp controls five-second countdown; history immutable; next round starts once |
| Next round | New random target assignment, fresh resources/spawns/round score; match total and room membership preserved; stale prior-round packets rejected |
| Match complete | Third round produces ranked totals and shared top rank; no automatic Round 4, movement, combat, or further score |
| Return to lobby | Host only; clears scores/history/targets/KO/readiness; repeated return in lobby does not erase newly selected readiness |
| Leave | Removes active session/socket references; target repair and host transfer; repeated leave safe; last departure deletes room |
| Reconnect | Token-owned identity restored, current phase/deadlines/resources/targets/scores retained; no new player; old transport close cannot detach new transport |
| Host loss | One host ID; first remaining connected player inherits; returning former host does not override new host |
| Empty room | Grace-expired players removed in any phase; one global tick loop, no per-room timeout loops; deleted rooms cannot transition again |

## Fixed issues and defensive changes

- Resume can race the old socket's close/heartbeat. Conflict now produces a retryable response. The client retries once per second up to 15 times, without evicting the original connection. A persistent duplicate tab gets a controlled error/menu instead of taking over. Reconnect grace remains ten seconds after server-observed disconnect.
- Duplicate lobby-return messages previously cleared readiness again. Lobby return is now idempotent.
- Inputs now include match ID and round number. Previous-round/match input and inputs without context are rejected; all clients must reload after deploying this version.
- Round starts/endings are phase-guarded, refuse deleted rooms, and cannot produce duplicate history or Round 4. Expiry precedes damage, and movement acknowledgements are settled at round end.
- Permanent removal clears transport/input/target references. Earned scoreboard records are intentionally retained for the match, then released on lobby return/room deletion.
- Failed sends detach that transport without throwing into other rooms. Malformed JSON, arrays, invalid inputs, and stale session references fail safely.
- Client discards callbacks from an obsolete WebSocket and clears retry timers on close/welcome/unmount. Session storage failures fall back to the in-memory session; refresh recovery then depends on storage availability.
- Held touch buttons track pointer IDs, preserving a control while another finger still holds it. Release, capture loss, cancellation, blur, visibility change, and phase changes clear appropriate input state.
- Narrow-screen overflow containment added without redesign. Remote interpolation metadata is removed when its player disappears.
- Simulation tick and input timeout/sequence limits use shared constants. Values did not change. Server shutdown clears global tick, sockets, sessions, and rooms.

## Validation boundary

Production build and 55 automated tests pass. Existing tests cover map connectivity, collision from all sides, camera bounds, movement prediction, melee range/walls/cooldown, health/KO/respawn, private targets, real WebSockets, score persistence, full matches and ties. New tests cover the state matrix, nine reconnect scenarios, duplicate transport recovery, spoof/stale context, idempotence, deadlines, replay/KO scoring, long-running sprint/dash spam, cleanup in all phases, and send failures.

No claim of physical-device, browser rendering, or live Render acceptance is made here. Use the README public-device checklist after uploading this build. Touch capture, actual network recovery timing, and 320–390px layouts remain manual checks.

## Constants for Step 2 tuning

| Area | Source |
| --- | --- |
| Map, building rectangles, valid spawns, camera size | `shared/map.ts` |
| Radius, walk speed, tick, sprint, stamina, dash | `shared/game.ts`: `ARENA`, `STEP`, `MOVEMENT` |
| Reconnect grace, input liveness/limits, resume retries | `shared/game.ts`: `RECONNECT_MS`, `NETWORK` |
| Health, damage, range/arc, cooldown, respawn, protection | `shared/combat.ts`: `COMBAT` |
| Round duration, intermission length, round count | `shared/rounds.ts`: `ROUND`, `MATCH` |

## Remaining prototype limits

In-memory rooms/scores disappear on restart. One server instance only. Ten-second server-observed reconnect grace is finite; long network loss/mobile suspension may expire identity. Duplicate tabs do not share control. All positions/health are public; only target assignments are private. No latency rewind, player-player collision, account system, durable history, radar, or Step 2 content. Random targets may repeat; two-player targets always repeat. Temporary disconnected players remain vulnerable during grace, and existing target links remain valid until permanent removal.
