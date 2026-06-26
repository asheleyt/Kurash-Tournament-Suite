# Medic Red Logic & Default Time 00:00 Spec

## Why
The user reported two issues:
1.  The default time on the Scoreboard is still "05:00" (300 seconds), even though the Referee Controller was updated. It should be "00:00".
2.  The Medic Indicator logic needs further refinement. Specifically:
    -   When the medic button is clicked (active), the indicator beside it in the Referee Controller should turn **RED** (not player color).
    -   The Scoreboard's medic indicator should mirror this behavior (turn RED when active).
    -   (Implied) The "pulsing" player color logic I added previously should be replaced with Red for the active state to match the user's explicit request.

## What Changes
-   **kurashScoreBoard.vue**:
    -   Initialize `time` ref to `0` (was 300).
    -   Update Medic Indicator logic to ensure it turns **RED** when active, mirroring the requested Referee behavior.
-   **refereeController.vue**:
    -   Update Medic Indicator logic:
        -   When `isMedicMode` is true for a player, the indicator should be **RED** (and likely pulsing or distinct).
        -   The previous logic used Player Color for active and Red for done. I will swap or unify this based on the request "If clicked... will turn red".

## Impact
-   **Scoreboard**: Starts at 00:00. Medic indicators turn Red when active.
-   **Referee Controller**: Medic indicators turn Red when active.

## MODIFIED Requirements
### Requirement: Default Timer
-   **Initial State**: `time` ref in Scoreboard SHALL be `0`.

### Requirement: Medic Indicator Color
-   **Active State**: When medic timer is running for a player, the indicator (on both Referee and Scoreboard) SHALL be **RED**.
-   **Consistency**: Both views must match.
