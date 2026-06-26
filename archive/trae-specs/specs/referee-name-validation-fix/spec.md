# Referee Name Validation UX Spec

## Why
Currently, the player name input fields show a red "Invalid" border and error message immediately upon page load because the validation logic considers an empty string as invalid. The user finds this prematurely alarming ("Don't show ... yet").

## What Changes
- Update the `class` binding for player name inputs in `refereeController.vue` to only show the red error state if the input is **non-empty** and invalid.
- Update the error message `<span>` to only appear if the input is **non-empty** and invalid.
- Ensure strict validation (required + regex) is still enforced when the "Update Match" button is clicked.

## Impact
- **Affected file**: `resources/js/Pages/refereeController.vue`
- **User Experience**: The form will look clean (gray borders) initially. Red warnings will only appear if the user types invalid characters (numbers/symbols).
- **Logic**: `handleUpdateMatchClick` will continue to block empty submissions, but the visual cue for "empty" won't be a red border *before* interaction.

## ADDED Requirements
### Requirement: Conditional Visual Validation
The system SHALL NOT display validation errors (red border or error text) for the Player Name field when the field is empty.
- **WHEN** the page loads (name is empty), **THEN** the input border should be gray.
- **WHEN** the user types an invalid character (e.g., "Player1"), **THEN** the input border should turn red and show the error message.
- **WHEN** the user types a valid name (e.g., "Player One"), **THEN** the input border should be green/gray.
