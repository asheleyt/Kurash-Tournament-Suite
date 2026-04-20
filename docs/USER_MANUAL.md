# Kurash Tournament Suite
## User Manual

Document status: source manuscript for documentation production  
Primary audience: referees, controller operators, event support staff, and deployment/support agents

---

## 1. Purpose of This Manual

This manual explains how to operate the Kurash Tournament Suite desktop application in live event conditions. It covers:

- normal startup and daily use
- display setup for live scoreboard and Gilam Match Order screens
- controller pairing with the Event Host or Admin Host
- manual and offline operation when central services are unavailable
- recovery actions for common problems
- support information to collect when escalation is required

This document is written as a structured source file so it can be transformed into polished end-user documentation later without re-discovering product behavior.

---

## Contents

1. Purpose and product overview
2. Roles, terminology, and preparation
3. Startup and first-time setup
4. Display configuration and saved layouts
5. Event Host or Admin Host pairing
6. Recovery setup, snapshots, and manual operation
7. Running a bout from load to finish
8. Scoreboard, queue display, and shortcut behavior
9. Troubleshooting, fallback playbooks, and end-of-event checks
10. Support data, logs, and documentation handoff notes

---

## 2. What the Application Does

Kurash Tournament Suite is a packaged desktop controller application used to run a Kurash ring locally. It can:

- start its own local runtime services automatically
- control a live scoreboard
- publish a Gilam Match Order display
- pair to an Event Host or Admin Host over the local event network
- continue operating with fallback data if the network or host becomes unavailable
- queue certain results locally and replay them when the host returns

The application is designed so the controller can keep running even when the ideal live connection path is degraded.

---

## 3. Key Terms

### Controller

The main operator window where the referee or table official controls the match, timer, display configuration, pairing, recovery setup, and manual fallback tools.

### Scoreboard

The audience-facing live match display. It shows athlete information, timer, score state, penalties, break state, medic timer, Jazo state, and winner presentation.

### Gilam Match Order

The audience-facing queue display that shows upcoming bout order for the ring.

### Event Host / Admin Host

The central event-side service that assigns tournament and queue information to the controller. The app uses a pairing flow to connect to it.

### Snapshot

A saved state of assignment or queue data used for continuity and recovery when live admin data cannot be refreshed.

### Fallback

The app's recovery behavior when live connectivity or broadcast services are unavailable. Fallback can include cached snapshots, offline snapshots, local display recovery, and locally queued results.

### Pending Results

Completed bout results that were saved locally because the Event Host was unavailable at the time of recording. These results can be replayed to the host later.

### Display Setup

A saved profile of which physical screens are used for the controller, scoreboard, and Gilam Match Order.

---

## 4. Who Should Use This Manual

This manual is useful for:

- referee table operators running a ring
- event technical staff configuring screens
- support staff assisting with recovery during live operations
- documentation agents turning product behavior into final public documentation

---

## 5. Before You Begin

Before opening the application, confirm the following:

- the packaged desktop application has been installed completely
- all required external displays are connected and powered on
- the Windows machine is stable and not mid-update
- if using Admin pairing, the controller machine can reach the Event Host or Admin Host on the local network
- if using pairing, you have the current short-lived pairing code from the Event Host
- if running without central admin, you have the match details needed for manual setup

Recommended operator preparation:

- decide whether the ring will run in Admin-connected mode or temporary manual mode
- connect all scoreboard and queue displays before launching the app
- save one or more display setups after initial configuration
- test one full bout workflow before the event begins

---

## 6. Starting the Application

### Normal Startup

1. Launch the desktop application.
2. A startup screen appears while the application prepares local services.
3. Wait for the controller window to open automatically.

During startup, the application may show a boot screen similar to:

- `STARTING CONTROLLER`
- `BOOT IN PROGRESS`
- `Preparing local services. The controller will open automatically when ready.`

Important startup behavior:

- repeated launches do not start separate controllers; they refocus the existing app window
- the first launch after install may take longer than normal
- the application automatically starts its local packaged runtime before opening the controller

### What Happens in the Background

