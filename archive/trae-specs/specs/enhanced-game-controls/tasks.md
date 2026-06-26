# Tasks

- [x] Task 1: Backend Setup for New Events
    - [x] SubTask 1.1: Create `App\Events\WinnerToggled` event.
    - [x] SubTask 1.2: Create `App\Events\PlayerInfoUpdated` event.
    - [x] SubTask 1.3: Update `BroadcastController` to handle `winnerToggle` and `updatePlayerInfo`.
    - [x] SubTask 1.4: Register routes `/broadcast/winner-toggle` and `/broadcast/player-info` in `web.php`.

- [x] Task 2: Referee Controller - Player Info Inputs
    - [x] SubTask 2.1: Add state for Player Info (Name, Country, Weight, Gender - global).
    - [x] SubTask 2.2: Create UI input fields for these details (likely at the top or in a settings modal/section).
    - [x] SubTask 2.3: Implement `handlePlayerInfoChange` to broadcast updates on input (debounce recommended).

- [x] Task 3: Referee Controller - Winner & Jazo Logic
    - [x] SubTask 3.1: Add "Winner" button to Player Panels.
    - [x] SubTask 3.2: Implement `handleWinnerToggle` logic (broadcast state).
    - [x] SubTask 3.3: Update Jazo Logic:
        - Stop timer when Jazo triggers.
        - Clear Jazo if `getTotalScore` > 0 for any player.
        - Ensure "Clear Jazo" button is accessible in Game Controls.

- [x] Task 4: Scoreboard Updates
    - [x] SubTask 4.1: Listen for `kurash.winner` and `kurash.player-info` channels.
    - [x] SubTask 4.2: Update UI to display dynamic Player Name, Country, Gender, Weight.
    - [x] SubTask 4.3: Implement "Winner" Popup UI.

# Task Dependencies

- Task 2 & 3 depend on Task 1 (backend routes).
- Task 4 depends on Task 1 (events).
