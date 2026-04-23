# Kurash Tournament Suite
## How The Application Is Built

Document purpose: internal learning guide  
Audience: you, future maintainers, and anyone trying to understand how this project actually works

---

## 1. What This Document Is

This is not an end-user manual.

This is a builder's guide to the current application: what technologies it uses, how the pieces connect, where the important code lives, and how to think about changing it safely.

One honest note up front:

- I can explain how the application is built now.
- I cannot perfectly reconstruct the exact historical order in which every feature was originally created unless we go through full git history.

So the goal here is:

- explain the current architecture clearly
- show the likely design intent behind it
- give you a practical map of the repo
- help you learn where to edit when you want to add or change features

---

## 2. The Short Version

This application is a desktop-first tournament controller built from several layers working together:

- `Electron` provides the Windows desktop shell and multi-screen control
- `Laravel` provides the backend, routing, API endpoints, local persistence, and sync logic
- `Vue 3 + Inertia` provides the operator interface and display pages
- `MariaDB` stores local tournament and match data in the packaged app runtime
- `Laravel Reverb` provides realtime event broadcasting
- `BroadcastChannel` and cached state provide local fallback when realtime broadcasting is degraded

The key design idea is:

> package a full local web app inside a desktop app, so the system can still run live competition even when the outside network or central admin services are unreliable

That is the core philosophy of this codebase.

---

## 3. High-Level Architecture

You can think about the app like this:

```text
Electron Desktop App
|
|-- Startup / Packaging / Multi-window management
|-- Runs local packaged services
|
+--> Local Laravel App
     |
     |-- Web routes for controller and displays
     |-- API routes for tournaments, matches, pairing, and sync
     |-- Broadcast endpoints for live scoreboard state
     |-- Services for remote admin sync and controller proxying
     |-- Local database persistence
     |
     +--> Vue / Inertia frontend
          |
          |-- Referee controller
          |-- Scoreboard view
          |-- Gilam Match Order view
          |
          +--> Realtime + fallback channels
               |-- Reverb / Echo
               |-- BroadcastChannel
               |-- Cached local state
```

Another way to say it:

- Electron makes it feel like a desktop app
- Laravel makes it work like a real local server-backed application
- Vue makes it feel interactive and operator-friendly
- fallback systems make it resilient during live events

---

## 4. Why This Architecture Was Chosen

Based on the code, the project seems built around these real-world needs:

### 1. It must work on-site

A normal cloud-first web app is risky for live sports control. This project instead packages the backend locally so the operator can keep running the ring even when internet or central services are weak.

### 2. It must drive multiple screens

A normal browser app does not handle scoreboards on multiple monitors very well. Electron gives the app direct control over display windows.

### 3. It must separate operator UI from audience UI

The operator uses the controller page. The audience sees dedicated scoreboard and queue windows. That separation is built deeply into the app.

### 4. It must degrade gracefully

The code clearly prioritizes continuity over perfection:

- cached state instead of blank displays
- offline result queues instead of hard failure
- snapshot recovery instead of lost assignments
- local saved display profiles instead of full reconfiguration

This tells us the app was built for real event pressure, not just ideal lab conditions.

---

## 5. Main Tech Stack

### Desktop Layer

- `Electron`

### Backend Layer

- `Laravel 12`
- `PHP 8.2+`
- `MariaDB`
- `Laravel Reverb`
- `Laravel Fortify`

### Frontend Layer

