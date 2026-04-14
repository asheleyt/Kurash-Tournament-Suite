# Match Settings Validation and Confirmation Spec

## Why
The user identified two critical areas for improvement in the Match Settings panel to prevent user errors:
1.  **Input Validation**: Player names currently have no validation, which could lead to empty or invalid names being displayed.
2.  **Update Confirmation**: Clicking "Update Match" immediately applies changes. A confirmation step summarizing the data to be applied is needed to ensure the referee reviews the data before broadcasting it to the scoreboard.

## What Changes
- **Referee Controller (`refereeController.vue`)**:
    - **Name Validation**:
        - Add logic to check if player names are empty.
        - Add visual feedback (red border/error text) similar to the weight validation.
    - **Confirmation Modal**:
        - Create a custom modal (using a `v-if` state) that appears when "Update Match" is clicked.
        - The modal SHALL display a summary of:
            - Player 1 Name, Country, Weight
            - Player 2 Name, Country, Weight
            - Selected Gender
            - Calculated Category
        - The modal SHALL have "Cancel" and "Confirm Update" buttons.
        - The actual update logic (`applyMatchSettings`) will only run upon clicking "Confirm Update".

## Impact
- **Affected files**: `resources/js/Pages/refereeController.vue`
- **User Experience**:
    - Reduced risk of bad data (empty names).
    - Reduced risk of accidental updates.
    - Increased confidence in the data being broadcast.

## ADDED Requirements
### Requirement: Name Validation
The system SHALL validate Player 1 and Player 2 name fields.
- **IF** a name is empty or whitespace only, show an error state.

### Requirement: Update Confirmation Modal
**WHEN** the user clicks "Update Match", the system SHALL display a modal.
**THEN** the modal SHALL show a summary of all pending match settings.
**AND** the settings SHALL NOT be applied/broadcast until the user confirms within the modal.

## MODIFIED Requirements
### Requirement: Update Logic
The `applyMatchSettings` function will no longer be called directly by the "Update Match" button. It will be moved to the "Confirm" action of the new modal.
