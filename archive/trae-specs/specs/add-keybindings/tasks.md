# Tasks

- [x] Task 1: Create Keybinding Logic
  - [x] Implement a `useKeyboardShortcuts` composable to handle global keydown events.
  - [x] Add `refereeController.vue` listener for `window.addEventListener('keydown')`.
  - [x] Ensure shortcuts are disabled when `isSettingsOpen` is true or when an input is focused.

- [x] Task 2: Implement Global Shortcuts
  - [x] `Space`: Start/Pause Timer.
  - [x] `Backspace`: Undo.
  - [x] `B`: Break Mode.
  - [x] `J`: Jazo Mode.
  - [x] `Shift + R`: Reset Timer.
  - [x] `Shift + Esc`: Reset Match.

- [x] Task 3: Implement Player Scoring Shortcuts
  - [x] Left Player: `1` (H), `2` (YO), `3` (CH).
  - [x] Right Player: `0` (H), `9` (YO), `8` (CH).

- [x] Task 4: Implement Player Penalty Shortcuts
  - [x] Left Player: `Q` (G), `W` (D), `E` (T).
  - [x] Right Player: `P` (G), `O` (D), `I` (T).

- [x] Task 5: Implement Medic & Winner Shortcuts
  - [x] Left Player: `A` (Medic), `Z` (Winner).
  - [x] Right Player: `L` (Medic), `M` (Winner).

- [x] Task 6: Add Visual Feedback (Optional)
  - [x] Add tooltips or small labels to buttons showing their hotkey (e.g., "[1]", "[Space]").