The desktop package starts and verifies its local service stack, including:

- portable PHP
- local MariaDB
- Laravel application service
- Reverb realtime service

This is normal. The operator does not need to start these services manually.

### When Startup Is Successful

Startup is complete when:

- the controller window opens
- the main ring controls become visible
- display and connection tabs are accessible

---

## 7. Main Controller Areas

The controller provides four main work areas:

### Display Configuration

Used to choose monitors, launch the scoreboard, launch Gilam Match Order, save display profiles, preview screens, and recover from disconnected displays.

### Admin Connection

Used to pair the controller to the Event Host or Admin Host, reconnect to known devices, and review live or degraded connection state.

### Manual Setup

Used for temporary manual recovery when a live Admin assignment is unavailable, or for operating an offline manual match without a central queue.

### Keyboard Shortcuts

Used to review or configure keyboard-driven control behavior for the ring operator.

---

## 8. Recommended First-Time Setup

For a new ring or newly installed controller, use this order:

1. Launch the application and wait for the controller window.
2. Open `Display Configuration`.
3. Choose `Single Screen` or `Multiple Screens`.
4. Assign outputs for `Scoreboard` and `Gilam Match Order` as needed.
5. Use `Preview Screens` to confirm the right physical monitor is selected.
6. Save the configuration using `Save Display Setup`.
7. Open `Admin Connection`.
8. Pair the controller if this ring will receive central assignments.
9. Only use `Manual Setup` if the ring is intentionally offline or live admin data is temporarily unavailable.

---

## 9. Display Configuration

Display management is available in the packaged desktop application. Browser previews do not provide the same live screen control tools.

### Output Modes

The application supports:

- `Single Screen`
- `Multiple Screens`

Use `Single Screen` when the scoreboard should use one selected display. Use `Multiple Screens` when the same output needs to be broadcast to multiple screens.

### Display Roles

You can assign local display roles for:

- `Scoreboard`
- `Gilam Match Order`

### Common Display Actions

The Display Configuration area includes actions such as:

- `Preview Screens`
- `Launch Scoreboard`
- `Stop Scoreboard`
- `Launch Gilam Match Order`
- `Stop Gilam Match Order`
- `Re-scan screens`
- `Re-add` missing or disconnected outputs
- `Move controller to chosen screen`
- `Bring scoreboard to controller screen`
- `Save Display Setup`
- `Reapply`
- `Delete`

### Display Setup Profiles

Display profiles are strongly recommended for live events. A saved setup stores which screens should be used the next time the operator re-applies that profile.

Recommended practice:

- create a profile for the normal event layout
- create a second profile for emergency single-screen recovery
- name profiles clearly by venue or ring number

### Important Display Notes

- version 1 is tuned for roughly 2 to 4 live outputs
- if the controller display is also selected as a scoreboard target, the app may require confirmation
- swapping controller and scoreboard positions is only available in `Single Screen` mode

---

## 10. Pairing to the Event Host or Admin Host

### When to Pair

Pairing is used when the controller should receive centrally managed assignment and queue data from the event network.

### Pairing Procedure

1. Open the `Admin Connection` tab.
2. Enter the Admin Host or Event Host address.
3. Obtain the current short-lived pairing code from the Event Host.
4. Complete the pairing flow.
5. Wait for the controller to reconnect automatically after pairing.

### What Successful Pairing Looks Like

Typical signs of success include:

- the controller reports a connected state
- the device becomes known locally
- the UI may indicate that the known device is saved locally
- `Admin-assigned setup active` can appear once assignment data arrives

### After Pairing

Pairing alone does not always mean the ring assignment has already arrived. The controller may be paired but still waiting for tournament and Gilam details from Admin.

If this happens:

- pairing is still complete
- the controller can remain connected
- temporary manual recovery values may still be used if necessary

---

## 11. Understanding Connection and Recovery States

The controller may show different connection or readiness messages. The operator should interpret them as follows.

