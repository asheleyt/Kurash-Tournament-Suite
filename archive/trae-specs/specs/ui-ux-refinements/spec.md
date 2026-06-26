# UI/UX Evaluation and Refinement Spec

## Why
An evaluation of the Referee Controller identified potential usability risks and clarity issues. Specifically, the "Reset All" button lacks a confirmation step (risking accidental data loss), and the "Reset" button label is ambiguous. Renaming and adding safeguards will improve the referee's experience and prevent errors during matches.

## What Changes
- **Referee Controller**:
    - **Rename Buttons**:
        - "Reset" (Timer section) -> "Reset Timer"
        - "Save Input" (Settings section) -> "Update Match"
    - **Add Confirmation**:
        - `handleResetAll`: Add a browser confirmation dialog ("Are you sure you want to reset the ENTIRE match? This cannot be undone.").
        - `handleResetTime`: Add a confirmation dialog ("Reset the timer to default?").
    - **Visual Tweaks**:
        - Ensure disabled penalty buttons look distinctly disabled (opacity/cursor).

## Impact
- **Affected files**: `resources/js/Pages/refereeController.vue`
- **User Experience**:
    - Reduced risk of accidental resets.
    - Clearer button functions.

## ADDED Requirements
### Requirement: Destructive Action Safety
The system SHALL require user confirmation before executing "Reset All" or "Reset Timer" actions.

### Requirement: Label Clarity
Buttons SHALL have descriptive labels that clearly indicate their scope (e.g., "Reset Timer" vs "Reset All").

## MODIFIED Requirements
### Requirement: Reset Logic
The reset functions will remain the same but will be wrapped in a confirmation check.
