# Enhanced Game Controls & Player Info Spec

## Why

The user requests further refinements to the "Jazo" functionality (persistent clear button, timer pause, auto-clear on score), the addition of a "Winner" announcement feature, and the ability to input and display player details (Name, Country, Gender, Weight).

## What Changes

- **Jazo Logic**:
    - "Clear Jazo" button will remain in the Game Controls panel.
    - Timer stops automatically when Jazo mode is triggered.
    - Jazo popup automatically clears if a player gains a point.
- **Winner Feature**:
    - Add a "Winner" button to each player's panel.
    - Clicking it triggers a "Winner" popup on the scoreboard with Player Name, Country Code, and Flag.
    - Clicking it again removes the popup.
- **Player Info Input**:
    - Add input fields for Player Name, Country Code, Gender, and Weight Division in the Referee Controller.
    - These inputs update the Scoreboard's "Player Name", "N/A" (Country), and footer info (Gender/Weight) in real-time.

## Impact

- **Affected specs**: Game Logic, Scoreboard UI, Referee UI.
- **Affected code**:
    - `resources/js/Pages/refereeController.vue`
    - `resources/js/Pages/kurashScoreBoard.vue`
    - `app/Http/Controllers/BroadcastController.php`
    - `routes/web.php`
    - `app/Events/WinnerToggled.php` (New)
    - `app/Events/PlayerInfoUpdated.php` (New)

## ADDED Requirements

### Requirement: Winner Announcement

The system SHALL allow declaring a winner.

- **Trigger**: "Winner" button on each player's panel.
- **Action**: Display a popup on the Scoreboard with:
    - Player Name
    - Country Code
    - Flag (derived from country code)
- **Toggle**: Clicking the button again removes the popup.

### Requirement: Player Information Management

The system SHALL allow editing player details.

- **Fields**: Name, Country Code, Gender, Weight Division.
- **Display**: Updates the Scoreboard in real-time.
    - Name -> "Player Name" label.
    - Country Code -> "N/A" label next to flag.
    - Gender/Weight -> Footer info.

### Requirement: Jazo Auto-Clear on Score

The system SHALL automatically clear the Jazo state if any player's score increases while Jazo is active.

## MODIFIED Requirements

### Requirement: Jazo Behavior

- **Timer**: The game timer SHALL pause automatically when Jazo is triggered.
- **Controls**: The "Clear Jazo" button SHALL be permanently visible in the Game Controls panel (or only when active, but user said "stay", implying easier access). _Clarification: User said "stay and just include it to game control panel", implying it shouldn't disappear or be hidden in a weird spot._
