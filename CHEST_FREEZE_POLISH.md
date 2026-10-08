# Bounty Shift — Chest and Freeze Ball update

Implemented against the supplied Bounty_Shift_HUD_Polish.zip on October 7, 2026.

## Gameplay chest

The reusable model has a dark reinforced body, cyan/white trim, a front latch, visible lid construction and a rear hinge. Only existing designated gameplay chest spawns instantiate it; environment crates remain scenery and floor loot remains separate.

USE opens a chest through the existing interaction message. Desktop's nearby prompt reads the same configured use key as the keyboard handler; phones use the existing USE button. Health, connection, freeze status, distance and line-of-sight eligibility are validated by the server. The shared prompt helper reflects that same eligibility.

The server records CLOSED → OPENING → OPENED → collected/empty. Opening takes 420ms. Loot is selected once from the existing mode table, revealed as the lid opens, then offered as a physical pickup at a supported point up to 28 map units from the chest. Collection updates the existing held item and three-slot loadout. The chest stays visibly open after collection and resets with the next round. Floor loot retains its independent pickup/respawn path.

The chest consumes a separate item-art factory; replacing a future Lab item model requires no change to the chest model. Current melee art remains a simple placeholder. Tag loot remains Freeze Balls; Flag Run and Kill Race retain their existing blade/hammer tables.

## Freeze Ball presentation

Freeze Balls now use a compact faceted icy sphere and snowflake motif for pickups, the held utility, and flight. The existing blocky avatar holds it in a ready pose and follows through with its throwing arm. The first visible projectile position comes from that avatar's hand, then catches up to the authoritative trajectory over 65ms. This is visual interpolation, with no added gameplay wind-up or delayed server hit.

Server events identify throws, player impacts and world impacts. Clients render small ice bursts and a short trail. Frozen players retain visible silhouettes, labels, health and IT markers, with temporary frost tint, snowflake feedback and a few cold particles. Frost fades and clears after thaw or KO. Projectile speed, lifetime, consumption, hit checks and the 3-second freeze remain unchanged.

Shared geometry/materials, a 24-projectile pool and eight short-lived ten-particle burst pools keep effects bounded. There are six lightweight frost particles per avatar. No new real-time lights or ongoing chest particle emitter were added. Chest sound uses one gesture-unlocked audio context per arena and is optional when audio is unavailable.

## Preservation

28 selected baseline files matched the supplied ZIP byte for byte: all five map definitions, movement/traversal and combat rules, core room/WebSocket server, environment renderer, approved status/loadout/control/lobby components and their styles. Changes are limited to chest interaction state, effect metadata, scene/item presentation, a nearby interaction prompt, and minimap placement of revealed chest pickups. The approved HUD layout, three slots, Hide/Show Controls, normal and expanded maps remain.

## Validation

- TypeScript check and production client/server build passed.
- Automated regression suite: 144 tests passed, 0 failed, including the previous 135 tests with the chest assertion updated for the requested timed opening.
- New coverage includes simultaneous opens/pickups, eligibility rejection, loot isolation, supported loot on all five maps, hinge rotation, open/looted persistence, shared art resources, above-floor item geometry, pooled flash/burst expiry, unchanged freeze timing, and real-client chest/freeze synchronization.
- Real WebSocket regression covers every supported mode/roster combination and all three rounds.
- Desktop and touch-emulated browser runs exercised create/join, ready/start, chest prompt/open/reveal/collection, shared used state, Utility loadout, actual throw/freeze/thaw, independent floor pickup, controls toggle, keyboard Dodge or touch joystick, minimap/expanded map, three slots, thin white stamina and no gameplay page scrolling. No browser page errors.
- The production bundle served its assets and started synchronized two-player Tag.
- Browser fixtures position players near loot and extend the inspection round; shipped round timing remains 90 seconds. Touch checks use browser emulation, not a physical phone performance benchmark.

## Run

Use Node 22 or newer:

```
npm ci
npm run build
npm start
```

The archive includes source, tests, browser QA script and the tested dist build. Portable helpers are retained for restricted Windows environments; portable-loader requires Node 22.15+ or Node 24.

This ZIP has not been deployed to Render. Older documentation describes earlier project versions; this file describes the current update.

