# Tasks

- [x] Task 1: Implement Comprehensive Reset in Referee Controller
    - [x] Rename `handleResetScore` to `handleResetAll` in `refereeController.vue` (update template usage too).
    - [x] In `handleResetAll`, add logic to:
        - [x] Reset `time` to 0.
        - [x] Reset `gender` to ''.
        - [x] Reset `winner` to null.
        - [x] Reset `isMedicMode`, `isBreakMode`, `isJazo` to false.
        - [x] Reset `timerPlayer` to null.
        - [x] Call all broadcast functions: `broadcastTimerState`, `broadcastBreakState`, `broadcastMedicState`, `broadcastJazoState`, `broadcastWinnerState`.

- [x] Task 2: Optimize Timer Synchronization in Scoreboard
    - [x] Modify `kurashScoreBoard.vue`:
        - [x] In the `kurash.timer` listener:
            - [x] When `e.isRunning` is true, immediately clear any existing interval and `startInterval()` to sync the tick phase.
            - [x] Ensure `time.value` is updated _before_ starting the interval.
