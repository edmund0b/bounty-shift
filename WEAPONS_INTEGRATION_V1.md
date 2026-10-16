# Bounty Shift — Weapons Integrated V1

Built incrementally from Bounty_Shift_Movement_Animation_Integration.zip using Bounty_Shift_Workshop_V5_Final.zip. This report is the current authority; older bundled reports describe historical releases. Local integration only: no staging or production deployment was performed.

## Run the complete game

Requires Node.js 22 or newer. From the extracted `bounty-shift` directory:

```sh
npm ci
npm run build
npm start
```

Open the address printed by the server (default port 3000). On a second device, use the host computer's LAN address and permit that port through the local firewall. Create a room, join with its code, choose Tag/Flag Run/Kill Race, ready both players, start, and equip characters. The existing selection and preparation phases remain active. `npm run dev` runs the existing development service. The existing Node single-service deployment still serves the client and `/ws`; PORT/environment handling and lockfile dependencies are preserved.

## Integration boundaries

The main game's room server, token reconnects, authoritative movement, health, KO, mode scoring, selection, three-round match flow, renderer, camera and map registry remain the foundation. No replacement networking service, second health controller or client-owned damage system was added. Workshop's preview UI and singleton ammo simulator do not run the match.

Exact V5 files were transferred for the nine models/materials, registry, attachment/grip solver, moves, weapon actions, swings, firearm parts, sniper bolt, ammo defaults, motion clips and tuning. `weapon-verification/provenance.json` records source hashes, exact transfers, changed existing files and unchanged map/character files. Existing lower-body gameplay animation, floor correction and authoritative actor transforms are preserved by the presentation adapter.

## Equipment permissions and loot

| Mode | Ground weapons | Chest weapons | Existing utility |
| --- | --- | --- | --- |
| Tag | Heavy Futuristic Blade, Heavy Impact Hammer | Riot Bat, Twin Daggers, Pulse Katana | Freeze Ball |
| Flag Run | Same two | All three chest melee and four firearms | Freeze Ball |
| Kill Race | Same two | All three chest melee and four firearms | Freeze Ball |

`shared/weapons.ts` owns canonical IDs, permissions, initial balance and configurable loot/persistence values. The server enforces permissions on rewards, pickup, ownership reconciliation, equipment, attacks and reloads. Entering a new round/mode clears equipment through existing reset behavior. Tag rejects forged or stale gun actions and displays no ammo/reload HUD. No new power-up mechanic was introduced; the exact model factory includes its original builder dependencies, but only existing Freeze Ball utility is exposed to gameplay.

Each round currently generates four chests, four random blade/hammer ground weapons and two separate Freeze Balls. Placement uses the current map's existing safe anchors, shuffled supported neighbors, collision/line checks and a supported path to the anchor. Pickups have at least 90 game units of separation. All five map definitions are unchanged. The server chooses chest rewards with configurable equal initial weights; blade/hammer are excluded. Chests use the existing 420 ms open animation, reveal a named reward nearby, and require a second interaction to collect it. Opening alone never grants equipment.

Ground items respawn after 12 seconds with new instance IDs. Opened chests stay opened for that round. Drops expire after 60 seconds and never refill ammunition. These are documented initial integration settings, not claimed final balance.

## Inventory, authority and persistence

Two weapon slots extend the existing inventory; utility remains separate in slot 3. The flag objective is independent of weapon slots. Players start with the original unarmed capability. No starter firearm was added. The retained legacy `inventory.weapon` field is a compatibility projection of the selected real slot, not another inventory authority.

Every world item and carried weapon has a server-owned identifier. Range, availability, health/freeze state, mode and capacity are checked in the existing room message flow. An atomic pickup marks the world item unavailable before another player can collect it. Same-type duplicates are rejected. With two occupied slots, interaction explicitly replaces the selected weapon (slot 1 if utility is selected), dropping the replaced instance. G/touch Drop also creates a real synchronized world pickup. Magazine/reserve values and instance identity survive switching, dropping and collection. KO and round reset clear the inventory, matching existing behavior. Unsupported airborne drops use supported ground instead of floating in space.

Reload/drop/input messages identify the current instance and match/round. Stale epoch/instance messages cannot operate a replacement weapon. Switching interrupts reloads without transferring unearned ammunition. Equip has its V5 0.7 second timing; firing cannot bypass it. Disconnect, death and round completion cancel active actions. Existing resume snapshots restore inventory, ammo, world loot and action state.

## Ammunition and combat

| Firearm | Loaded | Reserve | Mechanism |
| --- | ---: | ---: | --- |
| Pistol | 12 | 48 | V5 magazine-seating event |
| Assault Rifle | 30 | 30 | V5 magazine-seating event; authored four-shot burst repeated while attack is held |
| Shotgun | 6 | 18 | One shell per V5 insertion event; loaded shells permit interruption to fire |
| Sniper Rifle | 5 | 15 | V5 magazine reload and full firing/bolt recovery gate |

`shared/workshop-weapons.ts` is the server-safe extraction of V5 action durations/events and ammo configuration. Regenerate it with `node --import tsx scripts/sync-workshop-weapon-config.mjs` after intentional source updates. Tests compare these values directly with the exact visual source. `server/weapon-combat.ts` advances each event once, validates ownership/state/cooldown and returns hit intents into the existing room damage/scoring pipeline. It does not mutate a separate health system. Empty magazines stop shooting. Reserve exhaustion and partial reloads are bounded; no ammo refill message or power-up was added.

