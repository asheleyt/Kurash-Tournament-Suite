# Referee Controller Default Values Spec

## Why
The user wants to ensure that the Referee Controller starts in a "neutral" state, requiring explicit action from the referee to set the match parameters. Specifically:
1.  The timer should default to `00:00` (already partially done, but needs verification/cleanup).
2.  The Gender selection in "Match Settings" should default to **nothing selected** (currently defaults to 'male').
3.  The Gender toggle buttons in the "Timer Controls" panel should also reflect this "unselected" state initially.

## What Changes
-   **refereeController.vue**:
    -   Update `gameState` initialization: `gender` should be `''` (empty string).
    -   Update `Match Settings` radio buttons: Ensure they bind to `gameState.gender` and neither is checked if the value is empty.
    -   Update `Timer Controls`: Ensure the "Male" and "Female" buttons appear inactive (gray) when `gameState.gender` is empty.
    -   Update `handleResetTime`: Ensure it respects the empty gender state (sets time to 0).

## Impact
-   **Referee Controller**: On load, no gender is selected, time is 00:00. The referee must explicitly click "Male" or "Female" in either the Settings or Controls to set the time (4:00 or 3:00).
-   **Scoreboard**: Will display "N/A" for Gender until set.

## MODIFIED Requirements
### Requirement: Gender Initialization
-   **Initial State**: `gameState.gender` SHALL be `''`.
-   **UI State**: Both "Male" and "Female" radio buttons/buttons SHALL be unchecked/inactive initially.

### Requirement: Timer Initialization
-   **Initial State**: `gameState.time` SHALL be `0`.
