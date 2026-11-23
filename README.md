# Agent Office

A local, read-only virtual office for inspecting Codex rollout telemetry. Click the wall display for usage, a monitor for operations, the server rack for system metrics, or an agent for session details. Open the theme control to switch between Standard Office, Tropical Beach, Cyberpunk Rooftop, Forest Cabin, and Space Station. The viewer remembers your choice and applies the corresponding outfits. Use the camera control hints for orbiting, zooming, and panning.

## Start

Requires Node.js 22 and npm. From this directory run:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. The monitor starts automatically on loopback port 4318. Set the Web System Builders repository path in Settings. Local derived data and settings are stored in `.data/office.sqlite`. `CODEX_HOME` can override the default Codex directory. Stop both services with Ctrl+C in the terminal.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` to verify the project.

With the app running, run `npx playwright install chromium` and `node tests/office.browser.mjs` for the browser smoke test. Set `OFFICE_SCREENSHOT` and `OFFICE_LAPTOP_SCREENSHOT` to save the 1920×1080 and 1366×768 views. `OFFICE_UI_SHOTS` saves both sizes with a deterministic set of test agents. `OFFICE_CHROMIUM` can point to an existing Chromium executable. Run `node tests/office-themes.browser.mjs` to verify theme selection, camera controls, outfits, and persistence.

To verify with actual Codex turns, set `OFFICE_WSB_SMOKE_ROOT` to the configured WSB repository and run `node tests/live-session.browser.mjs`. The opt-in test uses the locally signed-in CLI and creates two read-only test sessions and one resumed turn in Codex history.

## What the monitor can and cannot establish

The adapter scans local `sessions/**/*.jsonl` files incrementally. It extracts session IDs, working directories, model, branch, event timestamps, allowlisted tool names, cumulative token counters and rate-limit snapshots; it does not store prompt text, tool arguments, outputs or environment variables. It caches the derived records in SQLite and broadcasts snapshots through server-sent events. The HTTP service binds to loopback, checks the Host and browser Origin headers, and has no shell or arbitrary-file endpoint. Other local processes can still access the service and database.

Rollout files are an undocumented fallback and may change between Codex versions. A filesystem watch wakes the scanner, with periodic scans as backup. A recorded turn start creates an active robot, and a subsequent turn on the same session ID marks it resumed. Completion briefly keeps the robot visible. A turn without recent events becomes unknown after two minutes. The office gives up to nine sessions separate desks and reuses a previous seat when available during the same browser visit. Recognized tool and command events drive the activity poses. Approval requests and errors appear on explicit events. Previously persisted events may lack newer classifications.

When the local managed App Server control socket is available, the monitor reads loaded thread status through the CLI proxy. This can confirm idle status for threads loaded by that server. Independent Codex processes use the rollout fallback. A feed interruption freezes the known workers, and the next snapshot restores them by ID. Per-agent process metrics are unavailable. See the [App Server protocol](https://developers.openai.com/codex/app-server/).

Token totals use each session's last cumulative snapshot; cached input is included in input and reasoning is included in output. Daily usage derives nonnegative differences between snapshots in UTC; resets or missing snapshots can make the history incomplete. Limit snapshots are separate from token usage and may be stale. Values and sessions missing from rollout files remain unavailable; an empty total does not prove zero usage. Context is the last reported count, not a verified live context measurement.

The scanner uses synchronous file reads, which can be expensive on very large rollout histories. WSB recognition uses the configured Git root and normalized path containment. Independent worktrees need their own configured checkout path. Archived rollout files and some file rotation edge cases are outside this adapter's coverage.
