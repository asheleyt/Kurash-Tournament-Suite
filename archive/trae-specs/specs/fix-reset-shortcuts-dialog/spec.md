# Fix Reset Shortcuts Dialog Spec

## Why
Currently, the "Reset Timer" (`Shift+R`) and "Reset Match" (`Shift+Esc`) keyboard shortcuts trigger the reset actions immediately, bypassing the confirmation dialogs that appear when clicking the corresponding buttons. This creates a risk of accidental resets during a match. The goal is to make the keyboard shortcuts trigger the same confirmation dialogs as the buttons.

## What Changes
- Refactor `refereeController.vue` to control the open state of the "Reset Timer" and "Reset Match" dialogs using reactive variables (`v-model:open`).
- Update the `useKeyboardShortcuts` usage in `refereeController.vue` to set these reactive variables to `true` when the shortcuts are triggered, instead of calling the reset functions directly.

## Impact
- **Affected Specs**: `referee-controller`
- **Affected Code**: `resources/js/pages/refereeController.vue`

## MODIFIED Requirements
### Requirement: Reset Confirmation
The system SHALL require confirmation for critical reset actions (Timer Reset, Match Reset) regardless of whether the action is triggered via mouse click or keyboard shortcut.

#### Scenario: Reset Timer via Shortcut
- **WHEN** user presses `Shift+R`
- **THEN** the "Reset Timer?" confirmation dialog SHALL appear
- **AND** the timer SHALL NOT reset immediately

#### Scenario: Reset Match via Shortcut
- **WHEN** user presses `Shift+Esc`
- **THEN** the "Reset Match?" confirmation dialog SHALL appear
- **AND** the match SHALL NOT reset immediately
