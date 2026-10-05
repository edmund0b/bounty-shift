# Controls drawer visual correction

Only the Controls presentation changed. `src/ControlsGuide.tsx` and `src/controls.css` add grouped icon sections, slate keycaps, compact actions and device-specific controls. `src/EntryFlow.tsx` uses that guide in the existing drawer; its close, Escape, backdrop, focus trap and focus restoration behavior remain intact. How to Play and the rest of the entry/lobby UI remain unchanged.

Verified against `src/main.tsx` and `src/Arena.tsx`: WASD/arrow movement, hold Shift sprint, Space dash, left click after mouse capture/F attack, mouse look, Q/E camera fallback, Esc release cursor. Mobile: left joystick movement, right-side drag camera, hold Sprint, tap Dash and Attack. No aim, interaction, pickup or ability controls were added. Input code and all gameplay, server, maps and synchronized state are unchanged from the Controls-task checkpoint.

Validation: production build passes. `scripts/controls-panel-smoke.mjs` uses two real clients and verifies unchanged room/code/host/ready/player identities/map/match/socket connections, exact lobby markup, dismissal and focus behavior, desktop/mobile inputs, six additional viewport sizes and no browser errors. Complete desktop drawer fits 1366×768. Screenshots in `controls-previews/` show the actual running lobby.
