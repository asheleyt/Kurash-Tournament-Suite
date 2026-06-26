# Fix Broadcast Data Loss Spec

## Why
The user reported that the medic indicator on the scoreboard is not updating.
Investigation revealed that the backend `BroadcastController` and Event classes are stripping out critical data fields sent by the frontend:
1.  `scoreUpdate` strips `medic` count.
2.  `timerToggle` strips `timerPlayer` and `activeTimer`.
3.  `medicToggle` strips `timerPlayer`.

This causes the scoreboard to receive incomplete data, leading to the synchronization issues.

## What Changes
-   **app/Http/Controllers/BroadcastController.php**:
    -   Update validation rules to include the missing fields.
    -   Pass these fields to the Event constructors.
-   **app/Events/ScoreUpdated.php**:
    -   No change needed (it accepts array, so if array has `medic`, it passes through).
-   **app/Events/TimerToggled.php**:
    -   Add `$activeTimer` and `$timerPlayer` properties and constructor arguments.
-   **app/Events/MedicToggled.php**:
    -   Add `$timerPlayer` property and constructor argument.

## Impact
-   **Scoreboard**: Will now receive `medic` counts, `timerPlayer`, and `activeTimer` correctly.
-   **Medic Indicators**: Will update correctly (Red/Pulsing) because the data triggering the state change will finally arrive.

## MODIFIED Requirements
### Requirement: Score Broadcast
-   **Data**: SHALL include `player1.medic` and `player2.medic`.

### Requirement: Timer Broadcast
-   **Data**: SHALL include `activeTimer` and `timerPlayer`.

### Requirement: Medic Broadcast
-   **Data**: SHALL include `timerPlayer`.
