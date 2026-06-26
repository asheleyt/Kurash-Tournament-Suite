# Tasks

- [x] Task 1: Fix Default Time in Scoreboard
  - [x] Update `kurashScoreBoard.vue`: Initialize `time` ref to `0`.

- [x] Task 2: Update Referee Medic Indicator Logic
  - [x] Update `refereeController.vue`: Change class binding for Medic Indicators.
  - [x] Logic: If `isMedicMode` AND `timerPlayer` matches player -> **RED** (e.g., `bg-red-500 animate-pulse`).
  - [x] Logic: If `!isMedicMode` AND `medicClicks >= N` -> **RED** (Solid/Border).

- [x] Task 3: Update Scoreboard Medic Indicator Logic
  - [x] Update `kurashScoreBoard.vue`: Ensure class binding matches the new "Red when active" requirement.
  - [x] Verify `timerPlayer` synchronization is already handled (it was fixed in previous task, but visual logic needs to align).