Gun aiming uses the current smoothed third-person camera ray to find the reticle destination, then a muzzle-to-destination ray. The server bounds and obstruction-checks the supplied camera origin and checks map solids and target geometry. Near cover blocks the muzzle path. Shotgun pellets aggregate into one damage contribution per target for the existing damage bucket. Melee uses the exact V5 contact-event times with authoritative range/cone, elevation, hostility and map line-of-sight checks. It uses forgiving gameplay hit volumes, rather than client-rendered mesh intersections. No client animation can award damage. Tag invokes the existing IT-transfer callback without health damage. Flag Run keeps its flag scoring; Kill Race credits the existing elimination path once, including simultaneous-hit handling.

Initial new weapon balance (game distance units; one actor is approximately 60 units tall):

| Weapon | Damage per contact/projectile | Maximum range |
| --- | ---: | ---: |
| Heavy Futuristic Blade | 25 | 105 |
| Heavy Impact Hammer | 40 | 110 |
| Riot Bat | 22 | 100 |
| Twin Daggers | 12 per authored contact | 75 |
| Pulse Katana | 28 | 120 |
| Pistol | 20 | 1000 |
| Assault Rifle | 12 per shot | 1400 |
| Shotgun | 8 pellets × 10, spread 0.09 | 550 |
| Sniper Rifle | 80 | 2200 |

These are new server defaults because the Workshop is presentation-focused. They require playtest balance review. No headshots, penetration, ADS/zoom mechanic, ammo refill or new character ability was invented.

## Rendering, animation and feedback

`src/weapons/gameplay.ts` attaches the exact V5 weapon model and grip solver to the existing GameplayAnimator. It samples compact authoritative action timestamps and existing movement phases. It preserves actor/root transforms, jump lift, low stances, reactions and feet while constraining wrists after layering. Twin Daggers retain independent hand attachments. Source overhead hammer, firearm holding/parts, bolt and reload poses are retained. A three-minute dagger finisher test finds no accumulated actor-root drift.

Source V5 colored weapon trails, muzzle/impact feedback and oscillator audio cues are adapted to existing scene/audio lifecycles; generated tracers and effects are bounded and disposed. Source procedural models also appear as ground/chest rewards instead of generic weapon placeholders. World labels use actual item names. Existing chest and Freeze Ball presentation remains. The workshop preview contact helper is retained for source visual tests, not server authority.

The slide now decelerates from 550 to 250 units/second over the original 0.42 seconds, preserving the original 168-unit unobstructed travel distance and cooldown. The source entry/active/recovery visual stages are preserved. Existing jump physics already uses responsive takeoff/gravity; its height, duration and authoritative collisions were retained. Mouse orbit, pitch limits, smoothing, pointer lock and mobile swipe/joystick remain the existing implementations.

## Controls and HUD

| Input | Action |
| --- | --- |
| E | Interact / open chest / collect / replace |
| Left click / F | Melee or firearm attack; hold for repeated rifle bursts |
| 1 / 2 | Weapon slots |
| 3 | Existing utility slot |
| R | Reload when holding a permitted firearm |
| G | Drop selected weapon |
| WASD / arrows | Existing camera-relative movement |
| Shift | Existing sprint |
| Space / quick double Space | Existing jump / dash behavior |
| X / hold X | Existing crouch / slide |
| Z | Existing dodge |
| Mouse / Q and C | Existing camera orbit / keyboard fallback |
| Esc / M / H | Existing cursor release / map / hints |

R previously overlapped camera-right. Camera-right fallback moves to C; Q and mouse orbit remain available. This conflict resolution is the only remapped fallback, required to provide R reload while retaining camera rotation functionality. Controls/help text reflects actual current input code.

The approved HUD remains: match/objective top-left, desktop health/stamina bottom-left, minimap and existing touch controls retained. The reserved bottom-right loadout now shows two weapons and utility, equipped state, firearm ammo, real Reload/Drop buttons and an independent flag badge. Named world prompts only appear for eligible nearby items. Touch uses the existing contextual interaction and Attack controls plus loadout slot/Reload/Drop buttons. Desktop hints measure the taller loadout to avoid overlap. Short landscape devices place loadout clear of minimap and action buttons; portrait remains full screen without page scrolling. Existing safe-area layouts remain active.

## Validation and scope

See `weapon-verification/TEST_RESULTS.md` and raw logs for executed tests. Automated geometry/attachment sampling covers all 72 character/weapon combinations, all authored actions and movement compatibility. It is not a claim that a human visually inspected every animation frame for every armor intersection.

Local Chromium used two independent browser contexts, real WebSocket connections and the running compiled game. Test fixtures reposition actual players, force individual chest reward weights and advance round clocks to cover each case reliably. The browser selection clock was extended only inside the QA process for software rendering; shipping selection timings are unchanged. Local WS tests use the same real protocol and deterministic clock fixtures. These are controlled integration tests, not a substitute for physical-phone, high-latency Internet, full-capacity play sessions or final weapon balance review.

Production remains untouched. The supplied main-game archive has a verified byte-identical backup. Current map/character assets and rotation are unchanged; no map was rebuilt and the Workshop was not substituted for the game. The complete ZIP contains frontend, backend, public assets, source weapon models, shared configuration, tests/scripts, compiled build, current report and historical project documentation. Dependencies and internal browser screenshots are excluded.
