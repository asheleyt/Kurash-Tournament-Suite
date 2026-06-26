# Tasks

- [x] Task 1: Create Constant File for Countries and Flags
  - [ ] Move `availableFlags` and `availableCountries` from `refereeController.vue` to `resources/js/Constants/countries.ts`.
  - [ ] Export and import them back into `refereeController.vue`.

- [x] Task 2: Create Reusable Components
  - [x] Create `resources/js/Components/Referee/ScoreButton.vue`.
  - [x] Create `resources/js/Components/Referee/PenaltyButton.vue`.
  - [x] Create `resources/js/Components/Referee/Icons/` directory and move icons (PlayIcon, PauseIcon, etc.) into individual `.vue` files.
  - [x] Update `refereeController.vue` to use these new components.

- [x] Task 3: Create useBroadcast Composable
  - [x] Create `resources/js/Composables/useBroadcast.ts`.
  - [x] Implement a generic `broadcast(endpoint: string, payload: any)` function.
  - [x] Replace all manual `fetch` calls in `refereeController.vue` with `useBroadcast`.

- [x] Task 4: Clean Up Referee Controller
  - [x] Remove inline component definitions.
  - [x] Remove hardcoded data.
  - [x] Ensure all logic still works correctly with the new structure.

# Task Dependencies
- Task 2 and Task 3 depend on Task 1 (structurally easier to do first).
- Task 4 is the final cleanup step.
