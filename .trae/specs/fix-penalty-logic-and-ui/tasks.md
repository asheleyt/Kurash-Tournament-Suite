# Tasks

- [x] Task 1: Fix Referee Controller Penalty Logic
    - [x] SubTask 1.1: Debug `handlePenaltyClick` in `refereeController.vue`. Ensure it targets the correct player state (`player1` vs `player2`).
    - [x] SubTask 1.2: Verify the `PenaltyButton` component's `active` prop logic to ensure it reflects the specific player's penalty state.
    - [x] SubTask 1.3: Ensure `broadcastScoreState` is called immediately and sends the correct data structure.

- [x] Task 2: Fix Scoreboard Penalty Sync & UI
    - [x] SubTask 2.1: Debug the `Echo` listener in `kurashScoreBoard.vue` to ensure it correctly parses the incoming penalty state for both players.
    - [x] SubTask 2.2: Update the background style of the player rows to match the Timer (`bg-white/10 backdrop-blur-md...`).
    - [x] SubTask 2.3: Adjust the grid layout or main container padding (e.g., `pb-8` or `h-screen` vs `min-h-screen`) to prevent the bottom row from being cut off.

# Task Dependencies

- Task 1 and 2 can be done in parallel but are interrelated for the sync fix.
