# Reset Buttons Popup Spec

## Why
The current implementation of the "Reset All" and "Reset Timer" buttons uses the native browser `confirm()` dialog, which provides a poor user experience and is inconsistent with the application's UI. The user has requested to replace these with a custom pop-up (modal/dialog) for confirmation.

## What Changes
- Replace native `confirm()` dialogs in `refereeController.vue` with the existing `Dialog` component from `@/components/ui/dialog`.
- Wrap the "Reset Timer" and "Reset All" buttons with `Dialog` and `DialogTrigger`.
- Add `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter` to create the confirmation modal.
- Refactor the existing click handlers (`handleResetTime` and `handleResetAll`) to separate the confirmation logic from the action logic. The action logic will be moved to new methods (e.g., `confirmResetTime`, `confirmResetAll`) called by the "Confirm" button inside the dialog.

## Impact
- **Affected Specs**: None directly, but improves UX consistency.
- **Affected Code**: `resources/js/pages/refereeController.vue`.

## ADDED Requirements
### Requirement: Reset Timer Confirmation Dialog
The system SHALL display a custom confirmation dialog when the "Reset Timer" button is clicked.

#### Scenario: User confirms reset timer
- **WHEN** user clicks "Reset Timer"
- **THEN** a dialog appears asking "Reset the timer to default?"
- **WHEN** user clicks "Confirm" in the dialog
- **THEN** the timer is reset to the default value based on gender.
- **AND** the dialog closes.

#### Scenario: User cancels reset timer
- **WHEN** user clicks "Reset Timer"
- **THEN** a dialog appears asking "Reset the timer to default?"
- **WHEN** user clicks "Cancel" or closes the dialog
- **THEN** no action is taken.
- **AND** the dialog closes.

### Requirement: Reset All Confirmation Dialog
The system SHALL display a custom confirmation dialog when the "Reset All" button is clicked.

#### Scenario: User confirms reset all
- **WHEN** user clicks "Reset All"
- **THEN** a dialog appears asking "Are you sure you want to reset the ENTIRE match? This cannot be undone."
- **WHEN** user clicks "Confirm" in the dialog
- **THEN** the entire match state is reset (scores, penalties, winner, etc.).
- **AND** the dialog closes.

#### Scenario: User cancels reset all
- **WHEN** user clicks "Reset All"
- **THEN** a dialog appears asking "Are you sure you want to reset the ENTIRE match? This cannot be undone."
- **WHEN** user clicks "Cancel" or closes the dialog
- **THEN** no action is taken.
- **AND** the dialog closes.

## MODIFIED Requirements
### Requirement: Existing Reset Logic
The existing reset logic will remain unchanged but will be triggered by the confirmation dialog instead of directly by the button click (after native confirm).

## REMOVED Requirements
### Requirement: Native Confirm Dialog
**Reason**: Replaced by custom UI component for better UX.
**Migration**: Remove `window.confirm()` calls.
