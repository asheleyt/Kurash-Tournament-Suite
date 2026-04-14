# Medic Status Indicator & Reset Label Spec

## Why
The user requested two specific improvements:
1.  **Medic Overlay Enhancement**: The medic popup on the Scoreboard should display the active 1-minute countdown timer so the audience can see how much time is remaining for the medical intervention.
2.  **Reset Button Rename**: The "Reset Score" button on the Referee Controller should be renamed to "Reset All" to better reflect its functionality (resetting scores, penalties, and timers).

## What Changes
-   **kurashScoreBoard.vue**:
    -   Update the Medic Overlay (div with `v-if="isMedicMode"`).
    -   Add a timer display inside this overlay.
    -   Bind the timer display to `medicalTime` (ensure `medicalTime` is being updated/broadcasted or use the main `time` variable if the medic timer reuses it). *Correction*: The referee controller uses `gameState.time` for the medic countdown (sets it to 60). The scoreboard receives this in the `time` ref via `kurash.timer` channel. So we can just display `formatTime(time)` inside the overlay.
-   **refereeController.vue**:
    -   Locate the "Reset Score" button in the template.
    -   Change the button label text from "Reset Score" to "Reset All".

## Impact
-   **Scoreboard**: Audience sees the countdown during medic breaks.
-   **Referee Controller**: Button label is more accurate.

## MODIFIED Requirements
### Requirement: Medic Overlay
-   **Content**: SHALL display the current countdown timer value formatted as MM:SS.
-   **Visibility**: SHALL be visible whenever the Medic Overlay is active.

### Requirement: Reset Button
-   **Label**: SHALL be "Reset All".
