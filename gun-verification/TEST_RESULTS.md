# Upgrade 1 verification

Automated: 268 tests passed, 0 failed, 0 skipped. Production TypeScript/client/server build passed. The existing Vite large-chunk advisory remains.

Includes exact body/head damage, ten-pellet aggregation/falloff, protection, wall/muzzle occlusion, duplicate-event rejection, recoil/heat recovery, malicious damage/headshot field rejection, sniper full-health KO, one score award, authoritative respawn, gun/low-stance attachment checks on all eight skins, and existing all-mode/two-WebSocket/round/map/movement/power-up regressions.

The chest test uses 1e-6 tolerance for trigonometric placement at its existing 28-unit boundary. No chest/loot code was changed.

Browser final pass: PASS. Two independently connected Chromium contexts created/joined/started the real room and selected original skins. All four weapons produced the configured body/head damage on both clients: Pistol 10/20, Rifle 30/45, Shotgun 50/85, Sniper 80/100. Sniper headshot caused a real KO and normal protected respawn. Desktop RMB/release and mobile ADS/fire/reload/exit passed for every gun. The rendered remote aim pose was checked. Held rifle trigger fired repeatedly while moving; release stopped it; V switched shoulder. Simultaneous touch joystick/right-side camera swipe preserved ADS. Viewports 844×390, 390×844, 375×667 and 640×360 had no Aim/control overlap or page scrolling. JavaScript page errors: zero.

Production smoke: PASS, health/index/all linked bundles, two real WebSocket create/join clients and room cleanup. Final archive integrity and extracted production smoke are checked before delivery.

No new physical-device, Safari, native pointer-lock, six-device/high-latency or hardware-performance certification is claimed.