| State or Message | What It Means | What the Operator Should Do |
| --- | --- | --- |
| `Setup needed` | The controller does not yet have enough information to operate normally. | Enter the required host details, pair the device, or use manual recovery if live admin is unavailable. |
| `Reconnecting` | The controller is attempting to restore a connection automatically. | Wait briefly. Do not reset the ring unless the condition persists. |
| `Connected` | Normal live connection is active. | Continue normal operation. |
| `Connected with warnings` | The connection is working but some data path is degraded. | Continue operating, but review warnings and confirm fallback data is acceptable. |
| `Known device offline` | The controller knows the paired device but cannot currently reach it. | Check local network availability and prepare to use fallback if needed. |
| `Manual fallback active` | The ring is currently relying on manual or recovery data instead of a normal live Admin assignment. | Continue only with the necessary temporary recovery workflow and restore live assignment when possible. |
| `Disconnected` | No active connection exists. | Recheck host address, local network, or use manual mode if the event must continue immediately. |

You may also see messages indicating that:

- Admin assignment has not yet been pushed
- the controller is using fallback snapshot data
- the controller is recovering a live snapshot
- the host connection is up but the current state still comes from fallback
- local recovery remains available while the event LAN is restored

These are warning states, not necessarily stop states.

---

## 12. Admin Recovery Setup

Admin Recovery Setup is a temporary recovery path used when:

- pairing is complete but assignment data has not arrived
- snapshots need to be recovered
- Admin-backed data is temporarily unavailable

This setup is intended to keep the ring operational while the live Admin path is restored.

### When to Use It

Use Admin Recovery Setup only when normal Admin assignment is missing or incomplete and the event cannot wait.

### What It Does

It allows the controller to keep working with temporary tournament and Gilam values while the normal event-side assignment path is unavailable.

### Important Limitation

Recovery values are not a replacement for a healthy Admin assignment. Once the Event Host or Admin Host is healthy again, return the ring to its normal assigned state.

---

## 13. Snapshot and Fallback Data Types

The application can recover state from several tiers of saved data.

| Data Type | Meaning | Typical Use |
| --- | --- | --- |
| `Live Snapshot` | Current live state from the active system path. | Preferred operating source. |
| `Cached Snapshot` | Recently saved state kept locally for continuity. | Used when live refresh is interrupted but recent state still exists. |
| `Offline Snapshot` | Local fallback state for continued operation during offline conditions. | Used when the Event Host cannot be reached. |
| `Legacy Snapshot Fallback` | Older compatibility fallback retained for recovery. | Use only when newer snapshot paths are unavailable. |

Practical guidance:

- if live data is healthy, use the live path
- if warnings mention cached or fallback snapshot data, continue only after confirming the displayed match state is still correct
- when the host returns, allow the controller to reconnect and refresh

---

## 14. Manual Setup and Offline Manual Match

The `Manual Setup` area is used when the scoreboard must run without an Admin queue.

### When to Use Manual Setup

Use manual setup when:

- the ring is intentionally operating without the Event Host
- the central queue is unavailable and the event must continue
- a temporary recovery path is needed to keep the scoreboard active

### What Manual Setup Can Do

Manual setup allows the operator to configure the local scoreboard and ring controls using locally entered match information.

Typical manual content includes:

- athlete names
- country or team information
- club or logo information
- category and bracket details
- match identifier information

### What Manual Setup Does Not Do

Manual setup does not create a central Admin queue match and does not update brackets by itself.

It is a local operating mode for the controller and scoreboard.

### Confirming a Manual Match

After entering the match details:

1. review all names and identifiers carefully
2. confirm logos or country codes if needed
3. use `Confirm & Apply`
4. verify the scoreboard reflects the expected bout before starting the timer

### Manual Match IDs

A match or manual match ID is important for result handling. If no current match is loaded and no manual match ID exists, certain result actions will be blocked.

---

## 15. Running a Match

This section describes a normal operator workflow from match load to result submission.

### Step 1: Load the Bout

Use one of the following:

- the assigned live bout from Admin
- a recovered cached bout
- a manually configured offline bout

Before continuing, verify:

- both athlete names are correct
- the match identifier is correct
- the displayed category is correct
- any logos or country indicators are correct

