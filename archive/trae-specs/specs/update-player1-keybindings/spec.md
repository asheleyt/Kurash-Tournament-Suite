# Update Player 1 Keybindings Spec

## Why
The current keybindings for Player 1 (Green/Left) are counter-intuitive. The user has requested to map the scoring and penalty buttons to standard keyboard keys (I, O, P and 8, 9, 0) that better align with the physical layout or user preference.

## What Changes
- Update `useKeyboardShortcuts.ts` to map Player 1 actions to the new keys.
- Update `refereeController.vue` to display the correct hotkeys on the buttons.

## Impact
- **Affected Specs**: `referee-controller`
- **Affected Code**: `resources/js/composables/useKeyboardShortcuts.ts`, `resources/js/pages/refereeController.vue`

## MODIFIED Requirements
### Requirement: Player 1 Keybindings
The system SHALL use the following keybindings for Player 1 (Left/Green):

| Action | Old Key | New Key |
| :--- | :--- | :--- |
| Penalty G | P | I |
| Penalty D | O | O |
| Penalty T | I | P |
| Score H | 0 | 8 |
| Score YO | 9 | 9 |
| Score CH | 8 | 0 |

**Note**: The mapping for D (O) and YO (9) remains the same, but the order of G/T and H/CH is swapped/shifted.

#### Scenario: Pressing 'I'
- **WHEN** user presses 'I'
- **THEN** Player 1 Penalty G is toggled (was T)

#### Scenario: Pressing 'P'
- **WHEN** user presses 'P'
- **THEN** Player 1 Penalty T is toggled (was G)

#### Scenario: Pressing '8'
- **WHEN** user presses '8'
- **THEN** Player 1 Score H is incremented (was CH)

#### Scenario: Pressing '0'
- **WHEN** user presses '0'
- **THEN** Player 1 Score CH is incremented (was H)
