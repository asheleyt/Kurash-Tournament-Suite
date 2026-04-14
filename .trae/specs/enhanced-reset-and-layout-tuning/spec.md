# Enhanced Reset and Layout Tuning Spec

## Why

The user requested two specific improvements:

1.  **"Reset All" Functionality**: The "Reset All" button in the Referee Controller currently only resets scores. The user wants it to reset the entire application state (both Referee Controller and Scoreboard) to the default "fresh" state (00:00 time, no gender, no scores, no penalties, no winner, etc.).
2.  **Timer Latency**: The user reports a "huge delay" in the timer synchronization. This is likely due to the current implementation relying solely on manual `setInterval` loops on both sides that drift apart, or network latency in the toggle events. We need to optimize this to ensure <1s perceived latency.

## What Changes

- **refereeController.vue**:
    - Update `handleResetScore` to `handleResetAll`.
    - In `handleResetAll`:
        - Reset `time` to `0`.
        - Reset `gender` to `''`.
        - Reset `winner`, `isMedicMode`, `isBreakMode`, `isJazo` to default/false.
        - Reset both players to `initialPlayerScore`.
        - Broadcast ALL state changes (Timer, Score, Break, Medic, Jazo, PlayerInfo, Winner).
    - **Timer Optimization**:
        - In `startInterval` (inside `watchEffect`), we currently only update local state.
        - We will NOT broadcast every second (to avoid rate limits), but we can implement a "sync" heartbeat or ensure the initial start event carries a timestamp.
        - _Actually_, the user says "delay is too huge". The best fix for _start/stop_ latency is to broadcast the _timestamp_ of the action so the client can calculate the offset. However, for a simple <1s requirement, ensuring the `broadcastTimerState` is fired _immediately_ and the client processes it _immediately_ is key.
        - Current `broadcastTimerState` sends `time` and `isRunning`.
        - We will add a `timestamp` field to `broadcastTimerState`.

- **kurashScoreBoard.vue**:
    - Update `kurash.timer` listener.
    - When `isRunning` becomes true, synchronize the local `time` with the received `time`.
    - _Crucially_: If the received event has a timestamp, we could adjust, but for now, simply trusting the received `time` and starting the local interval immediately is usually enough.
    - The "huge delay" might be due to the `setInterval` logic. If `time` is updated but the interval waits 1s to tick, it looks like a lag.
    - We will ensure that when `timer.toggled` event arrives with `isRunning: true`, we restart the interval immediately to minimize visual lag.

## Impact

- **Reset All**: Will now completely wipe the match state, preventing leftover data (like time or gender) from confusing the next match.
- **Timer**: Should feel more responsive.

## MODIFIED Requirements

### Requirement: Reset All

- **Scope**: SHALL reset Time, Gender, Scores, Penalties, Winner, Medic Status, Break Status, Jazo Status.
- **Broadcast**: SHALL trigger updates for all these states to the Scoreboard.

### Requirement: Timer Synchronization

- **Latency**: The Scoreboard timer SHALL start/stop within 1 second of the Referee Controller.
- **Mechanism**: The Scoreboard SHALL re-synchronize its `time` value whenever a timer toggle event is received.
