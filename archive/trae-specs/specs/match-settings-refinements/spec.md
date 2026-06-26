# Match Settings Refinement Spec

## Why
The user has requested further UI and validation refinements for the "Match Settings" and "Confirmation Modal" in `refereeController.vue`. Specifically:
1.  **Swap Player Sides**: "Player Right" should be on the Left, and "Player Left" on the Right (in the Settings panel) to match the physical layout or user preference.
2.  **Flag Display**: The Confirmation Modal needs to show the actual flag images, not just country codes.
3.  **Strict Name Validation**: The name input needs stricter validation to reject numbers and special characters, preventing invalid names.

## What Changes
- **Referee Controller (`refereeController.vue`)**:
    - **Swap UI**: In the `<template>`, swap the position of the "Player Right" and "Player Left" settings blocks.
        - **Note**: The underlying data (`player1`, `player2`) remains the same; only the visual order in the "Settings Panel" changes.
    - **Update Modal**:
        - Add `<img>` tags to the Confirmation Modal to display the selected flags for Player 1 and Player 2.
    - **Enhance Validation**:
        - Update `isValidName` to use a regex that allows only letters, spaces, and basic punctuation (like hyphens/apostrophes for names).
        - Reject strings containing numbers or special symbols (like `@`, `#`, `$`, etc.).
        - Update the error message to be specific (e.g., "Name cannot contain numbers or special characters").

## Impact
- **Affected files**: `resources/js/Pages/refereeController.vue`
- **User Experience**:
    - **Visual**: Settings panel matches expected physical layout.
    - **Confirmation**: Flags provide better visual verification.
    - **Data Integrity**: Names are strictly validated to be "real" names.

## ADDED Requirements
### Requirement: UI Layout Swap
The "Settings Panel" SHALL display "Player Right" (Cyan) on the **Left** side and "Player Left" (Green) on the **Right** side of the flex container.

### Requirement: Modal Flags
The Confirmation Modal SHALL display the flag image corresponding to the selected country code for both players.

### Requirement: Strict Name Validation
The system SHALL reject player names that contain:
- Numbers (0-9)
- Special characters (except standard name punctuation like `-`, `'`, `.`)
**IF** invalid, the system SHALL display a specific error message.

## MODIFIED Requirements
### Requirement: Name Validation
Old: Checks for empty string.
New: Checks for empty string AND regex pattern match `^[a-zA-Z\s\-\'\.]+$`.
