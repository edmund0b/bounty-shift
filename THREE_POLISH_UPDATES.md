# Bounty Shift — three targeted polish updates

This update uses the supplied integrated maps/skins project as its baseline. It changes the selected-character HUD portrait, keyboard browsing in the existing character wheel, and named locations on all five minimaps. No weapons, animation work, inventory features or broader UI redesign were added.

## Local character portrait

`src/GameHud.tsx` now finds the local player by the existing client ID and derives the portrait URL directly from that player's authoritative `characterId`. No separate skin selection state was introduced. All eight canonical IDs are supported: `voltrix`, `kirin`, `emberjack`, `mossbyte`, `novaa`, `gravel`, `lumi`, `shade`. The source name VOLTRIX remains unchanged.

The eight PNGs in `public/portraits/` are head/upper-shoulder renders of the actual existing model rigs. Hat, hair, helmet and rocky-head features are retained. `scripts/render-character-portraits.mjs` provides an offline, reproducible export using the same registry and builders; it disposes temporary scene and renderer resources. The HUD loads ordinary static images, with no additional WebGL context, animation loop, texture recreation or per-frame portrait rendering. The original health/stamina values, bars, placement and desktop/mobile dimensions are unchanged. Only the cyan/slate portrait frame and selected image replace the old generic robot SVG. A neutral placeholder handles an unavailable selection without pretending a default skin was equipped.

Because the URL comes from the replicated local player, existing respawn, round changes, reconnect restoration and next-match selection naturally select the correct image. Two clients choosing different skins each receive their own portrait.

## Keyboard character wheel

`src/CharacterSelection.tsx` handles ArrowLeft/ArrowRight only while the existing selection component is mounted. Both call the same `browse` function used by the existing on-screen buttons. Functional state updates keep rapid presses synchronized with the canonical registry order; wrapping is unchanged. Focus, name, highlight, wheel target and Equip continue consuming the same existing selection value.

One intentional press advances one position; repeated keydown events are suppressed. The handler ignores editable fields, handled events and Alt/Ctrl/Meta combinations. It prevents arrow scrolling while navigating and removes its listener when the screen unmounts. Locked choices remain locked. Gameplay keybindings and input implementation are untouched. Mouse, touch drag, character picking, shortcuts and on-screen arrows remain available.

## Named minimaps

`src/map-labels.ts` reuses each map's existing `districts` names, IDs and world anchors. The underlying map definitions and all geometry remain unchanged. Short presentation aliases are grouped by map and district ID; building width comes directly from the existing architectural plans where available.

| Map | Compact examples | Existing full names in expanded view |
| --- | --- | --- |
| Central Plaza | BOUNTY, CLUB, STORE, TECH, WHSE, TRANSIT | BOUNTY HQ, NIGHTCLUB, CONVENIENCE, ELECTRONICS, WAREHOUSE, TRANSIT |
| Scorched Point | CORE, MINING, RUINS, POWER | CENTRAL GEOTHERMAL CORE, MINING OFFICE, RESIDENTIAL RUINS, GEOTHERMAL POWER |
| Aerie Sky-Port | HUB, DOME, SPIRE, HANGAR | CENTRAL TRANSIT SPIRE, OBSERVATION DOME, RESIDENTIAL SPIRE, HANGAR BAY |
| Outlaw's Canyon | PIT, BRIDGE, OUTPOST, CAVE | CENTRAL PIT, ROCK BRIDGE, RUINED OUTPOST, CAVE TUNNEL |
| Viking's Fjord | VILLAGE, DOCKS, ICE BRIDGE, CAVERN | VILLAGE SQUARE, DOCKYARD, ICE BRIDGE, CAVERN PASS |

`src/Minimap.tsx` memoizes labels by the actual map definition and compact/expanded state. Names use short lines, footprint-aware font fitting, pale-blue text and a restrained dark outline. A collision check omits competing secondary text rather than overlapping labels or moving an anchor to another building. All current map districts fit at desktop compact and expanded scales. Below 160 pixels, a small ResizeObserver selects three recognizable landmarks with larger type; expanded mobile maps restore every district. The observer is cleaned up on unmount. Dynamic markers and existing objectives are drawn above static names, preserving visibility and tracking. The existing north-up coordinates, SVG geometry, expand/close behavior, title and responsive map sizes remain intact. Real map changes select fresh labels automatically, without stale Central Plaza labels.

## Changed files and new assets

Production edits: `src/GameHud.tsx`, `src/CharacterSelection.tsx`, `src/Minimap.tsx`, `src/hud-polish.css`.

New: `src/map-labels.ts`, eight `public/portraits/*.png`, the offline portrait exporter, `tests/polish.test.ts`, and `scripts/polish-browser-qa.mjs`. Verification screenshots and results are included under `polish-previews/`.

Server/networking, room creation/joining, host/readiness gates, selection confirmation protocol, character models, controllers, camera, combat, health/stamina rules, all map geometry/builders and map rotation are unchanged from the attached ZIP.

## Run and verification

Use Node 22 or newer. Extract `bounty-shift`, run `npm ci`, then `npm run dev`. Production uses `npm run build` and `npm start`. Run regressions with `npm test`. Browser verification uses `BOUNTY_QA_BROWSER=/path/to/chromium node --import tsx scripts/polish-browser-qa.mjs`; the portrait exporter uses the same environment variable.

The TypeScript/production build and all 169 game tests pass. This includes eight unique portrait assets, all five compact/expanded named maps and the tiny-mobile landmark mode. Final build/test logs and browser verification are supplied with the project. Browser checks run the real room server with two isolated clients and real create/join/ready/equip messages. They verified keyboard wrapping/repeat handling/rapid presses, editable-field exclusion, exact equipped choice, desktop arrow movement, jump/sprint/dash/attack, touch browsing, all eight loaded portraits, per-client identity, KO/respawn, three rounds/results and a fresh selection screen without duplicate listeners. All five maps were captured and visually inspected in desktop/mobile views. The first four map checks completed in the full audit; a targeted final run completed Viking’s Fjord and the full match regressions on the same production build. A test race was corrected by waiting for both clients to finish map switching before tapping the mobile map button. Test-only clocks/state and capped software-GPU rendering allow the lengthy UI audit and controlled map/KO/round checks; production timers and state rules are not modified.

Physical phones, real GPU performance and sustained public network sessions were not tested. Desktop and mobile browser emulation verify layout and input; this does not replace physical-device playtesting. No live Render deployment was performed because a connected deployment workflow is unavailable. Existing hosting setup is preserved.

The complete downloadable ZIP contains the current client/server/shared source, all required assets, tests, scripts, documentation and fresh production build. Dependency folders, temporary export pages and secrets are excluded. Work stops after these three updates.
