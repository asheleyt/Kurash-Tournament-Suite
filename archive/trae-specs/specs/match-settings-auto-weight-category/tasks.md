# Tasks

- [x] Task 1: Update GameState and Logic
  - [x] Modify `refereeController.vue`:
    - [x] Add `category` to `GameState` interface and `gameState` object.
    - [x] Implement `calculateWeightCategory(gender, p1Weight, p2Weight)` function.
    - [x] Add `watch` or `handleWeightInput` to update `gameState.category` automatically.
    - [x] Add a new "Match Category" input/display in the Settings panel (read-only or editable).

- [x] Task 2: Update Broadcast and Scoreboard
  - [x] Modify `refereeController.vue` `broadcastPlayerInfo`: Include `category` in the payload.
  - [x] Modify `kurashScoreBoard.vue`:
    - [x] Update `player-info` listener to use `e.category` for the "WEIGHT DIVISION" display.
