# Customizable Keybinds Spec

## Why
Users have requested the ability to customize keyboard shortcuts for the referee controller. This improves accessibility, accommodates different keyboard layouts, and allows referees to set up controls that feel most intuitive to them.

## What Changes
- **Refactor `useKeyboardShortcuts.ts`**: Replace hardcoded key checks with a dynamic lookup system based on action IDs.
- **Keymap Storage**: Implement persistence using `localStorage` so custom bindings survive page reloads.
- **Settings UI**: Add a new "Keyboard" tab/section in the Referee Settings modal to view and edit bindings.
- **Default Preservation**: The existing hardcoded keybindings will serve as the immutable default set that is loaded if no custom bindings exist (or upon "Restore Defaults").

## Impact
- **Affected Specs**: None directly, but touches core referee interaction logic.
- **Affected Code**:
    - `resources/js/composables/useKeyboardShortcuts.ts`: Major refactor.
    - `resources/js/pages/refereeController.vue`: Update to pass keymap or handle settings UI.
    - New Component: `resources/js/components/Referee/KeyboardSettings.vue` (or similar).

## ADDED Requirements
### Requirement: Dynamic Key Mapping
The system SHALL look up the action associated with a pressed key at runtime using a configurable keymap.

#### Scenario: User presses a custom key
- **WHEN** the user presses a key that has been remapped (e.g., 'T' for Timer Toggle instead of Space)
- **THEN** the system should execute the corresponding action (Toggle Timer)
- **AND** the default key (Space) should no longer trigger the action if it was replaced.

### Requirement: Settings Interface
The system SHALL provide a UI for users to view current bindings and record new ones.

#### Scenario: Changing a binding
- **WHEN** the user opens Settings > Keyboard and clicks "Edit" on an action
- **AND** presses a new key combination
- **THEN** the new key is assigned to that action
- **AND** the change is saved immediately or upon "Save".

### Requirement: Conflict Management
The system SHALL prevent or warn about assigning a key that is already in use.

#### Scenario: Duplicate Key
- **WHEN** the user tries to assign 'Space' to "Score H" (when it's already "Toggle Timer")
- **THEN** the system should warn the user or automatically unbind the previous action.

## MODIFIED Requirements
### Requirement: `useKeyboardShortcuts` Logic
**Old Behavior**: Hardcoded `if (e.code === 'Space') ...`
**New Behavior**: `const action = keymap.find(k => k.code === e.code); if (action) handlers[action]();`

## REMOVED Requirements
- Hardcoded key dependency in the composable.
