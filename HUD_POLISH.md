# HUD and lobby polish — October 6, 2026

This update applies all five requested UI changes to Bounty_Shift_Multiplayer_Updated.zip.

## Included

- Viewport-sized desktop lobby with compact mode cards, settings, players, copy code, Ready, Start and Leave. Phone layouts use Players / Room Code and Game Mode / Settings panels; Ready and Leave stay outside the internally scrollable panel.
- Bottom-left portrait, heart and authoritative HP, green health bar, and thinner white stamina bar with an energy icon. Stamina has no visible number.
- Hide/Show Controls with a 200ms transition and a local saved preference. Keyboard controls remain active; essential touch buttons remain visible.
- Bottom-right read-only loadout: melee/unarmed, carried flag, freeze-ball utility. The existing engine carries one item, so this adds no storage, equipping hotkeys or gameplay capacity. Pickups flash for 300ms and show an acquired message.
- One live minimap that expands into a centered overlay. Open with its icon or by tapping the map. Close with the close button, map/background tap, or Escape. It releases pointer lock and resets held touch input; it does not pause the match or reveal opponents.

## Preservation

Server, shared gameplay/map definitions, scene and character implementation files were compared with the supplied ZIP: all 20 matched. Networking, mode rules, 90-second rounds, three-round matches, random rotation, loot, physics, combat and map content are unchanged. This does not import the separate Workshop maps or skins.

## Validation

- TypeScript check and production client/server build passed.
- Existing automated suite: 135 passed, 0 failed.
- Real browser plus a second WebSocket player exercised Tag, Kill Race and Flag Run on desktop and touch emulation: create/join, mode selection, ready/start, hide/show and keyboard Dodge, loadout updates from floor pickups, expanded map, continued server acknowledgements, close, and return to lobby. No browser page errors.
- Desktop lobby control containment passed at 1366x768, 1280x720, 1024x768 and 800x600.
- Additional touch checks exercised the joystick after closing the map, live map marker updates, server HP changes, map/background tap close, portrait and landscape sizing, and gameplay without document scrolling.
- Browser screenshots use local fixtures to move the player to loot and extend a test round for inspection. Production round timing is unchanged.
- Touch validation uses browser emulation. Physical-device performance and OS gesture areas still depend on the device.

## Run

Use Node 22 or newer:

```
npm ci
npm run build
npm start
```

The archive also includes the tested production build in dist. Optional portable build/test helpers are retained for restricted Windows environments; portable-loader.mjs requires Node 22.15+ or Node 24.

This archive is ready for your existing deployment process. It has not been deployed to Render.