### Step 2: Verify the Display

Before the athletes start:

- launch the scoreboard if it is not already running
- confirm the correct audience display is active
- if needed, launch Gilam Match Order as well
- confirm the display shows the expected ring state

### Step 3: Set the Time

The controller provides timing tools including:

- `Start` and `Pause`
- `Set Start Time`
- preset duration values
- direct plus/minus time adjustments
- `Reset Timer`

Use `Set Start Time` before the bout begins if the ring requires a different starting duration than the default.

### Step 4: Use Break and Medic Controls

The controller supports:

- `Break`
- `End Break`
- `Set Break Time`
- `Medic Timer`

Use these controls as needed during stoppages. The audience display will reflect the active state.

### Step 5: Score the Bout

The controller supports match actions such as:

- score buttons including `K`, `YO`, and `CH`
- penalty controls
- `Jazo`
- `Undo`

Operator guidance:

- apply each action only after referee confirmation
- use `Undo` immediately when the most recent action was incorrect
- use `Jazo` only when it is allowed by the current match state

### Step 6: Declare the Winner

When the bout is complete:

1. choose the winner
2. review the scoreboard one final time
3. use the finish action presented by the controller

If the winner was chosen in error, use `Correction` to clear the winner and restore the match to a correct editable state.

### Step 7: Finish the Match

The finish action may appear as:

- `Finish Match`
- `Finish Match Offline`

The label depends on whether the Event Host is currently available.

### Step 8: Confirm Result Outcome

Possible outcomes include:

- the result is recorded normally to the live system
- the result is saved locally and queued for later Admin sync

Both outcomes allow the ring to continue, but the second one requires later review.

---

## 16. Result Handling and Offline Result Queue

The application supports continued match completion when the live Event Host path is interrupted.

### If the Host Is Available

When the controller can reach the host, the result is recorded immediately through the normal flow.

### If the Host Is Unavailable but the Bout Is Confirmed

If a confirmed cached bout is already loaded and the host becomes unreachable, the application can still allow the operator to finish the match locally.

In that case:

- the result is saved locally
- the result is placed in a pending sync queue
- the application can replay that result when the host returns

### What the Operator Should Watch For

The controller may show messages indicating:

- the Event Host is unreachable
- the result was saved locally
- one or more pending results still require sync review

### Operator Rule

If the app reports pending results:

- continue the event only if the displayed bout state is correct
- restore connectivity as soon as possible
- review sync status before closing out the event

---

## 17. Scoreboard Behavior

The live scoreboard can display:

- athlete names
- country or team indicators
- logos or flags
- category
- bracket information
- match identifier
- live timer state
- break state
- medic timer state
- Jazo state
- winner presentation

The scoreboard uses more than one update path so it can continue to reflect state even when the primary realtime path is degraded.

### Animation Note

If the operating system disables motion or animation behavior, the scoreboard may indicate that animations are off. A local force-enable option exists on the display side, including a `Shift+A` shortcut.

---

## 18. Gilam Match Order Behavior

The Gilam Match Order display is the public queue view for the ring.

It can show:

- the live match position
- waiting positions
- preview positions

The queue display also uses local projection and fallback behavior so it can continue displaying usable order information if the live broadcast path is degraded.

---

## 19. Keyboard Shortcuts

The controller includes a `Keyboard Shortcuts` area for operator control preferences.

Recommended use:

- review shortcut assignments before live operation
- standardize shortcuts across rings where possible
- avoid changing shortcuts during active competition unless absolutely necessary

---

## 20. Common Operating Scenarios

### Scenario A: Normal Admin-Connected Event

1. Start the app.
2. Configure displays.
3. Pair to the Event Host.
4. Wait for Admin assignment.
5. Launch scoreboard and queue displays.
6. Run bouts normally.

### Scenario B: Paired, But Assignment Has Not Arrived Yet

1. Confirm pairing completed successfully.
2. Wait briefly for Admin-assigned setup to arrive.
3. If the event cannot wait, use temporary Admin Recovery Setup.
4. Return to the normal assigned path once the host provides the ring data.

