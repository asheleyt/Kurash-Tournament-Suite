# Fix Penalty Logic and Scoreboard UI Spec

## Why

The user reported several issues:

1.  **Scoreboard Layout**: The bottom penalty buttons (G, D, T) are being cut off.
2.  **Scoreboard Styling**: The background of the player rows should match the Timer's background style (glassmorphism) instead of the opaque black.
3.  **Referee Controller Bug**: Clicking a penalty on one player activates the same penalty on the _other_ player (linked state).
4.  **Sync Bug**: Penalty updates on the Referee Controller are not reflecting on the Scoreboard.

## What Changes

- **Layout Fix**: Adjust the Scoreboard padding or grid sizing to ensure the bottom row is fully visible.
- **Styling Fix**: Update the player row background to use the same glassmorphism class as the Timer.
- **Logic Fix**: Debug and decouple the penalty state logic in `refereeController.vue` to ensure Player 1 and Player 2 penalties are independent.
- **Sync Fix**: Ensure the correct penalty state is broadcasted and received by `kurashScoreBoard.vue`.

## Impact

- **Affected code**:
    - `resources/js/Pages/refereeController.vue` (State & Logic)
    - `resources/js/Pages/kurashScoreBoard.vue` (UI & Layout)

## MODIFIED Requirements

### Requirement: Independent Penalties

- **Fix**: Clicking a penalty (G/D/T) for Player 1 SHALL NOT affect Player 2, and vice versa.

### Requirement: Penalty Synchronization

- **Fix**: Penalty changes on the Referee Controller SHALL be instantly reflected on the Scoreboard.

### Requirement: Scoreboard Layout & Style

- **UI Change**: The bottom penalty row SHALL be fully visible without being cut off.
- **UI Change**: The player rows SHALL use the `bg-white/10 backdrop-blur-md` style (same as Timer) instead of `bg-black`.
