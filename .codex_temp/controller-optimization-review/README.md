# Controller Optimization Review Package

Prepared on 2026-04-07 for optimization review focused on low-spec readiness, Electron efficiency, live display responsiveness, and long-running event stability.

## Included source files

Electron/runtime:
- `package.json`
- `electron-app/package.json`
- `electron-app/index.js`
- `electron-app/preload.js`
- `electron-app/window-manager.js`
- `electron-app/display-manager.js`
- `electron-app/settings-store.js`
- `electron-app/controller-auth-store.js`
- `electron-app/runtime-orchestrator.js`

Controller runtime/UI:
- `resources/js/pages/refereeController.vue`
- `resources/js/composables/useRefereeControllerSession.ts`
- `resources/js/composables/useRefereeDisplayManagement.ts`
- `resources/js/composables/useRefereeRingMatchOrderSync.ts`
- `resources/js/composables/useRefereeQueueSync.ts`
- `resources/js/composables/useRingMatchOrderProjection.ts`
- `resources/js/composables/refereeDisplayTypes.ts`
- `resources/js/composables/refereeQueueOverrides.ts`
- `resources/js/composables/refereeQueueStorage.ts`
- `resources/js/components/Referee/RefereeConnectionPanel.vue`
- `resources/js/components/Referee/RefereeFallbackRecoveryPanel.vue`
- `resources/js/components/Referee/RefereeDisplayManagementPanel.vue`

## 1. Live-display architecture

### Window model

- One controller `BrowserWindow` is always created by `windowManager.createControllerWindow(...)`.
- Scoreboard and ring-match-order outputs are not created eagerly. `createScoreboardWindow(...)` and `createRingMatchOrderWindow(...)` only store target URLs.
- Each live output display gets its own renderer process and its own `BrowserWindow`.
- Scoreboard live windows are tracked in `scoreboardWindows: Map<displayId, BrowserWindow>`.
- Ring Match Order live windows are tracked in `ringMatchOrderWindows: Map<displayId, BrowserWindow>`.
- Scoreboard test windows are separate lightweight `BrowserWindow`s in `displayTestWindows`.
- Ring Match Order preview windows are separate `BrowserWindow`s in `ringMatchOrderPreviewWindows`.

### How many BrowserWindows can exist

- Minimum steady state: 1 controller window.
- Typical two-screen event: 2 windows total.
  Controller on main screen.
  One scoreboard or one ring-match-order output on external screen.
- Typical three-screen event with both public outputs: 3 windows total.
  Controller + scoreboard output + ring-match-order output.
- Broadcast mode: 1 controller + N scoreboard output windows + M ring-match-order windows.
- Temporary preview/test windows add extra short-lived windows on top of that.

### Which windows stay alive

- Controller window stays alive for the app lifetime.
- Live scoreboard windows stay alive until stopped, display removal, or unexpected close.
- Live ring-match-order windows stay alive until stopped, display removal, or unexpected close.
- Scoreboard test windows auto-close after a timer.
- Ring Match Order preview windows stay open until manually stopped or displaced by live launch/role changes.

### External display detection

- Electron `screen` API is used through `DisplayManager`.
- Main process listens to:
  - `screen.on('display-added', ...)`
  - `screen.on('display-removed', ...)`
  - `screen.on('display-metrics-changed', ...)`
- `DisplayManager.getAllDisplays()` serializes all current displays and marks:
  - `isPrimary`
  - `isExternal`
  - bounds/workArea metadata

### How content is synced to displays

- Output windows load normal app routes through splash wrappers:
  - controller: `/refereeController`
  - scoreboard: `/kurashScoreBoard`
  - match order: `/ringMatchOrder`
- There is no shared in-memory Electron renderer store across windows.
- Each display window renders its own page independently.
- Controller-to-main-process state sync uses Electron IPC.
- Match Order projection cross-window sync uses browser `BroadcastChannel` plus `localStorage` persistence.
- Queue/match data itself is fetched in the renderer from HTTP endpoints, not pushed over Electron IPC.

### Update mechanism by surface

- Display-management UI state:
  - request/command path: renderer `ipcRenderer.invoke(...)`
  - state push back to controller: main process `webContents.send('display-management:state-changed', state)`
- Controller auth persistence:
  - renderer `ipcRenderer.invoke(...)`
  - main process file-backed store
- Queue/live snapshot:
  - renderer polling via HTTP fetch
