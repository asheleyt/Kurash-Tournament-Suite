# Tasks

- [x] Task 1: Initialize Time to 0
  - [x] Update `gameState.time` initialization to `0`.
  - [x] Ensure `handleResetTime` sets time to 0 if no gender is selected (or just defaults to 0).

- [x] Task 2: Implement Medic Undo/Toggle
  - [x] Modify `handlePlayerMedic` to check if `isMedicMode` is true and `timerPlayer` matches.
  - [x] If matching, call `handleMedicEnd` to stop/undo.
  - [x] Add `await broadcastScoreState()` to `handlePlayerMedic` to fix the scoreboard update issue.

- [x] Task 3: Update Referee Medic Indicators
  - [x] Update the class binding for P1 (Green) and P2 (Blue) indicators in `refereeController.vue`.
  - [x] Logic: Use Red only if `!isMedicMode` (or different player active). Use Player Color if `isMedicMode` is active for that player.
