# Disabled Cursor Fix Spec

## Why
The user reported that when the "D" penalty button is disabled (cannot be clicked), the cursor does not indicate this state appropriately. Currently, it might be showing the default pointer or `cursor-not-allowed` but with `pointer-events-none`, which prevents the cursor style from showing on hover.

## What Changes
- Modify `PenaltyButton.vue` to remove `pointer-events-none` from the disabled state class list.
- Ensure `cursor-not-allowed` is applied when the button is disabled.
- Verify that the `disabled` attribute on the button element prevents click events, so `pointer-events-none` is not strictly necessary for functionality but was preventing the cursor style.

## Impact
- **Affected Specs**: None directly.
- **Affected Code**: `resources/js/components/Referee/PenaltyButton.vue`.

## ADDED Requirements
### Requirement: Disabled Cursor Feedback
The system SHALL display a "not-allowed" cursor when hovering over a disabled penalty button.

#### Scenario: User hovers over disabled D button
- **WHEN** a user hovers over a "D" button that is currently disabled (e.g., because "T" is not active)
- **THEN** the cursor changes to a "not-allowed" circle-slash icon (standard browser behavior for `cursor: not-allowed`).
- **AND** the button does not respond to clicks.

## MODIFIED Requirements
### Requirement: Button Styling
The `PenaltyButton` component styling will be updated to allow pointer events on disabled buttons solely for the purpose of displaying the correct cursor.

## REMOVED Requirements
None.
