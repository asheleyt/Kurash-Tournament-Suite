# Tasks

- [x] Task 1: Implement Auto-Scroll for Settings
  - [x] SubTask 1.1: Add a `watch` on `isSettingsOpen` in `refereeController.vue`.
  - [x] SubTask 1.2: If `newValue` is `true`, find the root container (or window) and scroll to top: `rootRef.value.scrollTop = 0` or `window.scrollTo`. Note: The root div has `overflow-y-auto`, so we must scroll *that specific element*, not the window.
  - [x] SubTask 1.3: Add a `ref="rootContainer"` to the main wrapper div to target it.

- [x] Task 2: Update Save Button Label
  - [x] SubTask 2.1: Locate the "ENTER" button in `refereeController.vue` (around line 165).
  - [x] SubTask 2.2: Change the text `<span>ENTER</span>` to `<span>Save Input</span>`.
  - [x] SubTask 2.3: Remove or update the sub-label `(Broadcast Changes)` if it feels redundant, or keep it if it adds context. *User said "change ... label to 'Save Input'" implying replacement.* I will replace the main text and remove the sub-text for cleaner UI.

# Task Dependencies
- Tasks are independent.