### Scenario C: No Event Host Available

1. Start the app normally.
2. Open `Manual Setup`.
3. Enter bout details manually.
4. Use `Confirm & Apply`.
5. Launch scoreboard.
6. Operate the ring locally.

### Scenario D: Host Drops During an Active Bout

1. Do not panic or restart immediately.
2. Check whether the currently loaded bout is still correct.
3. If the app allows local finish, complete the bout.
4. Let the result queue locally for later sync.
5. Restore network access when possible.

---

## 21. Troubleshooting and Fallback Playbooks

This section is intentionally action-oriented so operators know exactly what to do when something goes wrong.

### Problem: The App Takes a Long Time to Start

Possible meaning:

- first launch after install
- local runtime services are still being prepared

What to do:

1. wait longer than usual before interrupting the process
2. do not launch extra copies of the app; repeated launches only refocus the existing instance
3. if startup still does not complete, move to the startup failure playbook below

### Problem: Startup Fails and the Controller Never Opens

Possible meaning:

- packaged runtime files are missing
- PHP or MariaDB could not start
- a local dependency or configuration issue blocked the service stack

What to do:

1. read the startup error message shown by the application
2. confirm the installation includes the packaged runtime content under `portable/runtime`
3. collect logs from `%APPDATA%\Kurash Scoreboard\logs`
4. escalate with the logs and the exact error text

What support should inspect:

- `main.log`
- `php.log`
- `mysql.log`
- `reverb.log`
- `portable-env-debug.json`

### Problem: Pairing Will Not Complete

Possible meaning:

- Admin Host address is incorrect
- the pairing code is expired
- the controller cannot reach the host over the local network

What to do:

1. re-check the host address
2. request a fresh short-lived pairing code
3. confirm the controller and host are on the expected local network
4. if the event must continue immediately, switch to temporary manual operation

### Problem: Pairing Succeeds, But No Assignment Appears

Possible meaning:

- the controller is paired but Admin has not assigned tournament or Gilam data yet
- the host is connected, but the ring is still waiting for assignment propagation

What to do:

1. confirm the controller shows a healthy or partially healthy connection state
2. wait briefly for Admin assignment
3. if the ring cannot wait, use `Admin Recovery Setup` temporarily
4. return to the live assigned state once it becomes available

### Problem: The Controller Says It Is Using Fallback Snapshot Data

Possible meaning:

- the live Admin path is degraded
- cached or offline snapshot data is currently maintaining the ring state

What to do:

1. verify the currently displayed bout information is correct
2. continue only if the bout information is reliable
3. restore the Event Host or local network connection as soon as possible
4. allow the controller to refresh once the live path returns

### Problem: The Event Host Becomes Unreachable During Competition

Possible meaning:

- the network path to Admin is down
- the controller has temporarily switched to local continuity behavior

What to do:

1. keep the controller running
2. verify whether the current bout is already confirmed and correctly displayed
3. if the app offers offline finish, complete the bout locally
4. watch for confirmation that the result was saved locally and queued for sync
5. restore connectivity and review pending sync status afterward

### Problem: I Cannot Record the Result

Possible meaning:

- no current match is loaded
- no manual match ID exists
- no winner has been selected

What to do:

1. confirm that a live or manual match is currently loaded
2. if operating manually, enter a valid manual match ID
3. select the winner
4. retry the finish action

### Problem: The Scoreboard Screen Disconnected

Possible meaning:

- the selected display was unplugged, powered off, or stopped responding

What to do:

1. check whether the app automatically moved the scoreboard to a safe fallback display
2. reconnect or power on the missing screen
3. use `Re-scan screens`
4. use `Re-add` when the display returns
5. if needed, switch temporarily to a saved single-screen recovery profile

### Problem: One Display in a Multi-Screen Broadcast Is Missing

Possible meaning:

- one display target left the system, but others may still be healthy

What to do:

1. confirm whether broadcast continues on remaining screens
2. keep the event running if the primary audience view is still working
3. reconnect the missing screen
4. use `Re-add` once Windows sees the display again

