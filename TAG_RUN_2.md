# Tag Run 2.0 — Hot Potato & Power-Up Integration

Verified source release. Executed results and limits are in tag-verification/TEST_RESULTS.md.

Foundation: the attached Gun Combat Upgrade 1 final game. Workshop V5 is reference only. Main-game weapon registry already includes the same six Workshop presentation devices: Freeze Ball, Gravity Bomb, Clone Decoy, Bounce Bomb, Healing Burst, Blink Beacon. Their compatible models are reused; Blink Beacon is a Jump Pad device visual, not a gameplay binding. Workshop has no server implementation of the twenty abilities. All new multiplayer rules live in the existing Node service.

Tag-only: 135,000 ms per round, exactly three rounds. Existing team keys determine IT. The IT player/team at zero loses; every other current side survives and earns one existing match point. Survivor order: least IT milliseconds, then most successful tags, then stable team ID. Match order: most survivor round points, least cumulative IT time, most cumulative tags, stable team ID. No KO/elimination points for Tag transfers.

Former Tagger team receives 2s immunity per member. A tag must pass the original contact timing, distance/facing/line-of-sight, activity/team rules and new immunity/visibility checks. Each action can transfer once; one tick cannot chain transfers. Newly IT teams exit escape states and thaw so they can chase. Disconnect grace keeps IT ownership; permanent removal reassigns if necessary. Late inputs cannot alter finished results.

Mystery capsules reuse validated existing loot routes; interaction E collects only within the server range/LOS. Actual reward and rarity are selected only on collection. Utility holds one ability, separate from weapon slots. Rarity weights: common 55, rare 30, epic 13, legendary 2. Within-rarity choice is uniform. Legendary rerolls to Epic after the one Seal Tug reward in a round, or when the collecting player has already used Seal Tug this match. Capsule counts for 2–6 players: 2/3/4/4/5. Consumed capsules respawn after 14s, except final 5s. No timer grants abilities to players.

All 20 definitions are in shared/tag-run.ts. Timed effects and activations are server-owned in server/tag-run.ts. A 1s utility cooldown and escape-duration-plus-1s lock prevent overlapping escape abilities. Freeze lasts 2s with immunity through thaw plus 3s. Seal Tug is stationary/protected for 6s, cannot activate in final 6s and can be used once/player/match. Existing 0.03 render scale makes 4m fields approximately 133.33 world units and a 7m Blink approximately 233.33 units. Blink/portal paths require supported ground and clear collision; forces and Phase Dash use substeps and map bounds. Airborne effects preserve the existing jump/landing safety fallback.

Controls: existing 1/2 weapon slots, 3 utility, F/Click/Attack while utility selected. The contextual USE button activates the server-owned utility instance without changing weapon selection. E collects capsules. Q/C camera fallback is preserved; no conflicting Q remap.

HUD: revealed name/rarity/icon/short description, utility availability, status timers, IT time, Tag announcements, final chase/countdown, minimap IT markers and coarse 2s Runner pings in the final 10s. Tagger aura keeps original skins. A new upper-body unarmed reaching layer leaves actor position/hips/feet untouched. No flag is attached to a Tagger.

Smoke masks opponent avatars/nameplates across its cloud; clone/seal invisibility masks opponent coordinates in server views. Teammates retain their own side's visibility. Tracker trails exclude ghost/sealed/invisible players. New mystery visuals do not expose rewards or rarity before pickup. Clone objects are separate server ability fields, not player memberships or IT owners.

All maps, original character builders, firearm damage/ADS, original melee models, Flag Run and Kill Race rules remain preserved. New Tag effects wrap unchanged base movement rather than altering ordinary physics. Magnet Boots reduce force by 70%; the existing Fjord controller has no separate ice friction simulation, so no global ice-physics rewrite is added.

Run Node 22+: npm ci; npm run build; npm start. Complete source/assets and compiled output are packaged, excluding dependencies/secrets. See tag-verification for executed tests, provenance and limitations. Deployment is attempted only after successful verification and never claimed from an old URL alone.
