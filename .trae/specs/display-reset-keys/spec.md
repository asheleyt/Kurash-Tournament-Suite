# Display Reset Keys Spec

## Why
The user requested visual feedback for the "Reset Timer" and "Reset Match" keyboard shortcuts, similar to the other controls, to make them easier to learn and use.

## What Changes
- Update "Reset Timer" button to display `[Shift+R]`.
- Update "Reset All" button to display `[Shift+Esc]`.

## Impact
- **Affected specs**: `add-keybindings` (follow-up).
- **Affected code**: `resources/js/Pages/refereeController.vue`.

## ADDED Requirements
### Requirement: Visual Labels
- The "Reset Timer" button SHALL display a small `[Shift+R]` label.
- The "Reset All" button SHALL display a small `[Shift+Esc]` label.