### Problem: The Wrong Screen Is Showing the Controller or Scoreboard

What to do:

1. use `Preview Screens` to identify each display
2. use `Move controller to chosen screen` if the operator window is on the wrong monitor
3. use `Bring scoreboard to controller screen` only if that is the intended recovery action
4. if necessary, reapply a known-good display profile

### Problem: Scoreboard or Queue Content Is Not Updating Smoothly

Possible meaning:

- realtime broadcasting is reconnecting or temporarily unavailable
- the app may still be updating the cached display state successfully

What to do:

1. confirm whether the visible state is still changing through cached recovery behavior
2. avoid unnecessary restarts if the display is still correct
3. restore the normal network or broadcast environment
4. if the content is frozen and incorrect, re-check the controller state before proceeding

### Problem: Logos or Team Images Are Missing

What to do:

1. verify the correct athlete or team data is loaded
2. upload or reselect the logo if the workflow allows it
3. save the logo
4. re-check the scoreboard display

### Problem: Animations Are Missing on the Scoreboard

Possible meaning:

- the operating system disabled motion
- the display is using reduced-motion behavior

What to do:

1. confirm whether reduced motion is acceptable for the event
2. if necessary, use the local force-enable animation option on the display side
3. use `Shift+A` if that shortcut is part of the operator workflow

---

## 22. Recovery Priorities During a Live Event

When something breaks during competition, use this priority order:

1. keep the current bout state correct
2. keep the audience-facing scoreboard visible if possible
3. preserve result integrity, even if that means using offline result queueing
4. restore the Event Host path after the bout, not in the middle of a critical scoring decision
5. return to the normal assigned workflow once the environment is stable again

This product favors continuity. In most cases, recovery should focus on preserving the ring state rather than forcing a full restart.

---

## 23. End-of-Event Operator Checklist

Before shutting down the controller at the end of an event or session:

- confirm there are no unresolved pending results waiting for sync review
- confirm the last completed bout state is correct
- stop scoreboard and queue displays if the event is over
- save or update the preferred display setup if the physical layout changed
- collect logs immediately if any unusual failures occurred during the event

---

## 24. Support and Escalation Information

When escalating a problem to technical support, provide:

- a short description of what the operator was doing
- the exact status label or warning message shown by the app
- whether the controller was paired, manual, or in fallback mode
- whether the issue affected startup, display output, scoring, result sync, or queue display
- screenshots if available
- the log files from `%APPDATA%\Kurash Scoreboard\logs`

Relevant log files include:

- `main.log`
- `php.log`
- `reverb.log`
- `mysql.log`
- `portable-env-debug.json`

If the issue is startup-related, also confirm whether the packaged runtime folder was present and intact.

---

## 25. Advanced Support Notes

This section is intended for technical support and deployment teams.

### Local Data Locations

The application stores user-side data under the app data area, including:

- `%APPDATA%\Kurash Scoreboard\logs`
- `%APPDATA%\Kurash Scoreboard\runtime`

### Runtime Characteristics

The packaged app starts a local service environment before opening the controller. This includes the web application runtime, database runtime, and realtime service used by the controller package.

### Why This Matters

If the controller window fails before the live UI opens, the issue may not be in the ring workflow itself. It may be in the packaged local runtime startup process.

---

## 26. Best Practices Summary

- configure displays before the audience arrives
- save a normal layout profile and an emergency recovery profile
- pair early and verify assignment before the first bout
- use manual setup only when the ring truly needs a local recovery path
- verify the active bout details before starting the timer
- if the host drops, preserve the bout and let the app queue results locally when supported
- collect logs before restarting repeatedly if startup or runtime errors appear

---

## 27. Documentation Handoff Note

This file is intended to serve as a production-ready content source for a documentation agent. When converting it into final polished documentation, preserve the following themes:

- operational clarity over technical jargon
- explicit recovery actions, not generic troubleshooting advice
- distinction between normal Admin-connected use and fallback/manual recovery use
- emphasis on continuity of competition and preservation of match integrity