- Ring Match Order projection:
  - controller renderer polls `/display-batch`
  - writes latest record/meta to `localStorage`
  - publishes updates over `BroadcastChannel`
  - each match-order renderer reads from local cache/broadcast path

## 2. Exact timing values

### Controller/UI polling

- Controller status monitor interval: `10000 ms`
  Source: `refereeController.vue` `startStatusMonitor()`
- Known-device reconnect/heartbeat cadence in practice: every `10000 ms`
  Reason: `startStatusMonitor()` calls `checkOnlineStatus()`, which attempts known-device reconnect first.
- Queue refresh cadence in practice: every `10000 ms`
  Reason: same status monitor calls `fetchScoreboardData()` when online and tournament is selected.
- Ring Match Order polling interval: `5000 ms`
  Source: `useRefereeRingMatchOrderSync.ts`
- Ring Match Order fresh threshold: `15000 ms`
  Source: `useRingMatchOrderProjection.ts`
- Ring Match Order offline threshold: `60000 ms`
  Source: `useRingMatchOrderProjection.ts`

### Retry/backoff and startup timings

- Controller pairing reconnect retry loop: no exponential backoff; piggybacks on `10000 ms` status monitor.
- Match result popup auto-hide:
  - `2500 ms`
  - `3000 ms`
  Multiple one-shot UI timers in `refereeController.vue`.
- Settings scroll restore timer: `window.setTimeout(..., 0)` plus deferred scroll helper.
- LAN auto-detect probe stagger: `900 ms + i * 400 ms`
  Source: `refereeController.vue`
- Scoreboard display test duration: `2200 ms` default
  Source: `window-manager.js`

### Runtime orchestrator

- MySQL ready timeout: `90000 ms`
- Laravel ready timeout: `90000 ms`
- Reverb ready timeout: `30000 ms`
- HTTP health request timeout: `5000 ms`
- TCP probe timeout: `1500 ms`
- Bootstrap readiness retry delay: `1000 ms`
- Bootstrap-only validation hold: default `5000 ms`

### Always-running watchers/timers/subscriptions

- One always-running `setInterval(10000)` while controller page is mounted.
- One `BroadcastChannel` for ring match order sync while controller page is active.
- Electron display listeners remain active in main process for app lifetime.
- Controller page has many Vue watchers; important always-reactive ones include:
  - assignment host changes
  - live snapshot context changes
  - degraded/live recovery conditions
  - selected tournament/ring changes
  - ring projection meta changes
  - ring output live-state changes
- Match Order poller runs only when ring-match-order output is live and projection meta exists.

## 3. Local persistence details

### Renderer `localStorage`

Stored keys include:
- `admin_base`
- `selected_ring`
- `manual_match_id`
- `match_history`
- queue cache keys: `sb_cache_<snapshot_scope>`
- result override keys: `sb_result_overrides_<snapshot_scope>`
- ring projection meta: `kurash:ring-match-order:current`
- ring projection payload cache: `kurash:ring-match-order:cache:<projection_key>`
- browser fallback controller auth key when Electron bridge is unavailable: `kurash_controller_auth_v1`

Snapshot-scoped queue keys include:
- host
- snapshot id
- tournament id
- ring

That scoping is versioned as `v2|host|snapshot|tournament|ring`.

### Main-process file storage

Under Electron `app.getPath('userData')`:
- `display-settings.json`
  Persistent selected displays, output mode, profiles, fullscreen preference.
- `controller-auth.json`
  Controller pairing state. Token is encrypted with Electron `safeStorage` when available.
- `logs/`
  Runtime logs: main/php/reverb/mysql/debug.
- `runtime/...`
  Extracted writable runtime directories for packaged Laravel/MariaDB/PHP state.

### Read/write behavior

- Queue cache writes are immediate on each successful queue application or fallback application.
- Result override writes are immediate on each override update; not debounced.
- Ring Match Order projection writes are immediate on each poll success/error.
- Display settings writes are immediate whenever display settings change in main process.
- Controller auth writes are immediate whenever auth state is updated or cleared.

### Debounce/batching status

- No explicit debounce or batch layer was found for queue cache writes.
- No explicit debounce or batch layer was found for result override writes.
- No explicit debounce or batch layer was found for ring projection cache writes.
- The only effective rate limiter is the poll interval and in-flight guards.

## 4. Performance-sensitive areas

### Electron / display side

