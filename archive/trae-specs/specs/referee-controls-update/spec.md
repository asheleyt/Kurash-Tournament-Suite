# Referee Controls & Scoreboard Logic Update Spec

## Why

The user requests enhancements to the game management workflow, specifically regarding the "Medic" timer behavior, UI adjustments for visibility, and the implementation of specific "Jazo" game rules and gender-based timers.

## What Changes

- **Medic Logic**: The "Medic" popup on the scoreboard will now automatically disappear when the medic timer reaches 0.
- **UI Adjustments**: The "Medic" button in the player controls will be made smaller, while the usage indicators (boxes) will be made larger for better visibility.
- **Gender Timer**: Add functionality to switch between Male (4:00) and Female (3:00) match durations.
- **"Jazo" Rule**: Implement logic to detect a "Jazo" situation (0-0 score at half-time) and display a popup.
- **New Controls**: Add buttons for Gender selection and a button to dismiss the "Jazo" popup.

## Impact

- **Affected specs**: Game timing logic, Scoring logic, Broadcast events.
- **Affected code**:
    - `resources/js/Pages/refereeController.vue`
    - `resources/js/Pages/kurashScoreBoard.vue`
    - `app/Http/Controllers/BroadcastController.php`
    - `routes/web.php`
    - `app/Events/JazoToggled.php` (New)

## ADDED Requirements

### Requirement: Gender Selection

The system SHALL provide controls to select the match gender (Male/Female).

- **Default**: Male (4:00 / 240 seconds).
- **Female**: 3:00 (180 seconds).
- **Behavior**: Changing gender resets the game timer to the respective full duration.

### Requirement: "Jazo" Detection & Popup

The system SHALL detect "Jazo" state and broadcast a popup event.

- **Condition**:
    - Game is running.
    - Timer reaches exactly half-time (Male: 2:00, Female: 1:30).
    - Both Player 1 and Player 2 total scores are 0.
- **Action**: Display "Jazo" popup on Scoreboard.
- **Control**: Provide a "Clear Jazo" button on the Referee Controller to manually remove the popup.

### Requirement: Medic Timer Auto-Clear

The system SHALL automatically remove the "Medic" popup when the medic timer counts down to 0.

## MODIFIED Requirements

### Requirement: Player Medic Controls

- **UI Change**: Reduce the size of the "Medic" button.
- **UI Change**: Increase the size of the medic usage indicators (red boxes) to make them more prominent.
