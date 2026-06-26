# Weight Validation and Scoreboard UI Spec

## Why
The user requested two specific refinements to improve data integrity and visual consistency:
1.  **Data Integrity**: Users can currently enter invalid data (non-numeric) into the weight fields in `refereeController.vue`, which breaks the auto-calculation logic. A warning is needed.
2.  **Visual Consistency**: The user explicitly requested **NOT** to apply the "opacity-40" disabled style to the penalty buttons on the `kurashScoreBoard.vue`, likely because the scoreboard should remain fully legible to the audience even if a button is logically disabled for the referee.

## What Changes
- **Referee Controller (`refereeController.vue`)**:
    - Add validation logic to the weight input fields.
    - If the input is not a valid number (e.g., contains letters), show a warning message or red border/text.
- **Scoreboard (`kurashScoreBoard.vue`)**:
    - **Revert/Ensure** that the penalty buttons (G, D, T) **DO NOT** have the `opacity-40` class or similar "disabled" visual diminishment, even if they are logically disabled in the state. They should remain fully visible.

## Impact
- **Affected files**:
    - `resources/js/Pages/refereeController.vue`
    - `resources/js/Pages/kurashScoreBoard.vue`
- **User Experience**:
    - **Referee**: Immediate feedback on invalid weight input.
    - **Audience**: Clear visibility of all scoreboard elements without confusing "disabled" states.

## ADDED Requirements
### Requirement: Weight Input Validation
The system SHALL validate the weight input field.
- **IF** the input is not numeric, the system SHALL display a visual warning (e.g., red border/text "Invalid number").

### Requirement: Scoreboard Visibility
The penalty buttons on the `kurashScoreBoard` SHALL maintain full opacity (100% visibility) regardless of their enabled/disabled state in the game logic.

## MODIFIED Requirements
### Requirement: Penalty Button Styling
**Referee Controller**: Disabled buttons use `opacity-40`.
**Scoreboard**: Disabled buttons use standard opacity (no visual dimming).
