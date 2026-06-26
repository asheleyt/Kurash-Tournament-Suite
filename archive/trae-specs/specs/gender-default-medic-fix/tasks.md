# Tasks

- [x] Task 1: Update Referee Controller Gender & Medic Logic
  - [x] Update `GameState` interface to allow empty string for `gender`.
  - [x] Set default `gender` to `''`.
  - [x] Update `broadcastMedicState` function to include `timerPlayer` in the body.
- [x] Task 2: Update Scoreboard Medic Listener
  - [x] Modify `kurashScoreBoard.vue` listener for `.medic.toggled` to extract `timerPlayer` and update the local ref.