- `Vue 3`
- `Inertia.js`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Laravel Echo`
- `Pusher JS` client, used with Reverb

### Packaging / Build Layer

- `electron-builder`
- packaged runtime staging under `electron-app/runtime-stage`

---

## 6. Repo Layout: What Each Major Folder Means

Here is the mental map of the repo.

### `app/`

Laravel backend code:

- controllers
- models
- services
- events

### `resources/js/`

Frontend application code:

- pages
- components
- composables
- shared utilities

### `routes/`

Laravel route definitions:

- browser routes
- API routes
- channels

### `database/`

- migrations
- seeders
- local schema evolution

### `electron-app/`

Desktop packaging and runtime control:

- Electron main process
- multi-window management
- preload bridge
- runtime boot orchestration
- installer and packaging scripts

### `public/`

Frontend build output and public assets used by the packaged Laravel app.

### `portable/`

Runtime source material and portable dependency staging, especially for PHP and MariaDB packaging.

### `docs/`

Human-facing project docs, including the user manual and now this builder guide.

---

## 7. The Most Important Idea in This Project

The application is really two things at once:

1. a local web application
2. a desktop orchestration shell for that local web application

That is the most important concept to understand.

If you only think of it as a Laravel app, you will miss the display and packaging logic.

If you only think of it as an Electron app, you will miss the data, routing, sync, and controller logic.

It is both.

---

## 8. How Startup Works

Startup is one of the most important parts of the system because the app cannot do anything until its local runtime is healthy.

### Startup Flow

At a high level, startup works like this:

1. Electron launches.
2. Electron enforces single-instance behavior.
3. A startup window appears.
4. The runtime orchestrator prepares the packaged environment.
5. The app verifies required binaries and writable folders.
6. MariaDB starts.
7. Laravel starts.
8. Reverb starts.
9. Electron opens the controller window to the local backend URL.

### Important Files

- `electron-app/index.js`
- `electron-app/runtime-orchestrator.js`
- `electron-app/startup.html`
- `electron-app/error.html`

### Why This Matters

This app is not just "opening a page."

It is booting a mini local platform first, then opening the UI on top of it.

That is why startup is more complex than a normal web app.

---

## 9. Electron Layer: What It Does

The Electron layer is responsible for desktop behavior that a browser cannot do well by itself.

### Main Responsibilities

- enforce single-instance app behavior
- show startup and error windows
- start the packaged local runtime
- create controller and display windows
- manage multiple physical monitors
- expose safe APIs from Electron to the frontend
- store local desktop preferences such as display profiles

### Important Files

#### `electron-app/index.js`

This is the Electron main process entry point.

It does things like:

- request the single-instance lock
- create windows
- connect Electron IPC handlers
- coordinate startup and shutdown
- pass the local backend URL into browser windows

#### `electron-app/runtime-orchestrator.js`

This is the heart of packaged startup.

It handles:

- runtime path setup
- logging
- local writable storage creation
- PHP checks
- MariaDB startup
- Laravel startup
- Reverb startup
- readiness checks
- startup error formatting

This file is one of the most important files in the entire repo.

#### `electron-app/preload.js`

This exposes a controlled bridge into the renderer using `contextBridge`.

That is how the Vue app can do Electron-specific things without full Node access in the browser window.

Examples:

- display management actions
- controller auth state access

#### `electron-app/window-manager.js`

This manages scoreboard and queue windows across physical displays.

It is the desktop control layer for:

- launching display windows
- moving them between screens
- handling display disconnects
- re-adding screens
- supporting single-screen and multi-screen modes

#### `electron-app/settings-store.js`

This stores persistent desktop preferences such as:

- selected scoreboard displays
- selected ring match order displays
- output mode
- saved broadcast profiles
- fullscreen preference

---

## 10. Backend Layer: What Laravel Does

Laravel is the real application engine behind the desktop shell.

### Main Responsibilities

- serves the controller and display pages
- serves JSON APIs
- stores local match data
- syncs with remote admin systems
- manages pairing and heartbeat proxying
- broadcasts live match updates
- caches current broadcast state
- handles uploads like team logos

### Important Files

#### `bootstrap/app.php`

This is worth paying attention to because it contains packaging-aware behavior.

It does things like:

- read runtime environment overrides
- support custom storage paths in packaged mode
- make `/api/*` return JSON instead of accidental HTML error pages
- wire Laravel routing and middleware

This is part of what makes the app safe for Electron fetch calls.

#### `routes/web.php`

This defines browser-rendered pages like:

- `/refereeController`
- `/kurashScoreBoard`
- `/ringMatchOrder`
- `/match`

It also defines broadcast endpoints such as:

- `/broadcast/timer-toggle`
- `/broadcast/score-update`
- `/broadcast/batch`
- `/broadcast/state`

#### `routes/api.php`

This defines JSON API endpoints used by the controller and Electron runtime, including:

- `/status`
- controller pairing and heartbeat endpoints
- tournament sync endpoints
- match import/update/result endpoints
- team lookup and logo upload endpoints

---

## 11. The Three Main Backend Controllers

This codebase is refreshingly focused. Most of the app behavior centers around three backend controllers.

### 1. `BroadcastController`

Purpose:

- accepts live scoreboard mutations from the controller
- validates payloads
- emits broadcast events
- caches the latest known display state
- keeps working even if realtime dispatch temporarily fails

This controller is a great example of the app's design philosophy:

- try realtime first
- if realtime fails, do not lose the state
- keep a cached version so viewers can recover

### 2. `TournamentController`

Purpose:

- manages local matches
- syncs tournaments and brackets from remote admin sources
- serves tournament and ring data
- records results
- handles pending result replay
- handles team/logo related helpers

This is the general "business logic" controller of the project.

### 3. `ControllerDeviceProxyController`

Purpose:

- proxies controller pairing
- sends heartbeat traffic
- fetches assigned setup data from the Admin Host

This is the bridge between the local controller package and the external event-side admin system.

---

## 12. Services: Why They Exist

The services folder contains the logic that would be messy if it lived directly inside controllers.

### `TournamentSyncService`

This service is the remote data integration layer.

It handles things like:

- normalizing the remote base URL
- making API requests to the remote admin system
- tolerating multiple remote response shapes
- detecting offline mode cleanly
- protecting the app from HTML/login-page mistakes when JSON was expected
- best-effort schema compatibility for packaged builds

This service exists because remote systems are rarely perfectly consistent.

### `ControllerDeviceProxyService`

This service wraps:

- pair requests
- heartbeat requests
- assigned setup requests

It normalizes:

- headers
- base URLs
- JSON expectations
- transport errors

This keeps the controller pairing logic predictable.

---

## 13. Data Model: What Gets Stored

The core local model is:

- `app/Models/TournamentMatch.php`

This model maps to the `matches` table.

### What It Stores

Examples of important fields:

- tournament identifiers
- remote IDs
- match number
- category
- gender
- age category
- ring number
- round
- player names
- player teams
- remote player IDs
- current status
- winner
- result details JSON
- sync status
- progression fields for later bracket advancement

### Why This Matters

The app is not only a live scoreboard.

It also stores match structure and sync state locally so the event can continue even when the remote system is weak or offline.

---

## 14. Frontend Layer: What Vue + Inertia Do

The frontend is a Vue application running through Inertia.

### Main Responsibilities

- show the controller UI
- show the live scoreboard
- show the queue display
- connect to realtime channels
- fall back to local browser-to-browser messaging when needed
- call backend APIs
- render admin, manual, and recovery states clearly for the operator

### Important Files

#### `resources/js/app.ts`

This is the main frontend boot file.

It:

- creates the Inertia app
- initializes Laravel Echo
- configures Reverb host/port details
- publishes connection state to the browser
- initializes theme behavior

This file is the frontend bootstrap equivalent of Electron's `index.js`.

#### `resources/js/ssr.ts`

This supports SSR-style Inertia rendering, although for day-to-day desktop behavior the main runtime focus is the client-side app.

#### `resources/js/pages/`

This folder contains the actual screens.

The most important pages are:

- `refereeController.vue`
- `kurashScoreBoard.vue`
- `ringMatchOrder.vue`

---

## 15. The Three Main Frontend Pages

### 1. `refereeController.vue`

This is the operator control center.

It handles things like:

- match control
- timer control
- score and penalty actions
- break and medic state
- Jazo state
- winner flow
- match finish flow
- admin pairing state
- recovery state
- manual setup
- keyboard settings
- display management integration

This file is large because it is the app's most complex workflow surface.

### 2. `kurashScoreBoard.vue`

This is the audience-facing scoreboard display.

It listens to:

- Reverb / Echo channels
- local `BroadcastChannel` updates
- current cached broadcast state

It is designed to keep showing correct or near-correct state even if the primary broadcast path is degraded.

### 3. `ringMatchOrder.vue`

This is the audience-facing queue display.

It uses:

- queue projection logic
- local state sharing
- `BroadcastChannel` fallback behavior

This keeps the public queue useful even when live update paths are interrupted.

---

## 16. Realtime Architecture

Realtime behavior in this app is intentionally layered.

### Primary Realtime Path

The ideal path is:

1. controller sends update to Laravel
2. Laravel emits event through Reverb
3. display pages receive the event with Laravel Echo

### Fallback Path

If realtime broadcasting has trouble, the app still tries to preserve state by using:

- cached broadcast state on the backend
- local `BroadcastChannel` communication between windows
- saved snapshots and projections on the frontend

### Why This Is Smart

In a live tournament environment, a blank or frozen display is much worse than a slightly degraded but still usable display.

This code clearly chooses usable continuity over brittle perfection.

---

## 17. Broadcast Layer: How a Match Update Becomes a Screen Update

Here is the normal scoreboard update flow.

### Example: Operator Changes the Score

1. The operator presses a score action in `refereeController.vue`.
2. The frontend sends a request to a broadcast endpoint such as `/broadcast/score-update`.
3. `BroadcastController` validates the request.
4. `BroadcastController` emits a `ScoreUpdated` event.
5. `BroadcastController` also updates the cached broadcast state.
6. `kurashScoreBoard.vue` receives the change through Echo if realtime is healthy.
7. If realtime is not healthy, the fallback local path can still keep the display synchronized.

This dual-path design is one of the best things in the codebase.

---

## 18. Pairing and Admin-Assigned Setup

The app is not purely standalone. It can connect to an external Admin Host / Event Host.

### What Pairing Solves

Pairing allows the local controller to:

- identify itself as a device
- receive assigned tournament and ring setup
- send heartbeat signals
- restore known-device behavior across sessions

### How It Works

The frontend calls backend API endpoints, which then proxy to the admin system using:

- `ControllerDeviceProxyController`
- `ControllerDeviceProxyService`

This is a nice architecture choice because the frontend does not talk directly to the remote admin service with raw uncontrolled requests.

The backend stays in the middle and normalizes the interaction.

---

## 19. Offline and Fallback Design

This app was clearly built with an assumption that something will eventually go wrong during an event.

### Fallback Themes Present in the Code

- cached scoreboard state
- pending local result queueing
- offline snapshot and recovery states
- known device recovery
- admin recovery setup
- display re-add and rescan behavior
- safe movement of scoreboard windows when a display disappears

### Why This Matters

This is not just defensive programming.

This is domain-aware engineering.

The app is being built around the reality that:

- venue networks are unstable
- external displays disconnect
- remote APIs can be slow or unavailable
- operators still need the ring to continue

That is why fallback behavior shows up in both frontend and backend code.

---

## 20. Multi-Display Strategy

The project does not treat the scoreboard as just another tab.

It treats audience-facing outputs as managed windows.

### What the Display System Supports

- single-screen scoreboard mode
- multiple-screen broadcast mode
- separate role-based displays
- dedicated Gilam Match Order windows
- moving windows between monitors
- previewing displays
- saving display profiles
- re-adding disconnected outputs

### How It Is Implemented

- Electron manages the physical windows
- preload exposes safe display APIs
- Vue calls those APIs
- `settings-store.js` persists layout preferences
- `window-manager.js` applies and restores window placement

This is one of the major reasons Electron makes sense here.

---

## 21. Build and Packaging Strategy

This project is more than a dev server. It is designed to be packaged and shipped as a Windows application.

### Root-Level Build

At the repo root:

- Vite builds the frontend bundle
- Electron packaging commands wrap the Laravel app and runtime

### Important Commands

- `npm run build`
- `npm run build:electron`
- `npm run build:electron:portable`
- `npm run build:electron:nsis`

### Backend Dev Commands

From `composer.json`, the project also supports:

- Laravel setup
- local dev server flow
- tests
- linting

### Electron Packaging

Inside `electron-app/package.json`, the app packages:

- Laravel source and resources
- vendor dependencies
- public assets
- storage seed data
- staged portable runtime under `portable/runtime`

So the packaged app is not depending on a separately installed PHP stack on the client machine.

That is a major architectural choice.

---

## 22. Why `public/build` Matters So Much

This is an easy thing to miss.

The packaged app does not read `.vue` files directly.

It runs built assets from `public/build`.

That means:

- changing Vue code is not enough
- you must rebuild the frontend bundle for packaged app changes to appear

This matters especially when testing Electron builds.

If the UI looks "old," the problem may be stale built assets, not the source code itself.

---

## 23. What the Startup Runtime Is Really Doing

The runtime orchestrator is effectively making the packaged app self-hosting.

### It Prepares

- logs directory
- runtime directory under user data
- writable Laravel storage
- packaged PHP and MariaDB usage
- runtime environment values

### It Starts

- MariaDB
- Laravel HTTP server
- Reverb websocket server

### It Validates

- PHP portability
- missing runtime DLLs
- server readiness
- database readiness
- health endpoints

This is why the app can behave more like an appliance than a website.

---

## 24. Where Logs and Local Runtime Data Live

The packaged app uses the Electron user data directory.

Important paths include:

- `%APPDATA%\Kurash Scoreboard\logs`
- `%APPDATA%\Kurash Scoreboard\runtime`

Log files include:

- `main.log`
- `php.log`
- `reverb.log`
- `mysql.log`
- `portable-env-debug.json`

This is useful not only for support, but for you as the maintainer when a packaged build behaves differently from the repo dev environment.

---

## 25. What Happens When the Operator Finishes a Match

The finish flow is more than a UI button.

At a high level:

1. the operator chooses a winner
2. the frontend confirms the current bout context
3. the result is sent to backend match/result handling
4. `TournamentController` records the result locally
5. if the remote path is healthy, sync can happen immediately
6. if the remote path is down, the result can remain queued locally for later replay

This again shows the project's main philosophy:

- local truth first
- sync when possible
- do not lose the event because the network had a bad moment

---

## 26. How the Codebase Is Organized by Responsibility

When learning the repo, do not read it file by file in random order. Read it by responsibility.

### If you want to understand startup

Read:

- `electron-app/index.js`
- `electron-app/runtime-orchestrator.js`

### If you want to understand desktop display behavior

Read:

- `electron-app/preload.js`
- `electron-app/window-manager.js`
- `electron-app/settings-store.js`
- `resources/js/components/Referee/RefereeDisplayManagementPanel.vue`

### If you want to understand live scoring

Read:

- `resources/js/pages/refereeController.vue`
- `app/Http/Controllers/BroadcastController.php`
- `app/Events/*`
- `resources/js/pages/kurashScoreBoard.vue`

### If you want to understand tournament and result sync

Read:

- `app/Http/Controllers/TournamentController.php`
- `app/Services/TournamentSyncService.php`
- `app/Models/TournamentMatch.php`

### If you want to understand pairing and admin assignment

Read:

- `resources/js/components/Referee/RefereeConnectionPanel.vue`
- `resources/js/components/Referee/RefereeFallbackRecoveryPanel.vue`
- `app/Http/Controllers/Api/ControllerDeviceProxyController.php`
- `app/Services/ControllerDeviceProxyService.php`

---

## 27. If You Want to Change Something, Edit Here

This section is the practical cheat sheet.

| If you want to change... | Start here |
| --- | --- |
| controller scoring behavior | `resources/js/pages/refereeController.vue` |
| scoreboard visuals and animations | `resources/js/pages/kurashScoreBoard.vue` |
| ring queue display behavior | `resources/js/pages/ringMatchOrder.vue` |
| display assignment and multi-monitor behavior | `electron-app/window-manager.js` and `resources/js/components/Referee/RefereeDisplayManagementPanel.vue` |
| startup flow or packaged runtime behavior | `electron-app/index.js` and `electron-app/runtime-orchestrator.js` |
| pairing or admin proxy behavior | `app/Http/Controllers/Api/ControllerDeviceProxyController.php` and `app/Services/ControllerDeviceProxyService.php` |
| tournament sync logic | `app/Services/TournamentSyncService.php` |
| backend result handling | `app/Http/Controllers/TournamentController.php` |
| broadcast event behavior | `app/Http/Controllers/BroadcastController.php` and `app/Events/*` |
| persisted match schema | `database/migrations/*` and `app/Models/TournamentMatch.php` |
| packaged release behavior | `electron-app/package.json` and `electron-app/README.md` |

---

## 28. How I Would Learn This Repo If I Were You

If your goal is learning, this is the path I recommend.

### Phase 1: Understand the Product Shape

Read:

- `README.md`
- `routes/web.php`
- `routes/api.php`

Goal:

- know what screens exist
- know what APIs exist

### Phase 2: Understand the Core User Workflow

Read:

- `resources/js/pages/refereeController.vue`
- `resources/js/pages/kurashScoreBoard.vue`
- `resources/js/pages/ringMatchOrder.vue`

Goal:

- understand what the operator sees
- understand what the audience sees

### Phase 3: Understand the Backend Logic

Read:

- `app/Http/Controllers/BroadcastController.php`
- `app/Http/Controllers/TournamentController.php`
- `app/Services/TournamentSyncService.php`

Goal:

- understand how state moves and gets stored

### Phase 4: Understand the Desktop Packaging Layer

Read:

- `electron-app/index.js`
- `electron-app/runtime-orchestrator.js`
- `electron-app/preload.js`
- `electron-app/window-manager.js`

Goal:

- understand why this is not just a web app

### Phase 5: Understand Persistence and Schema

Read:

- `database/migrations/*`
- `app/Models/TournamentMatch.php`

Goal:

- understand what the app keeps locally and why

---

## 29. My Best Reading of the Build Order

Again, this is an informed reconstruction, not a perfect historical truth.

The app appears to have evolved roughly like this:

1. basic Laravel + Vue/Inertia application foundation
2. live referee controller and scoreboard interactions
3. broadcast events for realtime updates
4. local match persistence and tournament sync support
5. pairing and admin-assigned setup support
6. offline/fallback/snapshot recovery behavior
7. Electron wrapping for multi-display desktop deployment
8. packaged runtime hardening for portable Windows delivery

Why I think that:

- the core scoreboard/controller patterns are central and deeply integrated
- the tournament sync and result persistence build naturally on top of that
- the Electron runtime and packaging layer feel like a more advanced deployment phase
- the fallback logic looks like it was added in response to real operational needs

That progression is normal and makes architectural sense.

---

## 30. Strengths of the Current Architecture

There is a lot to like here.

### 1. It is practical

The architecture matches the real-world use case instead of copying a trendy web stack blindly.

### 2. It is resilient

The code repeatedly prefers recoverable behavior over total failure.

### 3. It separates concerns reasonably well

- Electron handles desktop concerns
- Laravel handles backend concerns
- Vue handles UI concerns
- services absorb remote integration messiness

### 4. It is operator-aware

The app clearly understands that the real job is "keep the ring running."

That is a strong product mindset.

---

## 31. Friction Points to Be Aware Of

These are not criticisms so much as reality checks for maintenance.

### 1. `refereeController.vue` is a very large file

That is common in mature control surfaces, but it also means:

- changes can have unexpected side effects
- refactoring requires care

### 2. Packaged runtime debugging is harder than browser-only debugging

You have:

- frontend state
- backend state
- database state
- Electron state
- packaging/runtime state

So bugs can cross layers.

### 3. Built assets can hide the truth

Sometimes the source code is correct but the packaged app is still using stale `public/build` output.

### 4. Offline/fallback systems increase complexity

They are necessary, but every recovery path adds another mental model to keep track of.

---

## 32. How I Would Explain This App in One Sentence

I would describe it like this:

> Kurash Tournament Suite is a packaged Electron desktop application that runs a local Laravel + Vue tournament control system, with realtime display broadcasting, multi-screen management, remote admin integration, and offline-first fallback behavior for live event reliability.

That sentence captures the project better than "it's a scoreboard app."

---

## 33. Relationship to the User Manual

The user manual explains:

- how to operate the application
- what to do when problems happen

This document explains:

- how the application is constructed
- why the code is organized the way it is
- where you should look when you want to modify behavior

Those two documents are meant to complement each other.

---

## 34. Final Advice for You

If you want to grow comfortable with this codebase, focus on these ideas first:

- this is a local web app packaged as a desktop app
- the controller, scoreboard, and queue are separate surfaces
- broadcast state and fallback behavior are central, not optional extras
- packaging is part of the product, not just a release afterthought

If you keep those four ideas in your head, the repo will start making a lot more sense.

---

## 35. Suggested Next Internal Docs

If you want, the next useful internal docs would be:

- a `DATA_FLOW.md` showing exact request and event paths
- a `PACKAGING_GUIDE.md` for release and installer creation
- a `DISPLAY_SYSTEM_GUIDE.md` focused only on Electron screen/window management
- a `SYNC_AND_OFFLINE_GUIDE.md` focused only on admin sync, fallback snapshots, and pending results
