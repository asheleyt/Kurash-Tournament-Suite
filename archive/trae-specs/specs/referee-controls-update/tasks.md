# Tasks

- [x] Task 1: Backend Setup for "Jazo" Event
    - [x] SubTask 1.1: Create `App\Events\JazoToggled` event (similar to `MedicToggled`).
    - [x] SubTask 1.2: Update `BroadcastController` to handle `jazoToggle` request.
    - [x] SubTask 1.3: Register `/broadcast/jazo-toggle` route in `web.php`.

- [x] Task 2: Referee Controller Logic & UI Updates
    - [x] SubTask 2.1: Implement Gender State & Controls
        - Add `gender` state ('male' | 'female').
        - Add buttons to toggle gender (Male 4:00, Female 3:00).
        - Update `handleResetTime` to respect selected gender.
    - [x] SubTask 2.2: Implement "Jazo" Logic
        - Add `isJazoMode` state.
        - Update timer watcher to check for Jazo condition (Half-time & 0-0 score).
        - Implement `broadcastJazoState` function.
        - Add "Clear Jazo" button (only visible/active when Jazo is active).
    - [x] SubTask 2.3: Medic Auto-Clear Logic
        - Update timer watcher to check if `isMedicMode` is true and `time` == 0.
        - If true, set `isMedicMode = false` and broadcast.
    - [x] SubTask 2.4: Medic Button UI Refinement
        - Adjust Tailwind classes to make the button smaller and indicators larger.

- [x] Task 3: Scoreboard Updates
    - [x] SubTask 3.1: Listen for `kurash.jazo` channel and update `isJazoMode`.
    - [x] SubTask 3.2: Implement "Jazo" Popup UI (similar to Break/Medic popups).
    - [x] SubTask 3.3: Verify Medic popup disappears when `isMedicMode` becomes false via broadcast.

# Task Dependencies

- Task 2 depends on Task 1 (needs backend route for Jazo).
- Task 3 depends on Task 1 & 2 (needs events to listen to).
