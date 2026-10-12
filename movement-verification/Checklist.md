# Movement integration verification checklist

Results distinguish actual browser observations from automated rig/state tests. Software-GPU frame skipping is not presented as a visibly rendered stage.

| Requirement | Result | Evidence |
|---|---|---|
| Idle | PASSED | Workshop formula; actual zero translation and camera-only orbit remain idle |
| Walk | PASSED | Speed-driven timeline/rig tests; touch analog movement observed by both clients |
| Run | PASSED | Full keyboard movement selects run; both clients observe it |
| Sprint | PASSED | Keyboard/touch sprint with existing stamina; both clients observe it |
| Dash / existing dodge | PASSED (automated + actual inputs) | Existing burst timings unchanged; source dash pose tested on all eight rigs. Short rendered phases are recorded per observer; some fall between software-GPU frames |
| Jump Start | PASSED (automated); partial live sampling | Real jump physics and all eight rigs; recorded normal-jump observations contain takeoff on sampled clients |
| Airborne loop | PASSED (automated); partial live sampling | Rising physics, late snapshots, continuous loop; recorded browser observations contain airborne poses |
| Falling | PASSED | Descending velocity and prolonged-fall fixture; held pose and natural touchdown |
| Landing | PASSED | Both real clients observe actual touchdown; controls remain active; no repeated landing on stationary ground |
| Slide Entry / Travel / Exit | PASSED (automated + desktop observations) | Real hold-X slide/exit and source poses on all eight rigs. Per-client short-phase sampling is recorded. Live mobile short-stage observation is limited by software rendering |
| Crouch Enter | PASSED | Existing tap-X control, source timing, both browser observers |
| Crouch Idle | PASSED | Long held crouch in real game; source loop never auto-stands |
| Crouch Walk | PASSED | Moving while crouched and automated stance priority |
| Crouch Exit | PASSED | Actual toggle-off and source rise; smooth return to grounded locomotion |
| Hit Reaction | PASSED | Real melee damage, both observers; duplicate snapshots do not restart; low stance preserved in added regressions |
| Knockback | PASSED (rig/hook); NOT TESTED live | No existing gameplay knockback event; no force invented |
| Recovery | PASSED (rig/hook); NOT TESTED live | Explicit future-effect cessation returns to movement; no existing live trigger |
| Elimination | PASSED | Real KO, both observers, held collapse, unchanged score/five-second respawn; crouch-collapse and elevated-floor regressions |
| VOLTRIX / Volt | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Kirin | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Emberjack | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Novaa | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Gravel | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Mossbyte | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Shade | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Lumi | PASSED | Existing skin unchanged; every authorized clip and browser crouch |
| Local and remote animation | PASSED | Two actual browser clients observe movement, stance, jump/landing, hit and KO |
| Reconnect | PASSED | Real socket close/resume restores same character and crouch; existing automated reconnect regressions |
| Keyboard and mouse camera | PASSED | Existing inputs, pointer lock/mouse movement/Esc and stationary camera checks; bindings preserved byte-for-byte |
| Mobile movement/camera | PASSED | Simultaneous joystick and independent look pointer with measured facing change |
| Mobile jump/dash/sprint/crouch | PASSED | Actual touch controls and replicated states; short render windows recorded honestly |
| Mobile slide/dodge | PASSED (input/state); limited live pose sampling | Same authoritative actions and animation driver; source poses fully exercised in automated tests |
| Existing map geometry/traversal | PASSED | Unchanged source hashes and original flat/ramp/platform/bridge/roof/edge regression tests |
| Gameplay modes/combat/match flow | PASSED | Existing automated regressions plus actual browser combat/score/respawn |
| HUD/loadout/minimap/control layout | PASSED preservation | Existing frontend/CSS/assets unchanged; current run observations recorded in browser results |
| Frame-rate independence / no pose leaks | PASSED | Gait continuity at 5/10/30/60/120 Hz, interruption/freeze/respawn and all-rig finite-transform tests |
| No new gameplay balance / network changes | PASSED | Original server/shared files unchanged; no animation packets/forces added |
| Physical phones / real-GPU performance | NOT TESTED | Browser touch emulation/software GPU only |
| Live deployment | NOT TESTED / NOT DEPLOYED | No connected authorized Render workflow |

See the final test output and browser-result files for exact executed checks and recorded per-client stages. Character/map fixtures are test-only. The normal project uses the existing gameplay timings and renderer.
