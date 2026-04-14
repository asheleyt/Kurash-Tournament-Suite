# Tasks

- [x] Task 1: Refactor `useKeyboardShortcuts.ts` for dynamic keymapping
    - [x] Define `ActionId` types and `KeyChord` interfaces
    - [x] Create `defaultKeymap` object matching current hardcoded values
    - [x] Implement `loadKeymap` logic (localStorage + merge defaults)
    - [x] Update `handleKeydown` to lookup actions from the loaded keymap
    - [x] Export keymap state and update methods for the UI to use

- [x] Task 2: Create Keyboard Settings UI
    - [x] Create `KeyboardSettings.vue` component
    - [x] Layout the actions in logical groups (Global, Player 1, Player 2)
    - [x] Implement "Record Key" functionality (capture next keypress)
    - [x] Add visual feedback for conflicts (e.g., "This key is already used by X")
    - [x] Add "Restore Defaults" button

- [x] Task 3: Integrate Settings UI into Referee Controller
    - [x] Add "Keyboard" tab/button to the existing Settings modal in `refereeController.vue`
    - [x] Embed `KeyboardSettings.vue`
    - [x] Ensure shortcuts are disabled while recording a new key

- [x] Task 4: Validation & Polish
    - [x] Verify all default keys still work exactly as before
    - [x] Test persistence (reload page -> custom keys still work)
    - [x] Test "Restore Defaults"
    - [x] Ensure special keys (Shift, Ctrl) are handled correctly in the UI display
