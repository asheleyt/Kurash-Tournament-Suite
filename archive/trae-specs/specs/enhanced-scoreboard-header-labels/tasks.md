# Tasks

- [x] Task 1: Update Default State
  - [x] SubTask 1.1: Modify `kurashScoreBoard.vue` script to initialize `gender` ref to `'N/A'`.
  - [x] SubTask 1.2: Ensure `refereeController.vue` broadcast doesn't immediately overwrite it with "Male" on connect unless explicitly set (verify broadcast logic). *Self-correction: If referee defaults to Male, it might overwrite. We might need to map "Male" to "N/A" only if it's the specific initial state, or just change the display logic.* -> *Decision: Change the display logic or the referee default. Easier to change the display logic in scoreboard to show "N/A" if the value is empty or specific default.*

- [x] Task 2: Add Labels to Boxes
  - [x] SubTask 2.1: Update the Gender Box HTML in `kurashScoreBoard.vue` to include a `<span class="text-sm ...">GENDER</span>` block above the value.
  - [x] SubTask 2.2: Update the Weight Box HTML in `kurashScoreBoard.vue` to include a `<span class="text-sm ...">WEIGHT DIVISION</span>` block above the value.
  - [x] SubTask 2.3: Change the box layout to `flex-col` to stack the label and value.

# Task Dependencies
- Tasks are independent.
