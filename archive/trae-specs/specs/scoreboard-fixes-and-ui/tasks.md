# Tasks

- [x] Task 1: Fix Gender & Winner Broadcasting
    - [x] SubTask 1.1: Debug `refereeController.vue` to ensure `gender` and `winner` states are correctly sent in their respective broadcast functions.
    - [x] SubTask 1.2: Debug `kurashScoreBoard.vue` listeners (`kurash.player-info`, `kurash.winner`) to ensure they are receiving and reacting to the data.
    - [x] SubTask 1.3: Verify variable names match between frontend-backend-frontend (e.g., `gender` vs `category`, `winner` payload structure).

- [x] Task 2: Scoreboard UI Overhaul
    - [x] SubTask 2.1: Update `kurashScoreBoard.vue` main container to use `min-h-screen`, `w-full`, `flex`, `items-center`, `justify-center`.
    - [x] SubTask 2.2: Refactor the grid/flex layout of the inner content to ensure perfect centering of the Timer, Player Panels, and Footer.
    - [x] SubTask 2.3: Remove any fixed margins or paddings that are causing the left-skew.

# Task Dependencies

- Task 1 and 2 can be done in parallel, but it's better to fix functionality (Task 1) before perfecting the layout (Task 2).
