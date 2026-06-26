# Gender Default & Medic Indicator Fix Spec

## Why
The user requested that the gender selection in the Referee Controller not default to "Male", ensuring "N/A" is displayed on the scoreboard until a choice is explicitly made and saved. Additionally, the medic indicators on the scoreboard are not turning red because the player identity (`timerPlayer`) is likely not synchronizing correctly during the medic toggle event.

## What Changes
- **refereeController.vue**:
  - Update `GameState` interface to allow `gender` to be an empty string (`''`).
  - Initialize `gameState.gender` to `''` (instead of `'male'`).
  - Update `broadcastMedicState` payload to include `timerPlayer`.
- **kurashScoreBoard.vue**:
  - Update `kurash.medic` listener to accept and set `timerPlayer` from the payload.
  - Ensure the Gender display logic handles the empty string (defaults to "N/A").

## Impact
- **Referee Controller**: On load, no gender is selected. User must select one.
- **Scoreboard**: 
  - Gender shows "N/A" initially.
  - Medic boxes will now reliably turn red when a specific player's medic timer is activated.

## MODIFIED Requirements
### Requirement: Gender Selection
- **Default State**: `gameState.gender` SHALL be empty string `''`.
- **Scoreboard Display**: When gender is empty, Scoreboard SHALL display "N/A".

### Requirement: Medic Indicator Sync
- **Payload**: The `medic-toggle` broadcast SHALL include `timerPlayer`.
- **Synchronization**: Scoreboard SHALL update its local `timerPlayer` state when receiving the `medic-toggle` event.