- Every live display is a full independent `BrowserWindow` rendering a full app route.
- Broadcast mode scales renderer count linearly with output count.
- Scoreboard and ring-match-order outputs each keep their own renderer/window rather than sharing a compositor.
- `windowManager.pushStateToController()` sends full display state snapshots back to the controller on every display-management state change.
- `session.defaultSession.clearCache()` runs on startup after runtime bootstrap.

### Controller renderer

- `refereeController.vue` is still very large and contains many reactive branches and computed values in one renderer.
- `displaySlots` is recomputed from `matchesListForSlots`, which maps the match list when local overrides exist.
- Queue payload application normalizes/filter/maps arrays and writes cache on every successful refresh.
- Tournament/ring changes trigger:
  - cache restore
  - cache read
  - local DB sync attempt
  - fresh scoreboard fetch
- Ring Match Order projection polling writes `localStorage` plus `BroadcastChannel` messages every `5000 ms` while live.
- Repeated `localStorage` reads/writes exist across controller state, cache, match order projection, and historical helpers.

### UI/animation

- The controller page contains many animated/transitional utility classes and conditional panels.
- Multiple auto-dismiss popup/banner timers are active during interactions.
- Heavy full-screen browser windows are used for public outputs rather than light-weight static surfaces.

### Watcher sensitivity

- Recovery logic depends on watcher order and side effects around:
  - host changes
  - snapshot context changes
  - degradation flags
  - tournament/ring changes
- `useRefereeQueueSync` remains the most performance- and correctness-sensitive area.

## 5. Known issues or observations

### Confirmed from current code / previous work

- Repo-wide typecheck still has unrelated pre-existing errors outside this controller work.
- Controller currently warns on any assigned `ring_display` target even when disabled.
- Match Order projection is manual from the controller display-management side even though assignment metadata can mention `match_order`.

### Performance/stability observations from code review

- Potential slow startup in packaged mode:
  - Electron bootstraps PHP, MariaDB, Laravel, and Reverb before creating windows.
  - Cache clearing also happens during startup.
- Potential idle/network churn:
  - `10000 ms` always-on controller status loop.
  - `5000 ms` match-order polling while live.
- Potential renderer churn:
  - immediate `localStorage` writes on queue/projection updates
  - full list normalization/filtering on queue refresh
  - one renderer per external output window
- Long-session risk areas:
  - repeated cache writes
  - repeated queue array reconstruction
  - many always-reactive watchers in one large controller page
  - multiple BrowserWindows staying live for event duration
- Browser vs Electron behavior differs:
  - display management only exists in Electron through preload bridge
  - controller auth persistence falls back to browser `localStorage` outside Electron
  - Electron main process owns display topology and persistence files

### Not directly confirmed in code review

- No explicit memory leak was proven in this review.
- No explicit weak-hardware benchmark numbers were found in repo.
- No explicit CPU profiling artifacts were found in the requested files.

## 6. Deployment assumptions

### OS

- Inference: Windows is the target deployment platform.
- Evidence:
  - Electron build target is `win portable`.
  - runtime bootstrap uses `taskkill`, `mysqld.exe`, `php.exe`, Windows paths, and portable packaging.
- Inference: practical minimum is Windows 10/11 class.
  - No stricter minimum is explicitly declared in source.

### Hardware

- Inference: app is designed for low-to-midrange event PCs but not for extremely weak hardware without optimization.
- Reasons:
  - full Laravel + MariaDB + Reverb + Electron runtime on one machine
  - multiple BrowserWindows for outputs
  - steady polling and cache writes
- Safer review assumption:
  - 8 GB RAM recommended baseline
  - modern dual-core or quad-core CPU
  - SSD strongly preferred for packaged runtime and logs

### Real event display count

- Controller always expects one operator screen.
- Real event use likely expects:
  - 1 controller display
  - 1 scoreboard display
  - optionally 1 separate ring-match-order display
- Broadcast mode supports more than one external public display for scoreboard and ring match order.
- From a low-spec perspective, the most realistic optimization target should be:
  - 2 to 3 total displays
  - 1 to 2 public output windows live at once

## 7. Optimization review focus suggestions

- Reduce per-refresh renderer work in `useRefereeQueueSync`.
- Audit and possibly batch `localStorage` writes for queue/projection paths.
- Profile controller idle CPU with only the `10000 ms` status loop active.
- Profile event load with:
  - controller only
  - controller + one scoreboard window
  - controller + scoreboard + ring-match-order window
- Consider whether some public-output pages can be simplified for long-running fullscreen use.
- Review whether ring-match-order live windows need `5000 ms` polling or can move to a push/update model later.
