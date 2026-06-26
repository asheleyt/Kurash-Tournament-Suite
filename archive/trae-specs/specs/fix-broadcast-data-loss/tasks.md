# Tasks

- [x] Task 1: Update BroadcastController
  - [x] Modify `app/Http/Controllers/BroadcastController.php`:
    - [x] `timerToggle`: Validate `activeTimer` (nullable string) and `timerPlayer` (nullable string). Pass to event.
    - [x] `scoreUpdate`: Validate `player1.medic` (integer) and `player2.medic` (integer).
    - [x] `medicToggle`: Validate `timerPlayer` (nullable string). Pass to event.

- [x] Task 2: Update TimerToggled Event
  - [x] Modify `app/Events/TimerToggled.php`: Add public properties `$activeTimer`, `$timerPlayer` and update constructor.

- [x] Task 3: Update MedicToggled Event
  - [x] Modify `app/Events/MedicToggled.php`: Add public property `$timerPlayer` and update constructor.
