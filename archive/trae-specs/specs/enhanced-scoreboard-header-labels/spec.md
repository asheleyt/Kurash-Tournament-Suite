# Enhanced Scoreboard Header Labels Spec

## Why
The user wants to refine the Scoreboard Header to make the labels more informative and appropriately formatted:
1.  **Labeling**: Add "Gender" and "Weight Division" labels above their respective values to clarify what the boxes represent.
2.  **Formatting**: Change the default/displayed "MALE" text to "N/A" (or a neutral default) when no specific gender is selected or to match the user's preference for a cleaner initial state.
3.  **Layout**: Ensure these new labels are positioned correctly within the existing layout (above the value inside the box).

## What Changes
- **Scoreboard Header**:
    - Update the **Gender Box** (Left of Timer):
        - Add a small label "GENDER" above the value.
        - Change default value display logic if needed (though the user specifically asked "make the 'MALE' to 'N/A'").
    - Update the **Weight Box** (Right of Timer):
        - Add a small label "WEIGHT DIVISION" above the value.
    - **Default State**:
        - Initialize `gender` state to "N/A" instead of "Male" or ensure the display logic converts "Male" to "N/A" if it's the initial default, or simply change the hardcoded default in the script.

## Impact
- **Affected code**:
    - `resources/js/Pages/kurashScoreBoard.vue`

## MODIFIED Requirements

### Requirement: Header Labels
- **Gender Box**: SHALL display a "GENDER" label (small, uppercase, gray/muted) above the main value.
- **Weight Box**: SHALL display a "WEIGHT DIVISION" label (small, uppercase, gray/muted) above the main value.

### Requirement: Default Values
- **Gender Default**: The displayed gender SHALL be "N/A" by default (instead of "MALE") until updated by the referee.

