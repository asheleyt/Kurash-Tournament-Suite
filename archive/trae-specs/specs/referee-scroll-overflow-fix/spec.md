# Referee Controller Scroll & Overflow Fix Spec

## Why
The user reported that the auto-scroll functionality in the Referee Controller's Match Settings panel does not reach the top of the content (specifically the player name input). This is caused by the `justify-center` Flexbox alignment which, when content overflows, can clip the top portion of the content or prevent scrolling to the absolute top.

## What Changes
- **refereeController.vue**:
  - Update the root container's class logic.
  - Remove `justify-center` from the static class list.
  - Apply `justify-center` ONLY when `!isSettingsOpen`.
  - Apply `justify-start` (or default alignment) when `isSettingsOpen` to ensure the document flow starts from the top, allowing full scrolling.

## Impact
- **Referee Controller**: When Match Settings are open, the layout will align to the top. This ensures that if the content is taller than the screen, the user can scroll to the very top to see the first input field. When settings are closed, the content will remain vertically centered.
