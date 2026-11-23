# Agent Office

Agent Office turns Codex sessions on your computer into robots in a 3D office. Click a robot to inspect its session, open the wall display for usage, or change the office theme from the toolbar.

The GitHub link gives you a copy of the project. After setup, open the dashboard in a browser on the same computer that runs Codex.

## Set up Agent Office

### 1. Install the prerequisites

- To use the clone command, install Git. The ZIP option also works without it. [Git downloads](https://git-scm.com/downloads)
- Install **Node.js 22.18 or newer**. Choose an LTS release. The installer includes npm. [Node.js downloads](https://nodejs.org/en/download)
- Install and sign in to Codex CLI when you are ready to try a session. You can open the office first. [Codex CLI setup](https://developers.openai.com/codex/cli/)

Open PowerShell on Windows or Terminal on macOS or Linux. Run these commands to check your installation. If you plan to download the ZIP, you can skip `git --version`.

~~~sh
git --version
node --version
npm --version
~~~

If you just installed a tool and the command fails, close the terminal, open a new one, and try again.

### 2. Copy the project from GitHub

On the repository page, select **Code**, choose **HTTPS**, and copy the URL. Open a terminal in the folder where you keep your projects. Type `git clone` followed by the copied URL, press Enter, then run `cd agent-office` to enter the new folder.

~~~sh
git clone https://github.com/12valor/agent-office.git
cd agent-office
~~~

You can also select **Code → Download ZIP**. Extract the ZIP first, then open a terminal inside the extracted folder that contains `package.json` and continue with step 3.

### 3. Install dependencies and start the office

From the project folder, run these commands one at a time. The first downloads the packages the app needs. The second starts the dashboard and its local monitor.

~~~sh
npm ci
npm run dev
~~~

If Windows PowerShell blocks `npm.ps1`, use `npm.cmd ci` and `npm.cmd run dev` instead.

Keep the terminal open. When the server is ready, open [http://127.0.0.1:3000](http://127.0.0.1:3000) and look for **Monitor connected** in the top-right corner. To shut down the dashboard and monitor, return to the terminal and press **Ctrl+C**.

### 4. Try your first session

1. Leave the office running. Open a second terminal in a project folder you want to use for a test.
2. Run `codex --sandbox read-only`. Sign in if Codex asks.
3. Send a prompt such as “Describe this project in three sentences without editing any files.”
4. Return to Agent Office while Codex is working. A robot should appear once the local monitor picks up the session records.

The office can be empty before any local activity is recorded. **Monitor connected** means the dashboard can reach the monitor. If you want to mark one project as your main workspace, open **Settings**, enter the full path to an existing Git repository such as `C:\Projects\my-app`, and select **Save repository**. The current settings field is labeled **Web System Builders repository**.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| A command is unavailable | Install the tool in step 1 and open a new terminal. On Windows, try `npm.cmd` if PowerShell blocks the npm script. |
| npm cannot find `package.json` | Run the setup commands from the `agent-office` folder, or from the extracted folder if you downloaded a ZIP. |
| The browser cannot open the office | Keep `npm run dev` running and check the terminal for errors. The dashboard uses port 3000 and the monitor uses port 4318. If Agent Office is already running, open the dashboard directly. If another development server is using either port, close it before starting Agent Office. |
| The monitor is connected but the office is empty | Start a local Codex session as shown in step 4. If Codex uses a custom home directory, set `CODEX_HOME` to the same directory in the terminal you use to start Agent Office, then restart it. |
| The office reports that it needs WebGL | Open the dashboard in a browser with WebGL enabled. |

## Local data and privacy

Both services listen on `127.0.0.1`. Agent Office reads local Codex session records and stores derived session details and settings in `.data/office.sqlite`. These can include project paths, session IDs, and usage. Git ignores the `.data` folder. Keep it on your machine and use the dashboard locally.

## Development checks

~~~sh
npm test
npm run typecheck
npm run lint
npm run build
~~~

With the app running, run `npx playwright install chromium` and `node tests/office.browser.mjs` for the browser smoke test. Set `OFFICE_SCREENSHOT` and `OFFICE_LAPTOP_SCREENSHOT` to save the 1920×1080 and 1366×768 views. `OFFICE_UI_SHOTS` saves both sizes with test agents. `OFFICE_CHROMIUM` can point to an installed Chromium executable. Run `node tests/office-themes.browser.mjs` to verify theme selection, camera controls, outfits, and persistence.

To verify with actual Codex turns, set `OFFICE_WSB_SMOKE_ROOT` to the configured repository and run `node tests/live-session.browser.mjs`. The opt-in test uses the locally signed-in CLI and creates two read-only test sessions and one resumed turn in Codex history.

## What the monitor can and cannot establish

The adapter scans local `sessions/**/*.jsonl` files incrementally. It extracts session IDs, working directories, model, branch, event timestamps, allowlisted tool names, cumulative token counters and rate-limit snapshots; it does not store prompt text, tool arguments, outputs or environment variables. It caches the derived records in SQLite and broadcasts snapshots through server-sent events. The HTTP service binds to loopback, checks the Host and browser Origin headers, and has no shell or arbitrary-file endpoint. Other local processes can still access the service and database.

Rollout files are an undocumented fallback and may change between Codex versions. A filesystem watch wakes the scanner, with periodic scans as backup. A recorded turn start creates an active robot, and a subsequent turn on the same session ID marks it resumed. Completion briefly keeps the robot visible. A turn without recent events becomes unknown after two minutes. The office gives up to nine sessions separate desks and reuses a previous seat when available during the same browser visit. Recognized tool and command events drive the activity poses. Approval requests and errors appear on explicit events. Previously persisted events may lack newer classifications.

When the local managed App Server control socket is available, the monitor reads loaded thread status through the CLI proxy. This can confirm idle status for threads loaded by that server. Independent Codex processes use the rollout fallback. A feed interruption freezes the known workers, and the next snapshot restores them by ID. Per-agent process metrics are unavailable. See the [App Server protocol](https://developers.openai.com/codex/app-server/).

Token totals use each session's last cumulative snapshot; cached input is included in input and reasoning is included in output. Daily usage derives nonnegative differences between snapshots in UTC; resets or missing snapshots can make the history incomplete. Limit snapshots are separate from token usage and may be stale. Values and sessions missing from rollout files remain unavailable; an empty total does not prove zero usage. Context is the last reported count, not a verified live context measurement.

The scanner uses synchronous file reads, which can be expensive on very large rollout histories. WSB recognition uses the configured Git root and normalized path containment. Independent worktrees need their own configured checkout path. Archived rollout files and some file rotation edge cases are outside this adapter's coverage.
