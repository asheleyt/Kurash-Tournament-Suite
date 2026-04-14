# Scoreboard Fixes & UI Overhaul Spec

## Why

The user reported bugs in the recently added features: the "Female" gender category isn't updating on the scoreboard, and the "Winner" popups aren't appearing. Additionally, the scoreboard UI needs to be centered and maximized for better audience visibility.

## What Changes

- **Bug Fixes**:
    - Fix Gender category propagation from Referee to Scoreboard.
    - Fix Winner popup event handling on the Scoreboard.
- **UI Overhaul**:
    - Center the Scoreboard content perfectly on the screen.
    - Ensure the layout takes up the full viewport (`100vw`, `100vh`).
    - Adjust spacing to prevent the "skewed left" appearance.

## Impact

- **Affected specs**: Enhanced Game Controls.
- **Affected code**:
    - `resources/js/Pages/refereeController.vue` (Broadcasting logic)
    - `resources/js/Pages/kurashScoreBoard.vue` (Listening logic & CSS)

## MODIFIED Requirements

### Requirement: Player Info Display

- **Fix**: The "Gender" field on the scoreboard SHALL correctly update to "Female" when selected in the Referee Controller.

### Requirement: Winner Announcement

- **Fix**: Clicking the "Winner" button on the Referee Controller SHALL successfully trigger the Winner Popup on the Scoreboard.

### Requirement: Scoreboard Layout

- **UI Change**: The Scoreboard interface SHALL be fully centered horizontally and vertically.
- **UI Change**: The layout SHALL utilize the entire screen space effectively.
