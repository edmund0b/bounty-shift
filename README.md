# Bounty Shift — Phase 1

A real multiplayer movement test for 2–6 players. One Node.js service serves a React/Canvas browser frontend and an authoritative WebSocket room server. This milestone has no combat, Bounty selection, scans, scoring, sound, or detailed map art.

## Local quick start

Install Node.js 22 or newer, open a terminal in this folder, then run:

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3000 in two independent browser tabs/windows. Create a room on one, then join with a different name and its six-character code on the other. Both players must select Ready up before the host can start.

For development with source updates:

```sh
npm run dev
```

The frontend and WebSocket server share port 3000. `PORT` overrides it. For local testing on a separate device on the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:3000` there and allow incoming traffic through your computer's firewall. This is not public deployment.

## Rules and controls

- 2–6 connected players; everyone, including the host, must be ready.
- Only the host can start and return everyone to the lobby.
- Move with WASD or arrow keys. Touch directional buttons appear on phones.
- Your player has a white ring. Players have distinct colors and names.
- The arena boundary limits movement. There are no obstacles or player collisions yet.
- There is no winner in Phase 1. The objective is to check that independent movement agrees across screens.

## GitHub upload — browser method

1. Extract the provided ZIP on your computer.
2. Sign in to GitHub. Click **+**, then **New repository**.
3. Name it `bounty-shift`. Choose Public if you are comfortable sharing the source; private also works if Render is granted access.
4. Do not initialize a README, license, or gitignore. Click **Create repository**.
5. On the empty repository page, click **uploading an existing file**.
6. Open the extracted `bounty-shift` folder. Drag its contents into GitHub: `src`, `server`, `shared`, `tests`, and all files in that folder. Upload the contents, not the enclosing `bounty-shift` folder and not the ZIP itself.
7. Use the commit message `Add Bounty Shift Phase 1` and click **Commit changes**.
8. Confirm that `package.json`, `package-lock.json`, `index.html`, and `vite.config.ts` are visible at the repository root. Do not upload `node_modules` or `dist`.

## Render deployment

1. Go to https://render.com and create an account (or sign in).
2. In the dashboard, select **New → Web Service**.
3. Connect GitHub when prompted. Grant Render access to the `bounty-shift` repository; access to that one repository is sufficient.
4. Select that repository and click **Connect**.
5. Use these settings:

| Setting | Value |
| --- | --- |
| Name | `bounty-shift` (or an available variation) |
| Runtime / Language | Node |
| Branch | The branch you uploaded to, normally `main` |
| Region | Virginia if available; otherwise the closest US region |
| Root directory | Leave empty |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Instance type | Free |
| Environment variable | `NODE_ENV` = `production` |
| Health check path, if offered | `/health` |

6. Click **Deploy Web Service** (the button may say Create Web Service).
7. Wait until the deployment is marked Live. Copy the assigned HTTPS `onrender.com` URL.
8. Open that exact URL on both devices. No backend URL, API key, database, or custom domain is required.
9. Share the URL back in our conversation so public testing can be reviewed before Phase 2.

Use the Free service, not a paid instance. If the current onboarding flow unexpectedly requires payment information, stop and report it before entering any.

## Two-device test checklist

1. Device A: enter a name, create a room, note the code and HOST label.
2. Device B: open the same public URL, enter a different name, join using the code.
3. Confirm both lobby lists show both names and the same code.
4. Confirm Start is disabled before both players are ready, and only the host has Start.
5. Ready up on both. Start on the host. Confirm both enter the arena.
6. Move A while B watches; move B while A watches; then move simultaneously.
7. Stop moving. Check both screens agree on the positions and arena edges.
8. Refresh one device. It should resume the same identity within ten seconds, without adding a duplicate player. Host transfers when the current host disconnects and does not automatically transfer back.
9. Disconnect one device for more than ten seconds. The other should return to the lobby after removal leaves fewer than two players.
10. Return to the lobby, ready up, and run another test.
11. Try an incorrect code, duplicate name, and third player joining while the arena is running. Expect clear errors.
12. When possible, test one device on Wi-Fi and another on cellular to prove internet multiplayer.

## Architecture

- `shared/game.ts`: message types, arena constants, normalized movement.
- `server/rooms.ts`: rooms, private reconnect tokens, host, readiness, server movement, reconnect cleanup.
- `server/index.ts`: HTTP and WebSocket transport, payload/rate limits, heartbeat, deployment entrypoint.
- `src/main.tsx`: React flow, input prediction/reconciliation, interpolated remote players, Canvas arena, basic touch input.
- `tests/multiplayer.test.ts`: independent WebSocket integration checks and movement invariants.

The simulation advances at approximately 30 Hz, and snapshots are broadcast at approximately 15 Hz. Movement speed and boundaries are enforced by the server. Clients send directions and sequence numbers, not authoritative positions. The browser predicts local movement, reconciles against snapshots, and smooths remote movement. The server stops stale movement inputs after 300 ms.

Run `npm test` for the server integration checks and `npm run build` for TypeScript/build validation.

## Known limitations

- Browser visual/input testing could not run in this environment because a browser executable was unavailable. The TypeScript production build and independent WebSocket integration tests passed.
- Not yet tested through a public deployment or on physical separate devices. Local test success is not a completed Phase 1 acceptance test.
- Render Free can sleep after inactivity, take about a minute to wake, or restart. All rooms are temporary and disappear on server restart/redeployment. A client with an expired room token returns to room entry with an explanation.
- Ten-second reconnect grace applies only while this server process remains alive. A weak mobile connection may exceed it.
- Host transfers immediately to a connected player after disconnect; the returning original host becomes a normal player.
- No new joins while the movement session is running. Return to the lobby first.
- Touch buttons are basic movement controls, not a full mobile joystick implementation.
- A tab in the background can pause/throttle. Movement stops while hidden; reconnect if your browser suspends its connection.
- High latency may cause visible corrections. There is no advanced lag compensation or multi-instance scaling.
- Single server instance only. No accounts, persistent leaderboard, or database.

## Submission target

October 31, 2026, 11:59 PM Pacific. The final challenge deliverables will include title, public game URL, and a preview screenshot. This movement test is an early milestone, not the finished Bounty Shift submission.
