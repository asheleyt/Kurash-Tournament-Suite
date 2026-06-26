# Medic Red Logic & Default Time 00:00 Spec

## Why
The user requested three specific improvements:
1.  **Default Time**: The game timer should start at `00:00` (0 seconds) by default until a gender is selected, preventing accidental starts with the wrong time.
2.  **Medic Undo**: The medic timer button should act as a toggle, allowing the referee to cancel/stop the medic mode if clicked again while active.
3.  **Referee Medic Indicator**: The visual indicators for medic usage in the Referee Controller should turn **red** when the medic period is "done" (meaning the count is registered but the timer is no longer running), while using a different state (e.g., player color) when the medic timer is actively running.

## What Changes
- **refereeController.vue**:
  - **State Initialization**: Set `gameState.time` to `0` initially.
  - **Medic Logic**:
    - Update `handlePlayerMedic`:
      - Add toggle logic: if `isMedicMode` is active for the same player, call `handleMedicEnd` (undo/stop).
      - Add `await broadcastScoreState()` to ensure the incremented medic count is sent to the scoreboard immediately.
  - **Referee UI**:
    - Update the Medic Indicator classes.
    - **Logic**:
      - If `medicClicks >= N` AND (`!isMedicMode` OR `timerPlayer !== player`), show **RED** (Done).
      - If `medicClicks >= N` AND (`isMedicMode` AND `timerPlayer === player`), show **Player Color** (Active/In Progress).

## Impact
- **Referee Controller**:
  - Timer starts at 00:00.
  - Medic buttons now toggle off.
  - Medic indicators show Red only when the medic event is finished, avoiding confusion during the event.
- **Scoreboard**:
  - Medic count (filled boxes) will now update immediately when the button is clicked, thanks to the added broadcast.

## MODIFIED Requirements
### Requirement: Default Timer
- **Initial State**: `gameState.time` SHALL be `0`.

### Requirement: Medic Toggle
- **Action**: Clicking the Medic button for the *currently active* medic player SHALL stop the medic timer and revert to the main game state (Undo/Stop).

### Requirement: Referee Medic Indicators
- **Active State**: When medic timer is running, the corresponding indicator box SHALL be the player's color (Green/Blue).
- **Done State**: When medic timer is finished (or count exists but not running), the indicator box SHALL be Red.
